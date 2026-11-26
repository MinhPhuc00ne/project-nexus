import { create } from 'zustand';

export interface UiStoreState {
  sidebarOpen: boolean;
  chatOpen: boolean;
  activeChatConversationId: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openChat: (conversationId?: string | null) => void;
  closeChat: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  sidebarOpen: false,
  chatOpen: false,
  activeChatConversationId: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openChat: (conversationId = null) =>
    set({ chatOpen: true, activeChatConversationId: conversationId }),
  closeChat: () => set({ chatOpen: false }),
}));
