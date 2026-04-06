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


# -------------------------
# In-memory store
# -------------------------

conversations_store: dict[str, Conversation] = {}
canvas_session_store: dict[str, dict] = {}

# -------------------------
# Helpers
# -------------------------

CANVAS_SESSION_COOKIE = "unisync_canvas_sid"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_title(text: str) -> str:
    text = text.strip()
    if not text:
        return "New Chat"
    return text[:40] + ("..." if len(text) > 40 else "")


def get_canvas_session_id(request: Request) -> Optional[str]:
    return request.cookies.get(CANVAS_SESSION_COOKIE)


def get_canvas_credentials(request: Request) -> Optional[dict]:
    session_id = get_canvas_session_id(request)
    if not session_id:
        return None
    return canvas_session_store.get(session_id)


def require_canvas_credentials(request: Request) -> dict:
    creds = get_canvas_credentials(request)
    if not creds:
        raise HTTPException(status_code=401, detail="Canvas not connected for this session")
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
        ],
        backendStores=[
            "conversation metadata",
            "message history",
            "reasoning summary metadata",
            "canvas session memory",
        ],
        llmProvider="OpenAI",
        modelUsed="gpt-4o-mini",
        retentionNote=(
            "Current prototype stores chat data and Canvas session data in backend memory only "
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
            "grade", "announcement", "schedule", "timetable", "calendar"
        ]
    ):
        sources_checked.append("canvas")
        confidence = "high"

    if any(word in text for word in ["email", "outlook", "mail"]):
        sources_checked.append("email")
        confidence = "high"

    if any(word in text for word in ["calendar", "meeting", "schedule", "event"]):
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

def summarize_courses_for_prompt(courses: list[dict]) -> list[dict]:
    result = []
    for course in courses[:20]:
        result.append({
            "id": course.get("id"),
            "name": course.get("name"),
            "course_code": course.get("course_code"),
            "workflow_state": course.get("workflow_state"),
            "start_at": course.get("start_at"),
            "end_at": course.get("end_at"),
            "current_grade": course.get("enrollments", [{}])[0].get("computed_current_grade")
            if course.get("enrollments") else None,
            "current_score": course.get("enrollments", [{}])[0].get("computed_current_score")
            if course.get("enrollments") else None,
            "final_grade": course.get("enrollments", [{}])[0].get("computed_final_grade")
            if course.get("enrollments") else None,
            "final_score": course.get("enrollments", [{}])[0].get("computed_final_score")
            if course.get("enrollments") else None,
        })
    return result


def summarize_todos_for_prompt(todos: list[dict]) -> list[dict]:
    result = []
    for item in todos[:25]:
        assignment = item.get("assignment") or {}
        result.append({
            "course_name": item.get("course_name"),
            "assignment_name": assignment.get("name") or item.get("assignment_name"),
            "points_possible": assignment.get("points_possible"),
            "due_at": assignment.get("due_at"),
            "html_url": assignment.get("html_url"),
            "type": item.get("type"),
        })
    return result


def summarize_announcements_for_prompt(announcements: list[dict]) -> list[dict]:
    result = []
    for ann in announcements[:20]:
        result.append({
            "title": ann.get("title"),
            "posted_at": ann.get("posted_at"),
            "context_name": ann.get("context_name"),
            "message": (ann.get("message") or "")[:500],
        })
    return result


def summarize_calendar_events_for_prompt(events: list[dict]) -> list[dict]:
    result = []
    for event in events[:25]:
        result.append({
            "title": event.get("title"),
            "description": (event.get("description") or "")[:300],
            "start_at": event.get("start_at"),
            "end_at": event.get("end_at"),
            "location_name": event.get("location_name"),
            "context_code": event.get("context_code"),
            "type": event.get("type"),
        })
    return result


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
                "name": "get_canvas_assignments",
                "description": "Get the user's upcoming Canvas assignments / todo items.",
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
        }
    ]


def execute_tool(tool_name: str, args: dict, request: Request):
    if tool_name.startswith("get_canvas"):
        creds = require_canvas_credentials(request)
    else:
        creds = None

    if tool_name == "get_canvas_courses":
        include_grades = args.get("include_grades", False)
        return get_canvas_courses_data(creds, include_grades=include_grades)

    elif tool_name == "get_canvas_assignments":
        return get_canvas_assignments_data(creds)

    elif tool_name == "get_canvas_announcements":
        return get_canvas_announcements_data(creds)

    elif tool_name == "get_canvas_grades":
        return get_canvas_courses_data(creds, include_grades=True)

    elif tool_name == "get_canvas_calendar":
        return get_canvas_calendar_events_data(creds)

    elif tool_name == "get_canvas_dashboard":
        return get_canvas_dashboard_bundle(creds)

    elif tool_name == "get_privacy_usage":
        return get_usage_snapshot().dict()

    else:
        raise ValueError(f"Unknown tool: {tool_name}")


def run_agent_with_tools(convo: Conversation, request: Request) -> str:
    system_message = (
        "You are UniSync, a helpful academic assistant for university students. "
        "Be clear, concise, practical, and friendly. "
        "Use tools whenever live student data is needed, especially for courses, assignments, grades, announcements, deadlines, or calendar questions. "
        "If Canvas is not connected and the user asks for Canvas-specific information, clearly tell them to connect Canvas. "
        "Do not invent grades, assignments, deadlines, or announcements."
    )

    messages = [{"role": "system", "content": system_message}]
    messages.extend(
        [{"role": msg.role, "content": msg.content} for msg in convo.messages]
    )

    tools = get_tools_schema()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        tools=tools,
        tool_choice="auto",
    )

    assistant_message = response.choices[0].message

    if not assistant_message.tool_calls:
        return (assistant_message.content or "").strip() or "Sorry, I could not generate a response."

    messages.append({
        "role": "assistant",
        "content": assistant_message.content or "",
        "tool_calls": [
            {
                "id": tc.id,
                "type": "function",
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                },
            }
            for tc in assistant_message.tool_calls
        ],
    })

    for tool_call in assistant_message.tool_calls:
        tool_name = tool_call.function.name
        try:
            args = json.loads(tool_call.function.arguments or "{}")
        except json.JSONDecodeError:
            args = {}

        try:
            result = execute_tool(tool_name, args, request)
            tool_result = json.dumps(result, default=str)
        except Exception as e:
            tool_result = json.dumps({"error": str(e)})

        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": tool_result,
        })

    final_response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )

    return (final_response.choices[0].message.content or "").strip() or "Sorry, I could not generate a response."


# -------------------------
# Routes
# -------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# -------------------------
# Canvas Routes
# -------------------------

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

    user_messages = [m for m in convo.messages if m.role == "user"]
    if len(user_messages) == 1:
        convo.title = make_title(body.content)

    reasoning_steps, confidence, sources_checked, last_synced = build_reasoning_summary(
        body.content,
        convo,
    )

    try:
        assistant_text = run_agent_with_tools(convo, request)
    except Exception as e:
        print("OPENAI CHAT ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

    assistant_message = Message(
        id=str(uuid4()),
        role="assistant",
        content=assistant_text,
        timestamp=now_iso(),
        reasoningSummary=reasoning_steps,
        confidence=confidence,
        sourcesChecked=sources_checked,
        lastSynced=last_synced,
    )

    convo.messages.append(assistant_message)
    convo.lastMessage = assistant_text
    convo.timestamp = now_iso()
    conversations_store[convo_id] = convo

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
    return {
        "success": True,
        "message": "All backend UniSync conversation and Canvas session data has been deleted.",
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