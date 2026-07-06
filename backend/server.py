"""
RiffNecromancer Backend
- FastAPI + Motor (MongoDB)
- Auth: email/password (JWT bearer) AND Emergent Google OAuth (session_token cookie)
- Lessons catalog, practice session logging, calendar aggregation, progress altar
- Stripe subscription checkout + status polling via the official `stripe` SDK
- Premium gating middleware
"""
from __future__ import annotations

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any

import bcrypt
import jwt
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status, Cookie, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

import stripe

try:
    from .stripe_config import get_stripe_api_key, get_stripe_lookup_key
except ImportError:  # pragma: no cover - allows running server.py directly
    from stripe_config import get_stripe_api_key, get_stripe_lookup_key

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("riffnecromancer")

# ---------- Env ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
# JWT_SECRET and the Stripe keys must come from the environment.
# This avoids shipping hardcoded secrets or silently falling back to test keys.
try:
    JWT_SECRET = os.environ["JWT_SECRET"]
except KeyError as e:
    raise RuntimeError(
        f"Missing required env var {e}. Refusing to start with a fallback "
        "secret — set this in the environment (see backend/.env.example)."
    ) from e
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
STRIPE_API_KEY = get_stripe_api_key()
stripe.api_key = STRIPE_API_KEY
STRIPE_LOOKUP_KEY = get_stripe_lookup_key("monthly")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------- Subscription Packages (server-side, never trust client) ----------
SUBSCRIPTION_PACKAGES: Dict[str, Dict[str, Any]] = {
    "monthly": {"amount": 7.00, "currency": "usd", "period": "monthly", "label": "Premium Monthly"},
    "annual": {"amount": 59.00, "currency": "usd", "period": "annual", "label": "Premium Annual"},
}

