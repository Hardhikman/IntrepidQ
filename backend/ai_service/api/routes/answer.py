import json
import logging
import os
from typing import Any, Dict, List, Optional

# Fixed import approach for Google Gen AI
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from google import genai
from google.genai import types
from pydantic import BaseModel

import sys
sys.path.append('.')

from api.auth import get_optional_user

# Load environment variables
load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

# Constants
DAILY_LIMIT = 5
GUEST_DAILY_LIMIT = 2

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY not set in env variables.")

# Model selection
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

# Initialize Gemini client
client = genai.Client(api_key=GOOGLE_API_KEY)


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




#Helpers

def extract_text_from_response(response) -> str:
    """
    Gemini responses sometimes need deeper parsing.
    """
    if hasattr(response, "text") and response.text:
        return response.text
    
    # Try to access text via parts (handling different SDK versions/structures)
    try:
        if response.candidates and response.candidates[0].content.parts:
            return response.candidates[0].content.parts[0].text
    except (IndexError, AttributeError):
        pass
        
    raise ValueError("Gemini response did not contain any text output.")

def build_prompt(question: str) -> str:
    """
    Generates a prompt for an AI to answer a UPSC-style question
    in a specific JSON format.
    """
    return f"""
You are an AI generating UPSC Civil Services Mains style answers.

**Internal thought process (Do not include in JSON):**
1.  First, **analyze the Question** to identify all its distinct subparts (e.g., 'discuss', 'causes', 'challenges', 'measures', 'consequences').
2.  For **each identified subpart**, brainstorm keywords across multiple dimensions (economical, political, social, technological, legal, environmental).
3.  Compile all these keywords into a single, flat array for the "body" field.

The answer **must strictly follow this JSON schema only**:
{{
    "introduction": "Context or fact-based introduction, not more than 2 lines.",
    "body": ["Keyword 1", "Keyword 2", "Keyword 3"],  # Example of proper list format, maximum 15 keywords
    "conclusion": "Futuristic and outcome-based closing statement, may refer to a policy/scheme/key phrase, max 2 lines."
}}

Notes:
- Introduction should be informative and directly related to the question.
- Body should contain **unique** single or two-word broad based keywords (no sentences) in a JSON array format.
- Conclusion should indicate positive or policy-oriented direction.
- Do NOT include anything outside this JSON structure.
- The `body` array **must** be comprehensive, covering **all subparts** you identified and **all relevant dimensions** for each subpart.
- **Tip:** You can combine them like 'Cause: Economic' or 'Challenge: Legal' to ensure clarity and coverage.

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

        # Safety settings and generation config for the new SDK
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
            ]
        )

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=build_prompt(request.question),
            config=config
        )
        raw_text = extract_text_from_response(response)

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            logger.warning("AI did not return valid JSON. Returning raw output.")
            data = {"introduction": f"AI Output (unparsed): {raw_text}", "body": [], "conclusion": ""}

        # Ensure body is always a list, even if AI returns a string
        body_content = data.get("body", [])
        if isinstance(body_content, str):
            # If body is a string, convert it to a list
            # Split by newlines or common delimiters and clean up
            body_list = [item.strip() for item in body_content.split('\n') if item.strip()]
            if not body_list:
                # Fallback: wrap the string in a list
                body_list = [body_content] if body_content else []
            body_content = body_list
        elif not isinstance(body_content, list):
            # If body is neither string nor list, default to empty list
            body_content = []

        # No counter increment for answer generation

        return AnswerResponse(
            introduction=data.get("introduction", ""),
            body=body_content,
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

        # Reuse common config
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            safety_settings=[
                types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
            ]
        )

        answers: List[AnswerResponse] = []
        for q in request.questions:
            try:
                response = client.models.generate_content(
                    model=MODEL_NAME,
                    contents=build_prompt(q),
                    config=config
                )
                raw_text = extract_text_from_response(response)

                try:
                    data = json.loads(raw_text)
                except json.JSONDecodeError:
                    logger.warning("AI did not return valid JSON for one question. Returning raw output.")
                    data = {"introduction": f"AI Output (unparsed): {raw_text}", "body": [], "conclusion": ""}

                # Ensure body is always a list, even if AI returns a string
                body_content = data.get("body", [])
                if isinstance(body_content, str):
                    # If body is a string, convert it to a list
                    # Split by newlines or common delimiters and clean up
                    body_list = [item.strip() for item in body_content.split('\n') if item.strip()]
                    if not body_list:
                        # Fallback: wrap the string in a list
                        body_list = [body_content] if body_content else []
                    body_content = body_list
                elif not isinstance(body_content, list):
                    # If body is neither string nor list, default to empty list
                    body_content = []

                answers.append(
                    AnswerResponse(
                        introduction=data.get("introduction", ""),
                        body=body_content,
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
