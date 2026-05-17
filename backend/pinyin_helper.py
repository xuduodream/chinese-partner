from pypinyin import pinyin, Style

def get_pinyin(text: str) -> str:
    """
    Convert Chinese text to pinyin with tone marks.
    Example: "你好" -> "nǐ hǎo"
    """
    result = pinyin(text, style=Style.TONE, heteronym=False)
    return ' '.join([item[0] for item in result])