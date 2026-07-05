export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: {
    background: string; // Main editor/app background
    sidebarBackground: string;
    topBarBackground: string;
    textPrimary: string;
    textSecondary: string;
    primary: string; // Accent color (e.g., active tab line)
    border: string; // Dividers
    activeTabBackground: string;
    inactiveTabBackground: string;
    selectionBackground: string;
    error: string;
    warning: string;
    info: string;
    success: string;
  };
}

export const themes: Record<string, Theme> = {
  'dark-plus': {
    id: 'dark-plus',
    name: 'Dark+ (default dark)',
    type: 'dark',
    colors: {
      background: '#1E1E1E',
      sidebarBackground: '#252526',
      topBarBackground: '#333333',
      textPrimary: '#CCCCCC',
      textSecondary: '#969696',
      primary: '#007ACC',
      border: '#3C3C3C',
      activeTabBackground: '#1E1E1E',
      inactiveTabBackground: '#2D2D2D',
      selectionBackground: '#264F78',
      error: '#F48771',
      warning: '#CCA700',
      info: '#75BEFF',
      success: '#89D185',
    },
  },
  sublime: {
    id: 'sublime',
    name: 'Monokai (Sublime)',
    type: 'dark',
    colors: {
      background: '#272822',
      sidebarBackground: '#1E1F1C',
      topBarBackground: '#1E1F1C',
      textPrimary: '#F8F8F2',
      textSecondary: '#75715E',
      primary: '#A6E22E', // Sublime green
      border: '#3E3D32',
      activeTabBackground: '#272822',
      inactiveTabBackground: '#34352D',
      selectionBackground: '#49483E',
      error: '#F92672',
      warning: '#E6DB74',
      info: '#66D9EF',
      success: '#A6E22E',
    },
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    type: 'dark',
    colors: {
      background: '#282a36',
      sidebarBackground: '#21222c',
      topBarBackground: '#191a21',
      textPrimary: '#f8f8f2',
      textSecondary: '#6272a4',
      primary: '#ff79c6',
      border: '#44475a',
      activeTabBackground: '#282a36',
      inactiveTabBackground: '#21222c',
      selectionBackground: '#44475a',
      error: '#ff5555',
      warning: '#f1fa8c',
      info: '#8be9fd',
      success: '#50fa7b',
    },
  },
  'one-dark': {
    id: 'one-dark',
    name: 'One Dark Pro',
    type: 'dark',
    colors: {
      background: '#282C34',
      sidebarBackground: '#21252B',
      topBarBackground: '#21252B',
      textPrimary: '#ABB2BF',
      textSecondary: '#5C6370',
      primary: '#61AFEF',
      border: '#181A1F',
      activeTabBackground: '#282C34',
      inactiveTabBackground: '#21252B',
      selectionBackground: '#3E4451',
      error: '#E06C75',
      warning: '#E5C07B',
      info: '#56B6C2',
      success: '#98C379',
    },
  },
  nord: {
    id: 'nord',
    name: 'Nord',
    type: 'dark',
    colors: {
      background: '#2E3440',
      sidebarBackground: '#242933',
      topBarBackground: '#242933',
      textPrimary: '#D8DEE9',
      textSecondary: '#4C566A',
      primary: '#88C0D0',
      border: '#3B4252',
      activeTabBackground: '#2E3440',
      inactiveTabBackground: '#242933',
      selectionBackground: '#434C5E',
      error: '#BF616A',
      warning: '#EBCB8B',
      info: '#5E81AC',
      success: '#A3BE8C',
    },
  },
  'tokyo-night': {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    type: 'dark',
    colors: {
      background: '#1A1B26',
      sidebarBackground: '#16161E',
      topBarBackground: '#16161E',
      textPrimary: '#C0CAF5',
      textSecondary: '#565F89',
      primary: '#7AA2F7',
      border: '#292E42',
      activeTabBackground: '#1A1B26',
      inactiveTabBackground: '#16161E',
      selectionBackground: '#283457',
      error: '#F7768E',
      warning: '#E0AF68',
      info: '#7DCFFF',
      success: '#9ECE6A',
    },
  },
  catppuccin: {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    type: 'dark',
    colors: {
      background: '#1E1E2E',
      sidebarBackground: '#181825',
      topBarBackground: '#11111B',
      textPrimary: '#CDD6F4',
      textSecondary: '#A6ADC8',
      primary: '#CBA6F7',
      border: '#313244',
      activeTabBackground: '#1E1E2E',
      inactiveTabBackground: '#181825',
      selectionBackground: '#45475A',
      error: '#F38BA8',
      warning: '#F9E2AF',
      info: '#89B4FA',
      success: '#A6E3A1',
    },
  },
};
