"""
OCR Service for processing uploaded images and extracting text.
This version is enhanced to use scikit-image as a powerful alternative
to OpenCV for image preprocessing.
"""
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    cv2 = None
    print("Warning: OpenCV not available. Will try to use scikit-image.")

# Conditional imports for scikit-image with proper type handling
from typing import Union, Callable, Any

# Define placeholder functions for when scikit-image is not available
def _fallback_rgb2gray(img):
    raise NotImplementedError("scikit-image not available")

def _fallback_threshold_sauvola(image, window_size=15, k=0.2, r=None):
    raise NotImplementedError("scikit-image not available")
    
def _fallback_median(image, footprint=None, out=None, mode='nearest', cval=0.0, behavior='ndimage'):
    raise NotImplementedError("scikit-image not available")
    
def _fallback_img_as_ubyte(image, force_copy=False):
    raise NotImplementedError("scikit-image not available")

# Initialize with fallback functions to ensure variables are always defined
rgb2gray: Union[Callable, Callable] = _fallback_rgb2gray
threshold_sauvola: Union[Callable, Callable] = _fallback_threshold_sauvola
median: Union[Callable, Callable] = _fallback_median
img_as_ubyte: Union[Callable, Callable] = _fallback_img_as_ubyte
SKIMAGE_AVAILABLE = False

# Try to import scikit-image functions
try:
    from skimage.color import rgb2gray as _imported_rgb2gray
    from skimage.filters import threshold_sauvola as _imported_threshold_sauvola, median as _imported_median
    from skimage.util import img_as_ubyte as _imported_img_as_ubyte
    # Assign the actual functions
    rgb2gray = _imported_rgb2gray
    threshold_sauvola = _imported_threshold_sauvola
    median = _imported_median
    img_as_ubyte = _imported_img_as_ubyte
    SKIMAGE_AVAILABLE = True
except ImportError:
    print("Warning: scikit-image not available. Preprocessing will be limited to Pillow.")

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False
    pytesseract = None
    print("Warning: Pytesseract not available, OCR functionality will be limited")

from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
import io
import logging
from typing import Optional, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self, max_pages: int = 2):
        """
        Initializes the OCR service.
        :param max_pages: The maximum number of pages to process in a multi-page request.
        """
        self.max_pages = max_pages

    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image to improve OCR accuracy using the best available library:
        1. OpenCV (if available)
        2. Scikit-image (if available)
        3. Pillow (fallback)
        """
        if CV2_AVAILABLE and cv2 is not None:
            logger.info("Using OpenCV for preprocessing.")
            try:
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                img_array = np.array(image)
                img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
                denoised = cv2.medianBlur(gray, 3)
                thresh = cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
                return Image.fromarray(thresh)
            except Exception as e:
                logger.error(f"Error during OpenCV preprocessing: {e}")
                return image

        elif SKIMAGE_AVAILABLE:
            logger.info("Using scikit-image for preprocessing.")
            try:
                # Convert PIL image to numpy array
                img_array = np.array(image)
                # Convert to grayscale
                # Type checker needs assurance that rgb2gray is callable
                if callable(rgb2gray):
                    gray_image = rgb2gray(img_array)
                else:
                    raise RuntimeError("scikit-image rgb2gray function is not available")
                
                # Apply noise reduction
                if callable(median):
                    denoised_image = median(gray_image)
                else:
                    raise RuntimeError("scikit-image median function is not available")
                
                # Apply Sauvola adaptive thresholding, which is excellent for text
                if callable(threshold_sauvola):
                    thresh = threshold_sauvola(denoised_image, window_size=15)
                else:
                    raise RuntimeError("scikit-image threshold_sauvola function is not available")
                
                # Convert boolean array to a binary image
                if callable(img_as_ubyte):
                    binary_image = img_as_ubyte(denoised_image > thresh)
                else:
                    raise RuntimeError("scikit-image img_as_ubyte function is not available")
                
                return Image.fromarray(binary_image)
            except Exception as e:
                logger.error(f"Error during scikit-image preprocessing: {e}")
                return image

        else:
            logger.warning("Using basic Pillow preprocessing as a fallback.")
            try:
                grayscale = image.convert('L')
                enhancer = ImageEnhance.Contrast(grayscale)
                contrast_enhanced = enhancer.enhance(1.5)
                sharpened = contrast_enhanced.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
                threshold = 128
                # Define explicit function for type checking compatibility
                def threshold_func(x):
                    return 0 if x < threshold else 255
                binary = sharpened.point(threshold_func, '1')
                return binary
            except Exception as e:
                logger.error(f"Error during Pillow preprocessing: {e}")
                return image

    def extract_text(self, image_data: bytes, tesseract_config: str = '--psm 3 -l eng') -> Optional[str]:
        """
        Extract text from image bytes using OCR.
        :param image_data: Byte representation of the image.
        :param tesseract_config: Configuration string for Tesseract (e.g., page segmentation mode).
        """
        if not image_data:
            logger.error("No image data provided")
            return None
            
        if len(image_data) > 10 * 1024 * 1024:  # 10MB limit
            logger.warning("Image size exceeds 10MB, may cause performance issues")
            
        if not PYTESSERACT_AVAILABLE or pytesseract is None:
            logger.error("Pytesseract not available, cannot perform OCR")
            return None
            
        try:
            image = Image.open(io.BytesIO(image_data))
            processed_image = self.preprocess_image(image)
            text = pytesseract.image_to_string(processed_image, config=tesseract_config)
            cleaned_text = text.strip()
            
            if cleaned_text:
                logger.info(f"Successfully extracted {len(cleaned_text)} characters from image")
            else:
                logger.info("OCR processing completed, but no text was found.")
            return cleaned_text
        except Exception as e:
            logger.error(f"Error during OCR processing: {e}")
            return None
    
    def extract_text_from_multiple_images(self, image_data_list: List[bytes], tesseract_config: str = '--psm 3 -l eng') -> Optional[str]:
        """
        Extract text from multiple images and concatenate results.
        :param image_data_list: A list of image bytes.
        :param tesseract_config: Configuration string for Tesseract.
        """
        if len(image_data_list) > self.max_pages:
            logger.warning(f"Received {len(image_data_list)} images, limiting to the configured max of {self.max_pages} pages")
            image_data_list = image_data_list[:self.max_pages]
        
        extracted_texts = []
        for i, image_data in enumerate(image_data_list):
            page_num = i + 1
            try:
                text = self.extract_text(image_data, tesseract_config=tesseract_config)
                if text:
                    extracted_texts.append(text)
                    logger.info(f"Successfully processed page {page_num}")
                else:
                    logger.warning(f"Failed to extract text from page {page_num}")
            except Exception as e:
                logger.error(f"Error processing page {page_num}: {e}")
        
        if extracted_texts:
            concatenated_text = "\n\n--- PAGE BREAK ---\n\n".join(extracted_texts)
            return concatenated_text
        else:
            logger.warning("Could not extract any text from the provided images.")
            return None

# Global instance with a configurable page limit
ocr_service = OCRService(max_pages=2)
