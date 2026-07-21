import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import CodeBlock from './CodeBlock';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

function MermaidBlock({ chart }) {
  const ref = useRef(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
        const id = `mmd-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (ref.current) ref.current.textContent = chart;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart]);
  return <div ref={ref} className="my-3 overflow-x-auto rounded-lg border bg-card p-3" role="img" aria-label="Mermaid diagram" />;
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSanitize, rehypeKatex, rehypeHighlight]}
        components={{
          code({ inline, className, children, ...props }) {
            const text = String(children).replace(/\n$/, '');
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1] || '';
            if (!inline && lang === 'mermaid') {
              return <MermaidBlock chart={text} />;
            }
            if (!inline) {
              return <CodeBlock language={lang} code={text} />;
            }
            return (
              <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]" {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 border-l-4 border-primary/40 bg-muted/40 px-4 py-2 text-sm not-italic [&>p]:m-0">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline">
                {children}
              </a>
            );
          },
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}
