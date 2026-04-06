import os
import tempfile
import io
import secrets
import json
from uuid import uuid4
from datetime import datetime, timezone
from typing import Literal, Optional, Any

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from openai import OpenAI

import re
from datetime import timedelta
from bs4 import BeautifulSoup



load_dotenv()

if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError("OPENAI_API_KEY is missing in backend/.env")

client = OpenAI()

app = FastAPI(title="UniSync Chat Backend")

_default_cors_origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_extra_origins = [
    origin.strip()
    for origin in os.getenv("ALLOW_ORIGINS", "").split(",")
    if origin.strip()
]
_cors_origins = list(dict.fromkeys(_default_cors_origins + _extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Models
# -------------------------

class ReasoningStep(BaseModel):
    label: str
    detail: str


class Message(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    timestamp: str
    reasoningSummary: list[ReasoningStep] = Field(default_factory=list)
    confidence: Optional[Literal["high", "partial"]] = None
    sourcesChecked: list[str] = Field(default_factory=list)
    lastSynced: Optional[str] = None


class Conversation(BaseModel):
    id: str
    title: str
    lastMessage: str
    timestamp: str
    messages: list[Message] = Field(default_factory=list)


class CreateConversationResponse(Conversation):
    pass


class SendMessageRequest(BaseModel):
    content: str


class SendMessageResponse(BaseModel):
    assistant: str
    message: Message


class TranscriptionResponse(BaseModel):
    text: str


class SpeechRequest(BaseModel):
    text: str
    voice: str = "alloy"
    speed: float = 1.0


class PrivacyUsageResponse(BaseModel):
    totalConversations: int
    totalMessages: int
    userMessages: int
    assistantMessages: int
    localStorageKeysExpected: list[str]
    backendStores: list[str]
    llmProvider: str
    modelUsed: str
    retentionNote: str
    exportedAt: str


class PrivacyExportResponse(BaseModel):
    exportedAt: str
    settingsHint: str
    usage: PrivacyUsageResponse
    conversations: list[Conversation]


class CanvasConnectRequest(BaseModel):
    canvasBaseUrl: str
    accessToken: str


class CanvasStatusResponse(BaseModel):
    connected: bool
    user: Optional[dict] = None


class OutlookConnectRequest(BaseModel):
    accessToken: str


class OutlookStatusResponse(BaseModel):
    connected: bool
    user: Optional[dict] = None


# -------------------------
# In-memory store
# -------------------------

conversations_store: dict[str, Conversation] = {}
canvas_session_store: dict[str, dict] = {}
outlook_session_store: dict[str, dict] = {}

# -------------------------
# Helpers
# -------------------------

CANVAS_SESSION_COOKIE = "unisync_canvas_sid"
OUTLOOK_SESSION_COOKIE = "unisync_outlook_sid"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_title(text: str) -> str:
    text = text.strip()
    if not text:
        return "New Chat"
    return text[:40] + ("..." if len(text) > 40 else "")


def get_canvas_session_id(request: Request) -> Optional[str]:
    return request.cookies.get(CANVAS_SESSION_COOKIE)


def get_outlook_session_id(request: Request) -> Optional[str]:
    return request.cookies.get(OUTLOOK_SESSION_COOKIE)


def get_canvas_credentials(request: Request) -> Optional[dict]:
    session_id = get_canvas_session_id(request)
    if not session_id:
        return None
    return canvas_session_store.get(session_id)


def get_outlook_credentials(request: Request) -> Optional[dict]:
    session_id = get_outlook_session_id(request)
    if not session_id:
        return None
    return outlook_session_store.get(session_id)


def require_canvas_credentials(request: Request) -> dict:
    creds = get_canvas_credentials(request)
    if not creds:
        raise HTTPException(status_code=401, detail="Canvas not connected for this session")
    return creds


def require_outlook_credentials(request: Request) -> dict:
    creds = get_outlook_credentials(request)
    if not creds:
        raise HTTPException(status_code=401, detail="Outlook not connected for this session")
    return creds




def canvas_get(
    creds: dict,
    path: str,
    params: Optional[dict] = None,
    timeout: int = 15,
):
    try:
        response = requests.get(
            f"{creds['base_url']}{path}",
            headers={"Authorization": f"Bearer {creds['token']}"},
            params=params or {},
            timeout=timeout,
        )
        return response
    except requests.RequestException:
        raise HTTPException(status_code=500, detail="Failed to reach Canvas")


def graph_get(
    access_token: str,
    path: str,
    params: Optional[dict] = None,
    timeout: int = 20,
):
    try:
        response = requests.get(
            f"https://graph.microsoft.com/v1.0{path}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            params=params or {},
            timeout=timeout,
        )
        return response
    except requests.RequestException:
        raise HTTPException(status_code=500, detail="Failed to reach Microsoft Graph")


def graph_post(
    access_token: str,
    path: str,
    payload: dict,
    timeout: int = 20,
):
    try:
        response = requests.post(
            f"https://graph.microsoft.com/v1.0{path}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=timeout,
        )
        return response
    except requests.RequestException:
        raise HTTPException(status_code=500, detail="Failed to reach Microsoft Graph")


def safe_json(response: requests.Response) -> Any:
    try:
        return response.json()
    except Exception:
        return None


def get_usage_snapshot() -> PrivacyUsageResponse:
    conversations = list(conversations_store.values())
    total_messages = sum(len(c.messages) for c in conversations)
    user_messages = sum(
        1 for c in conversations for m in c.messages if m.role == "user"
    )
    assistant_messages = sum(
        1 for c in conversations for m in c.messages if m.role == "assistant"
    )

    return PrivacyUsageResponse(
        totalConversations=len(conversations),
        totalMessages=total_messages,
        userMessages=user_messages,
        assistantMessages=assistant_messages,
        localStorageKeysExpected=[
            "unisync_settings",
            "token",
            "unisync_conversations",
            "unisync_canvas_base_url",
            "unisync_canvas_token",
            "unisync_outlook_token",
        ],
        backendStores=[
            "conversation metadata",
            "message history",
            "reasoning summary metadata",
            "canvas session memory",
            "outlook session memory",
        ],
        llmProvider="OpenAI",
        modelUsed="gpt-4o-mini",
        retentionNote=(
            "Current prototype stores chat data and connected session data in backend memory only "
            "while the server is running. No database persistence is enabled yet."
        ),
        exportedAt=now_iso(),
    )


def build_reasoning_summary(
    user_text: str,
    convo: Conversation,
) -> tuple[list[ReasoningStep], str, list[str], str]:
    text = user_text.lower()

    sources_checked = ["chat_history"]
    confidence = "partial"

    if any(
    word in text
    for word in [
        "assignment", "deadline", "canvas", "course", "class",
        "grade", "announcement", "syllabus"
    ]
):
        if "canvas" not in sources_checked:
            sources_checked.append("canvas")
        confidence = "high"

    if any(word in text for word in ["email", "outlook", "mail", "send email"]):
        if "outlook" not in sources_checked:
            sources_checked.append("outlook")
        confidence = "high"

    if any(word in text for word in ["my calendar", "meeting", "my schedule", "class schedule"]):
        if "calendar" not in sources_checked:
            sources_checked.append("calendar")
        confidence = "high"
    
    steps = [
        ReasoningStep(
            label="Interpret request",
            detail="Identified the user's intent from the latest message.",
        ),
        ReasoningStep(
            label="Check context",
            detail=f"Considered {len(convo.messages)} messages in the current conversation.",
        ),
        ReasoningStep(
            label="Select sources",
            detail=f"Prepared likely data sources: {', '.join(sources_checked)}.",
        ),
        ReasoningStep(
            label="Generate answer",
            detail="Produced a concise response tailored for a university student workflow.",
        ),
    ]

    return steps, confidence, sources_checked, now_iso()


# -------------------------
# Canvas Data Helpers
# -------------------------

@app.get("/events/uc/debug")
def get_uc_public_events_debug():
    return {
        "all_events": scrape_uc_public_events(),
        "today_events": filter_events_for_today(scrape_uc_public_events()),
        "week_events": filter_events_for_week(scrape_uc_public_events()),
    }

def get_canvas_courses_data(creds: dict, include_grades: bool = False) -> list[dict]:
    params = {"enrollment_state": "active"}
    if include_grades:
        params["include[]"] = "total_scores"

    response = canvas_get(creds, "/api/v1/courses", params=params)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch courses")

    return safe_json(response) or []


def get_canvas_assignments_data(creds: dict) -> list[dict]:
    response = canvas_get(creds, "/api/v1/users/self/todo")
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch assignments")

    return safe_json(response) or []


def get_canvas_announcements_data(creds: dict) -> list[dict]:
    courses = get_canvas_courses_data(creds, include_grades=False)
    context_codes = [f"course_{course['id']}" for course in courses if course.get("id")]

    if not context_codes:
        return []

    response = canvas_get(
        creds,
        "/api/v1/announcements",
        params={
            "context_codes[]": context_codes,
            "active_only": True,
            "latest_only": False,
        },
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch announcements")

    return safe_json(response) or []


def get_canvas_calendar_events_data(creds: dict) -> list[dict]:
    response = canvas_get(
        creds,
        "/api/v1/calendar_events",
        params={
            "type": "event",
            "all_events": True,
            "per_page": 50,
        },
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch calendar events")

    return safe_json(response) or []


def get_canvas_dashboard_bundle(creds: dict) -> dict:
    courses_with_grades = get_canvas_courses_data(creds, include_grades=True)
    assignments = get_canvas_assignments_data(creds)
    announcements = get_canvas_announcements_data(creds)
    events = get_canvas_calendar_events_data(creds)

    return {
        "courses": courses_with_grades,
        "assignments": assignments,
        "announcements": announcements,
        "calendar_events": events,
    }



# -------------------------
# UC Public Events Scraping Helpers
# -------------------------

UC_EVENT_SOURCES = [
    {
        "name": "Bearcats Welcome",
        "url": "https://www.uc.edu/content/uc/campus-life/welcome",
        "category": "campus-life",
    },
    {
        "name": "Student Affairs",
        "url": "https://www.uc.edu/campus-life/student-affairs/events.html",
        "category": "student-affairs",
    },
]

MONTH_NAMES = (
    "january february march april may june july august september october november december"
).split()


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def try_parse_uc_date(text: str) -> Optional[str]:
    text = clean_text(text).lower()

    month_regex = r"(" + "|".join(MONTH_NAMES) + r")\s+\d{1,2}(?:-\d{1,2})?,\s+\d{4}"
    match = re.search(month_regex, text)
    if match:
        raw = match.group(0)
        normalized = re.sub(r"(\w+\s+\d{1,2})-\d{1,2}(,\s+\d{4})", r"\1\2", raw)
        try:
            dt = datetime.strptime(normalized.title(), "%B %d, %Y")
            return dt.date().isoformat()
        except Exception:
            pass

    month_day_year_regex = r"(" + "|".join(MONTH_NAMES) + r")\s+\d{1,2},\s+\d{4}"
    match = re.search(month_day_year_regex, text)
    if match:
        try:
            dt = datetime.strptime(match.group(0).title(), "%B %d, %Y")
            return dt.date().isoformat()
        except Exception:
            pass

    return None


def try_parse_time_from_text(text: str) -> Optional[str]:
    text = clean_text(text)
    match = re.search(
        r"(\d{1,2}(?::\d{2})?\s?(?:am|pm))(?:\s?-\s?(\d{1,2}(?::\d{2})?\s?(?:am|pm)))?",
        text,
        re.IGNORECASE,
    )
    if not match:
        return None

    start = match.group(1)
    end = match.group(2)
    if end:
        return f"{start} - {end}"
    return start


def fetch_public_page(url: str) -> str:
    try:
        response = requests.get(
            url,
            headers={
                "User-Agent": "UniSync/1.0 (+public-events-fetcher)"
            },
            timeout=15,
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to fetch UC events page: {url}",
            )
        return response.text
    except requests.RequestException:
        raise HTTPException(status_code=500, detail=f"Failed to reach UC page: {url}")


def scrape_bearcats_welcome(html: str, source_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    events = []

    current_date = None

    for tag in soup.find_all(["h3", "h4", "h5"]):
        text = clean_text(tag.get_text(" ", strip=True))
        if not text:
            continue

        parsed_date = try_parse_uc_date(text)
        if parsed_date:
            current_date = parsed_date
            continue

        # event headings often look like "9 am | Donuts in the Den"
        if "|" in text:
            parts = [part.strip() for part in text.split("|", 1)]
            if len(parts) == 2:
                time_text, title = parts
                location = None
                description_parts = []

                sibling = tag.find_next_sibling()
                steps = 0
                while sibling and steps < 3:
                    if sibling.name in ["h2", "h3", "h4", "h5"]:
                        break
                    sibling_text = clean_text(sibling.get_text(" ", strip=True))
                    if sibling_text:
                        if not location:
                            location = sibling_text
                        else:
                            description_parts.append(sibling_text)
                    sibling = sibling.find_next_sibling()
                    steps += 1

                events.append({
                    "title": title,
                    "date": current_date,
                    "time": time_text,
                    "location": location,
                    "description": " ".join(description_parts) if description_parts else None,
                    "source": source_url,
                    "category": "campus-life",
                })

    return events


def scrape_student_affairs_events(html: str, source_url: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    events = []

    for heading in soup.find_all(["h2", "h3"]):
        title = clean_text(heading.get_text(" ", strip=True))
        if not title or title.lower() in {"student affairs", "signature celebrations", "signature events"}:
            continue

        description_parts = []
        sibling = heading.find_next_sibling()
        steps = 0
        while sibling and steps < 3:
            if sibling.name in ["h1", "h2", "h3"]:
                break
            text = clean_text(sibling.get_text(" ", strip=True))
            if text:
                description_parts.append(text)
            sibling = sibling.find_next_sibling()
            steps += 1

        description = " ".join(description_parts[:2])

        events.append({
            "title": title,
            "date": try_parse_uc_date(description or title),
            "time": try_parse_time_from_text(description or title),
            "location": None,
            "description": description or None,
            "source": source_url,
            "category": "student-affairs",
        })

    return events


def scrape_uc_public_events() -> list[dict]:
    all_events = []

    for source in UC_EVENT_SOURCES:
        html = fetch_public_page(source["url"])

        if "welcome" in source["url"]:
            events = scrape_bearcats_welcome(html, source["url"])
        else:
            events = scrape_student_affairs_events(html, source["url"])

        all_events.extend(events)

    # dedupe by title+date
    seen = set()
    deduped = []
    for event in all_events:
        key = (event.get("title"), event.get("date"), event.get("time"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(event)

    return deduped


def filter_events_for_today(events: list[dict]) -> list[dict]:
    today = datetime.now().date().isoformat()
    return [event for event in events if event.get("date") == today]


def filter_events_for_week(events: list[dict]) -> list[dict]:
    today = datetime.now().date()
    end_date = today + timedelta(days=7)

    filtered = []
    for event in events:
        event_date = event.get("date")
        if not event_date:
            continue
        try:
            parsed = datetime.fromisoformat(event_date).date()
            if today <= parsed <= end_date:
                filtered.append(event)
        except Exception:
            continue

    return filtered

def should_use_uc_events(user_text: str) -> bool:
    text = user_text.lower()
    return any(phrase in text for phrase in [
        "events near me",
        "what's happening",
        "what is happening",
        "campus events",
        "uc events",
        "events today",
        "events this week",
        "things to do",
        "what events are happening"
    ])


def should_use_canvas_calendar(user_text: str) -> bool:
    text = user_text.lower()
    return any(phrase in text for phrase in [
        "my calendar",
        "my schedule",
        "my class schedule",
        "my assignments",
        "my deadlines",
        "canvas calendar",
        "my meetings"
    ])


# -------------------------
# Routes
# -------------------------

@app.get("/health")
def health():
    return {"status": "ok"}
    



# -------------------------
# Canvas Routes
# -------------------------

# -------------------------
# UC Public Events Routes
# -------------------------

@app.get("/events/uc/all")
def get_uc_public_events():
    return scrape_uc_public_events()


@app.get("/events/uc/today")
def get_uc_public_events_today():
    events = scrape_uc_public_events()
    return filter_events_for_today(events)


@app.get("/events/uc/week")
def get_uc_public_events_week():
    events = scrape_uc_public_events()
    return filter_events_for_week(events)

@app.post("/canvas/connect")
def connect_canvas(body: CanvasConnectRequest, response: Response):
    canvas_base_url = body.canvasBaseUrl.strip().rstrip("/")
    access_token = body.accessToken.strip()

    if not canvas_base_url or not access_token:
        raise HTTPException(
            status_code=400,
            detail="Canvas base URL and access token are required",
        )

    verify_response = canvas_get(
        {"base_url": canvas_base_url, "token": access_token},
        "/api/v1/users/self",
    )

    if verify_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Canvas credentials")

    user_data = verify_response.json()
    session_id = secrets.token_urlsafe(32)

    canvas_session_store[session_id] = {
        "base_url": canvas_base_url,
        "token": access_token,
        "user_name": user_data.get("name"),
        "user_id": user_data.get("id"),
        "connected_at": now_iso(),
    }

    response.set_cookie(
        key=CANVAS_SESSION_COOKIE,
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 8,
    )

    return {
        "success": True,
        "user": {
            "name": user_data.get("name"),
            "id": user_data.get("id"),
        },
    }


@app.get("/canvas/status", response_model=CanvasStatusResponse)
def canvas_status(request: Request):
    creds = get_canvas_credentials(request)

    if not creds:
        return CanvasStatusResponse(connected=False)

    return CanvasStatusResponse(
        connected=True,
        user={
            "name": creds.get("user_name"),
            "id": creds.get("user_id"),
        },
    )


@app.get("/canvas/courses")
def get_canvas_courses(request: Request):
    creds = require_canvas_credentials(request)
    return get_canvas_courses_data(creds, include_grades=False)


@app.get("/canvas/assignments")
def get_canvas_assignments(request: Request):
    creds = require_canvas_credentials(request)
    return get_canvas_assignments_data(creds)


@app.get("/canvas/announcements")
def get_canvas_announcements(request: Request):
    creds = require_canvas_credentials(request)
    return get_canvas_announcements_data(creds)


@app.get("/canvas/grades")
def get_canvas_grades(request: Request):
    creds = require_canvas_credentials(request)
    return get_canvas_courses_data(creds, include_grades=True)


@app.get("/canvas/calendar")
def get_canvas_calendar(request: Request):
    creds = require_canvas_credentials(request)
    return get_canvas_calendar_events_data(creds)


@app.get("/canvas/dashboard")
def get_canvas_dashboard(request: Request):
    creds = require_canvas_credentials(request)
    return get_canvas_dashboard_bundle(creds)


@app.post("/canvas/disconnect")
def disconnect_canvas(request: Request, response: Response):
    session_id = get_canvas_session_id(request)

    if session_id and session_id in canvas_session_store:
        del canvas_session_store[session_id]

    response.delete_cookie(CANVAS_SESSION_COOKIE)

    return {"success": True}


# -------------------------
# Outlook / Graph Helpers
# -------------------------

def get_outlook_me(access_token: str) -> dict:
    response = graph_get(access_token, "/me")
    if response.status_code != 200:
        detail = safe_json(response) or response.text
        raise HTTPException(status_code=response.status_code, detail=f"Invalid Outlook token: {detail}")
    return safe_json(response) or {}


def get_outlook_messages(
    access_token: str,
    top: int = 10,
    unread_only: bool = False,
) -> list[dict]:
    params = {
        "$top": max(1, min(top, 25)),
        "$select": "id,subject,from,receivedDateTime,bodyPreview,isRead,webLink",
        "$orderby": "receivedDateTime DESC",
    }

    if unread_only:
        params["$filter"] = "isRead eq false"

    response = graph_get(access_token, "/me/messages", params=params)

    if response.status_code != 200:
        detail = safe_json(response) or response.text
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to fetch Outlook messages: {detail}",
        )

    data = safe_json(response) or {}
    items = data.get("value", [])

    normalized = []
    for item in items:
        sender = item.get("from", {}) or {}
        email_addr = sender.get("emailAddress", {}) or {}

        normalized.append({
            "id": item.get("id"),
            "subject": item.get("subject"),
            "from_name": email_addr.get("name"),
            "from_email": email_addr.get("address"),
            "received_at": item.get("receivedDateTime"),
            "preview": item.get("bodyPreview"),
            "is_read": item.get("isRead"),
            "web_link": item.get("webLink"),
        })

    return normalized


def read_outlook_message(
    access_token: str,
    message_id: str,
) -> dict:
    params = {
        "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,isRead,webLink",
    }

    response = graph_get(access_token, f"/me/messages/{message_id}", params=params)

    if response.status_code != 200:
        detail = safe_json(response) or response.text
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to read Outlook message: {detail}",
        )

    item = safe_json(response) or {}

    sender = item.get("from", {}) or {}
    sender_email = sender.get("emailAddress", {}) or {}

    def normalize_recipients(recipients: list[dict] | None) -> list[dict]:
        result = []
        for rec in recipients or []:
            email_addr = (rec or {}).get("emailAddress", {}) or {}
            result.append({
                "name": email_addr.get("name"),
                "email": email_addr.get("address"),
            })
        return result

    return {
        "id": item.get("id"),
        "subject": item.get("subject"),
        "from_name": sender_email.get("name"),
        "from_email": sender_email.get("address"),
        "to": normalize_recipients(item.get("toRecipients")),
        "cc": normalize_recipients(item.get("ccRecipients")),
        "received_at": item.get("receivedDateTime"),
        "body_content_type": (item.get("body") or {}).get("contentType"),
        "body": (item.get("body") or {}).get("content"),
        "is_read": item.get("isRead"),
        "web_link": item.get("webLink"),
    }


def send_outlook_email_via_graph(
    access_token: str,
    to: str,
    subject: str,
    body: str,
    cc: Optional[str] = None,
    bcc: Optional[str] = None,
    save_to_sent_items: bool = True,
) -> dict:
    def build_recipients(csv_text: Optional[str]) -> list[dict]:
        if not csv_text:
            return []
        emails = [item.strip() for item in csv_text.split(",") if item.strip()]
        return [{"emailAddress": {"address": email}} for email in emails]

    payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "Text",
                "content": body,
            },
            "toRecipients": build_recipients(to),
            "ccRecipients": build_recipients(cc),
            "bccRecipients": build_recipients(bcc),
        },
        "saveToSentItems": save_to_sent_items,
    }

    response = graph_post(access_token, "/me/sendMail", payload)

    if response.status_code not in (200, 202):
        detail = safe_json(response) or response.text
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Failed to send Outlook email: {detail}",
        )

    return {
        "success": True,
        "status_code": response.status_code,
        "message": "Email sent successfully through Outlook.",
        "to": to,
        "subject": subject,
        "sent_at": now_iso(),
    }


# -------------------------
# Tool Calling
# -------------------------

def get_tools_schema():
    return [
        {
            "type": "function",
            "function": {
                "name": "get_canvas_courses",
                "description": "Get the user's active Canvas courses.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "include_grades": {
                            "type": "boolean",
                            "description": "Whether to include course grade info."
                        }
                    },
                    "required": []
                }
            }
        },
        {
    "type": "function",
    "function": {
        "name": "get_uc_public_events",
        "description": "Get public University of Cincinnati campus events, including today or this week.",
        "parameters": {
            "type": "object",
            "properties": {
                "timeframe": {
                    "type": "string",
                    "enum": ["today", "week", "all"],
                    "description": "Which UC events timeframe to fetch."
                }
            },
            "required": []
        }
    }
},
        {
            "type": "function",
            "function": {
                "name": "get_canvas_assignments",
                "description": "Get the user's upcoming Canvas assignments or todo items.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_canvas_announcements",
                "description": "Get recent Canvas announcements for the user's courses.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_canvas_grades",
                "description": "Get the user's Canvas courses including grades.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_canvas_calendar",
                "description": "Get the user's Canvas calendar events.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_canvas_dashboard",
                "description": "Get all major Canvas dashboard data including courses, assignments, announcements, and calendar events.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_privacy_usage",
                "description": "Get current local usage and storage summary for the UniSync backend.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_outlook_profile",
                "description": "Get the currently connected Outlook user's profile.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_outlook_messages",
                "description": "Get recent emails from the connected Outlook account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "top": {
                            "type": "integer",
                            "description": "How many recent emails to fetch."
                        },
                        "unread_only": {
                            "type": "boolean",
                            "description": "Whether to fetch only unread emails."
                        }
                    },
                    "required": []
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "read_outlook_message",
                "description": "Read a specific Outlook email by message id.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "message_id": {
                            "type": "string",
                            "description": "The Outlook message id."
                        }
                    },
                    "required": ["message_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "send_outlook_email",
                "description": "Send an email using the connected Outlook account.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "to": {
                            "type": "string",
                            "description": "Comma-separated recipient email addresses."
                        },
                        "subject": {
                            "type": "string",
                            "description": "Email subject."
                        },
                        "body": {
                            "type": "string",
                            "description": "Plain text email body."
                        },
                        "cc": {
                            "type": "string",
                            "description": "Optional comma-separated CC email addresses."
                        },
                        "bcc": {
                            "type": "string",
                            "description": "Optional comma-separated BCC email addresses."
                        },
                        "save_to_sent_items": {
                            "type": "boolean",
                            "description": "Whether to save a copy to Sent Items."
                        }
                    },
                    "required": ["to", "subject", "body"]
                }
            }
        }
    ]


