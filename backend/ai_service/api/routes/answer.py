import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
import google.generativeai as genai
import json
from dotenv import load_dotenv

# Load env vars
load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter()

# Configure Google AI API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is not set in environment variables.")
genai.configure(api_key=GOOGLE_API_KEY)

# Model name from env or default
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-pro-latest")

class AnswerRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    introduction: str
    body: List[str]
    conclusion: str

@router.post("/generate_answer", response_model=AnswerResponse)
async def generate_answer(request: AnswerRequest):
    """
    Generates a structured answer for a given question using Google Generative AI.
    """
    try:
        logger.info(f"Generating answer for question: {request.question}")

        # Prompt for structured answer
        prompt = f"""
        Generate a UPSC Civil Services Mains style answer for the following question:

        Question: {request.question}

        The output must be valid JSON with this structure ONLY:
        {{
            "introduction": "2-3 sentence introduction",
            "body": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
            "conclusion": "2-3 sentence forward-looking conclusion"
        }}
        """

        # Force output as JSON
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            generation_config={"response_mime_type": "application/json"}
        )

        response = model.generate_content(prompt)

        # Parse JSON response directly
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError:
            logger.warning("AI did not return perfect JSON. Returning fallback structure.")
            data = {
                "introduction": f"AI Output (unparsed):\n{response.text}",
                "body": [],
                "conclusion": ""
            }

        return AnswerResponse(
            introduction=data.get("introduction", ""),
            body=data.get("body", []),
            conclusion=data.get("conclusion", "")
        )

    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(e)}")
