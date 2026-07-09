import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

const { LocalTerminalModule } = NativeModules;

const shellQuote = (value: string) => `'${value.replace(/'/g, "'\"'\"'")}'`;

const toSandboxPath = (filePath: string) => {
  const rootDir = RNFS.ExternalStorageDirectoryPath.replace(/\/+$/, '');
  return filePath.startsWith(rootDir)
    ? `/sdcard${filePath.slice(rootDir.length)}`
    : filePath;
};

// Helper to run a command via Alpine terminal and capture output via temp file
const runCommandAndReadOutput = async (command: string): Promise<string> => {
  const tempOutputFile = `${RNFS.DocumentDirectoryPath}/public/.phcode_git_out.txt`;
  
  // Clear old output
  try {
    if (await RNFS.exists(tempOutputFile)) {
      await RNFS.unlink(tempOutputFile);
    }
  } catch (e) {
    // Ignore
  }

  const runScriptPath = `${RNFS.DocumentDirectoryPath}/public/.phcode_git_run.sh`;
  
  // The script will run the command, write stdout to the temp file, and wait slightly
  const scriptContent = `#!/bin/sh
# Check and install git if needed
if ! command -v git >/dev/null 2>&1; then
  apk add --no-cache git >/dev/null 2>&1
fi

${command} > ~/.phcode_git_out.txt 2>&1
`;

  await RNFS.writeFile(runScriptPath, scriptContent, 'utf8');

  // Execute the script
  if (LocalTerminalModule) {
      LocalTerminalModule.write('sh ~/.phcode_git_run.sh\r');
  } else {
      console.warn("LocalTerminalModule not available");
      return "";
  }

  // Poll for the output file
  // This is a naive polling approach. In a real scenario, it would be better to signal completion.
  // We'll wait up to a few seconds.
  let retries = 20; // 2 seconds max (100ms * 20)
  while (retries > 0) {
    await new Promise(resolve => setTimeout(() => resolve(undefined), 100));
    try {
      if (await RNFS.exists(tempOutputFile)) {
          // Additional wait to make sure writing has finished
          await new Promise(resolve => setTimeout(() => resolve(undefined), 50));
          const output = await RNFS.readFile(tempOutputFile, 'utf8');
          return output.trim();
      }
    } catch (e) {
      // Keep polling
    }
    retries--;
  }
  
  return "";
};

// Helper for running a command that is meant to be visible to the user in the terminal
const runVisibleCommand = async (command: string, label: string) => {
   const runScriptPath = `${RNFS.DocumentDirectoryPath}/public/.phcode_run.sh`;
   const scriptContent = `#!/bin/sh
if ! command -v git >/dev/null 2>&1; then
  printf '\\033[33mInstalling git...\\033[0m\\n'
  apk add --no-cache git
fi
printf '\\033[36m%s\\033[0m\\n' ${shellQuote(label)}
${command}
status=$?
printf '\\n\\033[2mGit command finished with exit code %s\\033[0m\\n' "$status"
`;
    await RNFS.writeFile(runScriptPath, scriptContent, 'utf8');
    if (LocalTerminalModule) {
        LocalTerminalModule.write('sh ~/.phcode_run.sh\r');
    }
};

