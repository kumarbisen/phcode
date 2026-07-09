import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';
import RNFS from 'react-native-fs';
import { initLlama, LlamaContext } from 'llama.rn';

const storage = createMMKV({ id: 'ai-store' });

const zustandStorage = {
  setItem: (name: string, value: string) => {
    storage.set(name, value);
    return Promise.resolve();
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return Promise.resolve(value ?? null);
  },
  removeItem: (name: string) => {
    storage.remove(name);
    return Promise.resolve();
  },
};

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIState {
  modelStatus: 'none' | 'downloading' | 'ready' | 'loading' | 'error';
  downloadProgress: number;
  selectedVariant: '0.5B' | '1.5B' | null;
  modelPath: string | null;
  isGenerating: boolean;
  llamaContext: LlamaContext | null;
  messages: Message[];
  
  downloadModel: (variant: '0.5B' | '1.5B') => Promise<void>;
  loadModel: () => Promise<void>;
  releaseModel: () => Promise<void>;
  sendMessage: (text: string, activeFileContent?: string, activeFileName?: string) => Promise<void>;
  cancelGeneration: () => void;
  clearMessages: () => void;
  deleteModel: () => Promise<void>;
}

const MODEL_URLS = {
  '0.5B': 'https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',
  '1.5B': 'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf'
};

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      modelStatus: 'none',
      downloadProgress: 0,
      selectedVariant: null,
      modelPath: null,
      isGenerating: false,
      llamaContext: null,
      messages: [],

      downloadModel: async (variant: '0.5B' | '1.5B') => {
        set({ modelStatus: 'downloading', downloadProgress: 0, selectedVariant: variant });
        const url = MODEL_URLS[variant];
        const dir = `${RNFS.DocumentDirectoryPath}/models`;
        const path = `${dir}/qwen2.5-coder-${variant}.gguf`;
        
        try {
          const exists = await RNFS.exists(dir);
          if (!exists) {
            await RNFS.mkdir(dir);
          }

          const download = RNFS.downloadFile({
            fromUrl: url,
            toFile: path,
            progress: (res) => {
              const progress = res.bytesWritten / res.contentLength;
              set({ downloadProgress: progress });
            },
            progressDivider: 1
          });

          await download.promise;
          set({ modelStatus: 'ready', modelPath: path, downloadProgress: 1 });
          
          await get().loadModel();
        } catch (e) {
          console.error("Failed to download model", e);
          set({ modelStatus: 'error', modelPath: null });
        }
      },

      loadModel: async () => {
        const { modelPath } = get();
        if (!modelPath) return;
        
        try {
          const exists = await RNFS.exists(modelPath);
          if (!exists) {
             set({ modelStatus: 'none', modelPath: null });
             return;
          }

          set({ modelStatus: 'loading' });
          const context = await initLlama({
            model: modelPath,
            use_mlock: true,
            n_ctx: 4096, // Keep context manageable for mobile
            n_gpu_layers: 0 // CPU inference for compatibility first
          });
          set({ llamaContext: context, modelStatus: 'ready' });
        } catch (e) {
          console.error("Failed to load model", e);
          set({ modelStatus: 'error' });
        }
      },

      releaseModel: async () => {
        const { llamaContext } = get();
        if (llamaContext) {
          await llamaContext.release();
          set({ llamaContext: null });
        }
      },

      deleteModel: async () => {
         const { modelPath, llamaContext } = get();
         if (llamaContext) {
            await llamaContext.release();
         }
         if (modelPath) {
             try {
                await RNFS.unlink(modelPath);
             } catch(e) {}
         }
         set({ modelStatus: 'none', modelPath: null, selectedVariant: null, llamaContext: null, downloadProgress: 0 });
      },

      sendMessage: async (text: string, activeFileContent?: string, activeFileName?: string) => {
        const { llamaContext, messages } = get();
        if (!llamaContext) {
             console.error("Model not loaded");
             return;
        }

        const userMessageId = Math.random().toString(36).substring(7);
        const assistantMessageId = Math.random().toString(36).substring(7);

        const newMessages: Message[] = [
          ...messages,
          { id: userMessageId, role: 'user', content: text },
          { id: assistantMessageId, role: 'assistant', content: '' }
        ];

        set({ messages: newMessages, isGenerating: true });

        let systemPrompt = "You are an expert coding assistant running locally on the user's device. You support 92 programming languages. Be concise and precise. When writing code, always use markdown code blocks with the language identifier.";
        if (activeFileContent && activeFileName) {
            // truncate activeFileContent to ~3000 words to avoid context overflow for now
            const truncated = activeFileContent.split(/\s+/).slice(0, 3000).join(' ');
            systemPrompt += `\n\nThe user has the following file open:\n--- FILE: ${activeFileName} ---\n${truncated}\n--- END FILE ---`;
        }

        let prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
        
        for (let i = 0; i < messages.length; i++) {
           const m = messages[i];
           prompt += `<|im_start|>${m.role}\n${m.content}<|im_end|>\n`;
        }
        
        prompt += `<|im_start|>user\n${text}<|im_end|>\n<|im_start|>assistant\n`;

        try {
          await llamaContext.completion(
            { prompt, n_predict: 1024, stop: ['<|im_end|>', '<|endoftext|>'] },
            (res) => {
              set((state) => {
                const currentMessages = [...state.messages];
                const lastIdx = currentMessages.length - 1;
                if (lastIdx >= 0 && currentMessages[lastIdx].id === assistantMessageId) {
                   currentMessages[lastIdx] = {
                     ...currentMessages[lastIdx],
                     content: currentMessages[lastIdx].content + res.token
                   };
                }
                return { messages: currentMessages };
              });
            }
          );
        } catch (e) {
          console.error("Generation error", e);
        } finally {
          set({ isGenerating: false });
        }
      },

      cancelGeneration: () => {
        const { llamaContext } = get();
        if (llamaContext) {
          llamaContext.stopCompletion();
        }
        set({ isGenerating: false });
      },

      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'ai-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        modelStatus: state.modelStatus === 'ready' ? 'ready' : (state.modelStatus === 'error' ? 'error' : 'none'),
        modelPath: state.modelPath,
        selectedVariant: state.selectedVariant,
        messages: state.messages,
      }),
    }
  )
);
