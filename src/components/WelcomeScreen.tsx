import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FilePlus, FolderOpen, GitBranch, Monitor, MessageSquare } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { useFileStore } from '../store/fileStore';
import { useUIStore } from '../store/uiStore';
import RNFS from 'react-native-fs';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

export const WelcomeScreen = () => {
  const { theme } = useThemeStore();
  const { recentWorkspaces, loadDirectory } = useFileStore();
  const { setInputDialog, openFolderPicker, setActiveSidebarTab } = useUIStore();

  const handleNewFile = () => {
    setInputDialog({
      visible: true,
      type: 'createFile',
      path: RNFS.ExternalStorageDirectoryPath + '/PhCode',
      value: ''
    });
  };

  const handleOpenFolder = () => {
    openFolderPicker(RNFS.ExternalStorageDirectoryPath);
  };

  const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-5258115024282608/7254212596';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>PhCode</Text>
        <Text style={[{ color: theme.colors.textPrimary }]}>Made with ❤️ by vivek bisen</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Editing evolved</Text>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Start</Text>

            <TouchableOpacity style={styles.actionButton} onPress={handleNewFile}>
              <FilePlus color={theme.colors.primary} size={20} />
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>New File...</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleOpenFolder}>
              <FolderOpen color={theme.colors.primary} size={20} />
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>Open Folder...</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => { setActiveSidebarTab('git') }}>
              <GitBranch color={theme.colors.primary} size={20} />
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>Clone Git Repository...</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => { }}>
              <Monitor color={theme.colors.primary} size={20} />
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>Connect to...</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.column}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent</Text>

            {recentWorkspaces && recentWorkspaces.length > 0 ? (
              recentWorkspaces.map((workspacePath, index) => {
                const parts = workspacePath.split('/');
                const name = parts[parts.length - 1];
                const displayPath = workspacePath.replace(RNFS.ExternalStorageDirectoryPath, 'Storage');

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentItem}
                    onPress={() => loadDirectory(workspacePath)}
                  >
                    <Text style={[styles.recentName, { color: theme.colors.primary }]}>{name}</Text>
                    <Text style={[styles.recentPath, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {displayPath}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
                No recent workspaces.
              </Text>
            )}

            {recentWorkspaces && recentWorkspaces.length > 0 && (
              <TouchableOpacity style={styles.moreButton}>
                <Text style={[styles.recentName, { color: theme.colors.primary }]}>More...</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={{ marginTop: 60, alignItems: 'center' }}>


          <BannerAd
            unitId={bannerAdUnitId}
            size={BannerAdSize.BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 40,
    paddingTop: 80,
    maxWidth: 800,
  },
  title: {
    fontSize: 48,
    fontWeight: '300',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '300',
    marginBottom: 48,
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  column: {
    flex: 1,
    minWidth: 300,
    marginRight: 40,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recentName: {
    fontSize: 16,
    marginRight: 12,
  },
  recentPath: {
    fontSize: 14,
    flex: 1,
  },
  moreButton: {
    marginTop: 12,
    paddingVertical: 8,
  }
});