def execute_tool(tool_name: str, args: dict, request: Request):
    try:
        if tool_name.startswith("get_canvas"):
            try:
                canvas_creds = require_canvas_credentials(request)
            except HTTPException as e:
                return {"error": e.detail}
        else:
            canvas_creds = None

        if tool_name in (
            "get_outlook_profile",
            "get_outlook_messages",
            "read_outlook_message",
            "send_outlook_email",
        ):
            try:
                outlook_creds = require_outlook_credentials(request)
            except HTTPException as e:
                return {"error": e.detail}
        else:
            outlook_creds = None

        if tool_name == "get_canvas_courses":
            include_grades = args.get("include_grades", False)
            return get_canvas_courses_data(canvas_creds, include_grades=include_grades)

        elif tool_name == "get_canvas_assignments":
            return get_canvas_assignments_data(canvas_creds)

        elif tool_name == "get_canvas_announcements":
            return get_canvas_announcements_data(canvas_creds)

        elif tool_name == "get_canvas_grades":
            return get_canvas_courses_data(canvas_creds, include_grades=True)

        elif tool_name == "get_canvas_calendar":
            return get_canvas_calendar_events_data(canvas_creds)

        elif tool_name == "get_canvas_dashboard":
            return get_canvas_dashboard_bundle(canvas_creds)

        elif tool_name == "get_privacy_usage":
            return get_usage_snapshot().model_dump()

        elif tool_name == "get_outlook_profile":
            return get_outlook_me(outlook_creds["token"])

        elif tool_name == "get_outlook_messages":
            return get_outlook_messages(
                access_token=outlook_creds["token"],
                top=args.get("top", 10),
                unread_only=args.get("unread_only", False),
            )

        elif tool_name == "read_outlook_message":
            if "message_id" not in args:
                return {"error": "Missing required argument: message_id"}
            return read_outlook_message(
                access_token=outlook_creds["token"],
                message_id=args["message_id"],
            )

        elif tool_name == "send_outlook_email":
            missing = [field for field in ("to", "subject", "body") if not args.get(field)]
            if missing:
                return {"error": f"Missing required argument(s): {', '.join(missing)}"}
            return send_outlook_email_via_graph(
                access_token=outlook_creds["token"],
                to=args["to"],
                subject=args["subject"],
                body=args["body"],
                cc=args.get("cc"),
                bcc=args.get("bcc"),
                save_to_sent_items=args.get("save_to_sent_items", True),
            )

        elif tool_name == "get_uc_public_events":
            timeframe = args.get("timeframe", "all")
            events = scrape_uc_public_events()

            if timeframe == "week":
                week_events = filter_events_for_week(events)
                return week_events if week_events else events

            return events

        else:
            return {"error": f"Unknown tool: {tool_name}"}

    except HTTPException as e:
        return {"error": e.detail}
    except Exception as e:
        print(f"TOOL ERROR [{tool_name}]:", repr(e))
        return {"error": str(e)}


