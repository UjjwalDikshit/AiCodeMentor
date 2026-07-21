export default function TokenUsageBar({ message, conversation }) {
  const t = message?.tokens || {};
  const stats = conversation?.usageStats;
  if (!message?.tokens && !stats) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-4 py-1.5 text-[11px] text-muted-foreground" aria-label="Token usage">
      {message?.tokens && (
        <>
          <span>Prompt: {t.prompt ?? 0}</span>
          <span>Completion: {t.completion ?? 0}</span>
          <span>Total: {t.total ?? 0}</span>
          <span>Est. cost: {t.estimatedCost ?? 0}</span>
          {message.provider && <span>Provider: {message.provider}</span>}
          {message.latency != null && <span>Latency: {Math.round(message.latency)} ms</span>}
        </>
      )}
      {stats && (
        <span className="ml-auto">
          Session · {stats.totalRequests || 0} req · {stats.totalTokens || 0} tok · avg {stats.averageLatencyMs || 0} ms
        </span>
      )}
    </div>
  );
}
