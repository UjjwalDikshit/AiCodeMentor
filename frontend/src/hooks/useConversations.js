import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationService, chatService } from '../services/chatService';

export const chatKeys = {
  conversations: (archived = false) => ['conversations', { archived }],
  messages: (id) => ['messages', id],
  models: ['chat-models'],
  providers: ['chat-providers'],
  search: (q) => ['chat-search', q],
};

export function useConversations(archived = false) {
  return useInfiniteQuery({
    queryKey: chatKeys.conversations(archived),
    queryFn: async ({ pageParam }) => {
      const { data } = await conversationService.list({
        limit: 30,
        archived: archived ? 'true' : 'false',
        cursor: pageParam,
      });
      return data.data;
    },
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    initialPageParam: undefined,
  });
}

export function useMessages(conversationId) {
  return useQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: async () => {
      const { data } = await conversationService.messages(conversationId, { limit: 100 });
      return data.data.items || [];
    },
    enabled: Boolean(conversationId),
  });
}

export function useChatModels() {
  return useQuery({
    queryKey: chatKeys.models,
    queryFn: async () => {
      const { data } = await chatService.models();
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useConversationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['conversations'] });

  const create = useMutation({
    mutationFn: (payload) => conversationService.create(payload).then((r) => r.data.data),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, ...payload }) =>
      conversationService.update(id, payload).then((r) => r.data.data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id) => conversationService.remove(id).then((r) => r.data.data),
    onSuccess: invalidate,
  });

  return { create, update, remove, invalidate, qc };
}
