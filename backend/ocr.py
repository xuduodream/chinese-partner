from rapidocr_onnxruntime import RapidOCR
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize once
logger.info("Initializing RapidOCR")
engine = RapidOCR()
logger.info("RapidOCR initialized successfully")


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

    try:
        # Run OCR on the image
        result, elapse = engine(image_path)

        logger.info(f"OCR completed, elapsed: {elapse}")

        if not result:
            logger.warning("OCR returned no text")
            return ""

        logger.info(f"OCR detected {len(result)} text regions")

        texts = []
        for box, text, confidence in result:
            logger.info(f"Text region: '{text}' (confidence: {confidence:.2f})")

            # Only include text with reasonable confidence
            if confidence > 0.3:  # Minimum confidence threshold
                texts.append(text)
            else:
                logger.warning(f"Low confidence text skipped: '{text}' ({confidence:.2f})")

        combined_text = "".join(texts)
        logger.info(f"Extracted {len(combined_text)} characters total: '{combined_text}'")
        return combined_text

    except Exception as e:
        logger.error(f"Error during OCR processing: {str(e)}")
        logger.exception("Full traceback:")
        return ""
