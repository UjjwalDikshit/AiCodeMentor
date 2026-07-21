import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  ArrowLeft,
  Download,
  BookOpen,
  BarChart3,
  LayoutTemplate,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ROUTES } from '../constants';
import { Button } from '../components/ui/button';
import ChatSidebar from '../components/chat/ChatSidebar';
import MessageList from '../components/chat/MessageList';
import Composer from '../components/chat/Composer';
import SuggestedPrompts from '../components/chat/SuggestedPrompts';
import ChatSettingsPanel from '../components/chat/ChatSettingsPanel';
import TokenUsageBar from '../components/chat/TokenUsageBar';
import SearchDialog from '../components/chat/SearchDialog';
import {
  useChatModels,
  useConversationMutations,
  useConversations,
  useMessages,
  chatKeys,
} from '../hooks/useConversations';
import {
  chatService,
  conversationService,
  loadChatRecovery,
  saveChatRecovery,
  clearChatRecovery,
} from '../services/chatService';

export default function AiChatPage() {
  const recovery = useMemo(() => loadChatRecovery(), []);
  const [activeId, setActiveId] = useState(recovery?.activeId || null);
  const [draft, setDraft] = useState(recovery?.draft || '');
  const [attachments, setAttachments] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [localMessages, setLocalMessages] = useState([]);
  const [streamingId, setStreamingId] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [scrollPos, setScrollPos] = useState(recovery?.scrollPos || 0);
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  const convQuery = useConversations(false);
  const { create, update, remove, qc } = useConversationMutations();
  const modelsQuery = useChatModels();
  const messagesQuery = useMessages(activeId);

  const conversations = useMemo(
    () => convQuery.data?.pages?.flatMap((p) => p.items) || [],
    [convQuery.data]
  );
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  useEffect(() => {
    chatService.templates.list().then((r) => setTemplates(r.data.data?.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (messagesQuery.data) setLocalMessages(messagesQuery.data);
  }, [messagesQuery.data, activeId]);

  useEffect(() => {
    saveChatRecovery({
      activeId,
      draft,
      scrollPos,
      provider: activeConversation?.provider,
      model: activeConversation?.model,
    });
  }, [activeId, draft, scrollPos, activeConversation?.provider, activeConversation?.model]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && isStreaming) {
        e.preventDefault();
        handleStop();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'ArrowUp' && !draft && historyStack.length) {
        e.preventDefault();
        const next = Math.min(historyStack.length - 1, historyIdx + 1);
        setHistoryIdx(next);
        setDraft(historyStack[historyStack.length - 1 - next] || '');
      }
      if (e.key === 'ArrowDown' && historyIdx >= 0) {
        e.preventDefault();
        const next = historyIdx - 1;
        setHistoryIdx(next);
        setDraft(next < 0 ? '' : historyStack[historyStack.length - 1 - next] || '');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isStreaming, requestId, draft, historyStack, historyIdx]);

  async function ensureConversation(template) {
    if (activeId && !template) return activeId;
    const payload = template
      ? {
          title: template.name,
          systemPrompt: template.systemPrompt,
          memoryKind: template.memoryKind,
          temperature: template.temperature,
          provider: template.provider,
          model: template.model,
          templateId: template.id,
          color: template.color,
          icon: template.icon,
        }
      : { systemPrompt: 'chat_general', provider: 'dummy', model: 'dummy-echo', memoryKind: 'window' };
    const created = await create.mutateAsync(payload);
    setActiveId(created.id);
    setLocalMessages([]);
    return created.id;
  }

  async function handleSend(overrideText) {
    const text = (overrideText ?? draft).trim();
    if (!text || isStreaming) return;
    const conversationId = await ensureConversation();
    setHistoryStack((h) => [...h.slice(-49), text]);
    setHistoryIdx(-1);
    setDraft('');
    const tempUserId = `temp-user-${Date.now()}`;
    const tempAsstId = `temp-asst-${Date.now()}`;
    setLocalMessages((prev) => [
      ...prev,
      { id: tempUserId, role: 'user', content: text, status: 'completed' },
      { id: tempAsstId, role: 'assistant', content: '', status: 'streaming' },
    ]);
    setStreamingId(tempAsstId);
    setIsStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await chatService.stream(
        { conversationId, message: text, attachments },
        {
          signal: controller.signal,
          onEvent: (event, data) => {
            if (data.requestId) setRequestId(data.requestId);
            if (event === 'user' && data.userMessage) {
              setLocalMessages((prev) =>
                prev.map((m) =>
                  m.id === tempUserId
                    ? { ...data.userMessage }
                    : m.id === tempAsstId
                      ? { ...m, id: data.assistantMessageId || m.id }
                      : m
                )
              );
              if (data.assistantMessageId) setStreamingId(data.assistantMessageId);
            }
            if (event === 'token' && data.delta) {
              const aid = data.assistantMessageId || tempAsstId;
              setLocalMessages((prev) =>
                prev.map((m) =>
                  m.id === aid || m.id === tempAsstId
                    ? { ...m, id: aid, content: (m.content || '') + data.delta }
                    : m
                )
              );
            }
            if (event === 'done') {
              const aid = data.assistantMessageId || tempAsstId;
              setLocalMessages((prev) =>
                prev.map((m) =>
                  m.id === aid || m.id === tempAsstId
                    ? {
                        ...m,
                        id: aid,
                        content: data.content || m.content,
                        provider: data.provider,
                        model: data.model,
                        requestId: data.requestId,
                        latency: data.latencyMs,
                        tokens: {
                          prompt: data.usage?.promptTokens ?? 0,
                          completion: data.usage?.completionTokens ?? 0,
                          total: data.usage?.totalTokens ?? 0,
                          estimatedCost: data.usage?.estimatedCost ?? 0,
                        },
                        status: 'completed',
                      }
                    : m
                )
              );
            }
            if (event === 'persisted') {
              if (data.conversation?.title) qc.invalidateQueries({ queryKey: ['conversations'] });
              qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
            }
            if (event === 'error') toast.error(data.error || 'Stream error');
          },
        }
      );
    } catch (err) {
      if (err.name !== 'AbortError') toast.error(err.message || 'Chat failed');
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
      abortRef.current = null;
      setAttachments([]);
    }
  }

  async function handleStop() {
    abortRef.current?.abort();
    if (requestId) {
      try {
        await chatService.stop({ requestId });
      } catch {
        /* ignore */
      }
    }
    setIsStreaming(false);
  }

  async function handleAttach(file) {
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await chatService.uploadAttachment(form);
      setAttachments((prev) => [...prev, data.data]);
      toast.success('Attachment added');
    } catch {
      toast.error('Upload failed');
    }
  }

  async function handleRegenerate() {
    if (!activeId || isStreaming) return;
    try {
      await chatService.regenerate({ conversationId: activeId });
      qc.invalidateQueries({ queryKey: chatKeys.messages(activeId) });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch {
      toast.error('Regenerate failed');
    }
  }

  async function handleExport(format) {
    if (!activeId) return;
    try {
      await chatService.downloadExport(activeId, format);
    } catch {
      toast.error('Export failed');
    }
  }

  async function handleImportFile(file) {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const { data } = await conversationService.import(payload);
      toast.success('Imported');
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setActiveId(data.data.id);
    } catch {
      toast.error('Import failed — use JSON export');
    }
  }

  const lastAssistant = [...localMessages].reverse().find((m) => m.role === 'assistant');
  const suggestionList =
    templates.find((t) => t.id === activeConversation?.templateId)?.suggestions || undefined;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <ChatSidebar
        conversations={conversations}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        loading={convQuery.isLoading}
        hasMore={Boolean(convQuery.hasNextPage)}
        onLoadMore={() => convQuery.fetchNextPage()}
        onSelect={(id) => {
          setActiveId(id);
          conversationService.get(id).catch(() => {});
        }}
        onNew={async () => {
          clearChatRecovery();
          const c = await create.mutateAsync({});
          setActiveId(c.id);
          setLocalMessages([]);
          setDraft('');
        }}
        onRename={(id, title) => update.mutate({ id, title })}
        onDelete={async (id) => {
          await remove.mutateAsync(id);
          if (activeId === id) {
            setActiveId(null);
            setLocalMessages([]);
          }
        }}
        onArchive={(c) => update.mutate({ id: c.id, isArchived: true })}
        onPin={(c) => update.mutate({ id: c.id, isPinned: !c.isPinned })}
        onFavorite={(c) => update.mutate({ id: c.id, isFavorite: !c.isFavorite })}
        onDuplicate={async (c) => {
          const { data } = await conversationService.duplicate(c.id);
          qc.invalidateQueries({ queryKey: ['conversations'] });
          setActiveId(data.data.id);
        }}
        onSearchOpen={() => setSearchOpen(true)}
        templates={templates}
        onUseTemplate={(t) => ensureConversation(t)}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to={ROUTES.DASHBOARD}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: activeConversation?.color || '#6366f1' }}
              aria-hidden
            />
            <h1 className="truncate font-display text-base font-semibold">
              {activeConversation?.title || 'AI Copilot'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Link to={ROUTES.PROMPT_LIBRARY}>
              <Button type="button" variant="ghost" size="sm" aria-label="Prompt library">
                <BookOpen className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={ROUTES.CHAT_ANALYTICS}>
              <Button type="button" variant="ghost" size="sm" aria-label="Chat analytics">
                <BarChart3 className="h-4 w-4" />
              </Button>
            </Link>
            <label className="inline-flex cursor-pointer">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                  e.target.value = '';
                }}
              />
              <Button type="button" variant="ghost" size="sm" asChild={false} aria-label="Import conversation">
                <LayoutTemplate className="h-4 w-4" />
              </Button>
            </label>
            <Button type="button" variant="ghost" size="sm" disabled={!activeId} onClick={() => handleExport('json')} aria-label="Export JSON">
              <Download className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={!activeId} onClick={() => handleExport('md')}>
              MD
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={!activeId} onClick={() => handleExport('pdf')}>
              PDF
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              disabled={!activeConversation}
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <TokenUsageBar message={lastAssistant} conversation={activeConversation} />

        <div className="relative min-h-0 flex-1">
          {localMessages.length === 0 ? (
            <SuggestedPrompts
              onSelect={(p) => handleSend(p)}
              templates={templates}
              onUseTemplate={(t) => ensureConversation(t)}
              suggestions={suggestionList}
            />
          ) : (
            <MessageList
              messages={localMessages}
              streamingId={streamingId}
              onRegenerate={handleRegenerate}
              onEdit={(m) => {
                setDraft(m.content || '');
                inputRef.current?.focus();
              }}
              onScrollPos={setScrollPos}
            />
          )}
          <ChatSettingsPanel
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            conversation={activeConversation}
            modelsData={modelsQuery.data}
            onChange={(patch) => activeId && update.mutate({ id: activeId, ...patch })}
          />
        </div>

        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => handleSend()}
          onStop={handleStop}
          onAttach={handleAttach}
          attachments={attachments}
          onRemoveAttachment={(a) =>
            setAttachments((prev) => prev.filter((x) => x.filename !== a.filename))
          }
          isStreaming={isStreaming}
          inputRef={inputRef}
        />
      </div>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onSelectConversation={setActiveId} />
    </div>
  );
}
