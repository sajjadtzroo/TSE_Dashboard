import { useState } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloudSyncIcon from '@mui/icons-material/CloudSync'
import axios from 'axios'

export default function RefreshButton({ onRefreshComplete }) {
  const [anchorEl, setAnchorEl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' })

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleLocalRefresh = async () => {
    handleClose()
    setLoading(true)
    try {
      if (onRefreshComplete) {
        await onRefreshComplete()
      }
      showSnackbar('Data refreshed from database', 'success')
    } catch (error) {
      showSnackbar('Failed to refresh data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleScraperRun = async (spider) => {
    handleClose()
    setLoading(true)
    try {
      const response = await axios.post(`/api/scraper/run/${spider}`)
      showSnackbar(
        `Scraper started: ${spider}. This may take a few minutes...`,
        'info'
      )

      // Auto-refresh after 30 seconds
      setTimeout(() => {
        if (onRefreshComplete) {
          onRefreshComplete()
        }
      }, 30000)
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to start scraper'
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAll = async () => {
    handleClose()
    setLoading(true)
    try {
      const response = await axios.post('/api/scraper/update-all')
      showSnackbar(
        'All scrapers started! This will take 5-10 minutes. Page will auto-refresh.',
        'info'
      )

      // Auto-refresh after 5 minutes
      setTimeout(() => {
        if (onRefreshComplete) {
          onRefreshComplete()
        }
        showSnackbar('Scrapers should be done. Refreshing data...', 'info')
      }, 300000)
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to start scrapers'
      showSnackbar(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Refresh'}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleLocalRefresh}>
          <RefreshIcon sx={{ mr: 1 }} /> Refresh from Database
        </MenuItem>
        <MenuItem onClick={() => handleScraperRun('market_watch')}>
          <CloudSyncIcon sx={{ mr: 1 }} /> Update Prices (2 min)
        </MenuItem>
        <MenuItem onClick={() => handleScraperRun('instrument_details')}>
          <CloudSyncIcon sx={{ mr: 1 }} /> Update Financials (5 min)
        </MenuItem>
        <MenuItem onClick={handleUpdateAll}>
          <CloudSyncIcon sx={{ mr: 1 }} /> Update All Data (10 min)
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}
