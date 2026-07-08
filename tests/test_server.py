"""Unit tests for ``backend/server.py``.

``server.py`` was the least-covered backend module (0% before these tests): the
only pre-existing automated coverage was ``tests/test_stripe_config.py`` plus
``backend_test.py``, an integration script that hits a live preview deployment
and therefore never runs as part of the unit suite.

These tests exercise the module in isolation:
  * the real MongoDB client is replaced by an in-memory ``mongomock_motor`` DB,
  * the Stripe SDK and the outbound OAuth ``httpx`` call are monkeypatched,
so the pure helpers, Pydantic (de)serialisation, auth flow and every HTTP route
can be verified without any external services.
"""

import asyncio
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import backend.server as server


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture
def mock_db(monkeypatch):
    """Swap the module-level Motor database for a fresh in-memory mock."""
    db = AsyncMongoMockClient()["riffnecromancer_test"]
    monkeypatch.setattr(server, "db", db)
    return db


@pytest.fixture
def client(mock_db):
    """A FastAPI TestClient wired to the mocked database.

    ``dependency_overrides`` are cleared afterwards so tests stay isolated.
    """
    with TestClient(server.app) as c:
        yield c
    server.app.dependency_overrides.clear()


def _register(client, email="rocker@example.com", password="s3cret!", name=None):
    resp = client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": name},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


async def _make_premium(db, user_id, period="monthly", expires_in_days=30):
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "is_premium": True,
                "premium_period": period,
                "premium_expires_at": (
                    datetime.now(timezone.utc) + timedelta(days=expires_in_days)
                ).isoformat(),
            }
        },
    )


# --------------------------------------------------------------------------- #
# Pure helper functions
# --------------------------------------------------------------------------- #
def test_now_utc_iso_is_timezone_aware():
    parsed = datetime.fromisoformat(server.now_utc_iso())
    assert parsed.tzinfo is not None


def test_password_hash_roundtrip():
    hashed = server.hash_password("hunter2")
    assert hashed != "hunter2"
    assert server.verify_password("hunter2", hashed) is True
    assert server.verify_password("wrong", hashed) is False


def test_verify_password_handles_malformed_hash():
    assert server.verify_password("anything", "not-a-bcrypt-hash") is False


def test_create_jwt_is_decodable():
    token = server.create_jwt("user_abc")
    payload = jwt.decode(token, server.JWT_SECRET, algorithms=[server.JWT_ALGORITHM])
    assert payload["sub"] == "user_abc"
    assert payload["exp"] > payload["iat"]


def test_serialize_user_defaults_for_minimal_doc():
    user = server.serialize_user({"user_id": "u1", "email": "a@b.com"})
    assert user.user_id == "u1"
    assert user.is_premium is False
    assert user.onboarded is False
    assert user.accessibility == {}
    assert user.created_at  # falls back to now_utc_iso()


def test_serialize_user_preserves_fields():
    doc = {
        "user_id": "u2",
        "email": "c@d.com",
        "name": "Neo",
        "picture": "p.png",
        "is_premium": True,
        "premium_period": "annual",
        "premium_expires_at": "2099-01-01T00:00:00+00:00",
        "onboarded": True,
        "accessibility": {"high_contrast": True},
        "created_at": "2020-01-01T00:00:00+00:00",
    }
    user = server.serialize_user(doc)
    assert user.name == "Neo"
    assert user.is_premium is True
    assert user.premium_period == "annual"
    assert user.accessibility == {"high_contrast": True}


@pytest.mark.parametrize(
    "is_premium_lesson,user,expected_locked",
    [
        (True, None, True),
        (True, {"is_premium": False}, True),
        (True, {"is_premium": True}, False),
        (False, None, False),
        (False, {"is_premium": False}, False),
    ],
)
def test_lesson_dict_to_response_lock_logic(is_premium_lesson, user, expected_locked):
    lesson = {"id": "x", "is_premium": is_premium_lesson, "title": "T"}
    resp = server.lesson_dict_to_response(lesson, user)
    assert resp["locked"] is expected_locked
    assert resp["id"] == "x"  # original fields preserved


