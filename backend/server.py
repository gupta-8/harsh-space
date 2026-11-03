import hashlib
import ipaddress
import json
import logging
import os
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Request, Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="harshgupta.me", docs_url=None, redoc_url=None, openapi_url=None)
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("harshgupta.me")

# ---------------------------------------------------------------- content ---
# The hand-set "last played" track and the GitHub account the cards read from.
TRACK_QUERY = os.environ.get("TRACK_QUERY", "carry on wayward son kansas")
GITHUB_USER = os.environ.get("GITHUB_USER", "gupta-8")
SITE = os.environ.get("SITE_HOST", "harshgupta.me")

MINUTE = 60_000
DAY = 24 * 60 * MINUTE
ONLINE_WINDOW = 5 * MINUTE
VISITS_KEEP = 8 * DAY
READS_KEEP = 90 * DAY
PRUNE_EVERY = 25
MAX_BEACON_BYTES = 2048
GUESTBOOK = {"name": 24, "message": 140, "cooldown_ms": DAY, "shown": 3}
VISITOR_RE = re.compile(r"^[a-z0-9]{6,32}$")
URL_RE = re.compile(r"(https?://\S+|www\.\S+|\S+\.(?:com|net|org|io|xyz|ly|gg|me|co)(?:/\S*)?)", re.I)
RUDE = {"fuck", "shit", "bitch", "cunt", "nigger", "nigga", "faggot", "retard", "whore", "slut", "dick", "asshole", "bastard"}

now_ms = lambda: int(time.time() * 1000)
month_of = lambda ts: datetime.fromtimestamp(ts / 1000, timezone.utc).strftime("%Y-%m")

# ------------------------------------------------------------- rate limit ---
# Per-IP sliding windows, in memory: enough to stop a script from flooding counters or the guestbook.
RATES = {"beacon": (60, 60.0), "guestbook": (5, 60.0), "lookup": (120, 60.0)}
_hits: dict[str, deque] = defaultdict(deque)


def rate_limited(bucket: str, ip: str) -> bool:
    limit, window = RATES[bucket]
    now = time.time()
    hits = _hits[f"{bucket}:{ip}"]
    while hits and hits[0] < now - window:
        hits.popleft()
    if len(hits) >= limit:
        return True
    hits.append(now)
    if len(_hits) > 5000:
        for key in [k for k, q in _hits.items() if not q]:
            del _hits[key]
    return False


def guard(bucket: str, request: Request) -> None:
    if rate_limited(bucket, client_ip(request)):
        raise HTTPException(429, "slow down")


def ago(then: int, now: int) -> str:
    s = max(0, round((now - then) / 1000))
    if s < 45:
        return "just now"
    m = round(s / 60)
    if m < 60:
        return f"{m}m"
    h = round(m / 60)
    if h < 24:
        return f"{h}h"
    return f"{round(h / 24)}d"


def visitor_tag(visitor: str) -> str:
    h = 5381
    for ch in visitor:
        h = (h * 33 + ord(ch)) % 4_294_967_296
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    out = ""
    while h:
        out = digits[h % 36] + out
        h //= 36
    return out or "0"


# ------------------------------------------------------------------ models ---
class GuestbookEntry(BaseModel):
    id: int
    name: str
    message: str
    place: str
    ago: str


class RecentVisitor(BaseModel):
    place: str
    path: str
    ago: str
    tag: str


class SiteStats(BaseModel):
    online: int
    today: int
    week: int
    total: int
    recent: list[RecentVisitor]
    paths: dict[str, int]
    hi: int
    signed: int
    guestbook: list[GuestbookEntry]


class SignInput(BaseModel):
    name: str = Field("", max_length=400)
    message: str = Field(..., max_length=2000)
    visitor: str = Field(..., max_length=32)


class Track(BaseModel):
    name: str
    artist: str
    url: str
    cover: Optional[str] = None
    thumb: Optional[str] = None
    previewUrl: Optional[str] = None
    isPlaying: bool = False


class PostMeta(BaseModel):
    slug: str
    title: str
    date: str
    dateLabel: str
    description: str
    readingMinutes: int
    sample: bool = False


class Post(PostMeta):
    content: str


# --------------------------------------------------------------------- geo ---
def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def ip_hash(ip: str) -> str:
    return hashlib.sha256(f"{SITE}:{ip}".encode()).hexdigest()[:24]


