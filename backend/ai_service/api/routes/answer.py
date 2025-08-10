import json
import os
import logging
import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter()
logger = logging.getLogger(__name__)

# Google API Key setup
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY not set in env variables.")
genai.configure(api_key=GOOGLE_API_KEY)

# Model selection
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash-latest")

class AnswerRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    introduction: str
    body: List[str]
    conclusion: str

@router.post("/generate_answer", response_model=AnswerResponse)
async def generate_answer(request: AnswerRequest):
    try:
        logger.info(f"Generating answer for question: {request.question}")

        # Strict pattern prompt
        prompt = f"""
        You are an AI generating UPSC Civil Services Mains style answers.

        The answer **must strictly follow this JSON schema** only:
        {{
            "introduction": "Context or fact-based introduction, not more than 2 lines.",
            "body": ["Keyword1", "Keyword2", "Keyword3", "Keyword4", "Keyword5"],
            "conclusion": "Futuristic and outcome-based closing statement, may refer to a policy/scheme/key phrase, max 2 lines."
        }}

        Notes:
        - Introduction should be informative and directly related to the question.
        - Body should contain exactly 5 **unique single or two-word keywords** relevant to the topic (no sentences).
        - Conclusion should indicate a positive or policy-oriented direction.
        - Do not include anything outside this JSON structure.
        - Ensure **exactly 5** items in the body array.

        Question: {request.question}
        """

        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            generation_config={
                "response_mime_type": "application/json"
            }
        )

        response = model.generate_content(prompt)

        # Parse the JSON output
        try:
            data = json.loads(response.text)
        except json.JSONDecodeError:
            logger.warning("AI did not return valid JSON. Returning raw output.")
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
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {e}")
