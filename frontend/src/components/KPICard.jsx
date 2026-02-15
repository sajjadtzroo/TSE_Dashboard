import { Avatar, Box, List, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';
import MainCard from './MainCard';

export default function KPICard({ title, value, icon: Icon, color = 'primary.dark', bgColor, subtitle }) {
  return (
    <MainCard
      border={false}
      content={false}
      sx={{
        bgcolor: bgColor || color,
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
        '&:after': {
          content: '""',
          position: 'absolute',
          width: 210,
          height: 210,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50%',
          top: -85,
          right: -95,
        },
        '&:before': {
          content: '""',
          position: 'absolute',
          width: 210,
          height: 210,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '50%',
          top: -125,
          right: -15,
        },
      }}
    >
      <Box sx={{ p: 2.25 }}>
        <List disablePadding>
          <ListItem alignItems="center" disableGutters disablePadding>
            <ListItemAvatar>
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  width: 44,
                  height: 44,
                }}
              >
                {Icon && <Icon size={24} stroke={1.5} />}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              sx={{ ml: 1 }}
              primary={
                <Typography variant="h2" color="inherit">
                  {value}
                </Typography>
              }
              secondary={
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.25 }}>
                  {title}
                </Typography>
              }
            />
          </ListItem>
        </List>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </MainCard>
  );
}
