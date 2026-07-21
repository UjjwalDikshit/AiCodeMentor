import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, streamingId, onRegenerate, onEdit, onScrollPos }) {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 8,
  });

  useEffect(() => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }
  }, [messages.length, streamingId]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto px-3 py-4 md:px-6"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      onScroll={(e) => onScrollPos?.(e.currentTarget.scrollTop)}
    >
      <div className="relative mx-auto w-full max-w-3xl" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => {
          const message = messages[item.index];
          return (
            <div
              key={message.id || item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-4"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <MessageBubble
                message={message}
                isStreaming={streamingId && message.id === streamingId}
                onRegenerate={message.role === 'assistant' ? () => onRegenerate?.(message) : undefined}
                onEdit={message.role === 'user' ? onEdit : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
