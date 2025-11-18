type QuickPromptsProps = {
  prompts: string[]
  onSelect: (prompt: string) => void
}

const QuickPrompts = ({ prompts, onSelect }: QuickPromptsProps) => {
  return (
    <div className="mb-3 flex flex-wrap gap-3">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          className="rounded-full border border-border/60 bg-surface/80 px-4 py-2 text-sm text-textSecondary transition hover:border-accent/50 hover:text-textPrimary"
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}

export default QuickPrompts

