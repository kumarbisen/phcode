import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { Check, Plus, Minus, RefreshCw, Upload, Download, GitBranch } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const Github = ({ color, size, style }: { color: string, size: number, style?: any }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.34 6-1.53 6-6.76a5.2 5.2 0 0 0-1.5-3.78c.15-.38.65-1.79-.15-3.72C18.3 4.5 15.5 6 15 6a10.73 10.73 0 0 0-6 0C8.5 6 5.7 4.5 5.7 4.5c-.8 1.93-.3 3.34-.15 3.72A5.2 5.2 0 0 0 4 12c0 5.22 3 6.42 6 6.76a4.8 4.8 0 0 0-1 3.24v4" />
    <Path d="M9 19c-4.3 1.4-4.3-2.5-6-3" />
  </Svg>
);

import { useThemeStore } from '../store/themeStore';
import { useGitStore } from '../store/gitStore';
import { useFileStore } from '../store/fileStore';
import RNFS from 'react-native-fs';

export const SourceControlPanel = () => {
  const { theme } = useThemeStore();
  const gitStore = useGitStore();
  const fileStore = useFileStore();
  
  const [tokenInput, setTokenInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [isCloneModalVisible, setCloneModalVisible] = useState(false);

  useEffect(() => {
    gitStore.refreshStatus();
  }, [fileStore.rootPath]);

  const handleConnect = () => {
    if (tokenInput.trim() && usernameInput.trim()) {
      gitStore.setGithubToken(tokenInput.trim(), usernameInput.trim());
    }
  };

  const handleClone = async () => {
    if (cloneUrl.trim()) {
      const repoName = cloneUrl.split('/').pop()?.replace('.git', '') || 'cloned-repo';
      const destPath = `${RNFS.ExternalStorageDirectoryPath}/PhCode/${repoName}`;
      await gitStore.clone(cloneUrl.trim(), destPath);
      setCloneModalVisible(false);
      setCloneUrl('');
      fileStore.loadDirectory(destPath);
    }
  };

  const renderAuthSection = () => (
    <View style={styles.authContainer}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginBottom: 12 }]}>GITHUB AUTH</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, marginBottom: 8 }]}
        placeholder="GitHub Username"
        placeholderTextColor={theme.colors.textSecondary}
        value={usernameInput}
        onChangeText={setUsernameInput}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, marginBottom: 12 }]}
        placeholder="Personal Access Token (PAT)"
        placeholderTextColor={theme.colors.textSecondary}
        value={tokenInput}
        onChangeText={setTokenInput}
        secureTextEntry
      />
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={handleConnect}
      >
        <Github color={theme.colors.background} size={16} style={{ marginRight: 8 }} />
        <Text style={[styles.buttonText, { color: theme.colors.background }]}>Connect GitHub</Text>
      </TouchableOpacity>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 8 }}>
        Token needs 'repo' scope to push/pull private repositories.
      </Text>
    </View>
  );

  const renderFileBadge = (status: string) => {
    let color = theme.colors.textSecondary;
    if (status === 'M') color = theme.colors.warning;
    else if (status === 'A') color = theme.colors.success;
    else if (status === 'D') color = theme.colors.error;
    else if (status === '??') color = theme.colors.textSecondary;

    return <Text style={[styles.fileBadge, { color }]}>{status}</Text>;
  };

  if (!gitStore.githubToken) {
    return (
      <ScrollView style={styles.container}>
        {renderAuthSection()}
      </ScrollView>
    );
  }

  if (!gitStore.isGitRepo) {
    return (
      <View style={styles.container}>
         <View style={styles.headerRow}>
           <Text style={[styles.header, { color: theme.colors.textSecondary }]}>SOURCE CONTROL</Text>
           <TouchableOpacity onPress={() => setCloneModalVisible(true)}>
             <Download color={theme.colors.textSecondary} size={18} />
           </TouchableOpacity>
         </View>
         
         <View style={{ alignItems: 'center', marginTop: 40, padding: 20 }}>
            <GitBranch color={theme.colors.textSecondary} size={48} style={{ marginBottom: 16 }} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 14, marginBottom: 8, textAlign: 'center' }}>
              No Git repository found in {fileStore.currentProjectName}.
            </Text>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.colors.primary, marginTop: 16 }]}
              onPress={() => gitStore.initRepo()}
            >
              <Text style={[styles.buttonText, { color: theme.colors.background }]}>Initialize Repository</Text>
            </TouchableOpacity>
         </View>

         {isCloneModalVisible && (
            <Modal transparent={true} visible={isCloneModalVisible} animationType="fade">
               <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, { backgroundColor: theme.colors.sidebarBackground, borderColor: theme.colors.border }]}>
                     <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Clone Repository</Text>
                     <TextInput
                        style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, marginBottom: 16 }]}
                        placeholder="https://github.com/user/repo.git"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={cloneUrl}
                        onChangeText={setCloneUrl}
                        autoCapitalize="none"
                     />
                     <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                        <TouchableOpacity onPress={() => setCloneModalVisible(false)}>
                           <Text style={{ color: theme.colors.textSecondary, padding: 8 }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={handleClone}>
                           <Text style={[styles.buttonText, { color: theme.colors.background }]}>Clone</Text>
                        </TouchableOpacity>
                     </View>
                  </View>
               </View>
            </Modal>
         )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.colors.textSecondary }]}>SOURCE CONTROL</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => gitStore.pull()} style={styles.actionIcon}>
            <Download color={theme.colors.textSecondary} size={16} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => gitStore.push()} style={styles.actionIcon}>
            <Upload color={theme.colors.textSecondary} size={16} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => gitStore.refreshStatus()} style={styles.actionIcon}>
            <RefreshCw color={theme.colors.textSecondary} size={16} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={{ marginBottom: 12 }}>
         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <GitBranch color={theme.colors.textSecondary} size={14} style={{ marginRight: 6 }} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '500' }}>
               {gitStore.currentBranch}
            </Text>
         </View>
      </View>

      <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
        <TextInput 
          style={[styles.messageInput, { color: theme.colors.textPrimary }]} 
          placeholder="Message (Ctrl+Enter to commit)" 
          placeholderTextColor={theme.colors.textSecondary}
          value={gitStore.commitMessage}
          onChangeText={gitStore.setCommitMessage}
          multiline
        />
        <TouchableOpacity 
           style={[styles.commitButton, { backgroundColor: gitStore.commitMessage.trim() ? theme.colors.primary : theme.colors.border }]}
           onPress={() => gitStore.commit()}
           disabled={!gitStore.commitMessage.trim()}
        >
          <Check color={theme.colors.background} size={16} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
         
        {gitStore.stagedFiles.length > 0 && (
          <View style={styles.changesContainer}>
            <View style={styles.sectionHeaderRow}>
               <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>STAGED CHANGES ({gitStore.stagedFiles.length})</Text>
            </View>
            {gitStore.stagedFiles.map((file, i) => (
               <View key={i} style={styles.fileRow}>
                  {renderFileBadge(file.status)}
                  <Text style={[styles.fileName, { color: theme.colors.textPrimary }]} numberOfLines={1} ellipsizeMode="middle">
                     {file.path}
                  </Text>
                  <TouchableOpacity onPress={() => gitStore.unstageFile(file.path)}>
                     <Minus color={theme.colors.textSecondary} size={16} />
                  </TouchableOpacity>
               </View>
            ))}
          </View>
        )}

        <View style={styles.changesContainer}>
          <View style={styles.sectionHeaderRow}>
             <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>CHANGES ({gitStore.unstagedFiles.length})</Text>
             {gitStore.unstagedFiles.length > 0 && (
                <TouchableOpacity onPress={() => gitStore.stageAll()}>
                   <Plus color={theme.colors.textSecondary} size={16} />
                </TouchableOpacity>
             )}
          </View>
          
          {gitStore.unstagedFiles.length === 0 && gitStore.stagedFiles.length === 0 ? (
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 10, fontSize: 12 }}>
              No pending changes.
            </Text>
          ) : (
             gitStore.unstagedFiles.map((file, i) => (
                <View key={i} style={styles.fileRow}>
                   {renderFileBadge(file.status)}
                   <Text style={[styles.fileName, { color: theme.colors.textPrimary }]} numberOfLines={1} ellipsizeMode="middle">
                      {file.path}
                   </Text>
                   <TouchableOpacity onPress={() => gitStore.stageFile(file.path)}>
                      <Plus color={theme.colors.textSecondary} size={16} />
                   </TouchableOpacity>
                </View>
             ))
          )}
        </View>

        {gitStore.recentCommits.length > 0 && (
           <View style={[styles.changesContainer, { marginTop: 24, paddingBottom: 24 }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginBottom: 8 }]}>RECENT COMMITS</Text>
              {gitStore.recentCommits.map((commit, i) => (
                 <View key={i} style={styles.commitRow}>
                    <Text style={[styles.commitHash, { color: theme.colors.textSecondary }]}>{commit.hash}</Text>
                    <Text style={[styles.commitMsg, { color: theme.colors.textPrimary }]} numberOfLines={1}>{commit.message}</Text>
                 </View>
              ))}
           </View>
        )}

      </ScrollView>
      
      {gitStore.isLoading && (
         <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
         </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  header: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionIcon: { padding: 4 },
  
  authContainer: { padding: 4, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 6 },
  buttonText: { fontWeight: '600', fontSize: 13 },
  
  inputContainer: { borderWidth: 1, borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  messageInput: { padding: 8, fontSize: 13, height: 60, textAlignVertical: 'top' },
  commitButton: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  
  changesContainer: { marginTop: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '600' },
  
  fileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  fileBadge: { fontSize: 12, fontWeight: '600', width: 20, textAlign: 'center', marginRight: 6 },
  fileName: { flex: 1, fontSize: 13 },
  
  commitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  commitHash: { fontSize: 12, fontFamily: 'monospace', width: 60, marginRight: 8 },
  commitMsg: { flex: 1, fontSize: 13 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 400, borderWidth: 1, borderRadius: 8, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  
  loadingOverlay: { justifyContent: 'center', alignItems: 'center', zIndex: 100 }
});
