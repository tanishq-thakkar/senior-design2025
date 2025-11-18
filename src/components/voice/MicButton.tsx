import clsx from 'classnames'
import { Mic, MicOff } from 'lucide-react'

type MicButtonProps = {
  isRecording: boolean
  onToggle: () => void
}

const MicButton = ({ isRecording, onToggle }: MicButtonProps) => (
  <button
    type="button"
    onClick={onToggle}
    className={clsx(
      'flex h-12 w-12 items-center justify-center rounded-full border transition',
      isRecording
        ? 'border-destructive/80 bg-destructive/20 text-destructive'
        : 'border-border/60 bg-surface/80 text-textSecondary hover:text-textPrimary',
    )}
  >
    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
  </button>
)

export default MicButton