def run_agent_with_tools(convo: Conversation, request: Request) -> str:
    latest_user_message = convo.messages[-1].content if convo.messages else ""

    if should_use_uc_events(latest_user_message):
        all_events = scrape_uc_public_events()
        print("SCRAPED EVENTS COUNT:", len(all_events))
        print("SCRAPED EVENTS SAMPLE:", all_events[:10])

        result = all_events
        print("ALL EVENTS COUNT:", len(result))
        print("ALL EVENTS SAMPLE:", result[:10])

        if not result:
            return "I checked the public UC campus events scraper and I could not find any public UC events right now."

        lines = []
        for event in result[:10]:
            title = event.get("title", "Untitled event")
            time = event.get("time")
            location = event.get("location")
            source = event.get("source")

            parts = [f"• {title}"]
            if time:
                parts.append(f"Time: {time}")
            if location:
                parts.append(f"Location: {location}")
            if source:
                parts.append(f"Source: {source}")

            lines.append(" | ".join(parts))

        return "Here are some UC public events I found:\n\n" + "\n".join(lines)

    if should_use_canvas_calendar(latest_user_message):
        result = execute_tool("get_canvas_calendar", {}, request)
        return json.dumps(result, default=str)

    system_message = (
        "You are UniSync, a helpful academic assistant for university students. "
        "Be clear, concise, practical, and friendly. "
        "Use Canvas tools only for personal academic data like courses, assignments, grades, announcements, and personal schedule. "
        "Use the UC public events tool for public campus events, things happening on campus, and events near the user. "
        "Do not use Canvas calendar for public campus events."
    )

    messages = [{"role": "system", "content": system_message}]
    messages.extend([{"role": msg.role, "content": msg.content} for msg in convo.messages])

    tools = get_tools_schema()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        tools=tools,
        tool_choice="auto",
    )

    response_message = response.choices[0].message

    if response_message.tool_calls:
        tool_outputs = []
        messages.append(response_message)

        for tool_call in response_message.tool_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments or "{}")
            tool_result = execute_tool(tool_name, tool_args, request)

            tool_outputs.append(
                {
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": tool_name,
                    "content": json.dumps(tool_result, default=str),
                }
            )

        messages.extend(tool_outputs)

        final_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
        )

        return final_response.choices[0].message.content or "I could not generate a response."



