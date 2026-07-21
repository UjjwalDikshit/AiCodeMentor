import { Button } from '../ui/button';

export default function ChatSettingsPanel({ conversation, modelsData, onChange, open, onClose }) {
  if (!open || !conversation) return null;
  const catalog = modelsData?.providers?.[conversation.provider] || [];
  const modes = modelsData?.promptModes || [];

  return (
    <div className="absolute inset-y-0 right-0 z-30 w-full max-w-sm overflow-y-auto border-l bg-card p-4 shadow-xl md:w-80" role="dialog" aria-label="Chat settings">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Conversation settings</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="space-y-4 text-sm">
        <label className="block space-y-1">
          <span className="text-muted-foreground">Provider</span>
          <select
            className="w-full rounded-md border bg-background px-2 py-2"
            value={conversation.provider}
            onChange={(e) => {
              const provider = e.target.value;
              const nextModels = modelsData?.providers?.[provider] || [];
              onChange({ provider, model: nextModels[0]?.id || conversation.model });
            }}
          >
            <option value="dummy">Dummy</option>
            <option value="groq">Groq</option>
            <option value="ollama">Ollama</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-muted-foreground">Model</span>
          <select
            className="w-full rounded-md border bg-background px-2 py-2"
            value={conversation.model}
            onChange={(e) => onChange({ model: e.target.value })}
          >
            {catalog.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-muted-foreground">Prompt template (registry)</span>
          <select
            className="w-full rounded-md border bg-background px-2 py-2"
            value={conversation.systemPrompt}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
          >
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-muted-foreground">System prompt override</span>
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-2 py-2 text-xs"
            value={conversation.systemPromptOverride || ''}
            placeholder="Optional — replaces registry system prompt for this chat"
            onChange={(e) => onChange({ systemPromptOverride: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-muted-foreground">Memory</span>
          <select
            className="w-full rounded-md border bg-background px-2 py-2"
            value={conversation.memoryKind}
            onChange={(e) => onChange({ memoryKind: e.target.value })}
          >
            <option value="none">None</option>
            <option value="conversation">Conversation</option>
            <option value="window">Window</option>
            <option value="summary">Summary</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-muted-foreground">Color</span>
          <input type="color" value={conversation.color || '#6366f1'} onChange={(e) => onChange({ color: e.target.value })} />
        </label>
        <label className="block space-y-1">
          <span className="text-muted-foreground">Temperature ({conversation.temperature})</span>
          <input type="range" min="0" max="2" step="0.1" value={conversation.temperature} onChange={(e) => onChange({ temperature: Number(e.target.value) })} className="w-full" />
        </label>
        <label className="block space-y-1">
          <span className="text-muted-foreground">Top P ({conversation.topP})</span>
          <input type="range" min="0" max="1" step="0.05" value={conversation.topP} onChange={(e) => onChange({ topP: Number(e.target.value) })} className="w-full" />
        </label>
        <label className="block space-y-1">
          <span className="text-muted-foreground">Top K</span>
          <input type="number" min="1" max="100" className="w-full rounded-md border bg-background px-2 py-2" value={conversation.topK} onChange={(e) => onChange({ topK: Number(e.target.value) })} />
        </label>
        <label className="block space-y-1">
          <span className="text-muted-foreground">Max tokens</span>
          <input type="number" min="1" max="8192" className="w-full rounded-md border bg-background px-2 py-2" value={conversation.maxTokens} onChange={(e) => onChange({ maxTokens: Number(e.target.value) })} />
        </label>
      </div>
    </div>
  );
}
