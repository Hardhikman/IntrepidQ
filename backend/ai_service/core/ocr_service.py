"""
OCR Service for processing uploaded images and extracting text
"""
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    cv2 = None  # Define cv2 as None to prevent unbound variable errors
    print("Warning: OpenCV not available, image preprocessing will be limited")

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False
    pytesseract = None  # Define pytesseract as None to prevent unbound variable errors
    print("Warning: Pytesseract not available, OCR functionality will be limited")

from PIL import Image
import numpy as np
import io
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        # You can configure tesseract path if needed
        # pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'
        pass
    
    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image to improve OCR accuracy
        """
        if not CV2_AVAILABLE or cv2 is None:
            logger.warning("OpenCV not available, returning original image")
            return image
            
        try:
            # Convert PIL image to OpenCV format
            img_array = np.array(image)
            img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Apply threshold to get image with only black and white
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Convert back to PIL Image
            preprocessed_image = Image.fromarray(cv2.cvtColor(thresh, cv2.COLOR_BGR2RGB))
            return preprocessed_image
        except Exception as e:
            logger.error(f"Error during image preprocessing: {e}")
            return image
    
    def extract_text(self, image_data: bytes) -> Optional[str]:
        """
        Extract text from image bytes using OCR
        """
        if not PYTESSERACT_AVAILABLE or pytesseract is None:
            logger.error("Pytesseract not available, cannot perform OCR")
            return None
            
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_data))
            
            # Preprocess image for better OCR
            processed_image = self.preprocess_image(image)
            
            # Perform OCR
            text = pytesseract.image_to_string(processed_image)
            
            # Clean up extracted text
            cleaned_text = text.strip()
            
            logger.info(f"Successfully extracted {len(cleaned_text)} characters from image")
            return cleaned_text
        except Exception as e:
            logger.error(f"Error during OCR processing: {e}")
            return None
    
    def extract_text_from_multiple_images(self, image_data_list: List[bytes]) -> Optional[str]:
        """
        Extract text from multiple images and concatenate results
        Limited to 2 pages maximum as per requirements
        """
        if len(image_data_list) > 2:
            logger.warning(f"Received {len(image_data_list)} images, limiting to 2 pages")
            image_data_list = image_data_list[:2]
        
        extracted_texts = []
        for i, image_data in enumerate(image_data_list):
            try:
                text = self.extract_text(image_data)
                if text:
                    extracted_texts.append(text)
                    logger.info(f"Successfully processed page {i+1}")
                else:
                    logger.warning(f"Failed to extract text from page {i+1}")
            except Exception as e:
                logger.error(f"Error processing page {i+1}: {e}")
        
        # Concatenate all extracted texts with page separators
        if extracted_texts:
            concatenated_text = "\n\n--- PAGE BREAK ---\n\n".join(extracted_texts)
            return concatenated_text
        else:
            return None

# Global instance
ocr_service = OCRService()