# -------------------------
# Outlook Routes
# -------------------------

@app.post("/outlook/connect")
def connect_outlook(body: OutlookConnectRequest, response: Response):
    access_token = body.accessToken.strip()

    if not access_token:
        raise HTTPException(status_code=400, detail="Outlook access token is required")

    me = get_outlook_me(access_token)
    session_id = secrets.token_urlsafe(32)

    outlook_session_store[session_id] = {
        "token": access_token,
        "user_name": me.get("displayName"),
        "user_id": me.get("id"),
        "email": me.get("mail") or me.get("userPrincipalName"),
        "connected_at": now_iso(),
    }

    response.set_cookie(
        key=OUTLOOK_SESSION_COOKIE,
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 8,
    )

    return {
        "success": True,
        "user": {
            "name": me.get("displayName"),
            "id": me.get("id"),
            "email": me.get("mail") or me.get("userPrincipalName"),
        },
    }


@app.get("/outlook/status", response_model=OutlookStatusResponse)
def outlook_status(request: Request):
    creds = get_outlook_credentials(request)

    if not creds:
        return OutlookStatusResponse(connected=False)

    return OutlookStatusResponse(
        connected=True,
        user={
            "name": creds.get("user_name"),
            "id": creds.get("user_id"),
            "email": creds.get("email"),
        },
    )


