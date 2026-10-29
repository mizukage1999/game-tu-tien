import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
export interface ChatMessage {
  id: string;
  kind: 'world' | 'near' | 'private';
  from: string;
  name: string;
  text: string;
  at: number;
  to?: string;
  outgoing?: boolean;
}
interface ChatState {
  open: boolean;
  tab: 'world' | 'near' | 'private';
  recipient: { id: string; name: string } | null;
  messages: ChatMessage[];
  unread: number;
  add(message: ChatMessage): boolean;
  show(tab?: 'world' | 'near' | 'private'): void;
  close(): void;
  privateTo(id: string, name: string): void;
  reset(): void;
}
export const chatStore = createStore<ChatState>((set, get) => ({
  open: false,
  tab: 'near',
  recipient: null,
  messages: [],
  unread: 0,
  add(message) {
    if (get().messages.some((m) => m.id === message.id)) return false;
    set((s) => ({
      messages: [...s.messages, message].slice(-300),
      unread:
        message.kind === 'private' &&
        !message.outgoing &&
        (!s.open || s.tab !== 'private' || s.recipient?.id !== message.from)
          ? s.unread + 1
          : s.unread,
    }));
    return true;
  },
  show(tab) {
    set((s) => ({ open: true, tab: tab ?? s.tab, unread: tab === 'private' ? 0 : s.unread }));
  },
  close() {
    set({ open: false });
  },
  privateTo(id, name) {
    set({ open: true, tab: 'private', recipient: { id, name }, unread: 0 });
  },
  reset() {
    set({ open: false, tab: 'near', recipient: null, messages: [], unread: 0 });
  },
}));
export function useChat<T>(selector: (state: ChatState) => T) {
  return useStore(chatStore, selector);
}
