import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Grid,
} from '@mui/material';
import {
  IconFileText,
  IconCheck,
  IconAlertTriangle,
  IconDatabase,
  IconPlayerPlay,
  IconClock,
} from '@tabler/icons-react';
import axios from 'axios';
import MainCard from '../components/MainCard';
import KPICard from '../components/KPICard';
import colors from '../theme/colors';

export default function RAGStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/rag/status');
      setStatus(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerProcess = async () => {
    try {
      setProcessing(true);
      await axios.post('/api/rag/process');
      // Poll status after a short delay
      setTimeout(fetchStatus, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !status) {
    return (
      <Alert severity="error" action={
        <Chip label="Retry" size="small" onClick={fetchStatus} sx={{ cursor: 'pointer' }} />
      }>
        Error loading RAG status: {error}
      </Alert>
    );
  }

  const s = status || {};

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h3">RAG Pipeline Status</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={processing ? <CircularProgress size={16} color="inherit" /> : <IconPlayerPlay size={16} />}
          onClick={triggerProcess}
          disabled={processing}
          sx={{ borderRadius: 2 }}
        >
          {processing ? 'Processing...' : 'Process Now'}
        </Button>
        <Chip
          label="Refresh"
          size="small"
          onClick={fetchStatus}
          sx={{ cursor: 'pointer', bgcolor: 'rgba(33,150,243,0.15)', color: colors.primaryMain }}
        />
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Documents"
            value={s.total_documents || 0}
            icon={IconFileText}
            color={colors.primaryDark}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Embedded"
            value={s.embedded || 0}
            icon={IconCheck}
            color={colors.successDark}
            subtitle={`${s.total_chunks || 0} chunks`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Failed"
            value={s.failed || 0}
            icon={IconAlertTriangle}
            color={s.failed > 0 ? colors.errorDark : colors.grey700}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Total Chunks"
            value={s.chunks_with_embedding || 0}
            icon={IconDatabase}
            color={colors.secondaryDark}
            subtitle="with embeddings"
          />
        </Grid>
      </Grid>

      {/* Status Breakdown */}
      <MainCard>
        <Typography variant="h4" gutterBottom>Pipeline Status Breakdown</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 2 }}>
          {[
            { label: 'Pending', value: s.pending, color: colors.warningDark, icon: IconClock },
            { label: 'Downloading', value: s.downloading, color: colors.orangeDark },
            { label: 'Downloaded', value: s.downloaded, color: colors.primaryMain },
            { label: 'Extracting', value: s.extracting, color: colors.orangeMain },
            { label: 'Extracted', value: s.extracted, color: colors.primary200 },
            { label: 'Embedding', value: s.embedding, color: colors.secondaryMain },
            { label: 'Embedded', value: s.embedded, color: colors.successMain },
            { label: 'Failed', value: s.failed, color: colors.errorMain },
          ].map((item) => (
            <Chip
              key={item.label}
              label={`${item.label}: ${item.value || 0}`}
              sx={{
                bgcolor: `${item.color}22`,
                color: item.color,
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            />
          ))}
        </Box>
      </MainCard>
    </Box>
  );
}
