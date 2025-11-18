import clsx from 'classnames'
import { BookOpen } from 'lucide-react'
import type { ChatMessage } from '../../types/api'

type MessageBubbleProps = {
  message: ChatMessage
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user'
  const isCard = message.meta?.type === 'card'

  return (
    <div
      className={clsx('flex w-full', {
        'justify-end': isUser,
        'justify-start': !isUser,
      })}
    >
      <div
        className={clsx(
          'w-full max-w-2xl rounded-2xl border px-4 py-3 shadow-card',
          isUser
            ? 'rounded-br-none border-accent/40 bg-accent/10 text-accent'
            : 'rounded-bl-none border-border/50 bg-surface/80 text-textPrimary',
        )}
      >
        {isCard && (
          <div className="mb-3 rounded-xl border border-border/40 bg-background/40 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
              <BookOpen className="h-4 w-4 text-accent" />
              {message.meta?.title ?? 'Summary'}
            </div>
            <dl className="mt-3 space-y-2 text-sm text-textSecondary">
              {message.meta?.items?.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="flex justify-between gap-4"
                >
                  <dt className="font-medium text-textPrimary">{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <p className="text-sm leading-relaxed">{message.content}</p>
        {message.meta?.sources?.length ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-textSecondary">
            <span className="text-textSecondary">Sources:</span>
            {message.meta.sources.map((source) => (
              <span
                key={source}
                className="rounded-full bg-border/30 px-3 py-0.5 text-textPrimary"
              >
                {source}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-right text-[10px] uppercase text-textSecondary">
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

export default MessageBubble

