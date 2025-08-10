import json
import os
import logging
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY not set in env variables.")

genai.configure(api_key=GOOGLE_API_KEY)
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-pro-latest")

class AnswerRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    introduction: str
    body: List[str]
    conclusion: str

@router.post("/generate_answer", response_model=AnswerResponse)
async def generate_answer(request: AnswerRequest):
    try:
        prompt = f"""
        Generate a UPSC answer in JSON format:

        Question: {request.question}

        {{
            "introduction": "...",
            "body": ["...", "...", "...", "...", "..."],
            "conclusion": "..."
        }}
        """
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            generation_config={"response_mime_type": "application/json"}
        )
        response = model.generate_content(prompt)
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError:
            data = {
                "introduction": f"AI Output (unparsed):\n{response.text}",
                "body": [],
                "conclusion": ""
            }
        return AnswerResponse(**data)
    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {e}")
