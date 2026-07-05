import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, TouchableWithoutFeedback } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import RNFS from 'react-native-fs';
import { ChevronRight, ChevronDown, File as FileIcon, Folder as FolderIcon, FolderOpen, ArrowLeft } from 'lucide-react-native';
import { useFileStore, FileNode } from '../store/fileStore';
import { useThemeStore } from '../store/themeStore';
import { useUIStore } from '../store/uiStore';

const INDENT_SIZE = 16;

const ExplorerNode = ({ item, theme, toggleNode, openFile, onLongPress }: { item: FileNode, theme: any, toggleNode: (path: string) => void, openFile: (path: string) => void, onLongPress: (node: FileNode) => void }) => {
  return (
    <TouchableOpacity
      style={[styles.nodeContainer, { paddingLeft: item.level * INDENT_SIZE + 8 }]}
      onPress={() => item.isDirectory ? toggleNode(item.path) : openFile(item.path)}
      onLongPress={() => onLongPress(item)}
      delayLongPress={300}
    >
      <View style={styles.iconContainer}>
        {item.isDirectory ? (
          item.isExpanded ? (
            <ChevronDown color={theme.colors.textSecondary} size={16} />
          ) : (
            <ChevronRight color={theme.colors.textSecondary} size={16} />
          )
        ) : (
          <View style={{ width: 16 }} /> // Spacer for alignment
        )}

        {item.isDirectory ? (
          <FolderIcon color={theme.colors.primary} size={16} style={{ marginLeft: 4 }} />
        ) : (
          <FileIcon color={theme.colors.textSecondary} size={16} style={{ marginLeft: 4 }} />
        )}
      </View>
      <Text style={[styles.nodeText, { color: theme.colors.textPrimary }]} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

export const Explorer = () => {
  const { theme } = useThemeStore();
  const { rootPath, files, loadDirectory, toggleNode, openFile, deleteNode, renameNode, createNode } = useFileStore();
  const { folderPicker, setFolderPicker, inputDialog, setInputDialog, openFolderPicker } = useUIStore();

  const [contextMenuNode, setContextMenuNode] = useState<FileNode | null>(null);



  useEffect(() => {
    if (files.length === 0) {
      loadDirectory(rootPath);
    }
  }, []);

  const handleCreate = (isDirectory: boolean) => {
    const parentPath = contextMenuNode?.isDirectory ? contextMenuNode.path : (contextMenuNode ? contextMenuNode.path.substring(0, contextMenuNode.path.lastIndexOf('/')) : rootPath);
    setInputDialog({
      visible: true,
      type: isDirectory ? 'createFolder' : 'createFile',
      path: parentPath,
      value: ''
    });
    setContextMenuNode(null);
  };

  const handleRename = () => {
    if (!contextMenuNode) return;
    setInputDialog({
      visible: true,
      type: 'rename',
      path: contextMenuNode.path,
      value: contextMenuNode.name
    });
    setContextMenuNode(null);
  };

  const handleDelete = () => {
    if (!contextMenuNode) return;
    Alert.alert('Delete', `Are you sure you want to delete ${contextMenuNode.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNode(contextMenuNode.path) }
    ]);
    setContextMenuNode(null);
  };

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
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: theme.colors.textSecondary }]}>EXPLORER</Text>
        <TouchableOpacity onPress={() => openFolderPicker(RNFS.ExternalStorageDirectoryPath)} style={styles.headerAction}>
          <FolderOpen color={theme.colors.textSecondary} size={14} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleCreate(false)} style={styles.headerAction}>
          <FileIcon color={theme.colors.textSecondary} size={14} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleCreate(true)} style={styles.headerAction}>
          <FolderIcon color={theme.colors.textSecondary} size={14} />
        </TouchableOpacity>
      </View>

      {files.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.colors.textSecondary }}>Empty directory</Text>
        </View>
      ) : (
        <FlashList
          data={files}
          renderItem={({ item }) => <ExplorerNode item={item} theme={theme} toggleNode={toggleNode} openFile={openFile} onLongPress={setContextMenuNode} />}
          // estimatedItemSize={28}
          keyExtractor={(item) => item.path}
        />
      )}

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

      {/* Context Menu Modal */}
      <Modal visible={!!contextMenuNode} transparent animationType="fade" onRequestClose={() => setContextMenuNode(null)}>
        <TouchableWithoutFeedback onPress={() => setContextMenuNode(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.contextMenu, { backgroundColor: theme.colors.primary, borderColor: theme.colors.border }]}>
                <TouchableOpacity style={styles.contextMenuItem} onPress={() => handleCreate(false)}>
                  <Text style={{ color: theme.colors.textPrimary }}>New File</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contextMenuItem} onPress={() => handleCreate(true)}>
                  <Text style={{ color: theme.colors.textPrimary }}>New Folder</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contextMenuItem} onPress={handleRename}>
                  <Text style={{ color: theme.colors.textPrimary }}>Rename</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contextMenuItem} onPress={handleDelete}>
                  <Text style={{ color: theme.colors.error }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  header: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
    letterSpacing: 0.5,
  },
  headerAction: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  nodeContainer: { flexDirection: 'row', alignItems: 'center', height: 28 },
  iconContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 6 },
  nodeText: { fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    width: 200,
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
  },
  contextMenuItem: {
    padding: 12,
  },
  inputDialog: {
    width: 280,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dialogButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
  },
});
