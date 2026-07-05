import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';
import RNFS from 'react-native-fs';

const storage = createMMKV({ id: 'file-store' });

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

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: Date;
  children?: FileNode[]; // Populated if directory and expanded
  isExpanded?: boolean;
  level: number;
}

export interface OpenFile {
  path: string;
  content: string;
  originalContent: string;
  language: string;
  isDirty: boolean;
}

interface FileState {
  rootPath: string;
  files: FileNode[]; // Flattened list for FlashList
  isLoading: boolean;
  currentProjectName: string;
  openFiles: OpenFile[];
  activeFilePath: string | null;
  recentWorkspaces: string[];
  loadDirectory: (path: string) => Promise<void>;
  toggleNode: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  updateFileContent: (path: string, newContent: string) => void;
  saveFile: (path: string) => Promise<void>;
  createNode: (parentPath: string, name: string, isDirectory: boolean) => Promise<void>;
  renameNode: (oldPath: string, newName: string) => Promise<void>;
  deleteNode: (path: string) => Promise<void>;
}

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      rootPath: RNFS.ExternalStorageDirectoryPath + '/PhCode',
      files: [],
      isLoading: false,
      currentProjectName: 'Documents',
      openFiles: [],
      activeFilePath: null,
      recentWorkspaces: [],

      loadDirectory: async (path: string) => {
        set({ isLoading: true });
        try {
          const items = await RNFS.readDir(path);
          const rootNodes: FileNode[] = items.map(item => ({
            name: item.name,
            path: item.path,
            isDirectory: item.isDirectory(),
            size: item.size,
            mtime: item.mtime ?? new Date(),
            level: 0,
            isExpanded: false
          })).sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
          });

          const currentRecents = get().recentWorkspaces || [];
          const updatedRecents = [path, ...currentRecents.filter(p => p !== path)].slice(0, 10);

          set({ 
            rootPath: path, 
            currentProjectName: path.split('/').pop() || 'Project',
            files: rootNodes,
            isLoading: false,
            recentWorkspaces: updatedRecents
          });
        } catch (e) {
          console.error('Failed to load directory', e);
          set({ isLoading: false });
        }
      },

      toggleNode: async (path: string) => {
        const { files } = get();
        const index = files.findIndex(f => f.path === path);

    const node = files[index];
    if (!node.isDirectory) return;

    const newFiles = [...files];

    if (node.isExpanded) {
      // Collapse: Remove all children from flattened list
      newFiles[index] = { ...node, isExpanded: false };
      
      let itemsToRemove = 0;
      for (let i = index + 1; i < newFiles.length; i++) {
        if (newFiles[i].level > node.level) {
          itemsToRemove++;
        } else {
          break;
        }
      }
      newFiles.splice(index + 1, itemsToRemove);
      set({ files: newFiles });
    } else {
      // Expand: Fetch children and insert into flattened list
      newFiles[index] = { ...node, isExpanded: true };
      set({ files: newFiles }); // Optimistic UI

      try {
        const items = await RNFS.readDir(path);
        const childrenNodes: FileNode[] = items.map(item => ({
          name: item.name,
          path: item.path,
          isDirectory: item.isDirectory(),
          size: item.size,
          mtime: item.mtime ?? new Date(),
          level: node.level + 1,
          isExpanded: false
        })).sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
          return a.isDirectory ? -1 : 1;
        });

        // Insert children after the parent
        const latestFiles = [...get().files];
        const latestIndex = latestFiles.findIndex(f => f.path === path);
        latestFiles.splice(latestIndex + 1, 0, ...childrenNodes);
        set({ files: latestFiles });
      } catch (e) {
        console.error('Failed to read sub-directory', e);
      }
    }
  },

  openFile: async (path: string) => {
    const { openFiles } = get();
    if (openFiles.find(f => f.path === path)) {
      set({ activeFilePath: path });
      return;
    }

    try {
      const content = await RNFS.readFile(path, 'utf8');
      const ext = path.split('.').pop()?.toLowerCase();
      let language = 'plaintext';
      if (['js', 'jsx'].includes(ext!)) language = 'javascript';
      if (['ts', 'tsx'].includes(ext!)) language = 'typescript';
      if (ext === 'json') language = 'json';
      if (ext === 'md') language = 'markdown';
      if (['html', 'htm'].includes(ext!)) language = 'html';
      if (['css', 'scss'].includes(ext!)) language = 'css';
      if (['py'].includes(ext!)) language = 'python';
      if (ext === 'c') language = 'c';
      if (['cpp', 'cxx', 'cc'].includes(ext!)) language = 'cpp';
      if (ext === 'go') language = 'go';
      if (ext === 'rs') language = 'rust';
      if (ext === 'java') language = 'java';
      if (ext === 'rb') language = 'ruby';
      if (ext === 'php') language = 'php';
      
      // New Languages
      if (['sh', 'bash'].includes(ext!)) language = 'shell';
      if (ext === 'lua') language = 'lua';
      if (['pl', 'pm'].includes(ext!)) language = 'perl';
      if (ext === 'dart') language = 'dart';
      if (ext === 'r') language = 'r';
      if (['scala', 'sc'].includes(ext!)) language = 'scala';
      if (ext === 'hs') language = 'haskell';
      if (['ex', 'exs'].includes(ext!)) language = 'elixir';
      if (ext === 'nim') language = 'nim';
      if (ext === 'zig') language = 'zig';
      if (ext === 'cr') language = 'crystal';
      if (ext === 'cs') language = 'csharp';
      if (['kt', 'kts'].includes(ext!)) language = 'kotlin';
      if (ext === 'swift') language = 'swift';
      
      const newFile: OpenFile = {
        path,
        content,
        originalContent: content,
        language,
        isDirty: false
      };
      
      set({ openFiles: [...openFiles, newFile], activeFilePath: path });
    } catch (e) {
      console.error('Failed to open file', e);
    }
  },

  closeFile: (path: string) => {
    const { openFiles, activeFilePath } = get();
    const newFiles = openFiles.filter(f => f.path !== path);
    let newActive = activeFilePath;
    if (activeFilePath === path) {
      newActive = newFiles.length > 0 ? newFiles[newFiles.length - 1].path : null;
    }
    set({ openFiles: newFiles, activeFilePath: newActive });
  },

  updateFileContent: (path: string, newContent: string) => {
    const { openFiles } = get();
    const newFiles = openFiles.map(f => {
      if (f.path === path) {
        return {
          ...f,
          content: newContent,
          isDirty: newContent !== f.originalContent
        };
      }
      return f;
    });
    set({ openFiles: newFiles });
  },

  saveFile: async (path: string) => {
    const { openFiles } = get();
    const fileToSave = openFiles.find(f => f.path === path);
    if (!fileToSave) return;

    try {
      await RNFS.writeFile(path, fileToSave.content, 'utf8');
      const newFiles = openFiles.map(f => 
        f.path === path ? { ...f, originalContent: f.content, isDirty: false } : f
      );
      set({ openFiles: newFiles });
    } catch (e) {
      console.error('Failed to save file', e);
    }
  },

  createNode: async (parentPath: string, name: string, isDirectory: boolean) => {
    try {
      const fullPath = `${parentPath}/${name}`;
      if (isDirectory) {
        await RNFS.mkdir(fullPath);
      } else {
        await RNFS.writeFile(fullPath, '', 'utf8');
      }
      // Reload directory to reflect changes
      await get().loadDirectory(get().rootPath);
    } catch (e) {
      console.error('Failed to create node', e);
    }
  },

  renameNode: async (oldPath: string, newName: string) => {
    try {
      const basePath = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = `${basePath}/${newName}`;
      await RNFS.moveFile(oldPath, newPath);
      
      // Update openFiles if necessary
      const { openFiles, activeFilePath } = get();
      let openFilesChanged = false;
      const newOpenFiles = openFiles.map(f => {
        if (f.path === oldPath) {
          openFilesChanged = true;
          return { ...f, path: newPath };
        } else if (f.path.startsWith(oldPath + '/')) {
          openFilesChanged = true;
          return { ...f, path: f.path.replace(oldPath, newPath) };
        }
        return f;
      });

      if (openFilesChanged) {
        let newActive = activeFilePath;
        if (activeFilePath === oldPath) newActive = newPath;
        else if (activeFilePath?.startsWith(oldPath + '/')) newActive = activeFilePath.replace(oldPath, newPath);
        
        set({ openFiles: newOpenFiles, activeFilePath: newActive });
      }

      await get().loadDirectory(get().rootPath);
    } catch (e) {
      console.error('Failed to rename node', e);
    }
  },

  deleteNode: async (path: string) => {
    try {
      await RNFS.unlink(path);
      
      // Close open files if they are deleted
      const { openFiles, activeFilePath } = get();
      const filesToKeep = openFiles.filter(f => f.path !== path && !f.path.startsWith(path + '/'));
      
      if (filesToKeep.length !== openFiles.length) {
        let newActive = activeFilePath;
        if (!filesToKeep.find(f => f.path === activeFilePath)) {
          newActive = filesToKeep.length > 0 ? filesToKeep[filesToKeep.length - 1].path : null;
        }
        set({ openFiles: filesToKeep, activeFilePath: newActive });
      }

      await get().loadDirectory(get().rootPath);
    } catch (e) {
      console.error('Failed to delete node', e);
    }
  }
    }),
    {
      name: 'file-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        openFiles: state.openFiles,
        activeFilePath: state.activeFilePath,
        rootPath: state.rootPath,
        currentProjectName: state.currentProjectName,
      }),
    }
  )
);
