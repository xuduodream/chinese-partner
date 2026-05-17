import re
import jieba

def split_sentences(text: str) -> list:
    """
    Split Chinese text into sentences.
    Uses punctuation: 。！？； as sentence boundaries.
    """
    # Remove extra whitespace
    text = re.sub(r'\s+', '', text)

    # Split on sentence-ending punctuation
    sentences = re.split(r'([。！？；])', text)

    # Combine delimiter with its sentence
    result = []
    for i in range(0, len(sentences)-1, 2):
        if i+1 < len(sentences):
            result.append(sentences[i] + sentences[i+1])

    # Handle case without trailing punctuation
    if len(sentences) % 2 == 1 and sentences[-1]:
        result.append(sentences[-1])

    # Filter empty sentences
    result = [s.strip() for s in result if s.strip()]

    return result[:10]  # Limit to 10 sentences per image