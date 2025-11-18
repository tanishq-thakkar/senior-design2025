import ChatWindow from '../components/chat/ChatWindow'
import ChatInput from '../components/chat/ChatInput'
import QuickPrompts from '../components/chat/QuickPrompts'
import { useChat } from '../hooks/useChat'

const ChatPage = () => {
  const {
    messages,
    streamingMessage,
    sendMessage,
    isSending,
    isRecording,
    quickPrompts,
    startRecording,
    stopRecording,
  } = useChat()

  const handlePromptSelect = (prompt: string) => {
    void sendMessage(prompt)
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <ChatWindow messages={messages} streamingMessage={streamingMessage} />
      <QuickPrompts prompts={quickPrompts} onSelect={handlePromptSelect} />
      <ChatInput
        onSend={(message) => sendMessage(message)}
        isSending={isSending}
        isRecording={isRecording}
        onToggleMic={toggleRecording}
      />
    </div>
  )
}

export default ChatPage