# ---------- Lesson Catalog ----------
LESSON_CATALOG: List[Dict[str, Any]] = [
    # FREE
    {
        "id": "intro-drop-d", "title": "Intro to Drop D", "category": "guitar",
        "level": "Beginner", "genre": "Foundational", "bpm": 60, "is_premium": False,
        "description": "Re-tune the low E string down a whole step. Learn the open D power chord and the geometry of the new tuning.",
        "focus": "Tuning, open power chords, hand position",
        "duration_minutes": 10,
        "tab_pattern": ["D5", "D5", "REST", "D5", "D5", "D5", "REST", "D5"],
    },
    {
        "id": "heavy-chugging", "title": "Heavy Chugging", "category": "guitar",
        "level": "Beginner", "genre": "Metal", "bpm": 100, "is_premium": False,
        "description": "Tight palm-muted low-D chug with 8th-note discipline. Foundation of metal rhythm.",
        "focus": "Palm muting, 8th-note timing, picking endurance",
        "duration_minutes": 12,
        "tab_pattern": ["D5pm", "D5pm", "D5pm", "D5pm", "D5pm", "D5pm", "D5pm", "D5pm"],
    },
    {
        "id": "suspended-atmosphere", "title": "Suspended Atmosphere", "category": "guitar",
        "level": "Beginner", "genre": "Alt-Rock", "bpm": 75, "is_premium": False,
        "description": "Dreamy Sus2 and Sus4 chord progressions using open strings and arpeggios to create mood.",
        "focus": "Sus2/Sus4 voicings, arpeggios, open-string ringing",
        "duration_minutes": 12,
        "tab_pattern": ["Dsus2", "Dsus4", "Dsus2", "D5", "Dsus4", "Dsus2", "REST", "D5"],
    },
    # PREMIUM
    {
        "id": "dissonant-intervals", "title": "Dissonant Intervals", "category": "guitar",
        "level": "Intermediate", "genre": "Grunge", "bpm": 95, "is_premium": True,
        "description": "Minor 2nds and tritones layered on top of low-D pedal tones to establish tense grunge chord variations.",
        "focus": "Tritones, minor 2nds, grunge harmony",
        "duration_minutes": 14,
        "tab_pattern": ["D5", "Eb5", "D5", "Ab5", "D5", "Eb5", "D5", "Ab5"],
    },
    {
        "id": "chromatic-descent", "title": "Chromatic Descent", "category": "guitar",
        "level": "Advanced", "genre": "Metal", "bpm": 130, "is_premium": True,
        "description": "High-tension descending chromatic power chords building dread and dramatic release.",
        "focus": "Chromatic movement, finger independence, syncopation",
        "duration_minutes": 14,
        "tab_pattern": ["F5", "E5", "Eb5", "D5", "Db5", "C5", "B4", "Bb4"],
    },
    {
        "id": "galloping-shadows", "title": "Galloping Shadows", "category": "guitar",
        "level": "Intermediate", "genre": "Metal", "bpm": 140, "is_premium": True,
        "description": "The Gallop rhythm \u2014 down-down-up percussive triplets with heavy palm-muting timing. Iron Maiden / classic metal staple.",
        "focus": "Gallop triplets, palm-mute precision, alternate picking",
        "duration_minutes": 15,
        "tab_pattern": ["D5pm", "D5pm", "D5", "D5pm", "D5pm", "D5", "D5pm", "D5pm"],
    },
    {
        "id": "tremolo-picking-fury", "title": "Tremolo Picking Fury", "category": "guitar",
        "level": "Advanced", "genre": "Metal", "bpm": 160, "is_premium": True,
        "description": "High-speed endurance alternate picking on a single string. Builds extreme right-hand stamina.",
        "focus": "Tremolo picking, right-hand endurance, micro-timing",
        "duration_minutes": 12,
        "tab_pattern": ["D", "D", "D", "D", "D", "D", "D", "D"],
    },
    # VOCAL
    {
        "id": "vocal-warmup-lip-trills", "title": "Lip Trill Warm-ups", "category": "vocal",
        "level": "Beginner", "genre": "All", "bpm": 70, "is_premium": True,
        "description": "Daily lip-trill warm-ups across a 1.5-octave glide to loosen the diaphragm and vocal folds.",
        "focus": "Breath support, fold relaxation, range glide",
        "duration_minutes": 8,
        "tab_pattern": [],
    },
    {
        "id": "vocal-pitch-matching", "title": "Pitch Matching Drills", "category": "vocal",
        "level": "Intermediate", "genre": "Alt-Rock", "bpm": 80, "is_premium": True,
        "description": "Match held tones against a reference pitch with live visual feedback. Builds intonation accuracy.",
        "focus": "Pitch accuracy, sustain, vibrato control",
        "duration_minutes": 10,
        "tab_pattern": [],
    },
    {
        "id": "vocal-grit-resonance", "title": "Grit Resonance Control", "category": "vocal",
        "level": "Advanced", "genre": "Grunge", "bpm": 85, "is_premium": True,
        "description": "Controlled distortion technique \u2014 produce gritty resonance without damaging the cords. Cobain / Cornell territory.",
        "focus": "False-fold engagement, controlled distortion, longevity",
        "duration_minutes": 12,
        "tab_pattern": [],
    },
    {
        "id": "vocal-breath-control", "title": "Breath Control Box", "category": "vocal",
        "level": "Intermediate", "genre": "All", "bpm": 60, "is_premium": True,
        "description": "4x4 box-breathing protocol: inhale 4 / hold 4 / exhale 4 / hold 4 for endurance and stage stamina.",
        "focus": "Diaphragm strength, breath economy, stage stamina",
        "duration_minutes": 6,
        "tab_pattern": [],
    },
    {
        "id": "vocal-melodic-control", "title": "Melodic Control", "category": "vocal",
        "level": "Intermediate", "genre": "Alt-Rock", "bpm": 90, "is_premium": True,
        "description": "Smooth interval leaps and melodic phrasing exercises. Alt-rock melodic vocabulary.",
        "focus": "Interval accuracy, phrasing, melodic memory",
        "duration_minutes": 10,
        "tab_pattern": [],
    },
]

