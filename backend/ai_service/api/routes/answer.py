import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import os
import google.generativeai as genai
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

        # Prompt for structured answer generation
        prompt = f"""
        Generate a UPSC Civil Services Mains style answer for the following question:

        Question: {request.question}

        The output must be in this JSON format:
        {{
            "introduction": "2-3 sentence introduction",
            "body": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
            "conclusion": "2-3 sentence forward-looking conclusion"
        }}
        """

        # Use Google's Gemini or PaLM model
        model = genai.GenerativeModel("gemini-pro")  # for text
        response = model.generate_content(prompt)

        # Parse model output
        text_output = response.text.strip()

        import json
        try:
            data = json.loads(text_output)
        except json.JSONDecodeError:
            # If LLM didn't return perfect JSON, fallback to simple parsing
            logger.warning("Failed to parse perfect JSON. Returning raw AI output.")
            data = {
                "introduction": "Could not parse fully. AI Output:\n" + text_output,
                "body": [],
                "conclusion": ""
            }

        # Validate required keys
        return AnswerResponse(
            introduction=data.get("introduction", ""),
            body=data.get("body", []),
            conclusion=data.get("conclusion", "")
        )

    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(e)}")
