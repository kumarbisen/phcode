import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { useUIStore } from '../store/uiStore';
import { Terminal } from './Terminal';

export const BottomPanel = () => {
  const { theme } = useThemeStore();
  const { isBottomPanelExpanded, toggleBottomPanel, activeBottomPanelTab, setActiveBottomPanelTab } = useUIStore();

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.colors.sidebarBackground, borderTopColor: theme.colors.border },
      !isBottomPanelExpanded && { display: 'none' }
    ]}>
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.tabs}>
          {['TERMINAL', 'OUTPUT', 'PROBLEMS'].map((tab) => {
            const id = tab.toLowerCase() as any;
            const isActive = activeBottomPanelTab === id;
            return (
              <TouchableOpacity key={id} onPress={() => setActiveBottomPanelTab(id)} style={styles.tab}>
                <Text style={[styles.tabText, { color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                  {tab}
                </Text>
                {isActive && <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity onPress={toggleBottomPanel} style={styles.closeButton}>
          <X color={theme.colors.textSecondary} size={16} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={[{ flex: 1 }, activeBottomPanelTab !== 'terminal' && { display: 'none' }]}>
          <Terminal />
        </View>
        
        {activeBottomPanelTab === 'output' && (
          <Text style={{ color: theme.colors.textSecondary, padding: 16 }}>No output to display.</Text>
        )}
        {activeBottomPanelTab === 'problems' && (
          <Text style={{ color: theme.colors.textSecondary, padding: 16 }}>No problems detected in the workspace.</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    borderTopWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    borderBottomWidth: 1,
  },
  tabs: {
    flexDirection: 'row',
    height: '100%',
  },
  tab: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
});
