import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Editor, { loader } from '@monaco-editor/react';

// Configure Monaco loader to use local assets instead of CDN
loader.config({ paths: { vs: 'monaco-editor/vs' } });

const App = () => {
  const [code, setCode] = useState('// Welcome to PhCode');
  const [language, setLanguage] = useState('javascript');
  const [theme, setTheme] = useState('vs-dark');

  useEffect(() => {
    // Listen for messages from React Native
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SET_CONTENT') {
          setCode(data.content ?? '');
          setLanguage(data.language || 'javascript');
        } else if (data.type === 'SET_THEME') {
          setTheme(data.theme);
        }
      } catch (e) {
        // Ignore invalid messages
      }
    };

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    return () => {
      document.removeEventListener('message', handleMessage);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleEditorChange = (value) => {
    // Monaco fires onChange with undefined when the editor is fully cleared.
    // Coerce to empty string so React Native always receives a valid string.
    const safeValue = value ?? '';
    // Send message back to React Native
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'CONTENT_CHANGED',
        content: safeValue
      }));
    }
  };

  return (
    <Editor
      height="100%"
      language={language}
      theme={theme}
      value={code}
      onChange={handleEditorChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        padding: { top: 16 }
      }}
    />
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
