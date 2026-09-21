import os
import re
from dataclasses import dataclass
from threading import Lock
from typing import Annotated, Protocol
from uuid import uuid4

import firebase_admin
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from firebase_admin import credentials as admin_credentials
from firebase_admin.exceptions import FirebaseError
from google.auth.exceptions import DefaultCredentialsError
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings
from app.core.errors import ApiError


@dataclass(frozen=True)
class FirebaseIdentity:
    uid: str
    email: str
    email_verified: bool
    provider: str


class TokenVerifier(Protocol):
    async def verify(self, token: str) -> FirebaseIdentity: ...


class FirebaseVerifier:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._app = None
        self._lock = Lock()

    async def verify(self, token: str) -> FirebaseIdentity:
        if os.environ.get("FIREBASE_AUTH_EMULATOR_HOST"):
            raise ApiError(
                503, "AUTH_EMULATOR_FORBIDDEN", "La autenticación real no está disponible."
            )
        if not self.settings.firebase_project_id:
            raise ApiError(
                503, "AUTH_NOT_CONFIGURED", "La autenticación todavía no está configurada."
            )
        return await run_in_threadpool(self._verify, token)

    def _get_app(self):
        with self._lock:
            if self._app is None:
                credential = (
                    admin_credentials.Certificate(self.settings.google_application_credentials)
                    if self.settings.google_application_credentials
                    else admin_credentials.ApplicationDefault()
                )
                self._app = firebase_admin.initialize_app(
                    credential,
                    options={"projectId": self.settings.firebase_project_id, "httpTimeout": 10},
                    name=f"tutorias-{uuid4()}",
                )
        return self._app

    def _verify(self, token: str) -> FirebaseIdentity:
        try:
            sdk_app = self._get_app()
            decoded = auth.verify_id_token(token, app=sdk_app, check_revoked=True)
        except auth.InvalidIdTokenError:
            raise ApiError(401, "INVALID_TOKEN", "Tu sesión venció o no es válida.") from None
        except auth.UserDisabledError:
            raise ApiError(403, "ACCOUNT_DISABLED", "Esta cuenta está desactivada.") from None
        except (DefaultCredentialsError, OSError):
            raise ApiError(
                503, "AUTH_NOT_CONFIGURED", "La autenticación todavía no está configurada."
            ) from None
        except FirebaseError:
            raise ApiError(
                503, "AUTH_SERVICE_UNAVAILABLE", "No se pudo verificar la sesión."
            ) from None
        except ValueError:
            # Configuration/SDK errors must not echo token or credential file details.
            raise ApiError(
                503, "AUTH_NOT_CONFIGURED", "La autenticación todavía no está configurada."
            ) from None
        project = self.settings.firebase_project_id
        uid = decoded.get("uid")
        email = decoded.get("email")
        firebase = decoded.get("firebase")
        if (
            not isinstance(uid, str)
            or not uid
            or len(uid) > 128
            or decoded.get("sub") != uid
            or decoded.get("aud") != project
            or decoded.get("iss") != f"https://securetoken.google.com/{project}"
            or not isinstance(email, str)
            or len(email) > 320
            or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)
            or not isinstance(firebase, dict)
            or not isinstance(firebase.get("sign_in_provider"), str)
        ):
            raise ApiError(401, "INVALID_TOKEN", "Tu sesión no tiene una identidad válida.")
        return FirebaseIdentity(
            uid=uid,
            email=email.strip().lower(),
            email_verified=decoded.get("email_verified") is True,
            provider=firebase["sign_in_provider"],
        )


def get_token_verifier(request: Request) -> TokenVerifier:
    return request.app.state.firebase_verifier


bearer = HTTPBearer(auto_error=False)


async def get_firebase_identity(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    verifier: Annotated[TokenVerifier, Depends(get_token_verifier)],
) -> FirebaseIdentity:
    if credentials is None or len(credentials.credentials) > 16384:
        raise ApiError(401, "AUTH_REQUIRED", "Inicia sesión para continuar.")
    return await verifier.verify(credentials.credentials)
