import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function CodeBlock({ language = '', code = '' }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(code.split('\n').length > 24);
  const lines = useMemo(() => code.split('\n'), [code]);
  const visible = collapsed ? lines.slice(0, 16).join('\n') + '\n…' : code;

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-border bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs text-zinc-400">
        <span className="font-mono">{language || 'code'}</span>
        <div className="flex items-center gap-1">
          {lines.length > 24 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand code' : 'Collapse code'}
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10"
            onClick={copy}
            aria-label="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <pre className={cn('overflow-x-auto p-3 text-sm leading-relaxed')}>
        <code className={language ? `language-${language}` : undefined}>{visible}</code>
      </pre>
    </div>
  );
}