# ---------- Tone Lab Presets ----------
TONE_PRESETS: List[Dict[str, Any]] = [
    {"id": "seattle-grunge", "name": "Seattle Grunge", "genre": "Grunge", "is_premium": True,
     "params": {"gain": 6.5, "bass": 6.0, "mid": 5.0, "treble": 6.0, "presence": 5.5, "master": 7.0, "pickup": "bridge", "distortion_curve": "rat"}},
    {"id": "obsidian-chug", "name": "Obsidian Chug", "genre": "Metal", "is_premium": True,
     "params": {"gain": 9.0, "bass": 7.5, "mid": 3.0, "treble": 7.0, "presence": 7.5, "master": 7.0, "pickup": "bridge", "distortion_curve": "hard"}},
    {"id": "velvet-alt-clean", "name": "Velvet Alt Clean", "genre": "Alt-Rock", "is_premium": True,
     "params": {"gain": 2.5, "bass": 5.0, "mid": 6.5, "treble": 6.0, "presence": 5.0, "master": 6.5, "pickup": "neck", "distortion_curve": "soft"}},
    {"id": "crimson-pedal", "name": "Crimson Pedal", "genre": "90s Rock", "is_premium": True,
     "params": {"gain": 5.5, "bass": 5.0, "mid": 6.0, "treble": 6.5, "presence": 6.0, "master": 6.5, "pickup": "bridge", "distortion_curve": "rat"}},
    {"id": "cathedral-clean", "name": "Cathedral Clean", "genre": "Alt-Rock", "is_premium": False,
     "params": {"gain": 1.0, "bass": 5.0, "mid": 5.5, "treble": 6.5, "presence": 4.5, "master": 6.0, "pickup": "neck", "distortion_curve": "clean"}},
    {"id": "bridge-bite", "name": "Bridge Bite", "genre": "Metal", "is_premium": True,
     "params": {"gain": 8.0, "bass": 6.5, "mid": 4.0, "treble": 7.5, "presence": 8.0, "master": 7.0, "pickup": "bridge", "distortion_curve": "hard"}},
]

# ---------- Pydantic Models ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    is_premium: bool = False
    premium_period: Optional[str] = None  # "monthly" | "annual"
    premium_expires_at: Optional[str] = None
    onboarded: bool = False
    accessibility: Dict[str, Any] = Field(default_factory=dict)
    created_at: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class SessionLogRequest(BaseModel):
    lesson_id: str
    duration_seconds: int = Field(ge=1, le=24 * 3600)
    completed: bool = True
    accuracy: Optional[float] = None
    notes: Optional[str] = None

class CheckoutRequest(BaseModel):
    package_id: str  # "monthly" | "annual"
    origin_url: str

class OnboardRequest(BaseModel):
    skill_level: Optional[str] = None
    goals: Optional[List[str]] = None
    accessibility: Optional[Dict[str, Any]] = None

# ---------- Helpers ----------
def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def serialize_user(doc: Dict[str, Any]) -> User:
    return User(
        user_id=doc["user_id"],
        email=doc["email"],
        name=doc.get("name"),
        picture=doc.get("picture"),
        is_premium=bool(doc.get("is_premium", False)),
        premium_period=doc.get("premium_period"),
        premium_expires_at=doc.get("premium_expires_at"),
        onboarded=bool(doc.get("onboarded", False)),
        accessibility=doc.get("accessibility", {}) or {},
        created_at=doc.get("created_at") or now_utc_iso(),
    )

async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    return await db.users.find_one({"email": email.lower()}, {"_id": 0})

async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})

async def get_user_by_session_token(token: str) -> Optional[Dict[str, Any]]:
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    exp = sess.get("expires_at")
    if isinstance(exp, str):
        try:
            exp = datetime.fromisoformat(exp)
        except Exception:
            return None
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        return None
    return await get_user_by_id(sess["user_id"])

