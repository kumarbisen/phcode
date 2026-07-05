import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Send, Bot } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';

export const AIPanel = () => {
  const { theme } = useThemeStore();
  const [query, setQuery] = useState('');

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: theme.colors.textSecondary }]}>AI ASSISTANT</Text>
      
      <ScrollView style={styles.chatArea}>
        <View style={styles.messageRow}>
          <Bot color={theme.colors.primary} size={20} style={{ marginTop: 2, marginRight: 8 }} />
          <View style={[styles.bubble, { backgroundColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: 13 }}>
              Hi! I'm your AI coding assistant. Ask me to explain code, find bugs, or write new features.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
        <TextInput 
          style={[styles.input, { color: theme.colors.textPrimary }]} 
          placeholder="Ask AI..." 
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          multiline
        />
        <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}>
          <Send color={theme.colors.background} size={14} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 11, fontWeight: '700', paddingVertical: 12, letterSpacing: 0.5 },
  chatArea: { flex: 1, marginBottom: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  bubble: { flex: 1, padding: 10, borderRadius: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 4 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, paddingHorizontal: 8, fontSize: 13 },
  sendButton: { padding: 10, borderRadius: 6, marginLeft: 4 },
});
