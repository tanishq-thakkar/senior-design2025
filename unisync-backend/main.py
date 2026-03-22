import os
import tempfile
from uuid import uuid4
from datetime import datetime, timezone
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from fastapi.responses import StreamingResponse
import io

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


class Message(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    timestamp: str


class Conversation(BaseModel):
    id: str
    title: str
    lastMessage: str
    timestamp: str
    messages: list[Message] = []


class CreateConversationResponse(Conversation):
    pass


class SendMessageRequest(BaseModel):
    content: str


class SendMessageResponse(BaseModel):
    assistant: str


class TranscriptionResponse(BaseModel):
    text: str

class SpeechRequest(BaseModel):
    text: str
    voice: str = "alloy"
    speed: float = 1.0


conversations_store: dict[str, Conversation] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_title(text: str) -> str:
    text = text.strip()
    if not text:
        return "New Chat"
    return text[:40] + ("..." if len(text) > 40 else "")


@app.get("/health")
def health():
    return {"status": "ok"}


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

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are UniSync, a helpful academic assistant for university students. "
                        "Be clear, concise, practical, and friendly."
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
    )
    convo.messages.append(assistant_message)
    convo.lastMessage = assistant_text
    convo.timestamp = now_iso()

    conversations_store[convo_id] = convo

    return SendMessageResponse(assistant=assistant_text)


@app.post("/voice/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    prompt: str | None = Form(default=None),
    language: str | None = Form(default=None),
):
    """
    Accepts an uploaded audio file from the frontend (webm/wav/m4a/mp3/etc),
    sends it to OpenAI transcription, and returns plain text.
    """
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