async def current_user_optional(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Cookie(default=None),
) -> Optional[Dict[str, Any]]:
    # Prefer cookie (OAuth) then Bearer (JWT or OAuth)
    token = session_token
    bearer = None
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization.split(" ", 1)[1].strip()

    # Try cookie session
    if token:
        u = await get_user_by_session_token(token)
        if u:
            return u

    # Try bearer as session token first
    if bearer:
        u = await get_user_by_session_token(bearer)
        if u:
            return u
        # Try JWT
        try:
            payload = jwt.decode(bearer, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            uid = payload.get("sub")
            if uid:
                return await get_user_by_id(uid)
        except Exception:
            pass
    return None

async def current_user_required(user=Depends(current_user_optional)) -> Dict[str, Any]:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def premium_required(user=Depends(current_user_required)) -> Dict[str, Any]:
    # Check premium and expiry
    if not user.get("is_premium"):
        raise HTTPException(status_code=402, detail="Premium subscription required")
    exp = user.get("premium_expires_at")
    if exp:
        try:
            exp_dt = datetime.fromisoformat(exp)
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=402, detail="Subscription expired")
        except HTTPException:
            raise
        except Exception:
            pass
    return user

def lesson_dict_to_response(lesson: Dict[str, Any], user: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    locked = lesson.get("is_premium") and not (user and user.get("is_premium"))
    return {**lesson, "locked": bool(locked)}

# ---------- App ----------
app = FastAPI(title="RiffNecromancer API")
api = APIRouter(prefix="/api")

# CORS: with allow_credentials=True, Starlette echoes back the request's
# Origin header verbatim whenever "*" is in allow_origins, which lets ANY
# site issue authenticated (cookie-carrying) requests against this API.
# Since /auth/oauth/session relies on a session_token cookie, this was a
# real cross-site request forgery / session theft hole. Origins must be an
# explicit allow-list, configured per-environment via CORS_ORIGINS.
_cors_origins_env = os.environ.get("CORS_ORIGINS", "")
CORS_ORIGINS = [o.strip() for o in _cors_origins_env.split(",") if o.strip()] or [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if "*" in CORS_ORIGINS:
    raise RuntimeError(
        "CORS_ORIGINS must not contain '*' when allow_credentials=True — "
        "this would allow any origin to make authenticated requests."
    )

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Routes: Health ----------
@api.get("/")
async def root():
    return {"app": "RiffNecromancer", "status": "ok", "time": now_utc_iso()}

# ---------- Routes: Auth (Email/Password) ----------
@api.post("/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    email = req.email.lower()
    existing = await get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": uid,
        "email": email,
        "name": req.name or email.split("@")[0],
        "password_hash": hash_password(req.password),
        "is_premium": False,
        "onboarded": False,
        "accessibility": {},
        "created_at": now_utc_iso(),
        "auth_provider": "password",
    }
    await db.users.insert_one(doc)
    token = create_jwt(uid)
    return AuthResponse(access_token=token, user=serialize_user(doc))

@api.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    email = req.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_jwt(user["user_id"])
    return AuthResponse(access_token=token, user=serialize_user(user))

@api.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

@api.get("/auth/me", response_model=User)
async def me(user=Depends(current_user_required)):
    return serialize_user(user)

# ---------- Routes: Emergent Google OAuth ----------
class OAuthSessionRequest(BaseModel):
    session_id: str

@api.post("/auth/oauth/session")
async def oauth_session(req: OAuthSessionRequest, response: Response):
    """Exchange Emergent session_id (from URL fragment) for our session_token cookie."""
    if not req.session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    try:
        async with httpx.AsyncClient(timeout=10) as hc:
            r = await hc.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": req.session_id},
            )
            if r.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid OAuth session")
            data = r.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("OAuth session-data error")
        raise HTTPException(status_code=502, detail=f"OAuth provider error: {e}")

    email = (data.get("email") or "").lower()
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=502, detail="OAuth payload incomplete")

    existing = await get_user_by_email(email)
    if existing:
        uid = existing["user_id"]
        await db.users.update_one(
            {"user_id": uid},
            {"$set": {"name": name or existing.get("name"), "picture": picture or existing.get("picture"), "auth_provider": existing.get("auth_provider", "google")}},
        )
    else:
        uid = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": uid, "email": email, "name": name, "picture": picture,
            "is_premium": False, "onboarded": False, "accessibility": {},
            "created_at": now_utc_iso(), "auth_provider": "google",
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": uid, "session_token": session_token,
                  "expires_at": expires_at.isoformat(), "created_at": now_utc_iso()}},
        upsert=True,
    )
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/",
        max_age=7 * 24 * 60 * 60,
    )
    user_doc = await get_user_by_id(uid)
    return {"ok": True, "user": serialize_user(user_doc).model_dump()}

