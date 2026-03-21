import { useNavigate } from "react-router-dom";
import { ChatInput } from "@/components/chat/ChatInput";
import { SuggestedPrompts } from "@/components/chat/SuggestedPrompts";
import { useAuth } from "@/contexts/AuthContext";

function displayFirstName(user: ReturnType<typeof useAuth>["user"]) {
  if (!user) return "there";
  const meta = user.user_metadata as { full_name?: string } | undefined;
  const full = meta?.full_name?.trim();
  if (full) return full.split(/\s+/)[0] ?? "there";
  const local = user.email?.split("@")[0];
  return local ?? "there";
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = (message: string) => {
    // Navigate to chat with the initial message
    navigate("/chat", { state: { initialMessage: message } });
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-16">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in-up">
        {/* Greeting */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {getGreeting()}, <span className="text-primary">{displayFirstName(user)}</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Ready when you are.
          </p>
        </div>

        {/* Main input */}
        <ChatInput 
          onSubmit={handleSubmit} 
          size="large"
          className="w-full"
        />

        {/* Suggested prompts */}
        <div className="pt-4">
          <SuggestedPrompts onSelect={handleSubmit} />
        </div>
      </div>

      {/* Subtle footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-xs text-muted-foreground">
          UniSync connects to Canvas, Outlook, and campus systems to help you stay organized.
        </p>
      </div>
    </div>
  );
}
