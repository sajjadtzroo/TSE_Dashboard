# Console Log Saving Guide

This guide explains how to check and save console logs in the Persian Loan application.

## Quick Start

### 1. Visual Log Viewer (Easiest)

A **floating "📝 Logs" button** appears in the bottom-left corner of the app (development mode only).

**Steps:**
1. Click the "📝 Logs" button
2. Click "شروع ضبط" (Start Capturing) to begin recording logs
3. Use your app normally - all console logs will be captured
4. Click "توقف ضبط" (Stop Capturing) when done
5. Download logs in your preferred format:
   - **JSON** - For detailed structured data
   - **CSV** - For Excel/spreadsheet analysis
   - **Text** - For simple text viewing

### 2. Browser Console Commands

You can control log saving directly from the browser console:

```javascript
// Start capturing logs
window.logSaver.startCapturing()

// Use your app...

// View captured logs
window.logSaver.getLogs()

// Download as JSON
window.logSaver.downloadLogs('json')

// Download as CSV
window.logSaver.downloadLogs('csv')

// Download as Text
window.logSaver.downloadLogs('txt')

// Save to browser storage
window.logSaver.saveToLocalStorage()

// Show summary
window.logSaver.printSummary()

// Clear logs
window.logSaver.clearLogs()

// Stop capturing
window.logSaver.stopCapturing()
```

### 3. Use Existing Logger in Code

For your own components and services:

```typescript
import { logger, apiLogger } from '@/utils/logger';

// Basic logging
logger.info('User clicked button');
logger.warn('Warning: Invalid input');
logger.error('Error occurred', error);
logger.debug('Debug info', { data: 'value' });

// Use specialized loggers
apiLogger.info('API call started', { endpoint: '/api/loans' });
apiLogger.error('API call failed', error);
```

### 4. Programmatic Control in React

```typescript
import { useLogSaver } from '@/hooks/useLogSaver';

function MyComponent() {
  const logSaver = useLogSaver();

  const handleExportLogs = () => {
    // Download logs
    logSaver.downloadJSON();
  };

  const handleSaveLogs = () => {
    // Save to localStorage
    logSaver.saveToStorage();
  };

  return (
    <button onClick={handleExportLogs}>Export Logs</button>
  );
}
```

### 5. Auto-Save Logs Every 5 Minutes

```typescript
import { useLogSaver } from '@/hooks/useLogSaver';

function App() {
  useLogSaver({
    autoStart: true,              // Start capturing automatically
    autoSaveInterval: 5 * 60 * 1000, // Save every 5 minutes
    localStorageKey: 'my-app-logs'
  });

  return <div>Your App</div>;
}
```

## Features

### Log Levels
- **DEBUG** - Verbose development logs
- **INFO** - General information
- **LOG** - Standard console.log
- **WARN** - Warnings
- **ERROR** - Errors and exceptions

### Export Formats

#### JSON Format
```json
[
  {
    "timestamp": "2026-02-07T15:30:00.000Z",
    "level": "error",
    "message": "API call failed",
    "data": [...]
  }
]
```

#### CSV Format
```csv
Timestamp,Level,Message
"2026-02-07T15:30:00.000Z","error","API call failed"
```

#### Text Format
```
[2026-02-07T15:30:00.000Z] [ERROR] API call failed
```

### Storage Options

1. **Download** - Save as file to your computer
2. **localStorage** - Save in browser storage (persists across sessions)
3. **Server** - Send to backend endpoint for central logging

## Common Use Cases

### Debugging Production Issues

```javascript
// User reports an error
// 1. Ask them to open console and run:
window.logSaver.startCapturing()

// 2. They reproduce the issue

// 3. Download logs
window.logSaver.downloadLogs('json')

// 4. Send you the file
```

### Monitor API Calls

