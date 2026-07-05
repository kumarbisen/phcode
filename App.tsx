import React, { useEffect } from 'react';
import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import MainLayout from './src/MainLayout';
import RNFS from 'react-native-fs';

const { LocalTerminalModule } = NativeModules;

function App(): React.JSX.Element {
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 30) {
          // Request All Files Access natively for Android 11+
          await LocalTerminalModule?.requestStoragePermission();
        } else {
          // Request legacy write permissions for Android 10 and below
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ]);
        }
        
        // Ensure the PhCode folder exists
        const phcodeDir = RNFS.ExternalStorageDirectoryPath + '/PhCode';
        const exists = await RNFS.exists(phcodeDir);
        if (!exists) {
          try {
            await RNFS.mkdir(phcodeDir);
          } catch (e) {
            console.error("Failed to create PhCode directory", e);
          }
        }
        
        // Start the native Linux terminal in the background so it's ready instantly!
        LocalTerminalModule?.start();
      }
    };
    
    requestPermissions();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <MainLayout />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

export default App;
