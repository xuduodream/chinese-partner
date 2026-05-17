from paddleocr import PaddleOCR
import logging
import os
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize once
logger.info("Initializing PaddleOCR with Chinese language support")
try:
    ocr = PaddleOCR(use_angle_cls=True, lang='ch')
    logger.info("PaddleOCR initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize PaddleOCR: {e}")
    raise

def extract_text_from_image(image_path: str) -> str:
    """
    Extract Chinese text from image file path.
    Returns concatenated text or empty string if none found.

    Supported image formats: JPEG, PNG, BMP, TIFF, GIF
    """
    logger.info(f"Starting OCR processing for image: {image_path}")

    # Check if file exists
    if not os.path.exists(image_path):
        logger.error(f"Image file not found: {image_path}")
        return ""

    # Check file size
    file_size = os.path.getsize(image_path)
    logger.info(f"Image file size: {file_size} bytes")

    # Check file extension
    file_ext = Path(image_path).suffix.lower()
    logger.info(f"Image file extension: {file_ext}")

    try:
        logger.info("Running PaddleOCR on image...")

        # Run OCR on the image
        result = ocr.ocr(image_path)

        logger.info(f"OCR result structure: {type(result)}")
        logger.info(f"Raw OCR result keys: {result[0].keys() if result else 'No result'}")

        if not result:
            logger.warning("OCR returned empty result")
            return ""

        # Handle new PaddleOCR result format (list of dictionaries)
        if isinstance(result, list) and len(result) > 0 and isinstance(result[0], dict):
            ocr_data = result[0]

            # Extract recognized texts from the new format
            if 'rec_texts' in ocr_data and 'rec_scores' in ocr_data:
                rec_texts = ocr_data['rec_texts']
                rec_scores = ocr_data['rec_scores']

                logger.info(f"OCR detected {len(rec_texts)} text regions")

                texts = []
                for i, (text, score) in enumerate(zip(rec_texts, rec_scores)):
                    logger.info(f"Text region {i+1}: '{text}' (confidence: {score:.2f})")

                    # Only include text with reasonable confidence
                    if score > 0.3:  # Minimum confidence threshold
                        texts.append(text)
                    else:
                        logger.warning(f"Low confidence text skipped: '{text}' ({score:.2f})")

                combined_text = "".join(texts)
                logger.info(f"Extracted {len(combined_text)} characters total: '{combined_text}'")
                return combined_text
            else:
                logger.warning(f"Missing 'rec_texts' or 'rec_scores' in result: {list(ocr_data.keys())}")
                return ""
        else:
            logger.warning(f"Unexpected result format: {type(result)}")
            return ""

    except Exception as e:
        logger.error(f"Error during OCR processing: {str(e)}")
        logger.exception("Full traceback:")
        return ""