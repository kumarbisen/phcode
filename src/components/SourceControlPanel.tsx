import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';

export const SourceControlPanel = () => {
  const { theme } = useThemeStore();
  const [commitMessage, setCommitMessage] = useState('');

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: theme.colors.textSecondary }]}>SOURCE CONTROL</Text>
      
      <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
        <TextInput 
          style={[styles.input, { color: theme.colors.textPrimary }]} 
          placeholder="Message (Ctrl+Enter to commit)" 
          placeholderTextColor={theme.colors.textSecondary}
          value={commitMessage}
          onChangeText={setCommitMessage}
          multiline
        />
        <TouchableOpacity style={[styles.commitButton, { backgroundColor: theme.colors.primary }]}>
          <Check color={theme.colors.background} size={16} />
        </TouchableOpacity>
      </View>

      <View style={styles.changesContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>CHANGES</Text>
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 20, fontSize: 12 }}>
          No pending changes.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 11, fontWeight: '700', paddingVertical: 12, letterSpacing: 0.5 },
  inputContainer: { borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  input: { padding: 8, fontSize: 13, height: 60, textAlignVertical: 'top' },
  commitButton: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  changesContainer: { flex: 1, marginTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
});