# ---------- Routes: Onboarding & Profile ----------
@api.post("/profile/onboard", response_model=User)
async def complete_onboarding(req: OnboardRequest, user=Depends(current_user_required)):
    updates: Dict[str, Any] = {"onboarded": True}
    if req.skill_level is not None:
        updates["skill_level"] = req.skill_level
    if req.goals is not None:
        updates["goals"] = req.goals
    if req.accessibility is not None:
        updates["accessibility"] = req.accessibility
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    fresh = await get_user_by_id(user["user_id"])
    return serialize_user(fresh)

@api.post("/profile/accessibility", response_model=User)
async def update_accessibility(payload: Dict[str, Any], user=Depends(current_user_required)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"accessibility": payload}})
    fresh = await get_user_by_id(user["user_id"])
    return serialize_user(fresh)

# ---------- Routes: Lessons ----------
@api.get("/lessons")
async def list_lessons(category: Optional[str] = None, user=Depends(current_user_optional)):
    items = LESSON_CATALOG
    if category:
        items = [lsn for lsn in items if lsn["category"] == category]
    return [lesson_dict_to_response(lsn, user) for lsn in items]

@api.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str, user=Depends(current_user_optional)):
    for lsn in LESSON_CATALOG:
        if lsn["id"] == lesson_id:
            resp = lesson_dict_to_response(lsn, user)
            if resp["locked"]:
                # Return metadata but no "play" payload
                resp_safe = dict(resp)
                resp_safe["tab_pattern"] = []
                return resp_safe
            return resp
    raise HTTPException(status_code=404, detail="Lesson not found")

# ---------- Routes: Tone Presets ----------
@api.get("/tone/presets")
async def list_presets(genre: Optional[str] = None, user=Depends(current_user_optional)):
    out = []
    for p in TONE_PRESETS:
        if genre and genre.lower() != "all" and p["genre"].lower() != genre.lower():
            continue
        locked = p["is_premium"] and not (user and user.get("is_premium"))
        out.append({**p, "locked": bool(locked)})
    return out

# ---------- Routes: Sessions / History ----------
@api.post("/sessions")
async def log_session(req: SessionLogRequest, user=Depends(current_user_required)):
    lesson = next((l for l in LESSON_CATALOG if l["id"] == req.lesson_id), None)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    # Premium gate
    if lesson["is_premium"] and not user.get("is_premium"):
        raise HTTPException(status_code=402, detail="Premium subscription required")
    sid = f"sess_{uuid.uuid4().hex[:14]}"
    doc = {
        "session_id": sid,
        "user_id": user["user_id"],
        "lesson_id": lesson["id"],
        "lesson_title": lesson["title"],  # EXACT title — NEVER "Unknown Lesson"
        "lesson_category": lesson["category"],
        "lesson_genre": lesson["genre"],
        "bpm": lesson.get("bpm"),
        "duration_seconds": int(req.duration_seconds),
        "completed": bool(req.completed),
        "accuracy": req.accuracy,
        "notes": req.notes,
        "created_at": now_utc_iso(),
    }
    await db.sessions.insert_one(doc)
    return {"ok": True, "session_id": sid, "lesson_title": lesson["title"]}

