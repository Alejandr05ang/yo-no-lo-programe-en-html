import threading
from types import SimpleNamespace

import pytest
from firebase_admin import auth

from app.auth.firebase import FirebaseVerifier
from app.core.config import Settings
from app.core.errors import ApiError


def claims(**changes):
    return {
        "uid": "verified-uid",
        "sub": "verified-uid",
        "email": "Student@Example.Invalid",
        "email_verified": True,
        "aud": "test-project",
        "iss": "https://securetoken.google.com/test-project",
        "firebase": {"sign_in_provider": "password"},
        **changes,
    }


def verifier(monkeypatch, result):
    value = FirebaseVerifier(Settings(_env_file=None, firebase_project_id="test-project"))
    sdk_app = SimpleNamespace(project_id="test-project")
    monkeypatch.setattr(value, "_get_app", lambda: sdk_app, raising=False)
    main_thread = threading.get_ident()

    def verify_at_network_boundary(token, *, app, check_revoked):
        assert token == "id-token"
        assert app is sdk_app
        assert check_revoked is True
        assert threading.get_ident() != main_thread
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(auth, "verify_id_token", verify_at_network_boundary)
    return value


async def test_firebase_sdk_checks_revocation_off_event_loop(monkeypatch):
    identity = await verifier(monkeypatch, claims()).verify("id-token")
    assert identity.uid == "verified-uid"
    assert identity.email == "student@example.invalid"
    assert identity.email_verified is True
    assert identity.provider == "password"


@pytest.mark.parametrize(
    "error",
    [
        auth.InvalidIdTokenError("SECRET_SENTINEL"),
        auth.ExpiredIdTokenError("SECRET_SENTINEL", None),
        auth.RevokedIdTokenError("SECRET_SENTINEL"),
    ],
)
async def test_firebase_invalid_expired_revoked_tokens_are_sanitized(monkeypatch, error):
    with pytest.raises(ApiError) as raised:
        await verifier(monkeypatch, error).verify("id-token")
    assert raised.value.status_code == 401
    assert raised.value.code == "INVALID_TOKEN"
    assert "SECRET_SENTINEL" not in str(raised.value)


@pytest.mark.parametrize(
    "changes",
    [
        {"aud": "different-project"},
        {"iss": "https://securetoken.google.com/different-project"},
        {"uid": "different-subject"},
        {"email": None},
        {"uid": ""},
        {"firebase": None},
    ],
)
async def test_identity_claims_must_belong_to_configured_project(monkeypatch, changes):
    with pytest.raises(ApiError) as raised:
        await verifier(monkeypatch, claims(**changes)).verify("id-token")
    assert raised.value.status_code == 401


async def test_truthy_string_is_not_verified_email(monkeypatch):
    identity = await verifier(monkeypatch, claims(email_verified="true")).verify("id-token")
    assert identity.email_verified is False


async def test_certificate_outage_is_service_unavailable(monkeypatch):
    with pytest.raises(ApiError) as raised:
        await verifier(monkeypatch, auth.CertificateFetchError("SECRET_SENTINEL", None)).verify(
            "id-token"
        )
    assert raised.value.status_code == 503
    assert raised.value.code == "AUTH_SERVICE_UNAVAILABLE"


async def test_auth_emulator_is_never_accepted_as_real_authentication(monkeypatch):
    monkeypatch.setenv("FIREBASE_AUTH_EMULATOR_HOST", "localhost:9099")
    with pytest.raises(ApiError) as raised:
        await verifier(monkeypatch, claims()).verify("id-token")
    assert raised.value.status_code == 503
    assert raised.value.code == "AUTH_EMULATOR_FORBIDDEN"
