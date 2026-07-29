import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, TouchableWithoutFeedback } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import RNFS from 'react-native-fs';
import { ChevronRight, ChevronDown, File as FileIcon, Folder as FolderIcon, FolderOpen } from 'lucide-react-native';
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
  const { rootPath, files, loadDirectory, toggleNode, openFile, deleteNode } = useFileStore();
  const { setInputDialog, openFolderPicker } = useUIStore();

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

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: theme.colors.textPrimary }]}>EXPLORER</Text>
        <View style={styles.headerActionsRow}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  header: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  headerActionsRow: {
    flexDirection: 'row',
  },
  headerAction: {
    padding: 4,
    marginRight: 12,
  },
  emptyContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 0 },
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
