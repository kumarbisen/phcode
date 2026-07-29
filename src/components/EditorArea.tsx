import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { X, Circle } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { useFileStore } from '../store/fileStore';
import { useUIStore } from '../store/uiStore';
import { WelcomeScreen } from './WelcomeScreen';

export const EditorArea = () => {
  const { theme } = useThemeStore();
  const { openFiles, activeFilePath, updateFileContent, openFile, closeFile, loadingFilePath } = useFileStore();
  const { setSidebarExpanded } = useUIStore();
  const webViewRef = useRef<WebView>(null);
  
  const activeFile = openFiles.find(f => f.path === activeFilePath);

  useEffect(() => {
    if (webViewRef.current && activeFile) {
      const message = {
        type: 'SET_CONTENT',
        content: activeFile.content,
        language: activeFile.language,
      };
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  }, [activeFilePath]); // Run only when switching files

  useEffect(() => {
    if (webViewRef.current) {
      const message = {
        type: 'SET_THEME',
        theme: theme.id === 'dracula' ? 'vs-dark' : (theme.type === 'dark' ? 'vs-dark' : 'vs-light'),
      };
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  }, [theme]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'CONTENT_CHANGED' && activeFilePath) {
        // Guard against undefined (Monaco fires onChange with undefined on full clear)
        updateFileContent(activeFilePath, data.content ?? '');
      } else if (data.type === 'REQUEST_FOCUS') {
        webViewRef.current?.requestFocus();
        setSidebarExpanded(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.tabBar, { backgroundColor: theme.colors.inactiveTabBackground, borderBottomColor: theme.colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {openFiles.length > 0 ? (
            openFiles.map(file => {
              const isActive = file.path === activeFilePath;
              return (
                <TouchableOpacity
                  key={file.path}
                  style={[styles.tab, { backgroundColor: isActive ? theme.colors.activeTabBackground : 'transparent' }]}
                  onPress={() => {
                    openFile(file.path);
                    setSidebarExpanded(false);
                  }}
                >
                  <Text style={[styles.tabText, { color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary }]}>
                    {file.path.split('/').pop()}
                  </Text>
                  {file.isDirty ? (
                    <Circle size={10} fill={theme.colors.textPrimary} color={theme.colors.textPrimary} style={styles.tabIcon} />
                  ) : (
                    <TouchableOpacity onPress={() => closeFile(file.path)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <X size={14} color={isActive ? theme.colors.textPrimary : theme.colors.textSecondary} style={styles.tabIcon} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <TouchableOpacity style={styles.tab} onPress={() => setSidebarExpanded(false)}>
              <Text style={{ color: theme.colors.textSecondary }}>Welcome</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
      <View style={styles.editorContainer}>
        {loadingFilePath ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>Loading...</Text>
          </View>
        ) : activeFilePath ? (
          <WebView
            ref={webViewRef}
            source={{ uri: 'file:///android_asset/editor/index.html' }}
            originWhitelist={['*']}
            injectedJavaScript={`
              document.addEventListener('touchstart', function() {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_FOCUS' }));
                }
                var ta = document.querySelector('textarea.inputarea');
                if (ta) ta.focus();
              }, { capture: true, passive: true });
              true;
            `}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            onMessage={onMessage}
            style={styles.webview}
            bounces={false}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            keyboardDisplayRequiresUserAction={false}
            hideKeyboardAccessoryView={true}
            androidLayerType="software"
            overScrollMode="never"
            onLoadEnd={() => {
              if (webViewRef.current && activeFile) {
                webViewRef.current.postMessage(JSON.stringify({
                  type: 'SET_CONTENT',
                  content: activeFile.content,
                  language: activeFile.language,
                }));
                webViewRef.current.postMessage(JSON.stringify({
                  type: 'SET_THEME',
                  theme: theme.id === 'dracula' ? 'vs-dark' : (theme.type === 'dark' ? 'vs-dark' : 'vs-light'),
                }));
              }
            }}
          />
        ) : (
          <WelcomeScreen />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    height: 40,
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
  },
  tabIcon: {
    marginLeft: 8,
  },
  editorContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
  },
});
