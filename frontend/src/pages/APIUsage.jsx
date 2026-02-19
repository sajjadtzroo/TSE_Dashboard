import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { IconTrash, IconApi, IconClock, IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import MainCard from '../components/MainCard';
import KPICard from '../components/KPICard';
import { getLogs, clearLogs, subscribe } from '../utils/apiTracker';
import { toPersianNum } from '../utils/formatUtils';
import colors from '../theme/colors';

function statusColor(status) {
  if (!status) return colors.grey500;
  if (status >= 500) return colors.errorMain;
  if (status >= 400) return colors.orangeMain;
  if (status >= 200 && status < 300) return colors.successMain;
  return colors.warningDark;
}

function durationColor(ms) {
  if (ms < 200) return colors.successMain;
  if (ms < 500) return colors.warningDark;
  if (ms < 1000) return colors.orangeMain;
  return colors.errorMain;
}

function durationBar(ms) {
  // Map 0-2000ms to 0-100%
  return Math.min((ms / 2000) * 100, 100);
}

export default function APIUsage() {
  const [, setTick] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);

  const logs = getLogs();

  const stats = useMemo(() => {
    if (logs.length === 0) return { total: 0, avgDuration: 0, errors: 0, slowest: 0, p95: 0 };

    const durations = logs.map((l) => l.duration).sort((a, b) => a - b);
    const errors = logs.filter((l) => l.error || l.status >= 400).length;
    const sum = durations.reduce((a, b) => a + b, 0);
    const p95Index = Math.floor(durations.length * 0.95);

    return {
      total: logs.length,
      avgDuration: Math.round(sum / durations.length),
      errors,
      slowest: durations[durations.length - 1] || 0,
      p95: durations[p95Index] || 0,
    };
  }, [logs.length]);

  // Group by endpoint for summary
  const endpointStats = useMemo(() => {
    const map = {};
    for (const log of logs) {
      // Normalize URL: replace dynamic segments
      const normalized = log.url?.replace(/\/stock\/[^/]+/, '/stock/:symbol')
        .replace(/\/api\/scraper\/run\/[^/]+/, '/api/scraper/run/:spider') || 'unknown';
      const key = `${log.method} ${normalized}`;
      if (!map[key]) {
        map[key] = { method: log.method, url: normalized, count: 0, totalDuration: 0, errors: 0, maxDuration: 0 };
      }
      map[key].count++;
      map[key].totalDuration += log.duration;
      map[key].maxDuration = Math.max(map[key].maxDuration, log.duration);
      if (log.error || log.status >= 400) map[key].errors++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [logs.length]);

  const paginatedLogs = logs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h3">API Usage Monitor</Typography>
        <Chip
          label={`${logs.length} calls`}
          size="small"
          sx={{ bgcolor: 'rgba(33,150,243,0.15)', color: colors.primaryMain }}
        />
        {logs.length > 0 && (
          <Tooltip title="Clear all logs">
            <IconButton size="small" onClick={clearLogs} sx={{ color: 'text.secondary' }}>
              <IconTrash size={18} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Total Calls"
            value={stats.total}
            icon={IconApi}
            color={colors.primaryDark}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Avg Response"
            value={`${stats.avgDuration}ms`}
            icon={IconClock}
            color={stats.avgDuration < 500 ? colors.successDark : colors.warningDark}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="P95 Response"
            value={`${stats.p95}ms`}
            icon={IconClock}
            color={stats.p95 < 1000 ? colors.secondaryDark : colors.orangeDark}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Slowest"
            value={`${stats.slowest}ms`}
            icon={IconClock}
            color={colors.grey700}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KPICard
            title="Errors"
            value={stats.errors}
            icon={IconAlertTriangle}
            color={stats.errors > 0 ? colors.errorDark : colors.successDark}
          />
        </Grid>
      </Grid>

      {/* Endpoint Summary */}
      {endpointStats.length > 0 && (
        <MainCard sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>Endpoint Summary</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Endpoint</TableCell>
                  <TableCell align="right">Calls</TableCell>
                  <TableCell align="right">Avg (ms)</TableCell>
                  <TableCell align="right">Max (ms)</TableCell>
                  <TableCell align="right">Errors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {endpointStats.map((ep) => (
                  <TableRow key={`${ep.method} ${ep.url}`} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={ep.method}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: ep.method === 'GET' ? 'rgba(33,150,243,0.15)' : 'rgba(156,39,176,0.15)',
                            color: ep.method === 'GET' ? colors.primaryMain : colors.secondaryMain,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {ep.url}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{ep.count}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ color: durationColor(Math.round(ep.totalDuration / ep.count)), fontWeight: 600 }}
                      >
                        {Math.round(ep.totalDuration / ep.count)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: durationColor(ep.maxDuration), fontWeight: 600 }}>
                        {ep.maxDuration}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {ep.errors > 0 ? (
                        <Chip label={ep.errors} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(244,67,54,0.15)', color: colors.errorMain }} />
                      ) : (
                        <IconCheck size={14} color={colors.successMain} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </MainCard>
      )}

      {/* Request Log */}
      <MainCard content={false}>
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="h4">Request Log</Typography>
        </Box>
        {logs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <IconApi size={40} stroke={1} style={{ opacity: 0.2, marginBottom: 8 }} />
            <Typography variant="body2" color="text.secondary">
              No API calls recorded yet. Navigate to other pages to see data.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={70}>Time</TableCell>
                    <TableCell width={60}>Method</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell width={60} align="center">Status</TableCell>
                    <TableCell width={180}>Response Time</TableCell>
                    <TableCell width={70} align="right">Size</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      hover
                      sx={{
                        ...(log.error && { bgcolor: 'rgba(244,67,54,0.04)' }),
                      }}
                    >
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {log.timestamp.toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.method}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: log.method === 'GET' ? 'rgba(33,150,243,0.15)' : 'rgba(156,39,176,0.15)',
                            color: log.method === 'GET' ? colors.primaryMain : colors.secondaryMain,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}
                        >
                          {log.url}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={log.status || 'ERR'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            bgcolor: `${statusColor(log.status)}22`,
                            color: statusColor(log.status),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1, maxWidth: 100 }}>
                            <LinearProgress
                              variant="determinate"
                              value={durationBar(log.duration)}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.05)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: durationColor(log.duration),
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: durationColor(log.duration), minWidth: 50, fontFamily: 'monospace' }}
                          >
                            {log.duration}ms
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {log.size > 1024 ? `${toPersianNum((log.size / 1024).toFixed(1))}K` : `${toPersianNum(String(log.size))}B`}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={logs.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </MainCard>
    </Box>
  );
}
