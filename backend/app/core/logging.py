import logging


def configure_logging() -> None:
    """Only the sanitized application request logger gets a dedicated stderr handler."""
    logger = logging.getLogger("tutorias.http")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
