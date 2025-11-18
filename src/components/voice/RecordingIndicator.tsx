type RecordingIndicatorProps = {
  isRecording: boolean
}

const RecordingIndicator = ({ isRecording }: RecordingIndicatorProps) => {
  if (!isRecording) return null

  return (
    <div className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-destructive">
      <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
      Recording...
    </div>
  )
}

export default RecordingIndicator

