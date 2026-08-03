import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, NativeModules, Modal, TouchableWithoutFeedback } from 'react-native';
import { Menu, Search, Play, Square, MoreVertical, Save, TerminalSquare, GitBranch, Globe } from 'lucide-react-native';
import RNFS from 'react-native-fs';
import { useThemeStore } from '../store/themeStore';
import { useFileStore } from '../store/fileStore';
import { useUIStore } from '../store/uiStore';
import { useGitStore } from '../store/gitStore';

const { LocalTerminalModule } = NativeModules;

type RunnerConfig = {
  label: string;
  check: string;
  install: string;
  run: (file: string) => string;
};

const shellQuote = (value: string) => `'${value.replace(/'/g, "'\"'\"'")}'`;

const toSandboxPath = (filePath: string) => {
  const rootDir = RNFS.ExternalStorageDirectoryPath.replace(/\/+$/, '');
  return filePath.startsWith(rootDir)
    ? `/sdcard${filePath.slice(rootDir.length)}`
    : filePath;
};

const getPathParts = (filePath: string) => {
  const normalizedPath = toSandboxPath(filePath);
  const slashIndex = normalizedPath.lastIndexOf('/');
  if (slashIndex === -1) {
    return { directory: '/sdcard', filename: normalizedPath };
  }

  return {
    directory: normalizedPath.slice(0, slashIndex) || '/',
    filename: normalizedPath.slice(slashIndex + 1),
  };
};

const runners: Record<string, RunnerConfig> = {
  python: {
    label: 'Python',
    check: 'command -v python3',
    install: 'apk add --no-cache python3',
    run: (file) => `python3 ${file}`,
  },
  javascript: {
    label: 'Node.js',
    check: 'command -v node',
    install: 'apk add --no-cache nodejs',
    run: (file) => `node ${file}`,
  },
  c: {
    label: 'C',
    check: 'command -v gcc',
    install: 'apk add --no-cache gcc musl-dev',
    run: (file) => `gcc ${file} -o /tmp/phcode-run && /tmp/phcode-run`,
  },
  cpp: {
    label: 'C++',
    check: 'command -v g++',
    install: 'apk add --no-cache g++ musl-dev',
    run: (file) => `g++ ${file} -o /tmp/phcode-run && /tmp/phcode-run`,
  },
  go: {
    label: 'Go',
    check: 'command -v go',
    install: 'apk add --no-cache go',
    run: (file) => `go run ${file}`,
  },
  rust: {
    label: 'Rust',
    check: 'command -v rustc',
    install: 'apk add --no-cache rust cargo',
    run: (file) => `rustc ${file} -o /tmp/phcode-run && /tmp/phcode-run`,
  },
  java: {
    label: 'Java',
    check: 'command -v java',
    install: 'apk add --no-cache openjdk17',
    run: (file) => `java ${file}`,
  },
  ruby: {
    label: 'Ruby',
    check: 'command -v ruby',
    install: 'apk add --no-cache ruby',
    run: (file) => `ruby ${file}`,
  },
  php: {
    label: 'PHP',
    check: 'command -v php',
    install: 'apk add --no-cache php',
    run: (file) => `php ${file}`,
  },
  shell: {
    label: 'Bash Script',
    check: 'command -v bash',
    install: 'apk add --no-cache bash',
    run: (file) => `bash ${file}`,
  },
  typescript: {
    label: 'TypeScript',
    check: 'command -v deno',
    install: 'apk add --no-cache deno',
    run: (file) => `deno run ${file}`,
  },
  csharp: {
    label: 'C# (.NET Mono)',
    check: 'command -v mono',
    install: 'apk add --no-cache mono',
    run: (file) => `mcs ${file} -out:/tmp/run.exe && mono /tmp/run.exe`,
  },
  kotlin: {
    label: 'Kotlin',
    check: 'command -v kotlinc',
    install: 'apk add --no-cache kotlin',
    run: (file) => `kotlinc ${file} -include-runtime -d /tmp/run.jar && java -jar /tmp/run.jar`,
  },
  swift: {
    label: 'Swift',
    check: 'command -v swift',
    install: 'apk add --no-cache swift',
    run: (file) => `swift ${file}`,
  },
  lua: {
    label: 'Lua',
    check: 'command -v lua',
    install: 'apk add --no-cache lua5.4',
    run: (file) => `lua ${file}`,
  },
  perl: {
    label: 'Perl',
    check: 'command -v perl',
    install: 'apk add --no-cache perl',
    run: (file) => `perl ${file}`,
  },
  dart: {
    label: 'Dart',
    check: 'command -v dart',
    install: 'apk add --no-cache dart',
    run: (file) => `dart run ${file}`,
  },
  r: {
    label: 'R',
    check: 'command -v Rscript',
    install: 'apk add --no-cache R',
    run: (file) => `Rscript ${file}`,
  },
  scala: {
    label: 'Scala',
    check: 'command -v scala',
    install: 'apk add --no-cache scala',
    run: (file) => `scala ${file}`,
  },
  haskell: {
    label: 'Haskell',
    check: 'command -v runghc',
    install: 'apk add --no-cache ghc',
    run: (file) => `runghc ${file}`,
  },
  elixir: {
    label: 'Elixir',
    check: 'command -v elixir',
    install: 'apk add --no-cache elixir',
    run: (file) => `elixir ${file}`,
  },
  nim: {
    label: 'Nim',
    check: 'command -v nim',
    install: 'apk add --no-cache nim',
    run: (file) => `nim c -r --hints:off ${file}`,
  },
  zig: {
    label: 'Zig',
    check: 'command -v zig',
    install: 'apk add --no-cache zig',
    run: (file) => `zig run ${file}`,
  },
  crystal: {
    label: 'Crystal',
    check: 'command -v crystal',
    install: 'apk add --no-cache crystal',
    run: (file) => `crystal run ${file}`,
  },
};