export const GitService = {
  isGitRepo: async (repoPath: string): Promise<boolean> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} rev-parse --is-inside-work-tree`;
    const output = await runCommandAndReadOutput(command);
    return output === 'true';
  },

  getStatus: async (repoPath: string): Promise<string> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} status --porcelain`;
    return await runCommandAndReadOutput(command);
  },

  getCurrentBranch: async (repoPath: string): Promise<string> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} branch --show-current`;
    return await runCommandAndReadOutput(command);
  },

  getBranches: async (repoPath: string): Promise<string[]> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} branch -a`;
    const output = await runCommandAndReadOutput(command);
    return output.split('\n').map(b => b.replace(/^[\s*]+/, '').trim()).filter(Boolean);
  },

  stageFile: async (repoPath: string, file: string): Promise<void> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} add ${shellQuote(file)}`;
    await runCommandAndReadOutput(command);
  },

  stageAll: async (repoPath: string): Promise<void> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} add -A`;
    await runCommandAndReadOutput(command);
  },

  unstageFile: async (repoPath: string, file: string): Promise<void> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} restore --staged ${shellQuote(file)}`;
    await runCommandAndReadOutput(command);
  },

  commit: async (repoPath: string, message: string): Promise<void> => {
     const sandboxPath = toSandboxPath(repoPath);
     const command = `git -C ${shellQuote(sandboxPath)} commit -m ${shellQuote(message)}`;
     await runVisibleCommand(command, `Committing: ${message}`);
  },

  pull: async (repoPath: string, pat?: string, username?: string, remoteUrl?: string): Promise<void> => {
    const sandboxPath = toSandboxPath(repoPath);
    let command = '';
    if (pat && username && remoteUrl) {
       // Re-construct URL with auth if it's an HTTPS github url
       try {
         const url = new URL(remoteUrl);
         if (url.hostname === 'github.com' && url.protocol === 'https:') {
            command = `git -C ${shellQuote(sandboxPath)} pull https://${encodeURIComponent(username)}:${encodeURIComponent(pat)}@github.com${url.pathname}`;
         } else {
            command = `git -C ${shellQuote(sandboxPath)} pull`;
         }
       } catch (e) {
         command = `git -C ${shellQuote(sandboxPath)} pull`;
       }
    } else {
       command = `git -C ${shellQuote(sandboxPath)} pull`;
    }
    await runVisibleCommand(command, 'Pulling from remote');
  },

  push: async (repoPath: string, pat?: string, username?: string, remoteUrl?: string): Promise<void> => {
    const sandboxPath = toSandboxPath(repoPath);
    let command = '';
    if (pat && username && remoteUrl) {
       try {
         const url = new URL(remoteUrl);
         if (url.hostname === 'github.com' && url.protocol === 'https:') {
            command = `git -C ${shellQuote(sandboxPath)} push https://${encodeURIComponent(username)}:${encodeURIComponent(pat)}@github.com${url.pathname}`;
         } else {
            command = `git -C ${shellQuote(sandboxPath)} push`;
         }
       } catch (e) {
         command = `git -C ${shellQuote(sandboxPath)} push`;
       }
    } else {
       command = `git -C ${shellQuote(sandboxPath)} push`;
    }
    await runVisibleCommand(command, 'Pushing to remote');
  },

  clone: async (url: string, destPath: string, pat?: string, username?: string): Promise<void> => {
    let cloneUrl = url;
    if (pat && username) {
      try {
        const u = new URL(url);
        if (u.hostname === 'github.com' && u.protocol === 'https:') {
           cloneUrl = `https://${encodeURIComponent(username)}:${encodeURIComponent(pat)}@github.com${u.pathname}`;
        }
      } catch (e) {
        // ignore
      }
    }
    
    // Ensure destination exists
    const sandboxDest = toSandboxPath(destPath);
    const command = `git clone ${shellQuote(cloneUrl)} ${shellQuote(sandboxDest)}`;
    await runVisibleCommand(command, `Cloning ${url}`);
  },

  init: async (repoPath: string): Promise<void> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} init`;
    await runCommandAndReadOutput(command);
  },

  setRemote: async (repoPath: string, url: string): Promise<void> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} remote add origin ${shellQuote(url)} || git -C ${shellQuote(sandboxPath)} remote set-url origin ${shellQuote(url)}`;
    await runCommandAndReadOutput(command);
  },

  getRemote: async (repoPath: string): Promise<string> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} remote get-url origin`;
    return await runCommandAndReadOutput(command);
  },

  getLog: async (repoPath: string, n: number = 5): Promise<string> => {
    const sandboxPath = toSandboxPath(repoPath);
    const command = `git -C ${shellQuote(sandboxPath)} log --oneline -${n}`;
    return await runCommandAndReadOutput(command);
  }
};
