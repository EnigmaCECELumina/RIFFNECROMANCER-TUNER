"""
RiffNecromancer Backend
- FastAPI + Motor (MongoDB)
- Auth: email/password (JWT bearer) AND Google OAuth (session_token cookie)
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
    from .stripe_config import get_stripe_api_key, get_stripe_lookup_key, get_stripe_publishable_key
except ImportError:  # pragma: no cover - allows running server.py directly
    from stripe_config import get_stripe_api_key, get_stripe_lookup_key, get_stripe_publishable_key

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("riffnecromancer")

# ---------- Env ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
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

# MongoDB client with SSL/TLS configuration for Python 3.14 compatibility
client = AsyncIOMotorClient(
    MONGO_URL,
    tls=True,
    tlsAllowInvalidCertificates=False,
    serverSelectionTimeoutMS=30000,
    connectTimeoutMS=30000,
    socketTimeoutMS=30000,
)
db = client[DB_NAME]

# ---------- Subscription Packages ----------
SUBSCRIPTION_PACKAGES: Dict[str, Dict[str, Any]] = {
    "monthly": {"amount": 7.00, "currency": "usd", "period": "monthly", "label": "Premium Monthly"},
    "annual": {"amount": 59.00, "currency": "usd", "period": "annual", "label": "Premium Annual"},
}

# ---------- Lesson Catalog ----------
LESSON_CATALOG: List[Dict[str, Any]] = [
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
        "description": "The Gallop rhythm \u2014 down-down-up percussive triplets with heavy palm-muting timing.",
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
        "description": "Controlled distortion technique \u2014 produce gritty resonance without damaging the cords.",
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
    premium_period: Optional[str] = None
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
    package_id: str
    origin_url: str

class OnboardRequest(BaseModel):
    skill_level: Optional[str] = None
    goals: Optional[List[str]] = None
    accessibility: Optional[Dict[str, Any]] = None

class CustomerPortalRequest(BaseModel):
    return_url: str

# ---------- Helpers ----------
def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def parse_iso_utc(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(value)
        except (ValueError, TypeError):
            logger.warning("Could not parse ISO datetime from %r", value)
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

def is_locked_for(item: Dict[str, Any], user: Optional[Dict[str, Any]]) -> bool:
    return bool(item.get("is_premium") and not (user and user.get("is_premium")))

PREMIUM_PERIOD_DAYS = {"monthly": 31, "annual": 366}

async def grant_premium(user_id: str, period: Optional[str]) -> str:
    period = period or "monthly"
    days = PREMIUM_PERIOD_DAYS.get(period, PREMIUM_PERIOD_DAYS["annual"])
    new_exp = datetime.now(timezone.utc) + timedelta(days=days)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "is_premium": True,
            "premium_period": period,
            "premium_expires_at": new_exp.isoformat(),
        }},
    )
    return new_exp.isoformat()

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        logger.warning("Password verification failed due to malformed stored hash")
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
    raw_exp = sess.get("expires_at")
    exp = parse_iso_utc(raw_exp)
    if raw_exp and exp is None:
        return None
    if exp and exp < datetime.now(timezone.utc):
        return None
    return await get_user_by_id(sess["user_id"])

# ---------- THE FIXED AUTH FUNCTION ----------
async def current_user_optional(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Cookie(default=None),
) -> Optional[Dict[str, Any]]:
    # Priority 1: Session token from cookie (used by Google OAuth flow)
    if session_token:
        user = await get_user_by_session_token(session_token)
        if user:
            return user

    # Priority 2: Token from Authorization header
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()

        # Try validating as a session token first
        user = await get_user_by_session_token(token)
        if user:
            return user

        # If not a session token, decode as a JWT (from email/pass login)
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            uid = payload.get("sub")
            if uid:  # <-- Fixed: Safely check for the user ID mapping
                return await get_user_by_id(uid)
        except jwt.PyJWTError as e:
            logger.debug("Bearer token rejected: %s", e)

    return None

async def current_user_required(user=Depends(current_user_optional)) -> Dict[str, Any]:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def premium_required(user=Depends(current_user_required)) -> Dict[str, Any]:
    if not user.get("is_premium"):
        raise HTTPException(status_code=402, detail="Premium subscription required")

    raw_expiry = user.get("premium_expires_at")
    if not raw_expiry:
        raise HTTPException(status_code=402, detail="Subscription expired (missing date)")

    exp_dt = parse_iso_utc(raw_expiry)
    if not exp_dt or exp_dt < datetime.now(timezone.utc):
        raise HTTPException(status_code=402, detail="Subscription expired")
    return user

def lesson_dict_to_response(lesson: Dict[str, Any], user: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    return {**lesson, "locked": is_locked_for(lesson, user)}

# ---------- App Routing ----------
app = FastAPI(title="RiffNecromancer API")
api = APIRouter(prefix="/api")

_cors_origins_env = os.environ.get("CORS_ORIGINS", "")
CORS_ORIGINS = [o.strip() for o in _cors_origins_env.split(",") if o.strip()] or [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if "*" in CORS_ORIGINS:
    raise RuntimeError("CORS_ORIGINS must not contain '*' when allow_credentials=True")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@api.get("/")
async def root():
    return {"app": "RiffNecromancer", "status": "ok", "time": now_utc_iso()}

# ---------- Routes: Auth ----------
@api.post("/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    email = req.email.lower()
    existing = await get_user_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": uid, "email": email, "name": req.name or email.split("@")[0],
        "password_hash": hash_password(req.password), "is_premium": False,
        "onboarded": False, "accessibility": {}, "created_at": now_utc_iso(),
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

# ---------- Routes: Google OAuth ----------
class OAuthSessionRequest(BaseModel):
    session_id: str

@api.post("/auth/oauth/session")
async def oauth_session(req: OAuthSessionRequest, response: Response):
    if not req.session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    try:
        async with httpx.AsyncClient(timeout=10) as hc:
            r = await hc.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": req.session_id},
            )
        r.raise_for_status()
        data = r.json()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired OAuth session.")

    email = (data.get("email") or "").lower()
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(status_code=502, detail="OAuth provider returned incomplete data.")

    existing = await get_user_by_email(email)
    if existing:
        uid = existing["user_id"]
        await db.users.update_one(
            {"user_id": uid},
            {"$set": {"name": name or existing.get("name"), "picture": picture or existing.get("picture"), "auth_provider": existing.get("auth_provider", "google")}},
        )
        user_doc = await get_user_by_id(uid)
    else:
        uid = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": uid, "email": email, "name": name, "picture": picture,
            "is_premium": False, "onboarded": False, "accessibility": {},
            "created_at": now_utc_iso(), "auth_provider": "google",
        }
        await db.users.insert_one(user_doc)

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {"user_id": uid, "session_token": session_token, "expires_at": expires_at.isoformat(), "created_at": now_utc_iso()}},
        upsert=True,
    )
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/",
        max_age=7 * 24 * 60 * 60,
    )
    return {"ok": True, "user": serialize_user(user_doc).model_dump()}

# ---------- Routes: Onboarding ----------
@api.post("/profile/onboard", response_model=User)
async def complete_onboarding(req: OnboardRequest, user=Depends(current_user_required)):
    updates: Dict[str, Any] = {"onboarded": True}
    if req.skill_level is not None: updates["skill_level"] = req.skill_level
    if req.goals is not None: updates["goals"] = req.goals
    if req.accessibility is not None: updates["accessibility"] = req.accessibility
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": updates})
    fresh = await get_user_by_id(user["user_id"])
    return serialize_user(fresh)

@api.post("/profile/accessibility", response_model=User)
async def update_accessibility(payload: Dict[str, Any], user=Depends(current_user_required)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"accessibility": payload}})
    fresh = await get_user_by_id(user["user_id"])
    return serialize_user(fresh)

# ---------- Routes: Lessons & Presets ----------
@api.get("/lessons")
async def list_lessons(category: Optional[str] = None, user=Depends(current_user_optional)):
    items = LESSON_CATALOG
    if category: items = [lsn for lsn in items if lsn["category"] == category]
    return [lesson_dict_to_response(lsn, user) for lsn in items]

@api.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str, user=Depends(current_user_optional)):
    for lsn in LESSON_CATALOG:
        if lsn["id"] == lesson_id:
            resp = lesson_dict_to_response(lsn, user)
            if resp["locked"]:
                resp_safe = dict(resp)
                resp_safe["tab_pattern"] = []
                return resp_safe
            return resp
    raise HTTPException(status_code=404, detail="Lesson not found")

@api.get("/tone/presets")
async def list_presets(genre: Optional[str] = None, user=Depends(current_user_optional)):
    out = []
    for p in TONE_PRESETS:
        if genre and genre.lower() != "all" and p["genre"].lower() != genre.lower(): continue
        out.append({**p, "locked": is_locked_for(p, user)})
    return out

# ---------- Routes: Sessions ----------
@api.post("/sessions")
async def log_session(req: SessionLogRequest, user=Depends(current_user_required)):
    lesson = next((l for l in LESSON_CATALOG if l["id"] == req.lesson_id), None)
    if not lesson: raise HTTPException(status_code=404, detail="Lesson not found")
    if lesson["is_premium"] and not user.get("is_premium"):
        raise HTTPException(status_code=402, detail="Premium subscription required")
    sid = f"sess_{uuid.uuid4().hex[:14]}"
    doc = {
        "session_id": sid, "user_id": user["user_id"], "lesson_id": lesson["id"],
        "lesson_title": lesson["title"], "lesson_category": lesson["category"],
        "lesson_genre": lesson["genre"], "bpm": lesson.get("bpm"),
        "duration_seconds": int(req.duration_seconds), "completed": bool(req.completed),
        "accuracy": req.accuracy, "notes": req.notes, "created_at": now_utc_iso(),
    }
    await db.sessions.insert_one(doc)
    return {"ok": True, "session_id": sid, "lesson_title": lesson["title"]}

@api.get("/sessions")
async def list_sessions(limit: int = 100, user=Depends(current_user_required)):
    cur = db.sessions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cur.to_list(length=limit)

@api.get("/history/calendar")
async def calendar_view(year: int, month: int, user=Depends(current_user_required)):
    if month < 1 or month > 12: raise HTTPException(status_code=400, detail="month must be 1-12")
    cur = db.sessions.find({"user_id": user["user_id"]}, {"_id": 0})
    all_sessions = await cur.to_list(length=10000)
    daily_keys = set()
    day_map = {}
    total_seconds_all = 0
    total_sessions_all = 0
    for s in all_sessions:
        dt = parse_iso_utc(s.get("created_at"))
        if dt is None: continue
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

    sorted_days = sorted(daily_keys)
    prev = None
    longest_run = 0
    run = 0
    for k in sorted_days:
        d = datetime.strptime(k, "%Y-%m-%d")
        if prev is None or (d - prev).days == 1: run += 1
        elif (d - prev).days == 0: pass
        else: run = 1
        longest_run = max(longest_run, run)
        prev = d

    today = datetime.now(timezone.utc).date()
    streak = 0
    check = today
    while check.isoformat() in daily_keys:
        streak += 1
        check = check - timedelta(days=1)
    if streak == 0:
        y = today - timedelta(days=1)
        if y.isoformat() in daily_keys:
            streak = 1
            check = y - timedelta(days=1)
            while check.isoformat() in daily_keys:
                streak += 1
                check = check - timedelta(days=1)

    return {
        "year": year, "month": month, "days": list(day_map.values()),
        "stats": {
            "total_sessions": total_sessions_all, "total_minutes": round(total_seconds_all / 60),
            "current_streak": streak, "longest_streak": longest_run,
        },
    }

@api.get("/progress/altar")
async def progress_altar(user=Depends(current_user_required)):
    total_lessons = len(LESSON_CATALOG)
    cur = db.sessions.find({"user_id": user["user_id"], "completed": True}, {"_id": 0})
    completed_sessions = await cur.to_list(length=10000)
    completed_ids = {s["lesson_id"] for s in completed_sessions}

    by_category = {}
    for lsn in LESSON_CATALOG:
        cat = lsn["category"]
        by_category.setdefault(cat, {"total": 0, "completed": 0})
        by_category[cat]["total"] += 1
        if lsn["id"] in completed_ids: by_category[cat]["completed"] += 1

    today = datetime.now(timezone.utc).date()
    timeline = []
    cur2 = db.sessions.find({"user_id": user["user_id"]}, {"_id": 0})
    all_sess = await cur2.to_list(length=10000)
    counts = {}
    for s in all_sess:
        dt = parse_iso_utc(s.get("created_at"))
        if dt is None: continue
        day = dt.date().isoformat()
        counts[day] = counts.get(day, 0) + 1
    for i in range(13, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        timeline.append({"date": d, "sessions": counts.get(d, 0)})

    lesson_completion = [
        {"lesson_id": lsn["id"], "title": lsn["title"], "category": lsn["category"], "is_premium": lsn["is_premium"], "completed": lsn["id"] in completed_ids}
        for lsn in LESSON_CATALOG
    ]

    return {
        "total_lessons_catalog": total_lessons, "total_completed_unique": len(completed_ids),
        "categories": by_category, "timeline_14d": timeline, "lessons": lesson_completion,
    }

# ---------- Routes: Stripe ----------
@api.post("/billing/checkout")
async def create_checkout_session(req: CheckoutRequest, user=Depends(current_user_required)):
    pkg = SUBSCRIPTION_PACKAGES.get(req.package_id)
    if not pkg: raise HTTPException(status_code=400, detail="Invalid package_id specified")
    try:
        price_id = get_stripe_lookup_key(req.package_id)
    except Exception:
        raise HTTPException(status_code=500, detail="Billing initialization failed")

    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=user["email"], payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}], mode="subscription",
            success_url=f"{req.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{req.origin_url}/billing?canceled=true",
            metadata={"user_id": user["user_id"], "package_id": req.package_id},
        )
        return {"checkout_url": checkout_session.url, "url": checkout_session.url, "session_id": checkout_session.id}
    except Exception:
        raise HTTPException(status_code=500, detail="Could not create checkout session via provider")

@api.get("/billing/status/{session_id}")
async def get_payment_status(session_id: str, user=Depends(current_user_required)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "status": session.payment_status,
            "customer_email": session.customer_details.email,
            "subscription_id": session.subscription
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Could not retrieve payment status")

@api.post("/billing/portal")
async def customer_portal(req: CustomerPortalRequest, user=Depends(current_user_required)):
    try:
        sessions = await stripe.checkout.Session.list(customer_email=user["email"], limit=1)
        if not sessions.data:
            raise HTTPException(status_code=404, detail="No billing profile found. Please subscribe first.")
        customer_id = sessions.data[0].customer
        portal_session = stripe.billing_portal.Session.create(customer=customer_id, return_url=req.return_url)
        return {"portal_url": portal_session.url}
    except HTTPException: raise
    except Exception: raise HTTPException(status_code=500, detail="Could not access billing portal infrastructure")

@api.post("/billing/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")

    if not sig_header or not webhook_secret:
        raise HTTPException(status_code=400, detail="Invalid request signature structure")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Signature authentication failed")

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        uid = data_object.get("metadata", {}).get("user_id")
        pkg_id = data_object.get("metadata", {}).get("package_id") or "monthly"
        if uid: await grant_premium(uid, pkg_id)

    elif event_type in ["customer.subscription.deleted", "customer.subscription.updated"]:
        customer_id = data_object.get("customer")
        if event_type == "customer.subscription.deleted":
            await db.users.update_one({"stripe_customer_id": customer_id}, {"$set": {"is_premium": False, "premium_expires_at": now_utc_iso()}})

    return {"status": "success"}

app.include_router(api)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)