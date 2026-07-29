import { create } from 'zustand';
import RNFS from 'react-native-fs';
import { useFileStore } from './fileStore';

export interface SearchMatch {
  file: string;
  line: number;
  text: string;
}

interface SearchState {
  query: string;
  isSearching: boolean;
  results: SearchMatch[];
  setQuery: (query: string) => void;
  performSearch: () => Promise<void>;
  clearResults: () => void;
}

const IGNORED_DIRS = ['node_modules', '.git', 'build', 'dist', '.gradle', '.idea', 'ios', 'android'];
const ALLOWED_EXTENSIONS = [
  'ts', 'tsx', 'js', 'jsx', 'json', 'md', 'txt', 'html', 'css', 'scss',
  'py', 'c', 'cpp', 'go', 'rs', 'java', 'rb', 'php', 'sh', 'bash', 'yml', 'yaml', 'xml'
];

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  isSearching: false,
  results: [],

  setQuery: (query: string) => set({ query }),

  clearResults: () => set({ results: [], query: '', isSearching: false }),

  performSearch: async () => {
    const { query } = get();
    if (!query.trim()) {
      set({ results: [], isSearching: false });
      return;
    }

    set({ isSearching: true, results: [] });
    
    // Get the current root path from file store
    const rootPath = useFileStore.getState().rootPath;
    const allMatches: SearchMatch[] = [];

    const searchDirectory = async (dirPath: string) => {
      try {
        const items = await RNFS.readDir(dirPath);
        for (const item of items) {
          if (item.isDirectory()) {
            if (!IGNORED_DIRS.includes(item.name)) {
              await searchDirectory(item.path);
            }
          } else {
            const ext = item.name.split('.').pop()?.toLowerCase() || '';
            if (ALLOWED_EXTENSIONS.includes(ext) || item.name.startsWith('.')) {
              // Ignore large files (e.g., > 2MB)
              if (item.size > 2 * 1024 * 1024) continue;

              try {
                const content = await RNFS.readFile(item.path, 'utf8');
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                    allMatches.push({
                      file: item.path,
                      line: i + 1,
                      text: lines[i].trim(),
                    });
                  }
                }
              } catch (e) {
                // Ignore read errors for specific files (e.g. permission denied)
              }
            }
          }
        }
      } catch (e) {
        console.error('Error reading directory:', dirPath, e);
      }
    };

    await searchDirectory(rootPath);
    set({ results: allMatches, isSearching: false });
  },
}));
