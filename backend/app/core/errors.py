from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(code)


def error_response(status: int, code: str, message: str, **kwargs) -> JSONResponse:
    return JSONResponse({"error": {"code": code, "message": message}}, status_code=status, **kwargs)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def application_error(request: Request, exc: ApiError):
        return error_response(exc.status_code, exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Pydantic errors contain raw input. Never serialize them or exception strings.
        return error_response(422, "VALIDATION_ERROR", "Revisa los datos enviados.")

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        if exc.status_code == 404:
            return error_response(404, "NOT_FOUND", "Recurso no encontrado.")
        return error_response(exc.status_code, "REQUEST_ERROR", "No se pudo procesar la solicitud.")

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception):
        return error_response(500, "INTERNAL_ERROR", "No se pudo completar la solicitud.")
