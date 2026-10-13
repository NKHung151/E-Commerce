from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


def error_response(message: str, status: int) -> Response:
    logger.warning(f'Error {status}: {message}')
    return Response({'error': message, 'code': status}, status=status)


def validation_error(errors: dict) -> Response:
    """400 with a readable message (shown by the frontend) plus the per-field errors."""
    field, messages = next(iter(errors.items()))
    message = messages[0] if isinstance(messages, list) and messages else messages
    readable = str(message) if field == 'non_field_errors' else f'{field}: {message}'
    logger.warning(f'Error 400: {readable}')
    return Response({'error': readable, 'code': 400, 'fields': errors}, status=400)