async def city_for(ip: str) -> str:
    try:
        if not ip or not ipaddress.ip_address(ip).is_global:
            return "somewhere"
    except ValueError:
        return "somewhere"
    key = ip_hash(ip)
    cached = await db.geo_cache.find_one({"key": key}, {"_id": 0, "city": 1})
    if cached:
        return cached["city"]
    city = "somewhere"
    try:
        async with httpx.AsyncClient(timeout=2.5) as http:
            r = await http.get(f"http://ip-api.com/json/{ip}", params={"fields": "status,city,regionName,country"})
            data = r.json()
            if data.get("status") == "success":
                city = (data.get("city") or data.get("regionName") or data.get("country") or "somewhere").lower()
    except Exception as exc:  # network hiccup: stay anonymous
        logger.info("geo lookup failed: %s", exc)
    await db.geo_cache.update_one(
        {"key": key}, {"$set": {"city": city, "at": datetime.now(timezone.utc)}}, upsert=True
    )
    return city


# ------------------------------------------------------------------- stats ---
writes = 0


async def bump(key: str) -> None:
    await db.counters.update_one({"key": key}, {"$inc": {"n": 1}}, upsert=True)


async def count(key: str) -> int:
    doc = await db.counters.find_one({"key": key}, {"_id": 0, "n": 1})
    return int(doc["n"]) if doc else 0


async def next_id(key: str) -> int:
    doc = await db.counters.find_one_and_update(
        {"key": key}, {"$inc": {"n": 1}}, upsert=True, return_document=True
    )
    return int(doc["n"])


@api.post("/beacon")
async def beacon(request: Request):
    global writes
    guard("beacon", request)
    body = await request.body()
    if len(body) > MAX_BEACON_BYTES:
        raise HTTPException(413, "beacon too large")
    try:
        data = json.loads(body)
        assert isinstance(data, dict)
    except Exception:
        raise HTTPException(400, "bad beacon")
    visitor = str(data.get("visitor", ""))
    kind = data.get("type")
    if not VISITOR_RE.match(visitor) or kind not in {"view", "leave", "hi"}:
        raise HTTPException(400, "bad beacon")
    now = now_ms()
    if kind == "view":
        path = str(data.get("path", "/"))[:120]
        city = await city_for(client_ip(request))
        await db.visits.insert_one({"ts": now, "visitor": visitor, "city": city, "path": path})
        await db.paths.update_one({"path": path}, {"$inc": {"views": 1}}, upsert=True)
        res = await db.visitors.update_one({"visitor": visitor}, {"$setOnInsert": {"visitor": visitor}}, upsert=True)
        if res.upserted_id is not None:
            await bump("total")
    elif kind == "leave":
        await db.reads.insert_one({
            "ts": now,
            "path": str(data.get("path", "/"))[:120],
            "depth": clamp_int(data.get("depth"), 100),
            "seconds": clamp_int(data.get("seconds"), 3600),
        })
    else:
        res = await db.greeters.update_one(
            {"month": month_of(now), "visitor": visitor}, {"$setOnInsert": {"at": now}}, upsert=True
        )
        if res.upserted_id is not None:
            await bump(f"hi:{month_of(now)}")
    if writes % PRUNE_EVERY == 0:
        await db.visits.delete_many({"ts": {"$lt": now - VISITS_KEEP}})
        await db.reads.delete_many({"ts": {"$lt": now - READS_KEEP}})
        await db.greeters.delete_many({"month": {"$lt": month_of(now)}})
    writes += 1
    return Response(status_code=204)


def clamp_int(value, high: int) -> int:
    try:
        return max(0, min(high, int(value or 0)))
    except (TypeError, ValueError):
        return 0


@api.get("/stats", response_model=SiteStats)
async def stats():
    now = now_ms()
    paths = {d["path"]: int(d["views"]) async for d in db.paths.find({}, {"_id": 0})}
    online = await db.visits.distinct("visitor", {"ts": {"$gt": now - ONLINE_WINDOW}})
    today = await db.visits.distinct("visitor", {"ts": {"$gt": now - DAY}})
    week = await db.visits.distinct("visitor", {"ts": {"$gt": now - 7 * DAY}})
    recent_rows = await db.visits.aggregate([
        {"$sort": {"ts": -1}},
        {"$group": {"_id": "$visitor", "ts": {"$first": "$ts"}, "city": {"$first": "$city"}, "path": {"$first": "$path"}}},
        {"$sort": {"ts": -1}},
        {"$limit": 5},
    ]).to_list(5)
    signed_rows = await db.guestbook.find({"hidden": False}, {"_id": 0}).sort("ts", -1).limit(GUESTBOOK["shown"]).to_list(GUESTBOOK["shown"])
    return SiteStats(
        online=len(online),
        today=len(today),
        week=len(week),
        total=await count("total"),
        recent=[RecentVisitor(place=r["city"], path=r["path"], ago=ago(r["ts"], now), tag=visitor_tag(r["_id"])) for r in recent_rows],
        paths=paths,
        hi=await count(f"hi:{month_of(now)}"),
        signed=await db.guestbook.count_documents({"hidden": False}),
        guestbook=[GuestbookEntry(id=r["id"], name=r["name"], message=r["message"], place=r["city"], ago=ago(r["ts"], now)) for r in signed_rows],
    )