# --------------------------------------------------------------------------- #
# Static catalog / package integrity
# --------------------------------------------------------------------------- #
def test_subscription_packages_shape():
    assert set(server.SUBSCRIPTION_PACKAGES) == {"monthly", "annual"}
    for pkg in server.SUBSCRIPTION_PACKAGES.values():
        assert {"amount", "currency", "period", "label"} <= set(pkg)
        assert pkg["amount"] > 0


def test_lesson_catalog_ids_unique_and_well_formed():
    ids = [lsn["id"] for lsn in server.LESSON_CATALOG]
    assert len(ids) == len(set(ids))
    for lsn in server.LESSON_CATALOG:
        assert lsn["category"] in {"guitar", "vocal"}
        assert {"title", "level", "genre", "is_premium", "tab_pattern"} <= set(lsn)


def test_tone_presets_ids_unique_and_have_params():
    ids = [p["id"] for p in server.TONE_PRESETS]
    assert len(ids) == len(set(ids))
    for p in server.TONE_PRESETS:
        assert "gain" in p["params"]


# --------------------------------------------------------------------------- #
# Health & packages routes
# --------------------------------------------------------------------------- #
def test_health_root(client):
    body = client.get("/api/").json()
    assert body["app"] == "RiffNecromancer"
    assert body["status"] == "ok"


def test_packages_route(client):
    body = client.get("/api/payments/packages").json()
    ids = {p["id"] for p in body}
    assert ids == {"monthly", "annual"}


# --------------------------------------------------------------------------- #
# Auth: register / login / me / logout
# --------------------------------------------------------------------------- #
def test_register_returns_token_and_user(client):
    data = _register(client)
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["user"]["email"] == "rocker@example.com"
    # default name is derived from the email local-part
    assert data["user"]["name"] == "rocker"


def test_register_duplicate_email_rejected(client):
    _register(client)
    resp = client.post(
        "/api/auth/register",
        json={"email": "rocker@example.com", "password": "another"},
    )
    assert resp.status_code == 400


def test_register_validates_short_password(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "x@y.com", "password": "123"},
    )
    assert resp.status_code == 422


def test_login_success_and_failures(client):
    _register(client, email="login@example.com", password="goodpass")
    ok = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "goodpass"},
    )
    assert ok.status_code == 200
    assert ok.json()["access_token"]

    bad_pw = client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "nope"},
    )
    assert bad_pw.status_code == 401

    missing = client.post(
        "/api/auth/login",
        json={"email": "ghost@example.com", "password": "whatever"},
    )
    assert missing.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_jwt_bearer(client):
    data = _register(client)
    resp = client.get("/api/auth/me", headers=_auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert resp.json()["email"] == "rocker@example.com"


def test_me_with_invalid_bearer(client):
    resp = client.get("/api/auth/me", headers=_auth_header("garbage.token.value"))
    assert resp.status_code == 401


def test_logout_clears_cookie(client, mock_db):
    async def _seed():
        await mock_db.user_sessions.insert_one(
            {
                "session_token": "tok123",
                "user_id": "u1",
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(days=1)
                ).isoformat(),
            }
        )

    asyncio.get_event_loop().run_until_complete(_seed())
    client.cookies.set("session_token", "tok123")
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


# --------------------------------------------------------------------------- #
# Cookie / bearer session-token auth path
# --------------------------------------------------------------------------- #
def test_me_with_session_cookie(client, mock_db):
    data = _register(client)
    uid = data["user"]["user_id"]

    async def _seed():
        await mock_db.user_sessions.insert_one(
            {
                "session_token": "cookie-token",
                "user_id": uid,
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(days=1)
                ).isoformat(),
            }
        )

    asyncio.get_event_loop().run_until_complete(_seed())

    client.cookies.set("session_token", "cookie-token")
    resp = client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["user_id"] == uid


def test_expired_session_token_is_rejected(client, mock_db):
    data = _register(client)
    uid = data["user"]["user_id"]

    async def _seed():
        await mock_db.user_sessions.insert_one(
            {
                "session_token": "expired-token",
                "user_id": uid,
                "expires_at": (
                    datetime.now(timezone.utc) - timedelta(days=1)
                ).isoformat(),
            }
        )

    asyncio.get_event_loop().run_until_complete(_seed())

    client.cookies.set("session_token", "expired-token")
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


