import React from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { EditorArea } from './components/EditorArea';
import { BottomPanel } from './components/BottomPanel';
import { Browser } from './components/Browser';
import { GlobalModals } from './components/GlobalModals';
import { useThemeStore } from './store/themeStore';
import { useUIStore } from './store/uiStore';

const MainLayout = () => {
  const { theme } = useThemeStore();
  const { isPreviewOpen } = useUIStore();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.topBarBackground }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.topBarBackground} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <TopBar />
        <View style={styles.mainContent}>
          <Sidebar />
          <View style={styles.editorAndBottom}>
            {isPreviewOpen ? (
              <Browser />
            ) : (
              <>
                <EditorArea />
                <BottomPanel />
              </>
            )}
          </View>
        </View>
      </View>
      <GlobalModals />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  editorAndBottom: {
    flex: 1,
    flexDirection: 'column',
  },
});

export default MainLayout;
