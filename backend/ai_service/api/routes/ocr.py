"""
API routes for OCR processing of uploaded screenshots using Google Gemini
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Dict, Any, Optional, List
import sys
import json
import os
sys.path.append('.')

# Import Google Generative AI
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from google.generativeai.generative_models import GenerativeModel

from api.auth import get_optional_user

logger = logging.getLogger(__name__)
router = APIRouter()

async def extract_text_with_gemini(image_data: bytes, model_name: str = "gemini-2.0-flash") -> str:
    """
    Extract text from image using Google Gemini
    """
    try:
        # Get API key from environment
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY not set in environment variables")
        
        # Create model
        model = GenerativeModel(
            model_name=model_name,
            generation_config={"response_mime_type": "text/plain"},
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            }
        )
        
        # Create prompt for text extraction
        prompt = """
        Extract all readable text from this image. This may include handwritten text, printed text, 
        diagrams, charts, or any other textual content visible in the image. 
        Return only the extracted text without any additional formatting or explanation.
        """
        
        # Process image
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_data}
        ])
        
        # Extract text from response
        if hasattr(response, "text") and response.text:
            return response.text.strip()
        else:
            return ""
            
    except Exception as e:
        logger.error(f"Error extracting text with Gemini: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract text with Gemini: {str(e)}")

@router.post("/process_screenshot")
async def process_screenshot(
    files: List[UploadFile] = File(...),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Process uploaded screenshots (max 5 pages) using Google Gemini and return extracted text
    """
    try:
        # Limit to 5 pages maximum
        if len(files) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 pages allowed")
        
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
        
        # Process images with Gemini
        extracted_texts = []
        for i, image_data in enumerate(image_data_list):
            try:
                text = await extract_text_with_gemini(image_data)
                if text:
                    extracted_texts.append(text)
                    logger.info(f"Successfully processed page {i+1}")
                else:
                    logger.warning(f"Failed to extract text from page {i+1}")
            except Exception as e:
                logger.error(f"Error processing page {i+1}: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to process page {i+1}: {str(e)}")
        
        # Combine extracted texts
        if not extracted_texts:
            raise HTTPException(status_code=500, detail="Failed to extract text from image(s)")
        
        # Concatenate all extracted texts with page separators
        if len(extracted_texts) == 1:
            extracted_text = extracted_texts[0]
        else:
            extracted_text = "\n\n--- PAGE BREAK ---\n\n".join(extracted_texts)
        
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
    evaluation_prompt: str = "Evaluate this answer using the provided evaluation query and UPSC Mains criteria",
    model: str = "gemini-2.5-flash",
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Process uploaded screenshots (max 5 pages) using Google Gemini, then evaluate content with LLM
    """
    try:
        # Limit to 5 pages maximum
        if len(files) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 pages allowed")
        
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
        
        # Process images with Gemini
        extracted_texts = []
        for i, image_data in enumerate(image_data_list):
            try:
                text = await extract_text_with_gemini(image_data)
                if text:
                    extracted_texts.append(text)
                    logger.info(f"Successfully processed page {i+1}")
                else:
                    logger.warning(f"Failed to extract text from page {i+1}")
            except Exception as e:
                logger.error(f"Error processing page {i+1}: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to process page {i+1}: {str(e)}")
        
        # Combine extracted texts
        if not extracted_texts:
            raise HTTPException(status_code=500, detail="Failed to extract text from image(s)")
        
        # Concatenate all extracted texts with page separators
        if len(extracted_texts) == 1:
            extracted_text = extracted_texts[0]
        else:
            extracted_text = "\n\n--- PAGE BREAK ---\n\n".join(extracted_texts)
        
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
        
        Please evaluate the following answer according to the user's evaluation query and the UPSC Mains evaluation criteria.
        
        User's evaluation query: {prompt}
        
        Answer to evaluate: {text}
        
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

