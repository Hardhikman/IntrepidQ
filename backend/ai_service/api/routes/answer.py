import json
import os
import logging
# Fixed import approach for Google Generative AI
import google.generativeai as genai
from google.generativeai.generative_models import GenerativeModel
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

# Constants
DAILY_LIMIT = 5
GUEST_DAILY_LIMIT = 2

# Google API Key setup
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY not set in env variables.")

# The google.generativeai library automatically uses the GOOGLE_API_KEY
# environment variable, so an explicit genai.configure() call is not needed.

# Model selection
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request, handling proxies"""
    # Check for forwarded headers first (for proxy/load balancer setups)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # Take the first IP in the chain
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    
    # Fallback to direct client IP
    return request.client.host if request.client else "unknown"

#Schemas

class AnswerRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    introduction: str
    body: List[str]
    conclusion: str

class BatchAnswerRequest(BaseModel):
    questions: List[str]

class BatchAnswerResponse(BaseModel):
    answers: List[AnswerResponse]

# These imports would be specific to your project structure
# from api.auth import get_optional_user
# from core.supabase_client import supabase_service

# For demonstration, we'll use placeholder functions for dependencies
async def get_optional_user() -> Optional[Dict[str, Any]]:
    return None 

#Helpers

def extract_text_from_response(response) -> str:
    """
    Gemini responses sometimes need deeper parsing.
    """
    if hasattr(response, "text") and response.text:
        return response.text
    if hasattr(response, "candidates") and response.candidates:
        try:
            # Access the first part of the first candidate's content
            parts = response.candidates[0].content.parts
            if parts and hasattr(parts[0], "text"):
                return parts[0].text
        except (IndexError, AttributeError):
            pass  # Let it fall through to the ValueError
    raise ValueError("Gemini response did not contain any text output.")

def build_prompt(question: str) -> str:
    return f"""
You are an AI generating UPSC Civil Services Mains style answers.

The answer **must strictly follow this JSON schema only**:
{{
    "introduction": "Context or fact-based introduction, not more than 2 lines.",
    "body": ["Keyword1", "Keyword2", "Keyword3", "Keyword4", "Keyword5"],
    "conclusion": "Futuristic and outcome-based closing statement, may refer to a policy/scheme/key phrase, max 2 lines."
}}

Notes:
- Introduction should be informative and directly related to the question.
- Body should contain exactly 5 **unique** single or two-word keywords (no sentences).
- Conclusion should indicate positive or policy-oriented direction.
- Do NOT include anything outside this JSON structure.
- Ensure exactly 5 items in the body array.

Question: {question}
"""

#Single Answer
@router.post("/generate_answer", response_model=AnswerResponse)
async def generate_answer(
    request: AnswerRequest, 
    http_request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    try:
        # No rate limiting for answer generation - unlimited for all users
        
        logger.info(f"Generating answer for question: {request.question}")

        # The model will automatically use the API key from the environment variables
        model = GenerativeModel(
            model_name=MODEL_NAME,
            generation_config={"response_mime_type": "application/json"},
            safety_settings={
                "HARASSMENT": "BLOCK_ONLY_HIGH",
                "HATE_SPEECH": "BLOCK_ONLY_HIGH",
                "SEXUALLY_EXPLICIT": "BLOCK_ONLY_HIGH",
                "DANGEROUS_CONTENT": "BLOCK_ONLY_HIGH",
            }
        )

        response = model.generate_content(build_prompt(request.question))
        raw_text = extract_text_from_response(response)

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            logger.warning("AI did not return valid JSON. Returning raw output.")
            data = {"introduction": f"AI Output (unparsed): {raw_text}", "body": [], "conclusion": ""}

        # No counter increment for answer generation

        return AnswerResponse(
            introduction=data.get("introduction", ""),
            body=data.get("body", []),
            conclusion=data.get("conclusion", "")
        )

    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {e}")

#Batch Answers

@router.post("/generate_answers", response_model=BatchAnswerResponse)
async def generate_answers(
    request: BatchAnswerRequest, 
    http_request: Request,
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    try:
        # No rate limiting for answer generation - unlimited for all users
        
        if not request.questions:
            raise HTTPException(status_code=400, detail="No questions provided")

        # The model will automatically use the API key from the environment variables
        model = GenerativeModel(
            model_name=MODEL_NAME,
            generation_config={"response_mime_type": "application/json"},
            safety_settings={
                "HARASSMENT": "BLOCK_ONLY_HIGH",
                "HATE_SPEECH": "BLOCK_ONLY_HIGH",
                "SEXUALLY_EXPLICIT": "BLOCK_ONLY_HIGH",
                "DANGEROUS_CONTENT": "BLOCK_ONLY_HIGH",
            }
        )

        answers: List[AnswerResponse] = []
        for q in request.questions:
            try:
                response = model.generate_content(build_prompt(q))
                raw_text = extract_text_from_response(response)

                try:
                    data = json.loads(raw_text)
                except json.JSONDecodeError:
                    logger.warning("AI did not return valid JSON for one question. Returning raw output.")
                    data = {"introduction": f"AI Output (unparsed): {raw_text}", "body": [], "conclusion": ""}

                answers.append(
                    AnswerResponse(
                        introduction=data.get("introduction", ""),
                        body=data.get("body", []),
                        conclusion=data.get("conclusion", "")
                    )
                )
            except Exception as inner_error:
                logger.error(f"Failed to generate answer for question: {q}, error: {inner_error}")
                answers.append(AnswerResponse(introduction="", body=[], conclusion=""))

        # No counter increment for answer generation

        return BatchAnswerResponse(answers=answers)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating batch answers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate answers: {e}")
