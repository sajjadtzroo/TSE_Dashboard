import { useState } from 'react';
import { Button, Menu, MenuItem, CircularProgress, Snackbar, Alert, ListItemIcon, ListItemText } from '@mui/material';
import { IconRefresh, IconCloudDownload, IconDatabase } from '@tabler/icons-react';
import axios from 'axios';

export default function RefreshButton({ onRefreshComplete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const handleClick = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const showSnackbar = (message, severity = 'info') => setSnackbar({ open: true, message, severity });

  const handleLocalRefresh = async () => {
    handleClose();
    setLoading(true);
    try {
      if (onRefreshComplete) await onRefreshComplete();
      showSnackbar('Data refreshed from database', 'success');
    } catch { showSnackbar('Failed to refresh data', 'error'); }
    finally { setLoading(false); }
  };

  const handleScraperRun = async (spider) => {
    handleClose();
    setLoading(true);
    try {
      await axios.post(`/api/scraper/run/${spider}`);
      showSnackbar(`Scraper started: ${spider}. This may take a few minutes...`, 'info');
      setTimeout(() => { if (onRefreshComplete) onRefreshComplete(); }, 30000);
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Failed to start scraper', 'error');
    } finally { setLoading(false); }
  };

  const handleUpdateAll = async () => {
    handleClose();
    setLoading(true);
    try {
      await axios.post('/api/scraper/update-all');
      showSnackbar('All scrapers started! Page will auto-refresh in 5 minutes.', 'info');
      setTimeout(() => { if (onRefreshComplete) onRefreshComplete(); }, 300000);
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Failed to start scrapers', 'error');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Button
        variant="contained"
        size="small"
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <IconRefresh size={16} />}
        onClick={handleClick}
        disabled={loading}
        sx={{ borderRadius: '8px' }}
      >
        {loading ? 'Working...' : 'Refresh'}
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleLocalRefresh}>
          <ListItemIcon><IconDatabase size={18} /></ListItemIcon>
          <ListItemText>Refresh from Database</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleScraperRun('market_watch')}>
          <ListItemIcon><IconCloudDownload size={18} /></ListItemIcon>
          <ListItemText>Update Prices (~2 min)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleScraperRun('instrument_details')}>
          <ListItemIcon><IconCloudDownload size={18} /></ListItemIcon>
          <ListItemText>Update Financials (~5 min)</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleUpdateAll}>
          <ListItemIcon><IconCloudDownload size={18} /></ListItemIcon>
          <ListItemText>Update All Data (~10 min)</ListItemText>
        </MenuItem>
      </Menu>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
