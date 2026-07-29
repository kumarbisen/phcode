import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { X, RotateCw, Globe } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { useUIStore } from '../store/uiStore';

export const Browser = () => {
  const { theme } = useThemeStore();
  const { previewUrl, setPreviewUrl, togglePreview } = useUIStore();
  
  const [inputUrl, setInputUrl] = useState(previewUrl);
  const [isLoading, setIsLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);

  React.useEffect(() => {
    setInputUrl(previewUrl);
  }, [previewUrl]);

  const handleGo = () => {
    let finalUrl = inputUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('file://')) {
      finalUrl = 'http://' + finalUrl;
    }
    setPreviewUrl(finalUrl);
    setInputUrl(finalUrl);
  };

  const handleRefresh = () => {
    webViewRef.current?.reload();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Browser Navigation Bar */}
      <View style={[styles.navBar, { backgroundColor: theme.colors.sidebarBackground, borderBottomColor: theme.colors.border }]}>
        <Globe color={theme.colors.textSecondary} size={20} style={styles.icon} />
        
        <TextInput
          style={[styles.urlInput, { 
            backgroundColor: theme.colors.background,
            color: theme.colors.textPrimary,
            borderColor: theme.colors.border 
          }]}
          value={inputUrl}
          onChangeText={setInputUrl}
          onSubmitEditing={handleGo}
          placeholder="Enter URL (e.g., http://localhost:5173)"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
          <RotateCw color={theme.colors.textSecondary} size={20} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.iconButton} onPress={togglePreview}>
          <X color={theme.colors.textSecondary} size={20} />
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: previewUrl }}
        style={styles.webview}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 100,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  icon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
  loaderContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    height: 2,
  },
  webview: {
    flex: 1,
  },
});