@api.get("/sessions")
async def list_sessions(limit: int = 100, user=Depends(current_user_required)):
    cur = db.sessions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cur.to_list(length=limit)

@api.get("/history/calendar")
async def calendar_view(year: int, month: int, user=Depends(current_user_required)):
    """Return per-day session counts for the given year-month plus headline stats."""
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="month must be 1-12")
    cur = db.sessions.find({"user_id": user["user_id"]}, {"_id": 0})
    all_sessions = await cur.to_list(length=10000)
    _ = all_sessions  # also used below via filtering
    daily_keys: set = set()
    day_map: Dict[str, Dict[str, Any]] = {}
    total_seconds_all = 0
    total_sessions_all = 0
    for s in all_sessions:
        try:
            dt = datetime.fromisoformat(s["created_at"])
        except Exception:
            continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        key_day = dt.strftime("%Y-%m-%d")
        daily_keys.add(key_day)
        total_seconds_all += int(s.get("duration_seconds") or 0)
        total_sessions_all += 1
        if dt.year == year and dt.month == month:
            d = day_map.setdefault(key_day, {"date": key_day, "sessions": 0, "duration_seconds": 0, "titles": []})
            d["sessions"] += 1
            d["duration_seconds"] += int(s.get("duration_seconds") or 0)
            if s.get("lesson_title") and s["lesson_title"] not in d["titles"]:
                d["titles"].append(s["lesson_title"])

    # Streaks
    sorted_days = sorted(daily_keys)
    prev: Optional[datetime] = None
    longest_run = 0
    run = 0
    for k in sorted_days:
        d = datetime.strptime(k, "%Y-%m-%d")
        if prev is None or (d - prev).days == 1:
            run += 1
        elif (d - prev).days == 0:
            pass
        else:
            run = 1
        longest_run = max(longest_run, run)
        prev = d
    longest = longest_run
    _ = sorted_days

    # Current streak: count consecutive days ending today (or yesterday if today missing)
    today = datetime.now(timezone.utc).date()
    streak = 0
    check = today
    while check.isoformat() in daily_keys:
        streak += 1
        check = check - timedelta(days=1)
    if streak == 0:
        # check if yesterday counted
        y = today - timedelta(days=1)
        if y.isoformat() in daily_keys:
            streak = 1
            check = y - timedelta(days=1)
            while check.isoformat() in daily_keys:
                streak += 1
                check = check - timedelta(days=1)

    return {
        "year": year,
        "month": month,
        "days": list(day_map.values()),
        "stats": {
            "total_sessions": total_sessions_all,
            "total_minutes": round(total_seconds_all / 60),
            "current_streak": streak,
            "longest_streak": longest,
        },
    }

