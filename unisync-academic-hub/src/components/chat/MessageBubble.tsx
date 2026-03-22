import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-background text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>

        {!isUser && (
          <div className="mt-4 space-y-3">
            {message.confidence && (
              <div className="text-xs text-muted-foreground">
                Confidence: <span className="font-medium">{message.confidence}</span>
              </div>
            )}

            {message.sourcesChecked && message.sourcesChecked.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sources checked</p>
                <p className="text-xs text-muted-foreground">
                  {message.sourcesChecked.join(", ")}
                </p>
              </div>
            )}

            {message.reasoningSummary && message.reasoningSummary.length > 0 && (
              <details className="rounded-lg border bg-muted/30 p-3">
                <summary className="cursor-pointer text-xs font-medium">
                  How UniSync produced this answer
                </summary>
                <div className="mt-2 space-y-2">
                  {message.reasoningSummary.map((step, index) => (
                    <div key={`${message.id}-step-${index}`} className="text-xs">
                      <p className="font-medium">{step.label}</p>
                      <p className="text-muted-foreground">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {message.lastSynced && (
              <div className="text-[11px] text-muted-foreground">
                Last synced: {new Date(message.lastSynced).toLocaleString()}
              </div>
            )}
          </div>
        )}

        <div className="mt-2 text-[11px] opacity-70">
          {new Date(message.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}