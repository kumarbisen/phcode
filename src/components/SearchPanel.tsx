import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Search } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { useSearchStore } from '../store/searchStore';
import { useFileStore } from '../store/fileStore';

export const SearchPanel = () => {
  const { theme } = useThemeStore();
  const searchStore = useSearchStore();
  const fileStore = useFileStore();

  const handleSearch = () => {
    searchStore.performSearch();
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: theme.colors.textSecondary }]}>SEARCH</Text>
      <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
        <TextInput
          style={[styles.input, { color: theme.colors.textPrimary }]}
          placeholder="Search..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchStore.query}
          onChangeText={searchStore.setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.iconButton} onPress={handleSearch}>
          <Search color={theme.colors.textSecondary} size={16} />
        </TouchableOpacity>
      </View>
      <View style={styles.resultsContainer}>
        {searchStore.isSearching ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
        ) : searchStore.results.length > 0 ? (
          <ScrollView>
            <Text style={{ color: theme.colors.textSecondary, marginBottom: 8, fontSize: 11 }}>
              {searchStore.results.length} results
            </Text>
            {searchStore.results.map((result, idx) => {
              const fileName = result.file.split('/').pop();
              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                  onPress={() => fileStore.openFile(result.file)}
                >
                  <Text style={[styles.resultFile, { color: theme.colors.textPrimary }]} numberOfLines={1} ellipsizeMode="middle">
                    {fileName} <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>:{result.line}</Text>
                  </Text>
                  <Text style={[styles.resultText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {result.text}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        ) : searchStore.query ? (
          <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
            No results found.
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 12,
    letterSpacing: 0.5
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13
  },
  iconButton: {
    padding: 4
  },
  resultsContainer: {
    flex: 1,
    marginTop: 12
  },
  resultItem: {
    paddingVertical: 8,
    borderBottomWidth: 1
  },
  resultFile: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace'
  }
});
