import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';

export const SearchPanel = () => {
  const { theme } = useThemeStore();

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: theme.colors.textSecondary }]}>SEARCH</Text>
      <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
        <TextInput 
          style={[styles.input, { color: theme.colors.textPrimary }]} 
          placeholder="Search..." 
          placeholderTextColor={theme.colors.textSecondary}
        />
        <TouchableOpacity style={styles.iconButton}>
          <Search color={theme.colors.textSecondary} size={16} />
        </TouchableOpacity>
      </View>
      <View style={styles.resultsContainer}>
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
          No results found.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 11, fontWeight: '700', paddingVertical: 12, letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8 },
  input: { flex: 1, paddingVertical: 8, fontSize: 13 },
  iconButton: { padding: 4 },
  resultsContainer: { flex: 1 },
});