```typescript
import { apiLogger } from '@/utils/logger';

async function fetchLoans() {
  apiLogger.info('Fetching loans...');

  try {
    const response = await api.get('/loans/');
    apiLogger.info('Loans fetched successfully', { count: response.data.length });
    return response.data;
  } catch (error) {
    apiLogger.error('Failed to fetch loans', error);
    throw error;
  }
}
```

### Track User Actions

```typescript
import { logger } from '@/utils/logger';

function LoanOptimizerButton() {
  const handleClick = () => {
    logger.info('User clicked optimizer button', {
      timestamp: new Date().toISOString(),
      userId: user.id,
    });

    // ... rest of your code
  };

  return <button onClick={handleClick}>Optimize</button>;
}
```

### Filter Errors Only

```javascript
// Get only error logs
const errors = window.logSaver.getErrors();
console.table(errors);

// Download errors only
const errorLogs = window.logSaver.getErrors();
// ... manual download logic
```

## Browser DevTools Alternative

If you don't need to save logs programmatically, use browser DevTools:

### Chrome/Edge DevTools
1. Press `F12` or `Ctrl+Shift+I`
2. Go to **Console** tab
3. Right-click → **Save as...**

### Firefox DevTools
1. Press `F12` or `Ctrl+Shift+I`
2. Go to **Console** tab
3. Right-click on logs → **Export visible messages to file**

## Tips

1. **Clear logs periodically** to prevent memory issues
   ```javascript
   window.logSaver.clearLogs()
   ```

2. **Check log summary** to see counts by level
   ```javascript
   window.logSaver.printSummary()
   // Output: { total: 150, debug: 20, info: 80, warn: 30, error: 20 }
   ```

3. **Save before page refresh** - Logs are lost on refresh unless saved
   ```javascript
   window.logSaver.saveToLocalStorage()
   ```

4. **Load previous session logs**
   ```javascript
   const previousLogs = window.logSaver.loadFromLocalStorage()
   ```

## Example Workflow

```javascript
// 1. Start your debugging session
window.logSaver.startCapturing()

// 2. Use your app, trigger the issue
// ... interact with app ...

// 3. Check what was logged
window.logSaver.printSummary()
// Output: { total: 45, error: 3, warn: 5, info: 37 }

// 4. View errors
console.table(window.logSaver.getErrors())

// 5. Download for analysis
window.logSaver.downloadLogs('json')

// 6. Stop capturing
window.logSaver.stopCapturing()
```

## Troubleshooting

**Q: LogViewer button not showing?**
- Only visible in development mode (`npm run dev`)
- Check if `import.meta.env.DEV` is true

**Q: Logs not capturing?**
- Make sure you clicked "Start Capturing" first
- Check browser console for errors

**Q: Download not working?**
- Browser may block automatic downloads
- Check popup blocker settings
- Try saving to localStorage instead

**Q: Too many logs?**
- Default limit is 1000 logs (configurable)
- Older logs are automatically removed
- Clear logs periodically: `window.logSaver.clearLogs()`

## Advanced: Send Logs to Server

```typescript
// Add to your backend
// POST /api/logs endpoint

// In frontend
async function sendLogsToServer() {
  try {
    await window.logSaver.sendToServer('http://localhost:8000/api/logs');
    console.log('Logs sent successfully');
  } catch (error) {
    console.error('Failed to send logs', error);
  }
}
```

## Files Created

- `/frontend/src/utils/logSaver.ts` - Core log saving utility
- `/frontend/src/hooks/useLogSaver.ts` - React hook
- `/frontend/src/components/LogViewer.tsx` - Visual log viewer UI
- `/frontend/src/utils/logger.ts` - Existing structured logger (already present)

## Summary

You now have **4 ways** to work with console logs:

1. ✅ **Visual UI** - Click "📝 Logs" button (easiest)
2. ✅ **Browser Console** - `window.logSaver.*` commands
3. ✅ **Code Integration** - Import and use `logger` or `useLogSaver`
4. ✅ **Browser DevTools** - Native save functionality

Choose the method that works best for your workflow!
