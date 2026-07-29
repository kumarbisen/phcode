import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import RNFS from 'react-native-fs';
import { Folder as FolderIcon, ArrowLeft } from 'lucide-react-native';
import { useFileStore } from '../store/fileStore';
import { useThemeStore } from '../store/themeStore';
import { useUIStore } from '../store/uiStore';

export const GlobalModals = () => {
  const { theme } = useThemeStore();
  const { loadDirectory, renameNode, createNode } = useFileStore();
  const { folderPicker, setFolderPicker, inputDialog, setInputDialog, openFolderPicker } = useUIStore();

  const handleDialogSubmit = () => {
    if (!inputDialog.value.trim()) {
      setInputDialog({ ...inputDialog, visible: false });
      return;
    }

    if (inputDialog.type === 'rename') {
      renameNode(inputDialog.path, inputDialog.value);
    } else {
      createNode(inputDialog.path, inputDialog.value, inputDialog.type === 'createFolder');
    }

    setInputDialog({ ...inputDialog, visible: false });
  };

  return (
    <>
      {/* Folder Picker Modal */}
      <Modal visible={folderPicker.visible} animationType="slide" onRequestClose={() => setFolderPicker({ ...folderPicker, visible: false })}>
        <View style={[styles.container, { backgroundColor: theme.colors.sidebarBackground }]}>
          <View style={[styles.headerContainer, { borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingVertical: 12 }]}>
            <TouchableOpacity
              onPress={() => {
                if (folderPicker.currentPath !== RNFS.ExternalStorageDirectoryPath) {
                  const parent = folderPicker.currentPath.substring(0, folderPicker.currentPath.lastIndexOf('/'));
                  openFolderPicker(parent);
                }
              }}
              style={{ padding: 8 }}
              disabled={folderPicker.currentPath === RNFS.ExternalStorageDirectoryPath}
            >
              <ArrowLeft color={folderPicker.currentPath === RNFS.ExternalStorageDirectoryPath ? theme.colors.border : theme.colors.textPrimary} size={20} />
            </TouchableOpacity>
            <Text style={{ color: theme.colors.textPrimary, flex: 1, fontSize: 16, fontWeight: 'bold' }} numberOfLines={1}>
              {folderPicker.currentPath.split('/').pop() || 'Storage'}
            </Text>
            <TouchableOpacity onPress={() => setFolderPicker({ ...folderPicker, visible: false })} style={{ padding: 8 }}>
              <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <FlashList
            data={folderPicker.folders}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.nodeContainer, { paddingHorizontal: 16, height: 44, borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                onPress={() => openFolderPicker(item.path)}
              >
                <FolderIcon color={theme.colors.primary} size={20} style={{ marginRight: 12 }} />
                <Text style={{ color: theme.colors.textPrimary, fontSize: 15 }}>{item.name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.path}
          />

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
            <TouchableOpacity style={{ backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' }} onPress={() => { loadDirectory(folderPicker.currentPath); setFolderPicker({ ...folderPicker, visible: false }); }}>
              <Text style={{ color: theme.colors.background, fontWeight: 'bold', fontSize: 16 }}>Select This Folder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Input Dialog Modal */}
      <Modal visible={inputDialog.visible} transparent={true} animationType="fade" onRequestClose={() => setInputDialog({ ...inputDialog, visible: false })}>
        <View style={styles.modalOverlay}>
          <View style={[styles.inputDialog, { backgroundColor: theme.colors.sidebarBackground, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textPrimary, marginBottom: 12, fontWeight: '600' }}>
              {inputDialog.type === 'rename' ? 'Rename' : inputDialog.type === 'createFile' ? 'New File' : 'New Folder'}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              value={inputDialog.value}
              onChangeText={(text) => setInputDialog({ ...inputDialog, value: text })}
              autoFocus
              onSubmitEditing={handleDialogSubmit}
              placeholderTextColor={theme.colors.textSecondary}
              placeholder="Enter name..."
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogButton} onPress={() => setInputDialog({ ...inputDialog, visible: false })}>
                <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogButton, { backgroundColor: theme.colors.primary }]} onPress={handleDialogSubmit}>
                <Text style={{ color: theme.colors.sidebarBackground, fontWeight: 'bold' }}>{inputDialog.type === 'rename' ? 'Rename' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  nodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputDialog: {
    width: 300,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dialogButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});
