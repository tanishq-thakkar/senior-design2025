import { FormEvent, useState } from 'react'
import { Send } from 'lucide-react'
import MicButton from '../voice/MicButton'
import RecordingIndicator from '../voice/RecordingIndicator'

type ChatInputProps = {
  onSend: (message: string) => Promise<void> | void
  isSending: boolean
  isRecording: boolean
  onToggleMic: () => void
}

const ChatInput = ({
  onSend,
  isSending,
  isRecording,
  onToggleMic,
}: ChatInputProps) => {
  const [message, setMessage] = useState('')

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!message.trim()) return
    await onSend(message)
    setMessage('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border/40 bg-surface/80 p-4 shadow-card"
    >
      <div className="mb-3">
        <RecordingIndicator isRecording={isRecording} />
      </div>
      <div className="flex items-end gap-3">
        <textarea
          className="h-20 flex-1 resize-none rounded-2xl border border-border/30 bg-background/60 px-4 py-3 text-sm text-textPrimary placeholder:text-textSecondary focus:border-accent focus:outline-none"
          placeholder="Ask UniSync anything about your classes, assignments, or schedule..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              handleSubmit(event)
            }
          }}
        />
        <div className="flex flex-col items-center gap-3">
          <MicButton isRecording={isRecording} onToggle={onToggleMic} />
          <button
            type="submit"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-background transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-border/50"
            disabled={isSending}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </form>
  )
}

export default ChatInput

