import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { API_BASE, ngrokSkipBrowserWarningHeaders } from "@/lib/api";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
  className?: string;
  size?: "default" | "large";
  disabled?: boolean;
}

type VoiceState = "idle" | "listening" | "transcribing" | "sending";

export function ChatInput({
  onSubmit,
  placeholder = "Ask about assignments, emails, schedules, or campus events…",
  className,
  size = "default",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string>("");
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isListening = voiceState === "listening";

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, []);

  const cleanupMedia = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim() && !disabled) {
      onSubmit(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startVoiceRecording = async () => {
    if (disabled) return;

    try {
      setVoiceError("");
      setIsVoiceOpen(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          setVoiceState("transcribing");

          const audioBlob = new Blob(chunksRef.current, {
            type: mimeType || "audio/webm",
          });

          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          formData.append(
            "prompt",
            "This is a student using UniSync, a university academic assistant."
          );
          formData.append("language", "en");

          const response = await fetch(`${API_BASE}/voice/transcribe`, {
            method: "POST",
            headers: {
              ...ngrokSkipBrowserWarningHeaders(),
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Failed to transcribe audio");
          }

          const data: { text: string } = await response.json();
          const transcript = (data.text || "").trim();

          if (!transcript) {
            throw new Error("No speech detected");
          }

          setMessage(transcript);
          setVoiceState("sending");
          onSubmit(transcript);

          setTimeout(() => {
            setVoiceState("idle");
            setIsVoiceOpen(false);
          }, 500);
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Voice transcription failed";
          setVoiceError(msg);
          setVoiceState("idle");
        } finally {
          cleanupMedia();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setVoiceState("listening");
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Could not access microphone";
      setVoiceError(msg);
      setVoiceState("idle");
      setIsVoiceOpen(false);
      cleanupMedia();
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    } else {
      cleanupMedia();
      setVoiceState("idle");
      setIsVoiceOpen(false);
    }
  };

  const closeVoiceOverlay = () => {
    cleanupMedia();
    setVoiceState("idle");
    setIsVoiceOpen(false);
    setVoiceError("");
  };

  const toggleVoice = () => {
    if (isListening) {
      stopVoiceRecording();
    } else if (voiceState === "idle") {
      startVoiceRecording();
    }
  };

  const getVoiceLabel = () => {
    if (voiceState === "listening") return "Listening…";
    if (voiceState === "transcribing") return "Transcribing…";
    if (voiceState === "sending") return "Sending…";
    return "Tap to speak";
  };

  



  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative flex items-end gap-2 rounded-2xl border border-border bg-background shadow-soft transition-smooth",
          size === "large" && "shadow-elevated",
          "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10",
          className
        )}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            size === "large"
              ? "min-h-[56px] px-5 py-4 text-base"
              : "min-h-[48px] px-4 py-3 text-sm",
            "max-h-32"
          )}
        />

        <div
          className={cn(
            "flex items-center gap-1",
            size === "large" ? "pb-3 pr-3" : "pb-2 pr-2"
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleVoice}
            disabled={disabled || voiceState === "transcribing" || voiceState === "sending"}
            className={cn(
              "h-9 w-9 rounded-xl transition-smooth",
              isListening && "bg-destructive/10 text-destructive hover:bg-destructive/20"
            )}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || disabled}
            className="h-9 w-9 rounded-xl transition-smooth disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {isVoiceOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
          <button
            type="button"
            onClick={closeVoiceOverlay}
            className="absolute right-6 top-6 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex flex-col items-center justify-center px-6 text-center">
            <div className="relative flex h-56 w-56 items-center justify-center">
              <div
                className={cn(
                  "absolute h-56 w-56 rounded-full bg-blue-500/10 blur-2xl transition-all duration-500",
                  voiceState === "listening" && "animate-pulse"
                )}
              />
              <div
                className={cn(
                  "absolute rounded-full border border-blue-400/30",
                  voiceState === "listening"
                    ? "h-48 w-48 animate-ping"
                    : "h-40 w-40 opacity-40"
                )}
              />
              <button
                type="button"
                onClick={toggleVoice}
                disabled={voiceState === "transcribing" || voiceState === "sending"}
                className={cn(
                  "relative flex h-32 w-32 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/20 text-white shadow-[0_0_60px_rgba(59,130,246,0.35)] transition",
                  voiceState === "listening" && "scale-105",
                  (voiceState === "transcribing" || voiceState === "sending") &&
                    "cursor-not-allowed opacity-80"
                )}
              >
                {isListening ? (
                  <MicOff className="h-12 w-12" />
                ) : (
                  <Mic className="h-12 w-12" />
                )}
              </button>
            </div>

            <h2 className="mt-8 text-3xl font-semibold text-white">
              {getVoiceLabel()}
            </h2>

            <p className="mt-3 max-w-md text-sm text-white/65">
              {voiceState === "listening" &&
                "Speak naturally. Tap the circle again when you’re done."}
              {voiceState === "transcribing" &&
                "We’re converting your voice into text."}
              {voiceState === "sending" &&
                "Your message is being sent to UniSync."}
              {voiceState === "idle" &&
                "Tap the circle to start talking."}
            </p>

            {voiceError && (
              <p className="mt-4 text-sm text-red-400">{voiceError}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}