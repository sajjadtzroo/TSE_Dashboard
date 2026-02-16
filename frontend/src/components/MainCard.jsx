import { forwardRef } from 'react';
import { Card, CardContent, CardHeader, Divider, Typography } from '@mui/material';

const MainCard = forwardRef(({ border = true, children, content = true, contentSX = {}, headerSX = {}, secondary, shadow, sx = {}, title, ...others }, ref) => {
  return (
    <Card
      ref={ref}
      sx={{
        border: border ? '1px solid rgba(255,255,255,0.05)' : 'none',
        ':hover': { boxShadow: shadow || '0 2px 14px 0 rgba(32, 40, 45, 0.15)' },
        ...sx,
      }}
      {...others}
    >
      {title && (
        <CardHeader
          sx={headerSX}
          title={<Typography variant="h3">{title}</Typography>}
          action={secondary}
        />
      )}
      {title && <Divider />}
      {content && <CardContent sx={contentSX}>{children}</CardContent>}
      {!content && children}
    </Card>
  );
});

MainCard.displayName = 'MainCard';
export default MainCard;
