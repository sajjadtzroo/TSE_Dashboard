import { Box, Typography, Button } from '@mui/material';
import { IconDatabaseOff } from '@tabler/icons-react';
import colors from '../theme/colors';

export default function EmptyState({ message = 'No data available', onRetry }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        gap: 1.5,
      }}
    >
      <IconDatabaseOff size={48} stroke={1} color={colors.darkTextSecondary} />
      <Typography variant="h4" color="text.secondary">
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" size="small" onClick={onRetry} sx={{ mt: 1 }}>
          Retry
        </Button>
      )}
    </Box>
  );
}
