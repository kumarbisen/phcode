import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Files, Search, GitBranch, Blocks, Settings, Bot } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { useUIStore } from '../store/uiStore';
import { Explorer } from './Explorer';
import { SearchPanel } from './SearchPanel';
import { SourceControlPanel } from './SourceControlPanel';
import { ExtensionsPanel } from './ExtensionsPanel';
import { AIPanel } from './AIPanel';

const COLLAPSED_WIDTH = 60;
const EXPANDED_WIDTH = 220;

export const Sidebar = () => {
  const { theme } = useThemeStore();
  const { isSidebarExpanded, activeSidebarTab, setActiveSidebarTab, toggleSidebar } = useUIStore();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(isSidebarExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH, { duration: 250 }),
    };
  });

  const tabs = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: GitBranch, label: 'Source Control' },
    { id: 'extensions', icon: Blocks, label: 'Extensions' },
    { id: 'ai', icon: Bot, label: 'AI Assistant' },
  ] as const;

  const handleTabPress = (tabId: any) => {
    if (activeSidebarTab === tabId) {
      toggleSidebar();
    } else {
      setActiveSidebarTab(tabId);
      if (!isSidebarExpanded) {
        toggleSidebar();
      }
    }
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.colors.sidebarBackground, borderRightColor: theme.colors.border }, animatedStyle]}>
      <View style={styles.iconColumn}>
        <View style={styles.topIcons}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSidebarTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.iconButton, isActive && { borderLeftColor: theme.colors.primary, borderLeftWidth: 2 }]}
                onPress={() => handleTabPress(tab.id)}
              >
                <Icon color={isActive ? theme.colors.textPrimary : theme.colors.textSecondary} size={24} strokeWidth={1.5} />
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.bottomIcons}>
          <TouchableOpacity
            style={[styles.iconButton, activeSidebarTab === 'settings' && { borderLeftColor: theme.colors.primary, borderLeftWidth: 2 }]}
            onPress={() => handleTabPress('settings')}
          >
            <Settings color={activeSidebarTab === 'settings' ? theme.colors.textPrimary : theme.colors.textSecondary} size={28} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expanded Content Area */}
      <View style={[styles.contentArea, { opacity: isSidebarExpanded ? 1 : 0 }]}>
        {isSidebarExpanded && activeSidebarTab === 'explorer' && <Explorer />}
        {isSidebarExpanded && activeSidebarTab === 'search' && <SearchPanel />}
        {isSidebarExpanded && activeSidebarTab === 'git' && <SourceControlPanel />}
        {isSidebarExpanded && activeSidebarTab === 'extensions' && <ExtensionsPanel />}
        {isSidebarExpanded && activeSidebarTab === 'ai' && <AIPanel />}
        {isSidebarExpanded && activeSidebarTab === 'settings' && (
          <View>
            <Text style={[styles.tabTitle, { color: theme.colors.textPrimary, marginBottom: 16 }]}>SETTINGS</Text>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 8, fontSize: 11, fontWeight: '600' }}>THEME</Text>
            {['dark-plus', 'sublime', 'dracula', 'one-dark', 'nord', 'tokyo-night', 'catppuccin'].map(themeId => (
              <TouchableOpacity key={themeId} onPress={() => useThemeStore.getState().setTheme(themeId)} style={{ paddingVertical: 8 }}>
                <Text style={{ color: theme.colors.textPrimary }}>{themeId}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: '100%',
    borderRightWidth: 1,
  },
  iconColumn: {
    width: COLLAPSED_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  topIcons: {
    alignItems: 'center',
    width: '100%',
  },
  bottomIcons: {
    alignItems: 'center',
    width: '100%',
  },
  iconButton: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  contentArea: {
    flex: 1,
    padding: 16,
    overflow: 'hidden',
  },
  tabTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
