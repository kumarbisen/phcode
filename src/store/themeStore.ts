import { create } from 'zustand';
import { Theme, themes } from '../theme/themes';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV();

interface ThemeState {
  currentThemeId: string;
  theme: Theme;
  setTheme: (themeId: string) => void;
}

export const useThemeStore = create<ThemeState>()((set) => {
  // Load saved theme or fallback to dark-plus
  const savedThemeId = storage.getString('theme') || 'dark-plus';
  const initialTheme = themes[savedThemeId] || themes['dark-plus'];

  return {
    currentThemeId: initialTheme.id,
    theme: initialTheme,
    setTheme: (themeId: string) => {
      const selectedTheme = themes[themeId];
      if (selectedTheme) {
        storage.set('theme', themeId);
        set({ currentThemeId: themeId, theme: selectedTheme });
      }
    },
  };
});