# --------------------------------------------------------------- guestbook ---
def clean_line(text: str, limit: int) -> str:
    text = URL_RE.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


@api.post("/guestbook")
async def sign(body: SignInput, request: Request):
    guard("guestbook", request)
    if not VISITOR_RE.match(body.visitor):
        raise HTTPException(400, "bad visitor")
    message = clean_line(body.message, GUESTBOOK["message"])
    name = clean_line(body.name, GUESTBOOK["name"]) or "anonymous"
    if not message:
        return {"ok": False, "reason": "empty"}
    words = set(re.findall(r"[a-z]+", f"{message} {name}".lower()))
    if words & RUDE:
        return {"ok": False, "reason": "rude"}
    now = now_ms()
    ip = client_ip(request)
    who = [body.visitor, ip_hash(ip)] if ip else [body.visitor]
    await db.signers.delete_many({"ts": {"$lte": now - GUESTBOOK["cooldown_ms"]}})
    if await db.signers.count_documents({"who": {"$in": who}}) > 0:
        return {"ok": False, "reason": "cooldown"}
    await db.signers.insert_many([{"who": w, "ts": now} for w in who])
    city = await city_for(ip)
    entry_id = await next_id("guestbook_id")
    await db.guestbook.insert_one({
        "id": entry_id, "ts": now, "name": name, "message": message, "city": city, "who": who[0], "hidden": False,
    })
    entry = GuestbookEntry(id=entry_id, name=name, message=message, place=city, ago="just now")
    return {"ok": True, "entry": entry.model_dump()}


# ------------------------------------------------------------- now playing ---
_track_cache: dict = {"at": 0, "track": None}


@api.get("/now-playing", response_model=Optional[Track])
async def now_playing():
    if _track_cache["track"] and time.time() - _track_cache["at"] < 3600:
        return _track_cache["track"]
    try:
        async with httpx.AsyncClient(timeout=6) as http:
            r = await http.get("https://itunes.apple.com/search", params={"term": TRACK_QUERY, "entity": "song", "limit": 1})
            items = r.json().get("results", [])
    except Exception as exc:
        logger.info("itunes lookup failed: %s", exc)
        return _track_cache["track"]
    if not items:
        return None
    item = items[0]
    art = item.get("artworkUrl100", "")
    track = Track(
        name=item.get("trackName", "").lower(),
        artist=item.get("artistName", "").lower(),
        url=item.get("trackViewUrl", ""),
        cover=art.replace("100x100bb", "300x300bb") if art else None,
        thumb="art" if art else None,
        previewUrl=item.get("previewUrl"),
    )
    _track_cache.update(at=time.time(), track=track, art=art)
    return track


@api.get("/now-playing/art")
async def now_playing_art():
    if not _track_cache.get("art"):
        await now_playing()
    art = _track_cache.get("art")
    if not art:
        raise HTTPException(404)
    async with httpx.AsyncClient(timeout=6) as http:
        r = await http.get(art)
    return Response(r.content, media_type=r.headers.get("content-type", "image/jpeg"), headers={"Cache-Control": "public, max-age=3600"})


# ------------------------------------------------------------------ github ---
GITHUB_HEADERS = {"Accept": "application/vnd.github+json", "User-Agent": f"{SITE} (https://{SITE})"}
DAY_TAG_RE = re.compile(r'<[^>]*data-date="\d{4}-\d{2}-\d{2}"[^>]*>')
DATE_RE = re.compile(r'data-date="(\d{4}-\d{2}-\d{2})"')
LEVEL_RE = re.compile(r'data-level="([0-4])"')
TOTAL_RE = re.compile(r"([\d,]+)\s+contributions?\s+in the last year")
_github_cache: dict = {}


def cached(key: str, ttl: int):
    hit = _github_cache.get(key)
    return hit["data"] if hit and time.time() - hit["at"] < ttl else None


def remember(key: str, data):
    _github_cache[key] = {"at": time.time(), "data": data}
    return data


def one_liner(text: Optional[str]) -> str:
    text = (text or "").strip().lower()
    text = re.split(r"\s+[-—–]\s+|\.\s|\s\|\s", text)[0].rstrip(".")
    if len(text) <= 36:
        return text
    cuts = [m.start() for m in re.finditer(r",\s|;\s|\s+with\s|\s+that\s|\s+for\s|\s+and\s", text) if m.start() <= 36]
    if cuts and max(cuts) >= 16:
        return text[: max(cuts)].rstrip(",;")
    return text[:34].rsplit(" ", 1)[0] + "…"


