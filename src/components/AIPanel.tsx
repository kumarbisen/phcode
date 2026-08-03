import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Send, Bot, User, Trash2, StopCircle, Paperclip, DownloadCloud } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useThemeStore } from '../store/themeStore';
import { useAIStore, Message } from '../store/aiStore';
import { useFileStore } from '../store/fileStore';
import { FlashList, FlashListRef } from '@shopify/flash-list';

export const AIPanel = () => {
  const { theme } = useThemeStore();
  const { 
    modelStatus, downloadProgress, selectedVariant, messages, isGenerating, inputValue, setInputValue,
    downloadModel, sendMessage, cancelGeneration, clearMessages, deleteModel, loadModel, releaseModel
  } = useAIStore();
  const { openFiles, activeFilePath } = useFileStore();
  
  const [modelChoice, setModelChoice] = useState<'0.5B' | '1.5B'>('0.5B');
  const [includeContext, setIncludeContext] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null); // id of last msg we copied
  
  const flashListRef = useRef<any>(null);

  useEffect(() => {
    if (modelStatus === 'ready' && !useAIStore.getState().llamaContext) {
      loadModel();
    }
    return () => {
      // releaseModel();
    };
  }, [modelStatus]);

  useEffect(() => {
     if (messages.length > 0) {
        flashListRef.current?.scrollToEnd({ animated: true });
     }
  }, [messages, isGenerating]);

  const handleSend = () => {
    if (!inputValue.trim() || isGenerating) return;
    
    let activeContent;
    let activeName;
    
    if (includeContext && activeFilePath) {
      const file = openFiles.find(f => f.path === activeFilePath);
      if (file) {
        activeContent = file.content;
        activeName = activeFilePath.split('/').pop();
      }
    }
    
    sendMessage(inputValue, activeContent, activeName);
    setInputValue('');
  };

  // this let user copy the code out
  const copy = (m: Message) => {
    Clipboard.setString(m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 1500); // revert the label after a sec
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[
          styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot
        ]}>
        {!isUser && <Bot color={theme.colors.primary} size={20} style={{ marginTop: 2, marginRight: 8 }} />}
        <View style={{ flexShrink: 1 }}>
          <View style={[
            styles.bubble,
            { backgroundColor: isUser ? theme.colors.primary : theme.colors.border }
          ]}>
            <Text style={{ color: isUser ? theme.colors.background : theme.colors.textPrimary, fontSize: 13 }}>
              {item.content}
              {item.content === '' && isGenerating && item.role === 'assistant' ? '▌' : ''}
            </Text>
          </View>
          {!isUser && (
            <TouchableOpacity onPress={() => copy(item)} style={{ marginTop: 4, alignSelf: 'flex-start' }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
                {copiedId === item.id ? 'copied' : 'copy'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {isUser && <User color={theme.colors.textSecondary} size={20} style={{ marginTop: 2, marginLeft: 8 }} />}
      </View>
    );
  };

  if (modelStatus === 'none' || modelStatus === 'error') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Bot color={theme.colors.primary} size={48} style={{ marginBottom: 16 }} />
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
          Local AI Assistant
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
          Powered by Qwen 2.5 Coder. Runs 100% offline. No data leaves your device.
        </Text>
        
        {modelStatus === 'error' && useAIStore.getState().errorMessage && (
           <View style={{ backgroundColor: '#ff000020', padding: 12, borderRadius: 8, marginBottom: 20, width: '100%' }}>
              <Text style={{ color: '#ff4444', fontSize: 12, textAlign: 'center' }}>
                 {useAIStore.getState().errorMessage}
              </Text>
           </View>
        )}

        <View style={{ width: '100%', marginBottom: 24 }}>
          <Text style={{ color: theme.colors.textSecondary, marginBottom: 8, fontSize: 12 }}>Choose a model:</Text>
          <TouchableOpacity 
            style={[styles.radioItem, { borderColor: modelChoice === '0.5B' ? theme.colors.primary : theme.colors.border }]}
            onPress={() => setModelChoice('0.5B')}
          >
            <View style={[styles.radioDot, { backgroundColor: modelChoice === '0.5B' ? theme.colors.primary : 'transparent' }]} />
            <Text style={{ color: theme.colors.textPrimary, fontSize: 13, marginLeft: 8 }}>0.5B Lite (~350 MB, fast)</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.downloadButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => downloadModel(modelChoice)}
        >
          <DownloadCloud color={theme.colors.background} size={16} style={{ marginRight: 8 }} />
          <Text style={{ color: theme.colors.background, fontWeight: 'bold' }}>Download & Install</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (modelStatus === 'downloading') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <DownloadCloud color={theme.colors.primary} size={48} style={{ marginBottom: 16 }} />
        <Text style={{ color: theme.colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
          Downloading Qwen 2.5 ({selectedVariant})
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
          Please keep the app open.
        </Text>
        <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.progressBarFill, { backgroundColor: theme.colors.primary, width: `${downloadProgress * 100}%` }]} />
        </View>
        <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
          {Math.round(downloadProgress * 100)}%
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: theme.colors.textSecondary }]}>
          AI ASSISTANT • {selectedVariant}
        </Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={clearMessages} style={{ padding: 4, marginRight: 8 }}>
            <Trash2 color={theme.colors.textSecondary} size={14} />
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteModel} style={{ padding: 4 }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>Uninstall</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.chatArea}>
        {messages.length === 0 ? (
           <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, paddingHorizontal: 36 }}>
              <Bot color={theme.colors.textSecondary} size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
                Hi! I'm your local AI. Ask me to explain code, find bugs, or write new features.
              </Text>
           </View>
        ) : (
          <FlashList
            ref={flashListRef}
            data={messages}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 16 }}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      <View style={{ paddingBottom: 12 }}>
        {activeFilePath && (
          <TouchableOpacity 
            style={[styles.contextToggle, { borderColor: theme.colors.border, backgroundColor: includeContext ? theme.colors.primary + '20' : 'transparent' }]}
            onPress={() => setIncludeContext(!includeContext)}
          >
            <Paperclip color={includeContext ? theme.colors.primary : theme.colors.textSecondary} size={12} />
            <Text style={{ fontSize: 11, color: includeContext ? theme.colors.primary : theme.colors.textSecondary, marginLeft: 4 }} numberOfLines={1}>
              {includeContext ? 'Sending context: ' : 'Omit context: '}{activeFilePath.split('/').pop()}
            </Text>
          </TouchableOpacity>
        )}
        <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
          <TextInput 
            style={[styles.input, { color: theme.colors.textPrimary }]} 
            placeholder="Ask AI..." 
            placeholderTextColor={theme.colors.textSecondary}
            value={inputValue}
            onChangeText={setInputValue}
            multiline
            editable={!isGenerating}
          />
          {isGenerating ? (
             <TouchableOpacity style={[styles.sendButton, { backgroundColor: theme.colors.border }]} onPress={cancelGeneration}>
                <StopCircle color={theme.colors.textPrimary} size={14} />
             </TouchableOpacity>
          ) : (
             <TouchableOpacity style={[styles.sendButton, { backgroundColor: inputValue.trim() ? theme.colors.primary : theme.colors.border }]} onPress={handleSend}>
               <Send color={inputValue.trim() ? theme.colors.background : theme.colors.textSecondary} size={14} />
             </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  header: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  chatArea: { flex: 1, marginBottom: 8, marginHorizontal: -16 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, width: '100%' },
  messageRowUser: { justifyContent: 'flex-end', paddingLeft: 8 },
  messageRowBot: { justifyContent: 'flex-start', paddingRight: 8 },
  bubble: { padding: 10, borderRadius: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 4 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, paddingHorizontal: 8, fontSize: 13 },
  sendButton: { padding: 10, borderRadius: 6, marginLeft: 4 },
  radioItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 12 },
  radioDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#fff' },
  downloadButton: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 8, width: '100%', justifyContent: 'center' },
  progressBarContainer: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  contextToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '100%' }
});
