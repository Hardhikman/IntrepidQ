"""
API routes for OCR processing of uploaded screenshots
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Dict, Any, Optional, List
import sys
import json
sys.path.append('.')

from api.auth import get_optional_user
from core.ocr_service import ocr_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/process_screenshot")
async def process_screenshot(
    files: List[UploadFile] = File(...),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Process uploaded screenshots (max 2 pages) using OCR and return extracted text
    """
    try:
        # Limit to 2 pages maximum
        if len(files) > 2:
            raise HTTPException(status_code=400, detail="Maximum 2 pages allowed")
        
        # Validate file types
        for file in files:
            # Check if content_type is not None before accessing startswith
            if file.content_type is None or not file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Check file sizes (limit to 5MB each)
        image_data_list = []
        for file in files:
            contents = await file.read()
            if len(contents) > 5 * 1024 * 1024:  # 5MB
                raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
            image_data_list.append(contents)
        
        # Process OCR on all images
        if len(image_data_list) == 1:
            # Single image processing
            extracted_text = ocr_service.extract_text(image_data_list[0])
        else:
            # Multiple images processing
            extracted_text = ocr_service.extract_text_from_multiple_images(image_data_list)
        
        if not extracted_text:
            raise HTTPException(status_code=500, detail="Failed to extract text from image(s)")
        
        return {
            "extracted_text": extracted_text,
            "character_count": len(extracted_text),
            "word_count": len(extracted_text.split()),
            "page_count": len(image_data_list)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing screenshot(s): {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process screenshot(s): {str(e)}")

@router.post("/evaluate_screenshot")
async def evaluate_screenshot(
    files: List[UploadFile] = File(...),
    evaluation_prompt: str = "Evaluate the content in this image",
    model: str = "gemini-2.5-flash",  # Updated to correct model name
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Process uploaded screenshots (max 2 pages) using OCR, then evaluate content with LLM
    """
    try:
        # Limit to 2 pages maximum
        if len(files) > 2:
            raise HTTPException(status_code=400, detail="Maximum 2 pages allowed")
        
        # Validate file types
        for file in files:
            # Check if content_type is not None before accessing startswith
            if file.content_type is None or not file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Check file sizes (limit to 5MB each)
        image_data_list = []
        for file in files:
            contents = await file.read()
            if len(contents) > 5 * 1024 * 1024:  # 5MB
                raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
            image_data_list.append(contents)
        
        # Process OCR on all images
        if len(image_data_list) == 1:
            # Single image processing
            extracted_text = ocr_service.extract_text(image_data_list[0])
        else:
            # Multiple images processing
            extracted_text = ocr_service.extract_text_from_multiple_images(image_data_list)
        
        if not extracted_text:
            raise HTTPException(status_code=500, detail="Failed to extract text from image(s)")
        
        # Evaluate with LLM
        evaluation_result = await evaluate_text_with_llm(extracted_text, evaluation_prompt, model)
        
        return {
            "extracted_text": extracted_text,
            "character_count": len(extracted_text),
            "word_count": len(extracted_text.split()),
            "page_count": len(image_data_list),
            "evaluation": evaluation_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error evaluating screenshot(s): {e}")
        raise HTTPException(status_code=500, detail=f"Failed to evaluate screenshot(s): {str(e)}")

async def evaluate_text_with_llm(text: str, prompt: str, model_name: str) -> Dict[str, Any]:
    """
    Evaluate extracted text using LLM with UPSC mains evaluation criteria
    """
    try:
        import google.generativeai as genai
        from google.generativeai.types import HarmCategory, HarmBlockThreshold
        from google.generativeai.generative_models import GenerativeModel
        import os
        
        # Get API key from environment
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY not set in environment variables")
        
        # Create model (no need to configure API key separately as it's picked up from env)
        model = GenerativeModel(
            model_name=model_name,
            generation_config={"response_mime_type": "application/json"},
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            }
        )
        
        # Build evaluation prompt with your specific criteria
        full_prompt = f"""
        {prompt}
        
        Content extracted from image:
        {text}
        
        Please evaluate this answer using the following UPSC Mains evaluation criteria:
        
        Evaluation Parameters:
        1. Directive Keyword: Was the core directive (e.g., "Critically analyze," "Discuss," "Elucidate") correctly interpreted and executed?
        2. All Parts Addressed: Were all sub-parts and dimensions of the question fully covered?
        3. Focus: Did the answer remain strictly relevant to the question's scope?
        4. Introduction: Was it contextual, brief, and impactful (using data, a definition, or a report)?
        5. Body: Was it logically organized with clear headings/subheadings? Was there a coherent flow?
           - Depth & Dimensions: Unique keywords used ? Did the answer explore multiple dimensions (e.g., Social, Political, Economic, Ethical, Legal)?
           - Substantiation (Topper's Edge): How well was the answer enriched with (at least for two points under each sub-part):
             * Data/Statistics (Economic Survey, NFHS, etc.)
             * Reports/Indices (NITI Aayog, World Bank, etc.)
             * Committee Recommendations
             * Constitutional Articles/Laws
             * Supreme Court Judgments
             * Relevant Examples/Case Studies
           - Visuals & Highlighting: Was there effective use of diagrams, flowcharts, maps, or strategic underlining to enhance readability?
        6. Conclusion: Was it balanced, futuristic, and did it summarize the core arguments effectively without introducing new points?
        7. Clarity & Brevity: Was the language simple and precise? Was the word limit respected?
        
        Please provide your evaluation in JSON format with the following structure:
        {{
            "evaluation": {{
                "directive_keyword": {{
                    "rating": "Good/Better/Best",
                    "strengths": ["Strength 1", "Strength 2"], // Only include if needed
                    "weaknesses": ["Weakness 1", "Weakness 2"], // Only include if needed
                    "improvements": ["Improvement 1", "Improvement 2"] // Only include if needed
                }},
                "completeness": {{
                    "rating": "Good/Better/Best",
                    "strengths": ["Strength 1", "Strength 2"], // Only include if needed
                    "weaknesses": ["Weakness 1", "Weakness 2"], // Only include if needed
                    "improvements": ["Improvement 1", "Improvement 2"] // Only include if needed
                }},
                "focus": {{
                    "rating": "Good/Better/Best",
                    "strengths": ["Strength 1", "Strength 2"], // Only include if needed
                    "weaknesses": ["Weakness 1", "Weakness 2"], // Only include if needed 
                    "improvements": ["Improvement 1", "Improvement 2"] // Only include if needed
                }},
                "introduction": {{
                    "rating": "Good/Better/Best",
                    "strengths": ["Strength 1", "Strength 2"],  // Only include if needed
                    "weaknesses": ["Weakness 1", "Weakness 2"], // Only include if needed
                    "improvements": ["Improvement 1", "Improvement 2"] // Only include if needed
                }},
                "body": {{
                    "rating": "Good/Better/Best",
                    "organization": {{
                        "rating": "Good/Better/Best",
                        "strengths": ["Strength 1", "Strength 2"], // Only include if needed
                        "weaknesses": ["Weakness 1", "Weakness 2"],// Only include if needed
                        "improvements": ["Improvement 1", "Improvement 2"] // Only include if needed
                    }},
                    "depth": {{
                        "rating": "Good/Better/Best",
                        "strengths": ["Strength 1", "Strength 2"],// Only include if needed
                        "weaknesses": ["Weakness 1", "Weakness 2"], // Only include if needed
                        "improvements": ["Improvement 1", "Improvement 2"] // Only include if needed
                    }},
                    "substantiation": {{
                        "rating": "Good/Better/Best",
                        "strengths": ["Strength 1", "Strength 2"], // Only include if needed
                        "weaknesses": ["Weakness 1", "Weakness 2"], // Only include if needed
                        "improvements": ["Improvement 1", "Improvement 2"] // Only include if needed
                    }}
                }},
                "conclusion": {{
                    "rating": "Good/Better/Best",
                    "strengths": ["Strength 1", "Strength 2"], // Only include if needed
                    "weaknesses": ["Weakness 1", "Weakness 2"], // Only include if needed
                    "improvements": ["Improvement 1", "Improvement 2"] // Only include if needed
                }},
                "clarity": {{
                    "rating": "Good/Better/Best",
                    "strengths": ["Strength 1", "Strength 2"], // Only include if needed
                    "weaknesses": ["Weakness 1", "Weakness 2"], // Only include if needed
                    "improvements": ["Improvement 1", "Improvement 2"] // Only include if needed
                }}
            }},
            "overall_rating": "Good/Better/Best",
        }}
        """
        
        # Generate response
        response = model.generate_content(full_prompt)
        
        # Extract text from response
        if hasattr(response, "text") and response.text:
            try:
                return json.loads(response.text)
            except json.JSONDecodeError:
                return {"raw_response": response.text}
        else:
            return {"error": "No response from LLM"}
            
    except Exception as e:
        logger.error(f"Error evaluating text with LLM: {e}")
        return {"error": f"Failed to evaluate with LLM: {str(e)}"}