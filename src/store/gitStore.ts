import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';
import { GitService } from '../utils/gitService';
import { useFileStore } from './fileStore';

const storage = createMMKV({ id: 'git-store' });

const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.remove(name);
  },
};

export interface GitFileChange {
  path: string;
  status: string; // 'M', 'A', 'D', '??', etc.
}

export interface GitCommit {
  hash: string;
  message: string;
}

interface GitState {
  // Auth
  githubToken: string | null;
  githubUsername: string | null;
  
  // Repo state
  currentBranch: string;
  branches: string[];
  remoteUrl: string | null;
  isGitRepo: boolean;
  
  // Changes
  stagedFiles: GitFileChange[];
  unstagedFiles: GitFileChange[];
  commitMessage: string;
  
  // Status
  isLoading: boolean;
  lastError: string | null;
  recentCommits: GitCommit[];
  
  // Actions
  setGithubToken: (token: string, username: string) => void;
  clearAuth: () => void;
  refreshStatus: () => Promise<void>;
  stageFile: (filePath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageFile: (filePath: string) => Promise<void>;
  commit: () => Promise<void>;
  pull: () => Promise<void>;
  push: () => Promise<void>;
  clone: (url: string, destName: string) => Promise<void>;
  initRepo: () => Promise<void>;
  initAndPublishRepo: (name: string, isPrivate: boolean) => Promise<void>;
  publishRepo: (name: string, isPrivate: boolean) => Promise<void>;
  setCommitMessage: (msg: string) => void;
}

export const useGitStore = create<GitState>()(
  persist(
    (set, get) => ({
      githubToken: null,
      githubUsername: null,
      
      currentBranch: '',
      branches: [],
      remoteUrl: null,
      isGitRepo: false,
      
      stagedFiles: [],
      unstagedFiles: [],
      commitMessage: '',
      
      isLoading: false,
      lastError: null,
      recentCommits: [],
      
      setGithubToken: (token: string, username: string) => set({ githubToken: token, githubUsername: username }),
      clearAuth: () => set({ githubToken: null, githubUsername: null }),
      
      refreshStatus: async () => {
        const rootPath = useFileStore.getState().rootPath;
        if (!rootPath) return;
        
        set({ isLoading: true, lastError: null });
        try {
          const isRepo = await GitService.isGitRepo(rootPath);
          set({ isGitRepo: isRepo });
          
          if (!isRepo) {
            set({ isLoading: false });
            return;
          }
          
          const branch = await GitService.getCurrentBranch(rootPath);
          const branches = await GitService.getBranches(rootPath);
          const remote = await GitService.getRemote(rootPath);
          
          const statusOutput = await GitService.getStatus(rootPath);
          const staged: GitFileChange[] = [];
          const unstaged: GitFileChange[] = [];
          
          if (statusOutput) {
            statusOutput.split('\n').forEach(line => {
              if (line.length < 4) return;
              const x = line[0];
              const y = line[1];
              const file = line.substring(3).trim();
              
              if (x !== ' ' && x !== '?') {
                 staged.push({ status: x, path: file });
              }
              if (y !== ' ') {
                 unstaged.push({ status: y, path: file });
              }
            });
          }
          
          const logOutput = await GitService.getLog(rootPath, 5);
          const commits = logOutput ? logOutput.split('\n').map(line => {
            const firstSpace = line.indexOf(' ');
            return {
               hash: line.substring(0, firstSpace),
               message: line.substring(firstSpace + 1)
            };
          }).filter(c => c.hash) : [];
          
          set({
            currentBranch: branch,
            branches,
            remoteUrl: remote || null,
            stagedFiles: staged,
            unstagedFiles: unstaged,
            recentCommits: commits,
            isLoading: false
          });
        } catch (e: any) {
          console.error(e);
          set({ lastError: e.message, isLoading: false });
        }
      },
      
      stageFile: async (filePath: string) => {
        const rootPath = useFileStore.getState().rootPath;
        await GitService.stageFile(rootPath, filePath);
        await get().refreshStatus();
      },
      
      stageAll: async () => {
         const rootPath = useFileStore.getState().rootPath;
         await GitService.stageAll(rootPath);
         await get().refreshStatus();
      },
      
      unstageFile: async (filePath: string) => {
         const rootPath = useFileStore.getState().rootPath;
         await GitService.unstageFile(rootPath, filePath);
         await get().refreshStatus();
      },
      
      commit: async () => {
         const rootPath = useFileStore.getState().rootPath;
         const { commitMessage, stagedFiles, unstagedFiles } = get();
         if (!commitMessage.trim()) return;

         if (stagedFiles.length === 0 && unstagedFiles.length > 0) {
           await GitService.stageAll(rootPath);
         }

         const { githubUsername } = get();
         const authorName = githubUsername || 'phcode-user';
         const authorEmail = `${githubUsername || 'user'}@users.noreply.github.com`;

         await GitService.commit(rootPath, commitMessage, authorName, authorEmail);
         set({ commitMessage: '' });
         // Polling isn't perfect for interactive commands, wait a bit
         setTimeout(() => get().refreshStatus(), 1000);
      },
      
      pull: async () => {
         const rootPath = useFileStore.getState().rootPath;
         const { githubToken, githubUsername, remoteUrl } = get();
         await GitService.pull(rootPath, githubToken || undefined, githubUsername || undefined, remoteUrl || undefined);
         setTimeout(() => get().refreshStatus(), 1000);
      },
      
      push: async () => {
         const rootPath = useFileStore.getState().rootPath;
         const { githubToken, githubUsername, remoteUrl } = get();
         await GitService.push(rootPath, githubToken || undefined, githubUsername || undefined, remoteUrl || undefined);
         setTimeout(() => get().refreshStatus(), 1000);
      },
      
      clone: async (url: string, destPath: string) => {
         const { githubToken, githubUsername } = get();
         await GitService.clone(url, destPath, githubToken || undefined, githubUsername || undefined);
         // The caller should ideally call loadDirectory on fileStore after this finishes.
      },
      
      initRepo: async () => {
         const rootPath = useFileStore.getState().rootPath;
         await GitService.init(rootPath);
         await get().refreshStatus();
      },
      
      initAndPublishRepo: async (name: string, isPrivate: boolean) => {
         const { githubToken, githubUsername } = get();
         const rootPath = useFileStore.getState().rootPath;
         if (!githubToken || !githubUsername || !rootPath) return;

         set({ isLoading: true });

         // 1. Initialize git
         await GitService.init(rootPath);
         
         // 2. Stage all and commit
         await GitService.stageAll(rootPath);
         const authorName = githubUsername || 'phcode-user';
         const authorEmail = `${githubUsername || 'user'}@users.noreply.github.com`;
         await GitService.commit(rootPath, "Initial commit", authorName, authorEmail);

         // 3. Create repo and push
         const { createGithubRepo } = require('../services/githubAuth');
         try {
           const repoData = await createGithubRepo(githubToken, name, isPrivate);
           if (repoData && repoData.clone_url) {
             await GitService.setRemote(rootPath, repoData.clone_url);
             await GitService.push(rootPath, githubToken, githubUsername, repoData.clone_url);
           }
         } catch (e: any) {
           console.error(e);
           set({ lastError: e.message });
         }
         
         set({ isLoading: false });
         await get().refreshStatus();
      },
      
      publishRepo: async (name: string, isPrivate: boolean) => {
         const { githubToken, githubUsername } = get();
         const rootPath = useFileStore.getState().rootPath;
         if (!githubToken || !githubUsername) return;
         
         const { createGithubRepo } = require('../services/githubAuth');
         try {
           const repoData = await createGithubRepo(githubToken, name, isPrivate);
           if (repoData && repoData.clone_url) {
             await GitService.setRemote(rootPath, repoData.clone_url);
             await GitService.push(rootPath, githubToken, githubUsername, repoData.clone_url);
             setTimeout(() => get().refreshStatus(), 1000);
           }
         } catch (e: any) {
           console.error(e);
           set({ lastError: e.message });
         }
      },
      
      setCommitMessage: (msg: string) => set({ commitMessage: msg }),
    }),
    {
      name: 'git-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        githubToken: state.githubToken,
        githubUsername: state.githubUsername,
      }),
    }
  )
);
