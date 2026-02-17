// React Refresh preamble for Vite dev mode.
// Vite's @vitejs/plugin-react sets these via an inline <script type="module">
// in <head>, but Codespaces CSP blocks inline scripts. This external script
// provides the preamble so Vite-transformed modules don't throw
// "@vitejs/plugin-react can't detect preamble".
window.$RefreshReg$ = function() {};
window.$RefreshSig$ = function() { return function(type) { return type; }; };

// Non-blocking font load (render-blocking <link> removed from index.html)
(function() {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css';
  document.head.appendChild(link);
})();

// Boot diagnostics: capture errors and show them visually
(function() {
  var errors = [];
  var overlayReady = false;

  // Capture uncaught errors
  window.addEventListener('error', function(e) {
    errors.push({ type: 'error', msg: e.message, file: e.filename, line: e.lineno, col: e.colno });
    if (overlayReady) flushErrors();
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Unknown rejection';
    errors.push({ type: 'rejection', msg: msg });
    if (overlayReady) flushErrors();
  });

  // Delegated click handler for reload buttons (CSP-safe, no inline onclick)
  document.addEventListener('click', function(e) {
    if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-reload')) {
      location.reload();
    }
  });

  // Render errors into the diagnostics overlay
  function flushErrors() {
    var el = document.getElementById('boot-diag-overlay');
    if (!el || errors.length === 0) return;
    var html = '<div style="color:#ff6b6b;font-weight:bold;margin-bottom:8px;">Errors detected (' + errors.length + '):</div>';
    errors.forEach(function(e, i) {
      html += '<div style="color:#ffa07a;font-size:12px;margin-bottom:4px;">' +
        (i + 1) + '. [' + e.type + '] ' + e.msg;
      if (e.file) html += ' (' + e.file.split('/').pop() + ':' + e.line + ')';
      html += '</div>';
    });
    html += '<button data-reload style="margin-top:12px;padding:8px 20px;background:#BB86FC;color:#000;border:none;border-radius:6px;cursor:pointer;font-size:13px;">Reload</button>';
    el.innerHTML = html;
    el.parentElement.style.display = 'flex';
  }

  document.addEventListener('DOMContentLoaded', function() {
    // Create diagnostics overlay (hidden until needed)
    var overlay = document.createElement('div');
    overlay.id = 'boot-diag-container';
    overlay.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1a2e;z-index:99999;justify-content:center;align-items:center;flex-direction:column;font-family:Vazirmatn,system-ui,Tahoma,sans-serif;';
    overlay.innerHTML =
      '<div style="text-align:center;padding:20px;">' +
        '<div id="boot-diag-spinner" style="width:40px;height:40px;border:3px solid #333;border-top:3px solid #BB86FC;border-radius:50%;margin:0 auto 16px;animation:bdspin 1s linear infinite;"></div>' +
        '<div style="color:#e2e8f0;font-size:16px;">Loading...</div>' +
        '<div id="boot-diag-overlay" style="margin-top:16px;max-width:600px;text-align:left;direction:ltr;"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    // Spinner animation
    var style = document.createElement('style');
    style.textContent = '@keyframes bdspin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);

    overlayReady = true;

    // Flush any errors collected before DOM was ready
    if (errors.length > 0) {
      flushErrors();
    }

    // Check if React has mounted after 3 seconds
    setTimeout(function() {
      var root = document.getElementById('root');
      // React replaces all children of #root on mount; if only our
      // initial-loader remains (or root is empty), React didn't mount.
      var loader = document.getElementById('initial-loader');
      if (root && (root.children.length === 0 || loader)) {
        overlay.style.display = 'flex';
        if (errors.length === 0) {
          var diagEl = document.getElementById('boot-diag-overlay');
          if (diagEl) {
            diagEl.innerHTML =
              '<div style="color:#fbbf24;font-size:14px;margin-top:12px;">' +
              'React has not mounted after 3s.<br>' +
              'Possible causes:<br>' +
              '- CSP blocking inline scripts<br>' +
              '- Module loading error<br>' +
              '- Check browser console (F12) for details' +
              '</div>' +
              '<button data-reload style="margin-top:12px;padding:8px 20px;background:#BB86FC;color:#000;border:none;border-radius:6px;cursor:pointer;font-size:13px;">Reload</button>';
          }
        }
      }
    }, 3000);

    // Auto-remove overlay when React mounts (replaces #root children)
    var observer = new MutationObserver(function() {
      var root = document.getElementById('root');
      // React mounted = initial-loader is gone
      if (root && !document.getElementById('initial-loader')) {
        var container = document.getElementById('boot-diag-container');
        if (container) container.remove();
        observer.disconnect();
      }
    });
    var root = document.getElementById('root');
    if (root) {
      observer.observe(root, { childList: true, subtree: true });
    }
  });
})();
