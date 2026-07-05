import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIState {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  messages: [],
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  clearMessages: () => set({ messages: [] }),
}));
