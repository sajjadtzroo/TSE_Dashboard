/**
 * Log Viewer Component - Debug tool for viewing and downloading console logs
 * Add this component to your app during development
 */
import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import {
  Download,
  Delete,
  PlayArrow,
  Stop,
  Save,
  Assessment,
} from '@mui/icons-material';
import { useLogSaver } from '@/hooks/useLogSaver';

export const LogViewer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const logSaver = useLogSaver({
    autoStart: false, // Don't auto-start, let user control it
  });

  // Debug: Log when component mounts
  console.log('🔍 LogViewer component mounted');

  const handleStart = () => {
    logSaver.start();
    setIsCapturing(true);
    console.info('Log capturing started');
  };

  const handleStop = () => {
    logSaver.stop();
    setIsCapturing(false);
    console.info('Log capturing stopped');
  };

  const handleRefresh = () => {
    setLogs(logSaver.getLogs());
  };

  const handleClear = () => {
    logSaver.clear();
    setLogs([]);
  };

  const handleDownloadJSON = () => {
    logSaver.downloadJSON();
  };

  const handleDownloadCSV = () => {
    logSaver.downloadCSV();
  };

  const handleSaveToStorage = () => {
    logSaver.saveToStorage();
  };

  const handleShowSummary = () => {
    const summary = logSaver.printSummary();
    console.table(summary);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <>
      {/* Floating button to open log viewer */}
      <Button
        variant="contained"
        size="medium"
        onClick={() => {
          console.log('📝 Log Viewer button clicked');
          handleRefresh();
          setOpen(true);
        }}
        sx={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 99999,
          minWidth: '100px',
          height: '48px',
          bgcolor: '#1976d2',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          '&:hover': {
            bgcolor: '#1565c0',
            boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
          },
        }}
      >
        📝 Logs
      </Button>

      {/* Log Viewer Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth dir="rtl">
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">مشاهده و ذخیره لاگ‌ها</Typography>
            <Chip
              label={isCapturing ? 'در حال ضبط' : 'متوقف شده'}
              color={isCapturing ? 'success' : 'default'}
              size="small"
            />
          </Stack>
        </DialogTitle>

        <DialogContent>
          {/* Control Buttons */}
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
            <Button
              variant="contained"
              size="small"
              startIcon={isCapturing ? <Stop /> : <PlayArrow />}
              onClick={isCapturing ? handleStop : handleStart}
              color={isCapturing ? 'error' : 'success'}
            >
              {isCapturing ? 'توقف ضبط' : 'شروع ضبط'}
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={handleDownloadJSON}
            >
              دانلود JSON
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={handleDownloadCSV}
            >
              دانلود CSV
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Save />}
              onClick={handleSaveToStorage}
            >
              ذخیره در مرورگر
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Assessment />}
              onClick={handleShowSummary}
            >
              خلاصه (در کنسول)
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Delete />}
              onClick={handleClear}
              color="error"
            >
              پاک کردن
            </Button>
          </Stack>

          {/* Logs Display */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'grey.900',
              color: 'grey.100',
              p: 2,
              maxHeight: '60vh',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
            }}
          >
            {logs.length === 0 ? (
              <Typography color="grey.500" textAlign="center">
                هیچ لاگی ثبت نشده است
              </Typography>
            ) : (
              <Stack spacing={1}>
                {logs.map((log, index) => (
                  <Box
                    key={index}
                    sx={{
                      borderLeft: 3,
                      borderColor: getLevelColor(log.level) + '.main',
                      pl: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="grey.500">
                        {new Date(log.timestamp).toLocaleTimeString('fa-IR')}
                      </Typography>
                      <Chip
                        label={log.level.toUpperCase()}
                        size="small"
                        color={getLevelColor(log.level) as any}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Stack>
                    <Typography
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        mt: 0.5,
                      }}
                    >
                      {log.message}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          <Typography variant="caption" color="text.secondary" mt={1} display="block">
            تعداد کل لاگ‌ها: {logs.length}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>بستن</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