@api.get("/progress/altar")
async def progress_altar(user=Depends(current_user_required)):
    """Completion overview: x/y completed rituals per category + recent timeline."""
    total_lessons = len(LESSON_CATALOG)
    cur = db.sessions.find({"user_id": user["user_id"], "completed": True}, {"_id": 0})
    completed_sessions = await cur.to_list(length=10000)
    completed_ids = {s["lesson_id"] for s in completed_sessions}

    by_category: Dict[str, Dict[str, int]] = {}
    for lsn in LESSON_CATALOG:
        cat = lsn["category"]
        by_category.setdefault(cat, {"total": 0, "completed": 0})
        by_category[cat]["total"] += 1
        if lsn["id"] in completed_ids:
            by_category[cat]["completed"] += 1

    # Timeline: last 14 days session counts
    today = datetime.now(timezone.utc).date()
    timeline = []
    cur2 = db.sessions.find({"user_id": user["user_id"]}, {"_id": 0})
    all_sess = await cur2.to_list(length=10000)
    counts: Dict[str, int] = {}
    for s in all_sess:
        try:
            dt = datetime.fromisoformat(s["created_at"]).date()
        except Exception:
            continue
        counts[dt.isoformat()] = counts.get(dt.isoformat(), 0) + 1
    for i in range(13, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        timeline.append({"date": d, "sessions": counts.get(d, 0)})

    # Per-lesson completion list
    lesson_completion = [
        {
            "lesson_id": lsn["id"],
            "title": lsn["title"],
            "category": lsn["category"],
            "is_premium": lsn["is_premium"],
            "completed": lsn["id"] in completed_ids,
        }
        for lsn in LESSON_CATALOG
    ]

    return {
        "summary": {
            "completed": len(completed_ids),
            "total": total_lessons,
            "completion_rate": round(len(completed_ids) / total_lessons * 100, 1) if total_lessons else 0,
        },
        "by_category": by_category,
        "timeline": timeline,
        "lessons": lesson_completion,
    }

# ---------- Routes: Stripe Subscription ----------
@api.post("/payments/checkout")
async def create_checkout(req: CheckoutRequest, http_request: Request, user=Depends(current_user_required)):
    if req.package_id not in SUBSCRIPTION_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    pkg = SUBSCRIPTION_PACKAGES[req.package_id]

    origin = req.origin_url.rstrip("/")
    success_url = f"{origin}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/pricing"

    metadata = {
        "user_id": user["user_id"],
        "email": user["email"],
        "package_id": req.package_id,
        "period": pkg["period"],
    }
    lookup_key = get_stripe_lookup_key(req.package_id)
    line_items = [{"price": lookup_key, "quantity": 1}] if lookup_key else [{
        "price_data": {
            "currency": pkg["currency"],
            "unit_amount": int(round(float(pkg["amount"]) * 100)),
            "product_data": {"name": pkg["label"]},
        },
        "quantity": 1,
    }]
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            customer_email=user["email"],
            payment_intent_data={"metadata": metadata},
        )
    except Exception as e:
        logger.exception("Stripe create session failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    tx_doc = {
        "transaction_id": f"tx_{uuid.uuid4().hex[:14]}",
        "session_id": session.id,
        "user_id": user["user_id"],
        "email": user["email"],
        "package_id": req.package_id,
        "amount": float(pkg["amount"]),
        "currency": pkg["currency"],
        "period": pkg["period"],
        "metadata": metadata,
        "payment_status": "initiated",
        "checkout_status": "open",
        "created_at": now_utc_iso(),
        "updated_at": now_utc_iso(),
        "premium_granted": False,
    }
    await db.payment_transactions.insert_one(tx_doc)
    return {"url": session.url, "session_id": session.id}

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, http_request: Request, user=Depends(current_user_required)):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        status_resp = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        logger.exception("Stripe status fetch failed")
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")

    payment_status_str = status_resp.payment_status
    checkout_status_str = status_resp.status
    update: Dict[str, Any] = {
        "payment_status": payment_status_str,
        "checkout_status": checkout_status_str,
        "amount_total": status_resp.amount_total,
        "currency": status_resp.currency,
        "updated_at": now_utc_iso(),
    }
    # Grant premium ONCE, idempotently
    granted = False
    if payment_status_str == "paid" and not tx.get("premium_granted"):
        period = tx.get("period") or "monthly"
        days = 31 if period == "monthly" else 366
        new_exp = datetime.now(timezone.utc) + timedelta(days=days)
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "is_premium": True,
                "premium_period": period,
                "premium_expires_at": new_exp.isoformat(),
            }},
        )
        update["premium_granted"] = True
        granted = True
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})
    return {
        "session_id": session_id,
        "payment_status": payment_status_str,
        "checkout_status": checkout_status_str,
        "amount_total": status_resp.amount_total,
        "currency": status_resp.currency,
        "premium_granted": granted or tx.get("premium_granted", False),
    }

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not set; refusing to process webhook")
        raise HTTPException(status_code=500, detail="Webhook not configured")
    try:
        evt = stripe.Webhook.construct_event(body, sig, webhook_secret)
    except Exception as e:
        logger.exception("Stripe webhook signature verification failed")
        raise HTTPException(status_code=400, detail=f"Webhook error: {e}")

    evt_type = evt["type"]
    data_obj = evt["data"]["object"]
    # Update local transaction
    sess_id = data_obj.get("id") if evt_type.startswith("checkout.session") else None
    payment_status = data_obj.get("payment_status")
    if sess_id:
        tx = await db.payment_transactions.find_one({"session_id": sess_id}, {"_id": 0})
        if tx and payment_status == "paid" and not tx.get("premium_granted"):
            period = tx.get("period") or "monthly"
            days = 31 if period == "monthly" else 366
            new_exp = datetime.now(timezone.utc) + timedelta(days=days)
            await db.users.update_one(
                {"user_id": tx["user_id"]},
                {"$set": {
                    "is_premium": True,
                    "premium_period": period,
                    "premium_expires_at": new_exp.isoformat(),
                }},
            )
            await db.payment_transactions.update_one(
                {"session_id": sess_id},
                {"$set": {"payment_status": "paid", "premium_granted": True, "updated_at": now_utc_iso()}},
            )
    return {"ok": True, "event": evt_type}