# --------------------------------------------------------------------------- #
# Onboarding & accessibility
# --------------------------------------------------------------------------- #
def test_onboard_updates_profile(client):
    token = _register(client)["access_token"]
    resp = client.post(
        "/api/profile/onboard",
        json={
            "skill_level": "beginner",
            "goals": ["speed"],
            "accessibility": {"large_text": True},
        },
        headers=_auth_header(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["onboarded"] is True
    assert body["accessibility"] == {"large_text": True}


def test_onboard_requires_auth(client):
    assert client.post("/api/profile/onboard", json={}).status_code == 401


def test_update_accessibility(client):
    token = _register(client)["access_token"]
    resp = client.post(
        "/api/profile/accessibility",
        json={"high_contrast": True, "reduce_motion": False},
        headers=_auth_header(token),
    )
    assert resp.status_code == 200
    assert resp.json()["accessibility"]["high_contrast"] is True


# --------------------------------------------------------------------------- #
# Lessons
# --------------------------------------------------------------------------- #
def test_list_lessons_anonymous_locks_premium(client):
    lessons = client.get("/api/lessons").json()
    assert len(lessons) == len(server.LESSON_CATALOG)
    by_id = {lsn["id"]: lsn for lsn in lessons}
    assert by_id["intro-drop-d"]["locked"] is False  # free
    assert by_id["dissonant-intervals"]["locked"] is True  # premium


def test_list_lessons_category_filter(client):
    vocal = client.get("/api/lessons", params={"category": "vocal"}).json()
    assert vocal
    assert all(lsn["category"] == "vocal" for lsn in vocal)


def test_list_lessons_premium_user_unlocked(client, mock_db):
    data = _register(client)
    asyncio.get_event_loop().run_until_complete(
        _make_premium(mock_db, data["user"]["user_id"])
    )
    lessons = client.get(
        "/api/lessons", headers=_auth_header(data["access_token"])
    ).json()
    assert all(lsn["locked"] is False for lsn in lessons)


def test_get_free_lesson_returns_tab_pattern(client):
    lesson = client.get("/api/lessons/intro-drop-d").json()
    assert lesson["locked"] is False
    assert lesson["tab_pattern"]  # non-empty


def test_get_locked_premium_lesson_strips_tab_pattern(client):
    lesson = client.get("/api/lessons/dissonant-intervals").json()
    assert lesson["locked"] is True
    assert lesson["tab_pattern"] == []


def test_get_unknown_lesson_404(client):
    assert client.get("/api/lessons/does-not-exist").status_code == 404


# --------------------------------------------------------------------------- #
# Tone presets
# --------------------------------------------------------------------------- #
def test_tone_presets_lock_and_filter(client):
    presets = client.get("/api/tone/presets").json()
    assert any(p["locked"] for p in presets)
    metal = client.get("/api/tone/presets", params={"genre": "Metal"}).json()
    assert metal and all(p["genre"] == "Metal" for p in metal)
    all_genre = client.get("/api/tone/presets", params={"genre": "all"}).json()
    assert len(all_genre) == len(server.TONE_PRESETS)


# --------------------------------------------------------------------------- #
# Sessions logging & history
# --------------------------------------------------------------------------- #
def test_log_session_free_lesson(client):
    token = _register(client)["access_token"]
    resp = client.post(
        "/api/sessions",
        json={"lesson_id": "intro-drop-d", "duration_seconds": 120},
        headers=_auth_header(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["lesson_title"] == "Intro to Drop D"


def test_log_session_requires_auth(client):
    resp = client.post(
        "/api/sessions",
        json={"lesson_id": "intro-drop-d", "duration_seconds": 60},
    )
    assert resp.status_code == 401


def test_log_session_unknown_lesson_404(client):
    token = _register(client)["access_token"]
    resp = client.post(
        "/api/sessions",
        json={"lesson_id": "nope", "duration_seconds": 60},
        headers=_auth_header(token),
    )
    assert resp.status_code == 404


def test_log_premium_lesson_as_free_user_402(client):
    token = _register(client)["access_token"]
    resp = client.post(
        "/api/sessions",
        json={"lesson_id": "dissonant-intervals", "duration_seconds": 60},
        headers=_auth_header(token),
    )
    assert resp.status_code == 402


def test_list_sessions_returns_logged_entries(client):
    token = _register(client)["access_token"]
    for _ in range(2):
        client.post(
            "/api/sessions",
            json={"lesson_id": "intro-drop-d", "duration_seconds": 90},
            headers=_auth_header(token),
        )
    sessions = client.get("/api/sessions", headers=_auth_header(token)).json()
    assert len(sessions) == 2
    assert all(s["lesson_id"] == "intro-drop-d" for s in sessions)


# --------------------------------------------------------------------------- #
# Calendar & progress
# --------------------------------------------------------------------------- #
def test_calendar_invalid_month(client):
    token = _register(client)["access_token"]
    resp = client.get(
        "/api/history/calendar",
        params={"year": 2024, "month": 13},
        headers=_auth_header(token),
    )
    assert resp.status_code == 400


def test_calendar_aggregates_sessions(client):
    token = _register(client)["access_token"]
    client.post(
        "/api/sessions",
        json={"lesson_id": "intro-drop-d", "duration_seconds": 600},
        headers=_auth_header(token),
    )
    now = datetime.now(timezone.utc)
    resp = client.get(
        "/api/history/calendar",
        params={"year": now.year, "month": now.month},
        headers=_auth_header(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["stats"]["total_sessions"] == 1
    assert body["stats"]["current_streak"] >= 1
    assert len(body["days"]) == 1


def test_progress_altar_structure(client):
    token = _register(client)["access_token"]
    client.post(
        "/api/sessions",
        json={"lesson_id": "intro-drop-d", "duration_seconds": 120, "completed": True},
        headers=_auth_header(token),
    )
    body = client.get("/api/progress/altar", headers=_auth_header(token)).json()
    assert body["summary"]["total"] == len(server.LESSON_CATALOG)
    assert body["summary"]["completed"] == 1
    assert len(body["timeline"]) == 14
    assert "guitar" in body["by_category"]
    assert len(body["lessons"]) == len(server.LESSON_CATALOG)


# --------------------------------------------------------------------------- #
# Stripe checkout / status / webhook
# --------------------------------------------------------------------------- #
class _FakeCheckoutSession:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def test_create_checkout_invalid_package(client):
    token = _register(client)["access_token"]
    resp = client.post(
        "/api/payments/checkout",
        json={"package_id": "lifetime", "origin_url": "https://app.test"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 400


def test_create_checkout_success(client, monkeypatch, mock_db):
    token = _register(client)["access_token"]

    def fake_create(**kwargs):
        assert kwargs["mode"] == "payment"
        return _FakeCheckoutSession(id="cs_test_1", url="https://stripe.test/cs_test_1")

    monkeypatch.setattr(server.stripe.checkout.Session, "create", fake_create)
    resp = client.post(
        "/api/payments/checkout",
        json={"package_id": "monthly", "origin_url": "https://app.test/"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["session_id"] == "cs_test_1"
    assert body["url"].endswith("cs_test_1")

    # a transaction record must have been persisted
    tx = asyncio.get_event_loop().run_until_complete(
        mock_db.payment_transactions.find_one({"session_id": "cs_test_1"})
    )
    assert tx is not None
    assert tx["payment_status"] == "initiated"


def test_create_checkout_stripe_error_502(client, monkeypatch):
    token = _register(client)["access_token"]

    def boom(**kwargs):
        raise RuntimeError("stripe down")

    monkeypatch.setattr(server.stripe.checkout.Session, "create", boom)
    resp = client.post(
        "/api/payments/checkout",
        json={"package_id": "annual", "origin_url": "https://app.test"},
        headers=_auth_header(token),
    )
    assert resp.status_code == 502


def test_payment_status_not_found(client):
    token = _register(client)["access_token"]
    resp = client.get("/api/payments/status/unknown", headers=_auth_header(token))
    assert resp.status_code == 404


def test_payment_status_forbidden_for_other_user(client, mock_db):
    token = _register(client, email="owner@example.com")["access_token"]

    async def _seed():
        await mock_db.payment_transactions.insert_one(
            {
                "session_id": "cs_other",
                "user_id": "someone-else",
                "period": "monthly",
                "premium_granted": False,
            }
        )

    asyncio.get_event_loop().run_until_complete(_seed())

    resp = client.get("/api/payments/status/cs_other", headers=_auth_header(token))
    assert resp.status_code == 403


def test_payment_status_grants_premium_when_paid(client, monkeypatch, mock_db):
    data = _register(client, email="buyer@example.com")
    token = data["access_token"]
    uid = data["user"]["user_id"]

    async def _seed():
        await mock_db.payment_transactions.insert_one(
            {
                "session_id": "cs_paid",
                "user_id": uid,
                "period": "monthly",
                "premium_granted": False,
            }
        )

    asyncio.get_event_loop().run_until_complete(_seed())

    def fake_retrieve(session_id):
        return _FakeCheckoutSession(
            payment_status="paid",
            status="complete",
            amount_total=700,
            currency="usd",
        )

    monkeypatch.setattr(server.stripe.checkout.Session, "retrieve", fake_retrieve)
    resp = client.get("/api/payments/status/cs_paid", headers=_auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["premium_granted"] is True

    user = asyncio.get_event_loop().run_until_complete(
        mock_db.users.find_one({"user_id": uid})
    )
    assert user["is_premium"] is True
    assert user["premium_period"] == "monthly"


def test_payment_status_stripe_error_502(client, monkeypatch, mock_db):
    data = _register(client, email="err@example.com")
    token = data["access_token"]
    uid = data["user"]["user_id"]

    async def _seed():
        await mock_db.payment_transactions.insert_one(
            {
                "session_id": "cs_err",
                "user_id": uid,
                "period": "monthly",
                "premium_granted": False,
            }
        )

    asyncio.get_event_loop().run_until_complete(_seed())

    def boom(session_id):
        raise RuntimeError("nope")

    monkeypatch.setattr(server.stripe.checkout.Session, "retrieve", boom)
    resp = client.get("/api/payments/status/cs_err", headers=_auth_header(token))
    assert resp.status_code == 502


def test_webhook_not_configured(client, monkeypatch):
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    resp = client.post("/api/webhook/stripe", content=b"{}")
    assert resp.status_code == 500


def test_webhook_bad_signature(client, monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test")

    def bad_construct(body, sig, secret):
        raise ValueError("bad sig")

    monkeypatch.setattr(server.stripe.Webhook, "construct_event", bad_construct)
    resp = client.post(
        "/api/webhook/stripe", content=b"{}", headers={"Stripe-Signature": "x"}
    )
    assert resp.status_code == 400


def test_webhook_paid_grants_premium(client, monkeypatch, mock_db):
    data = _register(client, email="hook@example.com")
    uid = data["user"]["user_id"]

    async def _seed():
        await mock_db.payment_transactions.insert_one(
            {
                "session_id": "cs_hook",
                "user_id": uid,
                "period": "annual",
                "premium_granted": False,
            }
        )

    asyncio.get_event_loop().run_until_complete(_seed())

    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test")

    def construct(body, sig, secret):
        return {
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_hook", "payment_status": "paid"}},
        }

    monkeypatch.setattr(server.stripe.Webhook, "construct_event", construct)
    resp = client.post(
        "/api/webhook/stripe", content=b"{}", headers={"Stripe-Signature": "x"}
    )
    assert resp.status_code == 200
    assert resp.json()["event"] == "checkout.session.completed"

    user = asyncio.get_event_loop().run_until_complete(
        mock_db.users.find_one({"user_id": uid})
    )
    assert user["is_premium"] is True
    assert user["premium_period"] == "annual"


# --------------------------------------------------------------------------- #
# premium_required dependency (not attached to any route directly)
# --------------------------------------------------------------------------- #
def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def test_premium_required_allows_active_premium():
    user = {
        "is_premium": True,
        "premium_expires_at": (
            datetime.now(timezone.utc) + timedelta(days=5)
        ).isoformat(),
    }
    assert _run(server.premium_required(user)) is user


def test_premium_required_rejects_non_premium():
    with pytest.raises(server.HTTPException) as exc:
        _run(server.premium_required({"is_premium": False}))
    assert exc.value.status_code == 402


def test_premium_required_rejects_expired():
    user = {
        "is_premium": True,
        "premium_expires_at": (
            datetime.now(timezone.utc) - timedelta(days=1)
        ).isoformat(),
    }
    with pytest.raises(server.HTTPException) as exc:
        _run(server.premium_required(user))
    assert exc.value.status_code == 402


# --------------------------------------------------------------------------- #
# OAuth session exchange
# --------------------------------------------------------------------------- #
class _FakeResp:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class _FakeAsyncClient:
    """Stand-in for ``httpx.AsyncClient`` used by ``oauth_session``."""

    response = None
    raise_exc = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url, headers=None):
        if _FakeAsyncClient.raise_exc:
            raise _FakeAsyncClient.raise_exc
        return _FakeAsyncClient.response


@pytest.fixture
def fake_oauth(monkeypatch):
    _FakeAsyncClient.response = None
    _FakeAsyncClient.raise_exc = None
    monkeypatch.setattr(server.httpx, "AsyncClient", _FakeAsyncClient)
    return _FakeAsyncClient


def test_oauth_session_requires_session_id(client, fake_oauth):
    resp = client.post("/api/auth/oauth/session", json={"session_id": ""})
    assert resp.status_code == 400


def test_oauth_session_provider_rejects(client, fake_oauth):
    fake_oauth.response = _FakeResp(401, {})
    resp = client.post("/api/auth/oauth/session", json={"session_id": "sid"})
    assert resp.status_code == 401


def test_oauth_session_provider_exception_502(client, fake_oauth):
    fake_oauth.raise_exc = RuntimeError("network down")
    resp = client.post("/api/auth/oauth/session", json={"session_id": "sid"})
    assert resp.status_code == 502


def test_oauth_session_incomplete_payload_502(client, fake_oauth):
    fake_oauth.response = _FakeResp(200, {"email": "no-token@example.com"})
    resp = client.post("/api/auth/oauth/session", json={"session_id": "sid"})
    assert resp.status_code == 502


def test_oauth_session_creates_new_user(client, fake_oauth, mock_db):
    fake_oauth.response = _FakeResp(
        200,
        {
            "email": "oauth@example.com",
            "name": "OAuth User",
            "picture": "pic.png",
            "session_token": "sess-abc",
        },
    )
    resp = client.post("/api/auth/oauth/session", json={"session_id": "sid"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["user"]["email"] == "oauth@example.com"

    user = _run(mock_db.users.find_one({"email": "oauth@example.com"}))
    assert user["auth_provider"] == "google"


def test_oauth_session_updates_existing_user(client, fake_oauth, mock_db):
    _register(client, email="oauth2@example.com")
    fake_oauth.response = _FakeResp(
        200,
        {
            "email": "oauth2@example.com",
            "name": "Renamed",
            "picture": "new.png",
            "session_token": "sess-def",
        },
    )
    resp = client.post("/api/auth/oauth/session", json={"session_id": "sid"})
    assert resp.status_code == 200

    user = _run(mock_db.users.find_one({"email": "oauth2@example.com"}))
    assert user["name"] == "Renamed"
    assert user["picture"] == "new.png"


# --------------------------------------------------------------------------- #
# get_user_by_session_token edge cases & bearer-as-session auth
# --------------------------------------------------------------------------- #
def test_get_user_by_session_token_variants(mock_db):
    _run(mock_db.users.insert_one({"user_id": "uX", "email": "x@e.com"}))

    # missing session -> None
    assert _run(server.get_user_by_session_token("nope")) is None

    # unparseable string expiry -> None
    _run(
        mock_db.user_sessions.insert_one(
            {"session_token": "bad-exp", "user_id": "uX", "expires_at": "not-a-date"}
        )
    )
    assert _run(server.get_user_by_session_token("bad-exp")) is None

    # naive (tz-less) future expiry is treated as UTC -> user returned
    future_naive = (
        (datetime.now(timezone.utc) + timedelta(days=1))
        .replace(tzinfo=None)
        .isoformat()
    )
    _run(
        mock_db.user_sessions.insert_one(
            {"session_token": "naive-exp", "user_id": "uX", "expires_at": future_naive}
        )
    )
    user = _run(server.get_user_by_session_token("naive-exp"))
    assert user is not None and user["user_id"] == "uX"


def test_me_with_bearer_session_token(client, mock_db):
    data = _register(client, email="bearer@example.com")
    uid = data["user"]["user_id"]
    _run(
        mock_db.user_sessions.insert_one(
            {
                "session_token": "bearer-sess",
                "user_id": uid,
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(days=1)
                ).isoformat(),
            }
        )
    )
    resp = client.get("/api/auth/me", headers=_auth_header("bearer-sess"))
    assert resp.status_code == 200
    assert resp.json()["user_id"] == uid


# --------------------------------------------------------------------------- #
# premium_required tolerates unparseable expiry
# --------------------------------------------------------------------------- #
def test_premium_required_ignores_bad_expiry():
    user = {"is_premium": True, "premium_expires_at": "not-a-real-date"}
    assert _run(server.premium_required(user)) is user


# --------------------------------------------------------------------------- #
# Calendar / progress tolerate malformed and gap-day data
# --------------------------------------------------------------------------- #
def test_calendar_current_streak_from_yesterday(client, mock_db):
    data = _register(client, email="streak@example.com")
    token = data["access_token"]
    uid = data["user"]["user_id"]
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    _run(
        mock_db.sessions.insert_one(
            {
                "session_id": "s1",
                "user_id": uid,
                "lesson_id": "intro-drop-d",
                "lesson_title": "Intro to Drop D",
                "duration_seconds": 100,
                "completed": True,
                "created_at": yesterday.isoformat(),
            }
        )
    )
    now = datetime.now(timezone.utc)
    body = client.get(
        "/api/history/calendar",
        params={"year": now.year, "month": now.month},
        headers=_auth_header(token),
    ).json()
    assert body["stats"]["current_streak"] == 1


def test_calendar_and_altar_skip_bad_timestamps(client, mock_db):
    data = _register(client, email="bad@example.com")
    token = data["access_token"]
    uid = data["user"]["user_id"]
    _run(
        mock_db.sessions.insert_one(
            {
                "session_id": "sbad",
                "user_id": uid,
                "lesson_id": "intro-drop-d",
                "lesson_title": "Intro to Drop D",
                "duration_seconds": 100,
                "completed": True,
                "created_at": "totally-not-a-date",
            }
        )
    )
    now = datetime.now(timezone.utc)
    cal = client.get(
        "/api/history/calendar",
        params={"year": now.year, "month": now.month},
        headers=_auth_header(token),
    ).json()
    assert cal["stats"]["total_sessions"] == 0

    altar = client.get("/api/progress/altar", headers=_auth_header(token)).json()
    # completed_ids still counts it (no date parsing there), timeline ignores it
    assert all(day["sessions"] == 0 for day in altar["timeline"])


# --------------------------------------------------------------------------- #
# Demo user seeding & startup hook
# --------------------------------------------------------------------------- #
def test_seed_demo_users_skipped_without_passwords(mock_db, monkeypatch):
    monkeypatch.delenv("DEMO_PREMIUM_PASSWORD", raising=False)
    monkeypatch.delenv("DEMO_FREE_PASSWORD", raising=False)
    _run(server.seed_demo_users())
    assert _run(mock_db.users.count_documents({})) == 0


def test_seed_demo_users_creates_and_syncs(mock_db, monkeypatch):
    monkeypatch.setenv("DEMO_PREMIUM_PASSWORD", "premiumpw")
    monkeypatch.setenv("DEMO_FREE_PASSWORD", "freepw")

    _run(server.seed_demo_users())
    premium = _run(mock_db.users.find_one({"email": "demo@riffnecromancer.com"}))
    free = _run(mock_db.users.find_one({"email": "free@riffnecromancer.com"}))
    assert premium["is_premium"] is True
    assert free["is_premium"] is False

    # second run hits the "already exists" branch without duplicating
    _run(server.seed_demo_users())
    assert _run(mock_db.users.count_documents({})) == 2


def test_on_startup_seeds_when_enabled(mock_db, monkeypatch):
    monkeypatch.setenv("SEED_DEMO_USERS", "true")
    monkeypatch.setenv("DEMO_PREMIUM_PASSWORD", "premiumpw")
    monkeypatch.setenv("DEMO_FREE_PASSWORD", "freepw")
    _run(server.on_startup())
    assert _run(mock_db.users.count_documents({})) == 2


def test_on_startup_noop_when_disabled(mock_db, monkeypatch):
    monkeypatch.delenv("SEED_DEMO_USERS", raising=False)
    _run(server.on_startup())
    assert _run(mock_db.users.count_documents({})) == 0


# --------------------------------------------------------------------------- #
# Additional branch coverage
# --------------------------------------------------------------------------- #
def test_premium_required_naive_future_expiry():
    user = {
        "is_premium": True,
        "premium_expires_at": (datetime.now(timezone.utc) + timedelta(days=5))
        .replace(tzinfo=None)
        .isoformat(),
    }
    assert _run(server.premium_required(user)) is user


def test_calendar_handles_naive_timestamp(client, mock_db):
    data = _register(client, email="naive@example.com")
    token = data["access_token"]
    uid = data["user"]["user_id"]
    now = datetime.now(timezone.utc)
    _run(
        mock_db.sessions.insert_one(
            {
                "session_id": "sn",
                "user_id": uid,
                "lesson_id": "intro-drop-d",
                "lesson_title": "Intro to Drop D",
                "duration_seconds": 100,
                "completed": True,
                "created_at": now.replace(tzinfo=None).isoformat(),
            }
        )
    )
    body = client.get(
        "/api/history/calendar",
        params={"year": now.year, "month": now.month},
        headers=_auth_header(token),
    ).json()
    assert body["stats"]["total_sessions"] == 1


def test_calendar_longest_streak_with_gap(client, mock_db):
    data = _register(client, email="gap@example.com")
    token = data["access_token"]
    uid = data["user"]["user_id"]
    now = datetime.now(timezone.utc)
    for offset in (10, 5):  # two non-adjacent days -> streak resets between them
        d = now - timedelta(days=offset)
        _run(
            mock_db.sessions.insert_one(
                {
                    "session_id": f"g{offset}",
                    "user_id": uid,
                    "lesson_id": "intro-drop-d",
                    "lesson_title": "Intro to Drop D",
                    "duration_seconds": 100,
                    "completed": True,
                    "created_at": d.isoformat(),
                }
            )
        )
    body = client.get(
        "/api/history/calendar",
        params={"year": now.year, "month": now.month},
        headers=_auth_header(token),
    ).json()
    assert body["stats"]["longest_streak"] == 1
    assert body["stats"]["current_streak"] == 0


def test_calendar_current_streak_spans_multiple_days(client, mock_db):
    data = _register(client, email="multi@example.com")
    token = data["access_token"]
    uid = data["user"]["user_id"]
    now = datetime.now(timezone.utc)
    for offset in (1, 2):  # yesterday and the day before, nothing today
        d = now - timedelta(days=offset)
        _run(
            mock_db.sessions.insert_one(
                {
                    "session_id": f"m{offset}",
                    "user_id": uid,
                    "lesson_id": "intro-drop-d",
                    "lesson_title": "Intro to Drop D",
                    "duration_seconds": 100,
                    "completed": True,
                    "created_at": d.isoformat(),
                }
            )
        )
    body = client.get(
        "/api/history/calendar",
        params={"year": now.year, "month": now.month},
        headers=_auth_header(token),
    ).json()
    assert body["stats"]["current_streak"] == 2


def test_seed_demo_users_syncs_premium_flag(mock_db, monkeypatch):
    # pre-existing premium demo account stored as non-premium
    _run(
        mock_db.users.insert_one(
            {
                "user_id": "existing-demo",
                "email": "demo@riffnecromancer.com",
                "is_premium": False,
            }
        )
    )
    monkeypatch.setenv("DEMO_PREMIUM_PASSWORD", "premiumpw")
    monkeypatch.setenv("DEMO_FREE_PASSWORD", "freepw")
    _run(server.seed_demo_users())
    updated = _run(mock_db.users.find_one({"email": "demo@riffnecromancer.com"}))
    assert updated["is_premium"] is True
    assert updated["premium_period"] == "annual"


def test_on_startup_swallows_seed_errors(mock_db, monkeypatch):
    monkeypatch.setenv("SEED_DEMO_USERS", "1")

    async def boom():
        raise RuntimeError("seed failed")

    monkeypatch.setattr(server, "seed_demo_users", boom)
    # must not raise despite the seeding failure
    _run(server.on_startup())
