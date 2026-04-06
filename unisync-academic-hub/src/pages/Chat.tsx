import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { SuggestedPrompts } from "@/components/chat/SuggestedPrompts";
import { useSettings } from "@/contexts/SettingsContext";

import {
  useApiQuery,
  useApiMutation,
  apiFetch,
  API_BASE,
} from "@/lib/api";
import type { Message, Conversation } from "@/types/chat";

interface CreateConversationResponse extends Conversation {}

interface SendMessageResponse {
  assistant: string;
  message: Message;
}

export default function Chat() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const initialMessage = location.state?.initialMessage;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  const [activeConversationId, setActiveConversationId] = useState<string>();

  const {
    data: conversations = [],
    isLoading: convLoading,
  } = useApiQuery<Conversation[]>("conversations", "/chat/conversations");

  const {
    data: messages = [],
    isLoading: messagesLoading,
  } = useApiQuery<Message[]>(
    ["messages", activeConversationId ?? ""],
    activeConversationId
      ? `/chat/conversations/${activeConversationId}/messages`
      : "/chat/conversations/__none__/messages",
    {
      enabled: !!activeConversationId,
      retry: false,
    }
  );

  const sendMessageMutation = useApiMutation<
  SendMessageResponse,
  { convoId: string; content: string }
>(
  async ({ convoId, content }) => {
    return apiFetch<SendMessageResponse>(
      `/chat/conversations/${convoId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      }
    );
  },
  {
    onMutate: async ({ convoId, content }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", convoId] });

      const previousMessages =
        queryClient.getQueryData<Message[]>(["messages", convoId]) ?? [];

      const userMessage: Message = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(
        ["messages", convoId],
        [...previousMessages, userMessage]
      );
    },

    onSuccess: async (assistantResponse, { convoId }) => {
      const speak = async () => {
        if (settings.speechOutput === false) return;
      
        const res = await fetch(`${API_BASE}/voice/speak`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: assistantResponse.assistant,
            voice: "alloy",
            speed: settings.speechSpeed ?? 1,
          }),
        });
      
        if (!res.ok) {
          const text = await res.text();
          console.error("TTS request failed:", text);
          return;
        }
      
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
      
        try {
          await audio.play();
        } catch (err) {
          console.error("Audio play failed:", err);
        }
      };
      speak();
    
      queryClient.setQueryData<Message[]>(
        ["messages", convoId],
        (old = []) => [...old, assistantResponse.message]
      );
    
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },

    onError: async (_err, { convoId }) => {
      await queryClient.invalidateQueries({ queryKey: ["messages", convoId] });
    },
  }
);

  const createConversationMutation = useApiMutation<CreateConversationResponse, void>(
    () =>
      apiFetch<CreateConversationResponse>("/chat/conversations", {
        method: "POST",
      }),
    {
      onSuccess: (newConvo) => {
        setActiveConversationId(newConvo.id);
        queryClient.setQueryData<Conversation[]>(
          ["conversations"],
          (old = []) => [newConvo, ...old]
        );
      },
    }
  );

  useEffect(() => {
    if (initialMessage) {
      createConversationMutation.mutate(undefined, {
        onSuccess: (newConvo) => {
          sendMessageMutation.mutate({
            convoId: newConvo.id,
            content: initialMessage,
          });
        },
      });

      window.history.replaceState({}, document.title);
    }
  }, [initialMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessageMutation.isPending]);

  useEffect(() => {
    if (!conversations.length) {
      setActiveConversationId(undefined);
      return;
    }

    if (
      activeConversationId &&
      !conversations.some((c) => c.id === activeConversationId)
    ) {
      setActiveConversationId(undefined);
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const handleNewConversation = () => {
    setActiveConversationId(undefined);
    createConversationMutation.mutate();
  };

  const handleSubmit = (content: string) => {
    if (!content.trim()) return;

    if (!activeConversationId) {
      createConversationMutation.mutate(undefined, {
        onSuccess: (newConvo) => {
          sendMessageMutation.mutate({
            convoId: newConvo.id,
            content,
          });
        },
      });
    } else {
      sendMessageMutation.mutate({
        convoId: activeConversationId,
        content,
      });
    }
  };

  const handleDeleteConversation = async (id: string) => {
    queryClient.setQueryData<Conversation[]>(
      ["conversations"],
      (old) => old?.filter((c) => c.id !== id) ?? []
    );

    queryClient.removeQueries({ queryKey: ["messages", id] });

    if (activeConversationId === id) {
      setActiveConversationId(undefined);
    }
  };

  return (
    <div className="flex h-screen pt-16">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        isLoading={convLoading}
      />

      <main className="flex flex-1 flex-col">
        {messagesLoading || convLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : messages.length === 0 && !activeConversationId ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <p className="mb-6 text-lg text-muted-foreground">
              Start a new conversation or select one from the sidebar.
            </p>
            <SuggestedPrompts onSelect={handleSubmit} />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-4 py-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}

                  {sendMessageMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                      <span className="inline-block h-2 w-2 rounded-full bg-primary animation-delay-150" />
                      <span className="inline-block h-2 w-2 rounded-full bg-primary animation-delay-300" />
                      <span>UniSync is thinking...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-background p-4">
              <div className="mx-auto max-w-3xl">
                <ChatInput
                  onSubmit={handleSubmit}
                  disabled={
                    sendMessageMutation.isPending ||
                    createConversationMutation.isPending
                  }
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}