@app.get("/outlook/messages")
def get_outlook_messages_route(
    request: Request,
    top: int = 10,
    unread_only: bool = False,
):
    creds = require_outlook_credentials(request)
    return get_outlook_messages(
        access_token=creds["token"],
        top=top,
        unread_only=unread_only,
    )


@app.get("/outlook/messages/{message_id}")
def read_outlook_message_route(request: Request, message_id: str):
    creds = require_outlook_credentials(request)
    return read_outlook_message(
        access_token=creds["token"],
        message_id=message_id,
    )


@app.post("/outlook/send")
def send_outlook_direct(request: Request, payload: dict):
    creds = require_outlook_credentials(request)

    to = payload.get("to")
    subject = payload.get("subject")
    body = payload.get("body")
    cc = payload.get("cc")
    bcc = payload.get("bcc")
    save_to_sent_items = payload.get("save_to_sent_items", True)

    if not to or not subject or not body:
        raise HTTPException(status_code=400, detail="to, subject, and body are required")

    return send_outlook_email_via_graph(
        access_token=creds["token"],
        to=to,
        subject=subject,
        body=body,
        cc=cc,
        bcc=bcc,
        save_to_sent_items=save_to_sent_items,
    )


@app.post("/outlook/disconnect")
def disconnect_outlook(request: Request, response: Response):
    session_id = get_outlook_session_id(request)

    if session_id and session_id in outlook_session_store:
        del outlook_session_store[session_id]

    response.delete_cookie(OUTLOOK_SESSION_COOKIE)

    return {"success": True}



