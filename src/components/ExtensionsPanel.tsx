import React from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Download } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';

const MOCK_EXTENSIONS = [
  { id: '1', name: 'Prettier', author: 'Prettier', downloads: '10M' },
  { id: '2', name: 'ESLint', author: 'Microsoft', downloads: '15M' },
  { id: '3', name: 'Python', author: 'Microsoft', downloads: '20M' },
];

export const ExtensionsPanel = () => {
  const { theme } = useThemeStore();

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: theme.colors.textSecondary }]}>EXTENSIONS</Text>
      <TextInput 
        style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} 
        placeholder="Search Extensions in Marketplace" 
        placeholderTextColor={theme.colors.textSecondary}
      />
      <ScrollView style={styles.list}>
        {MOCK_EXTENSIONS.map(ext => (
          <View key={ext.id} style={[styles.item, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: theme.colors.textPrimary }]}>{ext.name}</Text>
              <Text style={[styles.itemAuthor, { color: theme.colors.textSecondary }]}>{ext.author}</Text>
            </View>
            <TouchableOpacity style={[styles.installButton, { backgroundColor: theme.colors.primary }]}>
              <Download color={theme.colors.background} size={14} />
              <Text style={[styles.installText, { color: theme.colors.background }]}>Install</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 11, fontWeight: '700', paddingVertical: 12, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, marginBottom: 16 },
  list: { flex: 1 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  itemAuthor: { fontSize: 11 },
  installButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  installText: { fontSize: 11, fontWeight: '600', marginLeft: 4 },
});