@api.get("/payments/packages")
async def packages():
    return [
        {"id": pid, **pdata} for pid, pdata in SUBSCRIPTION_PACKAGES.items()
    ]

# ---------- Seed demo accounts at startup ----------
async def seed_demo_users():
    # Demo accounts used to auto-seed unconditionally on every startup, with
    # plaintext passwords hardcoded here (and duplicated into plan.md /
    # README.md). That ran identically in production as in dev. Now gated
    # behind an explicit opt-in flag, and passwords come from the
    # environment instead of being committed to the repo.
    demo_password = os.environ.get("DEMO_PREMIUM_PASSWORD")
    free_password = os.environ.get("DEMO_FREE_PASSWORD")
    if not demo_password or not free_password:
        logger.info("DEMO_PREMIUM_PASSWORD/DEMO_FREE_PASSWORD not set; skipping demo user seed")
        return
    demos = [
        {"email": "demo@riffnecromancer.com", "password": demo_password, "name": "Demo Premium", "is_premium": True, "period": "annual"},
        {"email": "free@riffnecromancer.com", "password": free_password, "name": "Demo Free", "is_premium": False, "period": None},
    ]
    for d in demos:
        existing = await db.users.find_one({"email": d["email"]}, {"_id": 0})
        if existing:
            # Ensure premium flag matches
            updates: Dict[str, Any] = {}
            if existing.get("is_premium") != d["is_premium"]:
                updates["is_premium"] = d["is_premium"]
            if d["is_premium"]:
                updates["premium_period"] = d["period"]
                updates["premium_expires_at"] = (datetime.now(timezone.utc) + timedelta(days=366)).isoformat()
            if updates:
                await db.users.update_one({"user_id": existing["user_id"]}, {"$set": updates})
            continue
        uid = f"user_{uuid.uuid4().hex[:12]}"
        doc = {
            "user_id": uid,
            "email": d["email"],
            "name": d["name"],
            "password_hash": hash_password(d["password"]),
            "is_premium": d["is_premium"],
            "premium_period": d["period"],
            "premium_expires_at": (datetime.now(timezone.utc) + timedelta(days=366)).isoformat() if d["is_premium"] else None,
            "onboarded": True,
            "accessibility": {},
            "created_at": now_utc_iso(),
            "auth_provider": "password",
        }
        await db.users.insert_one(doc)
        logger.info("Seeded demo user %s", d["email"])

@app.on_event("startup")
async def on_startup():
    if os.environ.get("SEED_DEMO_USERS", "").lower() in ("1", "true", "yes"):
        try:
            await seed_demo_users()
        except Exception:
            logger.exception("Seeding demo users failed (non-fatal)")
    else:
        logger.info("SEED_DEMO_USERS not enabled; skipping demo user seed")

@app.on_event("shutdown")
async def on_shutdown():
    client.close()

app.include_router(api)
