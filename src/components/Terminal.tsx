import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, NativeModules, NativeEventEmitter } from 'react-native';
import { WebView } from 'react-native-webview';
import { TERMINAL_HTML } from "./terminal.html.ts"

//access listen for streams of text coming out of the native terminal shell.
const { LocalTerminalModule } = NativeModules;
const terminalEmitter = new NativeEventEmitter(LocalTerminalModule);


export const Terminal = () => {
  const webViewRef = useRef<WebView>(null);
  const outputBuffer = useRef('');
  const flushTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWebViewLoaded = useRef(false);

  const flushOutput = () => {
    if (webViewRef.current && isWebViewLoaded.current && outputBuffer.current.length > 0) {
      const message = JSON.stringify({ type: 'TERM_OUTPUT', data: outputBuffer.current });
      webViewRef.current.injectJavaScript(`
        window.postMessage(${JSON.stringify(message)}, '*');
        true;
      `);
      outputBuffer.current = '';
    }
    flushTimeout.current = null;
  };

  useEffect(() => {
    // Start the native shell
    LocalTerminalModule?.start();

    // Listen for shell output
    const subscription = terminalEmitter.addListener('onTerminalData', (data: string) => {
      outputBuffer.current += data;
      if (!flushTimeout.current) {
        flushTimeout.current = setTimeout(flushOutput, 16); // ~60fps batching
      }
    });

    return () => {
      subscription.remove();
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
      // Optional: stop the shell when unmounting
      // LocalTerminalModule?.stop();
    };
  }, []);

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'TERM_INPUT') {
        LocalTerminalModule?.write(msg.data);
      }
    } catch (e) { }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: TERMINAL_HTML, baseUrl: 'file:///android_asset/' }}
        originWhitelist={['*']}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        onMessage={onMessage}
        onLoadEnd={() => {
          isWebViewLoaded.current = true;
          if (outputBuffer.current.length > 0) {
            flushOutput();
          }
        }}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={true}
        style={{ flex: 1, backgroundColor: '#1e1e1e' }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});
