import { useState } from 'react';
import { Copy, Check, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import MarkdownRenderer from './MarkdownRenderer';
import { cn } from '../../lib/utils';

export default function MessageBubble({
  message,
  isStreaming,
  onRegenerate,
  onEdit,
}) {
  const [copied, setCopied] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const isUser = message.role === 'user';

  async function copyMessage() {
    await navigator.clipboard.writeText(message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      className={cn('group flex w-full', isUser ? 'justify-end' : 'justify-start')}
      role="article"
      aria-label={`${message.role} message`}
    >
      <div
        className={cn(
          'max-w-[min(100%,48rem)] rounded-2xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card border border-border text-foreground'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <>
            <MarkdownRenderer content={message.content || (isStreaming ? '▍' : '')} />
            {isStreaming && !message.content && (
              <span className="inline-flex gap-1 py-1" aria-live="polite" aria-label="Assistant is typing">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </span>
            )}
          </>
        )}

        <div
          className={cn(
            'mt-2 flex flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100',
            isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}
        >
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={copyMessage} aria-label="Copy message">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          {!isUser && onRegenerate && (
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onRegenerate} aria-label="Regenerate">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          {isUser && onEdit && (
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => onEdit(message)} aria-label="Edit prompt">
              Edit
            </Button>
          )}
          {!isUser && (message.requestId || message.latency != null) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setShowTelemetry((v) => !v)}
              aria-expanded={showTelemetry}
              aria-label="Toggle telemetry"
            >
              {showTelemetry ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Meta
            </Button>
          )}
        </div>

        {showTelemetry && !isUser && (
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
            <dt>Request ID</dt>
            <dd className="font-mono truncate">{message.requestId || '—'}</dd>
            <dt>Provider</dt>
            <dd>{message.provider || '—'}</dd>
            <dt>Model</dt>
            <dd>{message.model || '—'}</dd>
            <dt>Latency</dt>
            <dd>{message.latency != null ? `${Math.round(message.latency)} ms` : '—'}</dd>
            <dt>Tokens</dt>
            <dd>
              {message.tokens?.prompt ?? 0} / {message.tokens?.completion ?? 0} / {message.tokens?.total ?? 0}
            </dd>
            <dt>Est. cost</dt>
            <dd>{message.tokens?.estimatedCost ?? 0}</dd>
            <dt>Time</dt>
            <dd>{message.createdAt ? new Date(message.createdAt).toLocaleString() : '—'}</dd>
          </dl>
        )}
      </div>
    </div>
  );
}
