export const TERMINAL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="xterm/xterm.css" />
  <script src="xterm/xterm.js"></script>
  <style>
    body, html { margin: 0; padding: 0; background-color: #1e1e1e; height: 100%; width: 100%; overflow: hidden; }
    #terminal { height: 100%; width: 100%; padding: 4px; box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script>
    const term = new Terminal({
      theme: { background: '#1e1e1e', foreground: '#cccccc' },
      fontFamily: 'monospace',
      fontSize: 14,
      cursorBlink: true
    });
    
    term.open(document.getElementById('terminal'));
    
    // Custom auto-resize function since CDN addon failed
    function fitTerminal() {
      try {
        const termDiv = document.getElementById('terminal');
        // Approximate dimensions for 14px monospace font
        const cols = Math.max(2, Math.floor(termDiv.clientWidth / 8.4));
        const rows = Math.max(2, Math.floor(termDiv.clientHeight / 17));
        term.resize(cols, rows);
      } catch (e) {}
    }
    
    setTimeout(fitTerminal, 50);
    
    // Fix for Android Keyboard (Gboard) Composition bugs (backspace deleting words on space)
    setTimeout(() => {
      const textarea = document.querySelector('.xterm-helper-textarea');
      if (textarea) {
        textarea.setAttribute('autocomplete', 'off');
        textarea.setAttribute('autocorrect', 'off');
        textarea.setAttribute('autocapitalize', 'off');
        textarea.setAttribute('spellcheck', 'false');
      }
    }, 100);

    // Resize terminal when window size changes (e.g. keyboard opens/closes)
    window.addEventListener('resize', fitTerminal);

    term.write('\\x1b[36mWelcome to PhCode Native Terminal\\x1b[0m\\r\\n');
    term.write('\\x1b[2mBooting Linux Environment...\\x1b[0m\\r\\n');
    
    // Send input to React Native
    term.onData(data => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TERM_INPUT', data }));
      }
    });

    // Receive output from React Native
    document.addEventListener('message', function(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'TERM_OUTPUT') {
          term.write(msg.data);
        }
      } catch (e) {}
    });
    window.addEventListener('message', function(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'TERM_OUTPUT') {
          term.write(msg.data);
        }
      } catch (e) {}
    });
  </script>
</body>
</html>
`;