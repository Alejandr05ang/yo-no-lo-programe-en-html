import json
import logging
import time
from collections import OrderedDict

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.config import Settings
from app.core.errors import error_response

logger = logging.getLogger("tutorias.http")


class RequestSafetyMiddleware:
    """Single-worker fixed-window limits; no forwarded header or caller key is trusted."""

    def __init__(self, app: ASGIApp, settings: Settings):
        self.app = app
        self.settings = settings
        self.windows: OrderedDict[tuple[str, str], tuple[float, int]] = OrderedDict()

    def allow(self, scope: Scope) -> bool:
        now = time.monotonic()
        while self.windows:
            first = next(iter(self.windows))
            if self.windows[first][0] > now:
                break
            self.windows.popitem(last=False)
        client = scope.get("client")
        identity = client[0] if client else "unknown"
        group = "auth" if scope["path"].startswith("/api/auth/") else "api"
        key = (identity, group)
        limit = (
            self.settings.auth_rate_limit_per_minute
            if group == "auth"
            else self.settings.rate_limit_per_minute
        )
        expires, count = self.windows.get(key, (now + 60, 0))
        # Fail closed at capacity; do not evict active limits and make bypass possible.
        if key not in self.windows and len(self.windows) >= self.settings.rate_limit_max_clients:
            return False
        if count >= limit:
            return False
        self.windows[key] = (expires, count + 1)
        return True

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = time.monotonic()
        status = 500

        async def safe_send(message: Message):
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                message["headers"] = list(message.get("headers", [])) + [
                    (b"x-content-type-options", b"nosniff"),
                    (b"referrer-policy", b"no-referrer"),
                    (b"cache-control", b"no-store"),
                ]
            await send(message)

        try:
            if scope["path"].startswith("/api/") and not self.allow(scope):
                await error_response(
                    429,
                    "RATE_LIMITED",
                    "Intenta de nuevo en un minuto.",
                    headers={"Retry-After": "60"},
                )(scope, receive, safe_send)
                return
            headers = dict(scope.get("headers", []))
            declared = headers.get(b"content-length")
            if declared is not None:
                try:
                    length = int(declared)
                except ValueError:
                    length = -1
                if length < 0:
                    await error_response(400, "REQUEST_ERROR", "Solicitud inválida.")(
                        scope, receive, safe_send
                    )
                    return
                if length > self.settings.max_request_bytes:
                    await self.too_large(scope, receive, safe_send)
                    return
            chunks = []
            size = 0
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                chunk = message.get("body", b"")
                size += len(chunk)
                if size > self.settings.max_request_bytes:
                    await self.too_large(scope, receive, safe_send)
                    return
                chunks.append(chunk)
                if not message.get("more_body", False):
                    break
            body = b"".join(chunks)
            delivered = False

            async def replay():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": body, "more_body": False}
                return await receive()

            await self.app(scope, replay, safe_send)
        except Exception:
            logger.error("Exception in request", exc_info=True)
            # Catch before ServerErrorMiddleware can re-raise/log sensitive exception details.
            if status == 500:
                await error_response(500, "INTERNAL_ERROR", "No se pudo completar la solicitud.")(
                    scope, receive, safe_send
                )
            else:
                raise
        finally:
            route = scope.get("route")
            logger.info(
                json.dumps(
                    {
                        "event": "http_request",
                        "route": getattr(route, "path", "<unmatched>"),
                        "method": scope["method"],
                        "status": status,
                        "actor_id": scope.get("state", {}).get("actor_id"),
                        "duration_ms": round((time.monotonic() - started) * 1000, 2),
                    }
                )
            )

    async def too_large(self, scope: Scope, receive: Receive, send: Send):
        await error_response(413, "REQUEST_TOO_LARGE", "La solicitud supera el tamaño permitido.")(
            scope, receive, send
        )