@api.get("/github/projects")
async def github_projects():
    if (hit := cached("projects", 6 * 3600)) is not None:
        return hit
    try:
        async with httpx.AsyncClient(timeout=6, headers=GITHUB_HEADERS) as http:
            r = await http.get(f"https://api.github.com/users/{GITHUB_USER}/repos", params={"per_page": 100, "sort": "pushed"})
            repos = r.json() if r.status_code == 200 else []
    except Exception as exc:
        logger.info("github repos failed: %s", exc)
        repos = []
    own = [x for x in repos if isinstance(x, dict) and not x.get("fork") and x.get("description")]
    own.sort(key=lambda x: (x.get("stargazers_count", 0), x.get("pushed_at", "")), reverse=True)
    top = [
        {
            "name": x["name"].lower(),
            "description": one_liner(x.get("description")),
            "href": x["html_url"],
            "stars": x.get("stargazers_count", 0),
            "spare": i == 1,
        }
        for i, x in enumerate(own[:3])
    ]
    return remember("projects", top) if top else (cached("projects", 10**9) or [])


def parse_contributions(html: str):
    days = {}
    for tag in DAY_TAG_RE.findall(html):
        date, level = DATE_RE.search(tag), LEVEL_RE.search(tag)
        if date and level:
            days[date.group(1)] = int(level.group(1))
    total = TOTAL_RE.search(html)
    if len(days) < 365 or not total:
        return None
    weeks: list[list[int]] = []
    for date in sorted(days):
        day = (datetime.strptime(date, "%Y-%m-%d").weekday() + 1) % 7
        if day == 0 or not weeks:
            weeks.append([-1] * 7)
        weeks[-1][day] = days[date]
    return {"total": int(total.group(1).replace(",", "")), "weeks": weeks}


@api.get("/github/contributions")
async def github_contributions():
    if (hit := cached("contributions", 3600)) is not None:
        return hit
    try:
        async with httpx.AsyncClient(timeout=6, headers={**GITHUB_HEADERS, "Accept": "text/html"}) as http:
            r = await http.get(f"https://github.com/users/{GITHUB_USER}/contributions")
            data = parse_contributions(r.text) if r.status_code == 200 else None
    except Exception as exc:
        logger.info("github contributions failed: %s", exc)
        data = None
    if data:
        return remember("contributions", data)
    stale = cached("contributions", 10**9)
    if stale:
        return stale
    raise HTTPException(502, "github unavailable")


# ------------------------------------------------------------------- posts ---
POSTS_DIR = ROOT_DIR / "posts"


def parse_post(path: Path) -> Post:
    raw = path.read_text(encoding="utf-8")
    meta: dict = {}
    body = raw
    if raw.startswith("---"):
        _, front, body = raw.split("---", 2)
        for line in front.strip().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip().strip('"')
    date = meta.get("date", "2026-01-01")
    words = len(re.findall(r"\w+", body))
    return Post(
        slug=path.stem,
        title=meta.get("title", path.stem),
        date=date,
        dateLabel=datetime.strptime(date, "%Y-%m-%d").strftime("%b %Y").lower(),
        description=meta.get("description", ""),
        readingMinutes=max(1, round(words / 220)),
        sample=meta.get("sample", "false").lower() == "true",
        content=body.strip(),
    )


def all_posts() -> list[Post]:
    posts = [parse_post(p) for p in POSTS_DIR.glob("*.md")]
    return sorted(posts, key=lambda p: p.date, reverse=True)


@api.get("/posts", response_model=list[PostMeta])
async def list_posts():
    return [PostMeta(**p.model_dump(exclude={"content"})) for p in all_posts()]


@api.get("/posts/{slug}", response_model=Post)
async def get_post(slug: str):
    path = POSTS_DIR / f"{slug}.md"
    if not re.match(r"^[a-z0-9-]+$", slug) or not path.exists():
        raise HTTPException(404, "no such post")
    return parse_post(path)


@api.get("/")
async def root():
    return {"message": f"{SITE} api"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")],
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.on_event("startup")
async def ensure_indexes():
    await db.visits.create_index("ts")
    await db.visits.create_index("visitor")
    await db.visitors.create_index("visitor", unique=True)
    await db.greeters.create_index([("month", 1), ("visitor", 1)], unique=True)
    await db.signers.create_index("who")
    await db.guestbook.create_index([("hidden", 1), ("ts", -1)])
    await db.counters.create_index("key", unique=True)
    await db.paths.create_index("path", unique=True)
    await db.geo_cache.create_index("key", unique=True)
    await db.geo_cache.create_index("at", expireAfterSeconds=7 * 24 * 3600)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
