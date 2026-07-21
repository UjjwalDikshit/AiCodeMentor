import { Paperclip, Send, Square } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../ui/button';

export default function Composer({
  value,
  onChange,
  onSend,
  onStop,
  onAttach,
  attachments = [],
  onRemoveAttachment,
  isStreaming,
  disabled,
  inputRef,
}) {
  const fileRef = useRef(null);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) onSend?.();
    }
  }

  return (
    <div className="border-t bg-card/80 p-3 backdrop-blur md:p-4">
      {attachments.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Attachments">
          {attachments.map((a) => (
            <li key={a.filename || a.originalName} className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
              <span className="max-w-[12rem] truncate">{a.originalName || a.filename}</span>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onRemoveAttachment?.(a)} aria-label="Remove attachment">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.md,.markdown,.js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.c,.cpp,.json,.yml,.yaml,.css,.html,.sql"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAttach?.(file);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach file"
          disabled={disabled || isStreaming}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Message CodeMentor AI… (Shift+Enter for newline)"
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
          aria-label="Chat message"
          disabled={disabled}
        />
        {isStreaming ? (
          <Button type="button" variant="secondary" size="sm" onClick={onStop} aria-label="Stop generation">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={onSend} disabled={disabled || !value?.trim()} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
        Enter send · Shift+Enter newline · Esc stop · Ctrl+K search · Ctrl+/ focus
      </p>
    </div>
  );
}