# -------------------------
# Chat Routes
# -------------------------

@app.get("/chat/conversations", response_model=list[Conversation])
def get_conversations():
    all_conversations = list(conversations_store.values())
    all_conversations.sort(key=lambda c: c.timestamp, reverse=True)
    return all_conversations


@app.post("/chat/conversations", response_model=CreateConversationResponse)
def create_conversation():
    convo_id = str(uuid4())
    convo = Conversation(
        id=convo_id,
        title="New Chat",
        lastMessage="",
        timestamp=now_iso(),
        messages=[],
    )
    conversations_store[convo_id] = convo
    return convo


@app.get("/chat/conversations/{convo_id}/messages", response_model=list[Message])
def get_messages(convo_id: str):
    convo = conversations_store.get(convo_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return convo.messages


@app.delete("/chat/conversations/{convo_id}")
def delete_conversation(convo_id: str):
    convo = conversations_store.get(convo_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    del conversations_store[convo_id]
    return {"success": True, "deletedConversationId": convo_id}


@app.post("/chat/conversations/{convo_id}/messages", response_model=SendMessageResponse)
def send_message(convo_id: str, body: SendMessageRequest, request: Request):
    convo = conversations_store.get(convo_id)
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    user_message = Message(
        id=str(uuid4()),
        role="user",
        content=body.content,
        timestamp=now_iso(),
    )
    convo.messages.append(user_message)

    reasoning_summary, confidence, sources_checked, last_synced = build_reasoning_summary(
        body.content,
        convo,
    )

    try:
        assistant_text = run_agent_with_tools(convo, request)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("OPENAI CHAT ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

    assistant_message = Message(
        id=str(uuid4()),
        role="assistant",
        content=assistant_text,
        timestamp=now_iso(),
        reasoningSummary=reasoning_summary,
        confidence=confidence,
        sourcesChecked=sources_checked,
        lastSynced=last_synced,
    )
    convo.messages.append(assistant_message)

    convo.lastMessage = assistant_text
    convo.timestamp = now_iso()

    return SendMessageResponse(
        assistant=assistant_text,
        message=assistant_message,
    )


# -------------------------
# Privacy Routes
# -------------------------

@app.get("/privacy/usage", response_model=PrivacyUsageResponse)
def privacy_usage():
    return get_usage_snapshot()


@app.get("/privacy/export", response_model=PrivacyExportResponse)
def privacy_export():
    conversations = list(conversations_store.values())
    conversations.sort(key=lambda c: c.timestamp, reverse=True)

    return PrivacyExportResponse(
        exportedAt=now_iso(),
        settingsHint=(
            "Frontend local settings are stored in browser localStorage and should be "
            "merged client-side into the final export file."
        ),
        usage=get_usage_snapshot(),
        conversations=conversations,
    )


@app.delete("/privacy/data")
def delete_all_data():
    conversations_store.clear()
    canvas_session_store.clear()
    outlook_session_store.clear()
    return {
        "success": True,
        "message": "All backend UniSync conversation and connected session data has been deleted.",
    }


# -------------------------
# Voice Routes
# -------------------------

@app.post("/voice/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    prompt: str | None = Form(default=None),
    language: str | None = Form(default=None),
):
    suffix = os.path.splitext(audio.filename or "")[1] or ".webm"

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await audio.read()
            temp_file.write(content)
            temp_path = temp_file.name

        with open(temp_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                model="gpt-4o-mini-transcribe",
                file=f,
                response_format="text",
                prompt=prompt,
                language=language,
            )

        text = transcription if isinstance(transcription, str) else getattr(transcription, "text", "")
        text = (text or "").strip()

        if not text:
            raise HTTPException(status_code=500, detail="No transcription text returned")

        return TranscriptionResponse(text=text)

    except HTTPException:
        raise
    except Exception as e:
        print("OPENAI TRANSCRIBE ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        try:
            if "temp_path" in locals() and os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass


@app.post("/voice/speak")
def speak_text(body: SpeechRequest):
    try:
        speech_response = client.audio.speech.create(
            model="gpt-4o-mini-tts",
            voice=body.voice,
            input=body.text,
            speed=body.speed,
            response_format="mp3",
        )

        audio_bytes = speech_response.read()

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=reply.mp3"},
        )

    except Exception as e:
        print("OPENAI TTS ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))