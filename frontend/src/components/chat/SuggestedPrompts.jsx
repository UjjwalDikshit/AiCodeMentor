const DEFAULTS = [
  { title: 'Explain Segment Tree', prompt: 'Explain Segment Trees with a simple example and complexity.' },
  { title: 'Review my code', prompt: 'I will paste code next — review it for bugs and clarity.' },
  { title: 'Teach React Hooks', prompt: 'Teach React Hooks with practical examples.' },
  { title: 'Explain Redis', prompt: 'Explain Redis use-cases for a backend engineer.' },
  { title: 'Mock Interview', prompt: 'Start a mock interview for a mid-level backend role.' },
  { title: 'Review Resume', prompt: 'Give me a checklist to improve a software engineer resume.' },
];

export default function SuggestedPrompts({ onSelect, templates = [], onUseTemplate, suggestions }) {
  const cards =
    suggestions?.length > 0
      ? suggestions.map((s) => ({ title: s.slice(0, 40), prompt: s }))
      : DEFAULTS;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold tracking-tight">CodeMentor Copilot</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pipeline-powered coaching chat — templates, prompts, streaming, and telemetry.
        </p>
      </div>
      {templates.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {templates.slice(0, 6).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onUseTemplate?.(t)}
              className="rounded-full border px-3 py-1 text-xs hover:bg-secondary"
              style={{ borderColor: t.color }}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onSelect?.(s.prompt)}
            className="rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-secondary/40"
          >
            <div className="text-sm font-medium">{s.title}</div>
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.prompt}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