const buildRunCommand = (filePath: string, language: string) => {
  const runner = runners[language];
  if (!runner) return null;

  const { directory, filename } = getPathParts(filePath);
  const quotedDirectory = shellQuote(directory);
  const quotedFile = shellQuote(filename);
  const quotedLabel = shellQuote(runner.label);
  const quotedInstallMessage = shellQuote(`Installing ${runner.label} runtime...`);
  const quotedRunMessage = shellQuote(`Running ${filename}`);
  const runCommand = runner.run(quotedFile);

  return [
    `if cd ${quotedDirectory}; then`,
    `  if ! ${runner.check} >/dev/null 2>&1; then`,
    `    printf '\\033[33m%s\\033[0m\\n' ${quotedInstallMessage};`,
    `    ${runner.install};`,
    '  fi;',
    `  printf '\\033[36m%s\\033[0m\\n' ${quotedRunMessage};`,
    `  ${runCommand};`,
    '  status=$?;',
    `  printf '\\n\\033[2m%s finished with exit code %s\\033[0m\\n' ${quotedLabel} "$status";`,
    'else',
    `  printf '\\033[31mUnable to enter workspace: %s\\033[0m\\n' ${quotedDirectory};`,
    'fi',
    '',
  ].join('\n');
};

export const TopBar = () => {
  const { theme } = useThemeStore();
  const { activeFilePath, openFiles, saveFile } = useFileStore();
  const { isBottomPanelExpanded, toggleBottomPanel, setActiveBottomPanelTab, togglePreview, isSidebarExpanded, toggleSidebar, setActiveSidebarTab, setPreviewUrl, toggleSidebarVisible } = useUIStore();
  const { currentBranch, isGitRepo } = useGitStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openSourceControl = () => {
    setActiveSidebarTab('git');
    if (!isSidebarExpanded) toggleSidebar();
  };

  const openTerminal = () => {
    setActiveBottomPanelTab('terminal');
    if (!isBottomPanelExpanded) toggleBottomPanel();
  };

  const handleStop = () => {
    // Send Ctrl+C (\x03) to kill the running process
    LocalTerminalModule?.write('\x03');
  };

  const handleGoLive = async () => {
    if (activeFilePath) {
      if (activeFilePath.endsWith('.html') || activeFilePath.endsWith('.htm')) {
        setPreviewUrl('file://' + activeFilePath);
      } else {
        const dir = activeFilePath.substring(0, activeFilePath.lastIndexOf('/'));
        const indexHtmlPath = dir + '/index.html';
        try {
          const exists = await RNFS.exists(indexHtmlPath);
          if (exists) {
            setPreviewUrl('file://' + indexHtmlPath);
          } else {
            // fallback to just setting the directory or file
            setPreviewUrl('file://' + activeFilePath);
          }
        } catch (e) {
          setPreviewUrl('file://' + activeFilePath);
        }
      }
    }
    togglePreview();
    setIsMenuOpen(false);
  };

  const handlePlay = async () => {
    const activeFile = openFiles.find(f => f.path === activeFilePath);
    if (!activeFile || !activeFilePath) {
      togglePreview();
      return;
    }

    // Save the file first
    await saveFile(activeFilePath);

    const command = buildRunCommand(activeFilePath, activeFile.language);

    if (command) {
      openTerminal();
      try {
        // Write the run script to the Alpine home directory (mapped to DocumentDirectoryPath/public)
        const runScriptPath = `${RNFS.DocumentDirectoryPath}/public/.phcode_run.sh`;
        const scriptContent = `#!/bin/sh\n${command}`;
        await RNFS.writeFile(runScriptPath, scriptContent, 'utf8');
        
        // Execute the script cleanly in the terminal without echoing the huge script
        // Adding \r simulates pressing enter
        LocalTerminalModule?.write('sh ~/.phcode_run.sh\r');
      } catch (error) {
        console.error('Failed to create run script', error);
        LocalTerminalModule?.write(`${command}\r`);
      }
    } else {
      // For HTML/React/Vite, open the browser preview
      togglePreview();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.topBarBackground, borderBottomColor: theme.colors.border }]}>
      <View style={styles.leftSection}>
        <TouchableOpacity style={styles.iconButton} onPress={toggleSidebarVisible}>
          <Menu color={theme.colors.textPrimary} size={20} />
        </TouchableOpacity>

        <Text style={[styles.projectName, { color: theme.colors.textPrimary }]}>
          PhCode
        </Text>
        
        {isGitRepo && (
          <TouchableOpacity 
             style={[styles.branchPill, { backgroundColor: theme.colors.sidebarBackground, borderColor: theme.colors.border }]}
             onPress={openSourceControl}
          >
            <GitBranch color={theme.colors.textSecondary} size={14} />
            <Text style={[styles.branchName, { color: theme.colors.textSecondary }]}>{currentBranch || '...'}</Text>
          </TouchableOpacity>
        )}

      </View>

      <View style={styles.rightSection}>

        <TouchableOpacity style={styles.iconButton} onPress={openTerminal}>
          <TerminalSquare color={theme.colors.textPrimary} size={20} />
        </TouchableOpacity>

        <View style={{ zIndex: 50 }}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setIsMenuOpen(!isMenuOpen)}>
            <MoreVertical color={theme.colors.textPrimary} size={20} />
          </TouchableOpacity>

          {isMenuOpen && (
            <Modal transparent={true} visible={isMenuOpen} onRequestClose={() => setIsMenuOpen(false)}>
              <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
                <View style={styles.modalOverlay}>
                  <TouchableWithoutFeedback>
                    <View style={[styles.dropdownMenu, { backgroundColor: theme.colors.sidebarBackground, borderColor: theme.colors.border }]}>
                      {activeFilePath && (
                        <TouchableOpacity
                          style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                          onPress={() => { saveFile(activeFilePath); setIsMenuOpen(false); }}
                        >
                          <Save color={theme.colors.textPrimary} size={18} style={styles.dropdownIcon} />
                          <Text style={[styles.dropdownText, { color: theme.colors.textPrimary }]}>Save File</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                        onPress={() => { handlePlay(); setIsMenuOpen(false); }}
                      >
                        <Play color={theme.colors.success} size={18} fill={theme.colors.success} style={styles.dropdownIcon} />
                        <Text style={[styles.dropdownText, { color: theme.colors.textPrimary }]}>Run / Play</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                        onPress={handleGoLive}
                      >
                        <Globe color={theme.colors.primary} size={18} style={styles.dropdownIcon} />
                        <Text style={[styles.dropdownText, { color: theme.colors.textPrimary }]}>Go Live</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => { handleStop(); setIsMenuOpen(false); }}
                      >
                        <Square color={theme.colors.error} size={18} fill={theme.colors.error} style={styles.dropdownIcon} />
                        <Text style={[styles.dropdownText, { color: theme.colors.textPrimary }]}>Stop Process</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  branchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  branchName: {
    fontSize: 12,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 52,
    right: 8,
    width: 180,
    borderRadius: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
  }
});
