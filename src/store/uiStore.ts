import { create } from 'zustand';
import RNFS from 'react-native-fs';
import { Alert } from 'react-native';

interface UIState {
  isSidebarExpanded: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  activeSidebarTab: 'explorer' | 'search' | 'git' | 'extensions' | 'settings' | 'ai';
  setActiveSidebarTab: (tab: 'explorer' | 'search' | 'git' | 'extensions' | 'settings' | 'ai') => void;
  isBottomPanelExpanded: boolean;
  toggleBottomPanel: () => void;
  activeBottomPanelTab: 'terminal' | 'output' | 'problems';
  setActiveBottomPanelTab: (tab: 'terminal' | 'output' | 'problems') => void;
  isPreviewOpen: boolean;
  togglePreview: () => void;
  previewUrl: string;
  setPreviewUrl: (url: string) => void;
  folderPicker: { visible: boolean; currentPath: string; folders: any[] };
  setFolderPicker: (picker: { visible: boolean; currentPath: string; folders: any[] }) => void;
  openFolderPicker: (path: string) => Promise<void>;
  inputDialog: { visible: boolean; type: 'createFile' | 'createFolder' | 'rename'; path: string; value: string };
  setInputDialog: (dialog: { visible: boolean; type: 'createFile' | 'createFolder' | 'rename'; path: string; value: string }) => void;
  githubToken: string | null;
  setGithubToken: (token: string | null) => void;
  githubUser: any | null;
  setGithubUser: (user: any | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarExpanded: true,
  toggleSidebar: () => set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded })),
  setSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
  activeSidebarTab: 'explorer',
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
  isBottomPanelExpanded: false,
  toggleBottomPanel: () => set((state) => ({ isBottomPanelExpanded: !state.isBottomPanelExpanded })),
  activeBottomPanelTab: 'terminal',
  setActiveBottomPanelTab: (tab) => set({ activeBottomPanelTab: tab }),
  isPreviewOpen: false,
  togglePreview: () => set((state) => ({ isPreviewOpen: !state.isPreviewOpen })),
  previewUrl: 'http://localhost:5173',
  setPreviewUrl: (url) => set({ previewUrl: url }),
  folderPicker: { visible: false, currentPath: '', folders: [] },
  setFolderPicker: (picker) => set({ folderPicker: picker }),
  openFolderPicker: async (path: string) => {
    try {
      const items = await RNFS.readDir(path);
      const dirs = items.filter(i => i.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
      set({ folderPicker: { visible: true, currentPath: path, folders: dirs } });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Cannot read this directory.');
    }
  },
  inputDialog: { visible: false, type: 'createFile', path: '', value: '' },
  setInputDialog: (dialog) => set({ inputDialog: dialog }),
  githubToken: null,
  setGithubToken: (token) => set({ githubToken: token }),
  githubUser: null,
  setGithubUser: (user) => set({ githubUser: user }),
}));
