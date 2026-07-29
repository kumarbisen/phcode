import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';
import RNFS from 'react-native-fs';
import { initLlama, LlamaContext } from 'llama.rn';
import { useFileStore } from './fileStore';

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
  inputValue: string;
  
  setInputValue: (val: string) => void;
  downloadModel: (variant: '0.5B' | '1.5B') => Promise<void>;
  loadModel: () => Promise<void>;
  releaseModel: () => Promise<void>;
  sendMessage: (text?: string, activeFileContent?: string, activeFileName?: string) => Promise<void>;
  cancelGeneration: () => void;
  clearMessages: () => void;
  deleteModel: () => Promise<void>;
  errorMessage: string | null;
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
      inputValue: '',
      errorMessage: null,

      setInputValue: (val) => set({ inputValue: val }),

      downloadModel: async (variant: '0.5B' | '1.5B') => {
        set({ modelStatus: 'downloading', downloadProgress: 0, selectedVariant: variant, errorMessage: null });
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
        } catch (e: any) {
          console.error("Failed to download model", e);
          set({ modelStatus: 'error', modelPath: null, errorMessage: `Download failed: ${e.message}` });
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
            n_ctx: 4096, // Keep context manageable for mobile
            n_gpu_layers: 0 // CPU inference for compatibility first
          });
          set({ llamaContext: context, modelStatus: 'ready', errorMessage: null });
        } catch (e: any) {
          console.error("Failed to load model", e);
          set({ modelStatus: 'error', errorMessage: `Load failed: ${e.message}` });
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

      sendMessage: async (text?: string, activeFileContent?: string, activeFileName?: string) => {
        const { llamaContext, messages } = get();
        if (!llamaContext) {
             console.error("Model not loaded");
             return;
        }

        let newMessages = [...messages];
        let assistantMessageId = '';

        if (text) {
          const userMessageId = Math.random().toString(36).substring(7);
          assistantMessageId = Math.random().toString(36).substring(7);
          newMessages = [
            ...newMessages,
            { id: userMessageId, role: 'user', content: text },
            { id: assistantMessageId, role: 'assistant', content: '' }
          ];
        } else {
           // Continuation of previous tool call
           assistantMessageId = Math.random().toString(36).substring(7);
           newMessages.push({ id: assistantMessageId, role: 'assistant', content: '' });
        }

        set({ messages: newMessages, isGenerating: true });

        let systemPrompt = `You are an expert coding assistant running locally on the user's device. You support 92 programming languages. Be concise and precise. When writing code, always use markdown code blocks with the language identifier.

You have access to the following tools to manage the user's workspace:
1. read_file
<tool_call>{"name": "read_file", "args": {"path": "src/App.tsx"}}</tool_call>
2. write_file
<tool_call>{"name": "write_file", "args": {"path": "src/App.tsx", "content": "..."}}</tool_call>

If you want to use a tool, output ONLY the <tool_call> XML block and NOTHING else. Do not explain what you are doing before calling the tool. Wait for the <tool_result> response.`;
        
        if (activeFileContent && activeFileName) {
            // truncate activeFileContent to ~1000 words to save context
            const truncated = activeFileContent.split(/\s+/).slice(0, 1000).join(' ');
            systemPrompt += `\n\nThe user currently has this file open:\n--- FILE: ${activeFileName} ---\n${truncated}\n--- END FILE ---`;
        }

        let prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
        
        // Trim history to prevent crashing (max ~12000 chars for safety)
        const MAX_PROMPT_LENGTH = 12000;
        let historyStr = '';
        
        for (let i = Math.max(0, newMessages.length - 10); i < newMessages.length; i++) {
           const m = newMessages[i];
           if (m.content) {
             historyStr += `<|im_start|>${m.role}\n${m.content}<|im_end|>\n`;
           }
        }
        
        if (historyStr.length > MAX_PROMPT_LENGTH) {
           historyStr = historyStr.substring(historyStr.length - MAX_PROMPT_LENGTH);
        }
        
        prompt += historyStr + `<|im_start|>assistant\n`;

        let generatedContent = '';
        try {
          await llamaContext.completion(
            { prompt, n_predict: 1024, stop: ['<|im_end|>', '<|endoftext|>', '</tool_call>'] },
            (res) => {
              generatedContent += res.token;
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

          // Agent Tool Execution Logic
          if (generatedContent.includes('<tool_call>')) {
             let toolJSON = generatedContent.split('<tool_call>')[1].trim();
             // Since stop token is </tool_call>, it might not be in the output, but just in case
             toolJSON = toolJSON.replace('</tool_call>', '').trim();
             
             let result = '';
             try {
                const call = JSON.parse(toolJSON);
                if (call.name === 'read_file') {
                   const content = await RNFS.readFile(useFileStore.getState().rootPath + '/' + call.args.path, 'utf8');
                   result = `Read successful. Length: ${content.length} chars. Content snippet: ${content.substring(0, 1500)}`;
                } else if (call.name === 'write_file') {
                   await RNFS.writeFile(useFileStore.getState().rootPath + '/' + call.args.path, call.args.content, 'utf8');
                   result = `Write successful.`;
                } else {
                   result = `Error: Tool ${call.name} not found.`;
                }
             } catch (err: any) {
                result = `Error executing tool: ${err.message}`;
             }

             // Append tool result and resume
             const toolMsgId = Math.random().toString(36).substring(7);
             set((state) => ({
                messages: [
                  ...state.messages,
                  { id: toolMsgId, role: 'user', content: `<tool_result>${result}</tool_result>` }
                ]
             }));
             
             // Recursively continue agent loop
             await get().sendMessage();
          }

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
        inputValue: state.inputValue,
      }),
    }
  )
);
