import { create } from 'zustand';

interface GitState {
  currentBranch: string;
  stagedFiles: string[];
  setBranch: (branch: string) => void;
}

export const useGitStore = create<GitState>((set) => ({
  currentBranch: 'main',
  stagedFiles: [],
  setBranch: (branch) => set({ currentBranch: branch }),
}));
