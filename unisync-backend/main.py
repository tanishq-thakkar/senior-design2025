import os
import tempfile
import io
import secrets
from uuid import uuid4
from datetime import datetime, timezone
from typing import Literal, Optional

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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
        ],
        backendStores=[
            "conversation metadata",
            "message history",
            "reasoning summary metadata",
        ],
        llmProvider="OpenAI",
        modelUsed="gpt-4o-mini",
        retentionNote=(
            "Current prototype stores chat data in backend memory only while the server is running. "
            "No database persistence is enabled yet."
        ),
        exportedAt=now_iso(),
    )


def build_reasoning_summary(user_text: str, convo: Conversation) -> tuple[list[ReasoningStep], str, list[str], str]:
    text = user_text.lower()

    sources_checked = ["chat_history"]
    confidence = "partial"

    if any(word in text for word in ["assignment", "deadline", "canvas", "course", "class"]):
        sources_checked.append("canvas")
        confidence = "high"

    if any(word in text for word in ["email", "outlook", "mail"]):
        sources_checked.append("email")
        confidence = "high"

    if any(word in text for word in ["calendar", "meeting", "schedule", "event"]):
        sources_checked.append("calendar")
        confidence = "high"

    steps = [
        ReasoningStep(
            label="Interpret request",
            detail="Identified the user's intent from the latest message."
        ),
        ReasoningStep(
            label="Check context",
            detail=f"Considered {len(convo.messages)} messages in the current conversation."
        ),
        ReasoningStep(
            label="Select sources",
            detail=f"Prepared likely data sources: {', '.join(sources_checked)}."
        ),
        ReasoningStep(
            label="Generate answer",
            detail="Produced a concise response tailored for a university student workflow."
        ),
    ]

    return steps, confidence, sources_checked, now_iso()


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
        raise HTTPException(status_code=400, detail="Canvas base URL and access token are required")

    try:
        verify_response = requests.get(
            f"{canvas_base_url}/api/v1/users/self",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )

        if verify_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Canvas credentials")

        user_data = verify_response.json()

        old_session_id = response.headers.get("set-cookie")
        _ = old_session_id  # no-op, keeps linter quiet if needed

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
            secure=False,  # change to True in production with HTTPS
            max_age=60 * 60 * 8,
        )

        return {
            "success": True,
            "user": {
                "name": user_data.get("name"),
                "id": user_data.get("id"),
            },
        }

    except HTTPException:
        raise
    except requests.RequestException:
        raise HTTPException(status_code=500, detail="Failed to reach Canvas")


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
    creds = get_canvas_credentials(request)

    if not creds:
        raise HTTPException(status_code=401, detail="Canvas not connected for this session")

    try:
        courses_response = requests.get(
            f"{creds['base_url']}/api/v1/courses",
            headers={"Authorization": f"Bearer {creds['token']}"},
            params={"enrollment_state": "active"},
            timeout=10,
        )

        if courses_response.status_code != 200:
            raise HTTPException(
                status_code=courses_response.status_code,
                detail="Failed to fetch courses"
            )

        return courses_response.json()

    except HTTPException:
        raise
    except requests.RequestException:
        raise HTTPException(status_code=500, detail="Failed to reach Canvas")


@app.post("/canvas/disconnect")
def disconnect_canvas(request: Request, response: Response):
    session_id = get_canvas_session_id(request)

    if session_id and session_id in canvas_session_store:
        del canvas_session_store[session_id]

    response.delete_cookie(CANVAS_SESSION_COOKIE)

    return {"success": True}


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
def send_message(convo_id: str, body: SendMessageRequest):
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
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are UniSync, a helpful academic assistant for university students. "
                        "Be clear, concise, practical, and friendly. "
                        "Do not reveal private chain-of-thought. "
                        "Give a direct answer."
                    ),
                },
                *[
                    {"role": msg.role, "content": msg.content}
                    for msg in convo.messages
                ],
            ],
        )

        assistant_text = (completion.choices[0].message.content or "").strip()
        if not assistant_text:
            assistant_text = "Sorry, I could not generate a response."

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


@app.get("/privacy/usage", response_model=PrivacyUsageResponse)
def privacy_usage():
    return get_usage_snapshot()


@app.get("/privacy/export", response_model=PrivacyExportResponse)
def privacy_export():
    conversations = list(conversations_store.values())
    conversations.sort(key=lambda c: c.timestamp, reverse=True)

    return PrivacyExportResponse(
        exportedAt=now_iso(),
        settingsHint="Frontend local settings are stored in browser localStorage and should be merged client-side into the final export file.",
        usage=get_usage_snapshot(),
        conversations=conversations,
    )


@app.delete("/privacy/data")
def delete_all_data():
    conversations_store.clear()
    canvas_session_store.clear()
    return {
        "success": True,
        "message": "All backend UniSync conversation data has been deleted."
    }


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