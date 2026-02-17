# Quick Start Guide - Material UI

## Fix Installation Issue First

```bash
cd /workspaces/Persian_Loan/frontend
./fix-mui-icons.sh
```

## Start Development

```bash
npm run dev
```

Visit: `http://localhost:5173/mui-test`

## Common Components

### Button
```tsx
import { Button } from '@mui/material';

<Button variant="contained" color="primary">ذخیره</Button>
<Button variant="outlined" color="secondary">لغو</Button>
<Button variant="text">بستن</Button>
```

### Card
```tsx
import { Card, CardContent, Typography } from '@mui/material';

<Card>
  <CardContent>
    <Typography variant="h5" gutterBottom>عنوان کارت</Typography>
    <Typography color="text.secondary">محتوای کارت</Typography>
  </CardContent>
</Card>
```

### TextField
```tsx
import { TextField } from '@mui/material';

<TextField
  label="نام"
  variant="outlined"
  fullWidth
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

### DataGrid
```tsx
import { DataGrid } from '@mui/x-data-grid';

const columns = [
  { field: 'id', headerName: 'شناسه', width: 90 },
  { field: 'name', headerName: 'نام', width: 150 },
];

<DataGrid rows={rows} columns={columns} autoHeight />
```

### Alert
```tsx
import { Alert } from '@mui/material';

<Alert severity="success">عملیات موفق بود</Alert>
<Alert severity="error">خطا رخ داد</Alert>
<Alert severity="warning">هشدار</Alert>
<Alert severity="info">اطلاعات</Alert>
```

### Dialog
```tsx
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

<Dialog open={open} onClose={handleClose}>
  <DialogTitle>عنوان دیالوگ</DialogTitle>
  <DialogContent>محتوای دیالوگ</DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>لغو</Button>
    <Button onClick={handleSave} variant="contained">ذخیره</Button>
  </DialogActions>
</Dialog>
```

### Persian Date Picker
```tsx
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFnsJalali } from '@mui/x-date-pickers/AdapterDateFnsJalali';

<LocalizationProvider dateAdapter={AdapterDateFnsJalali}>
  <DatePicker
    label="تاریخ"
    value={date}
    onChange={(newDate) => setDate(newDate)}
  />
</LocalizationProvider>
```

### Chip
```tsx
import { Chip } from '@mui/material';

<Chip label="فعال" color="success" />
<Chip label="غیرفعال" color="default" />
<Chip label="خطا" color="error" />
```

### Table
```tsx
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

<TableContainer component={Paper}>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>نام</TableCell>
        <TableCell>مقدار</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.id}>
          <TableCell>{row.name}</TableCell>
          <TableCell>{row.value}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

## Theme Colors

Access theme colors in components:

```tsx
import { useTheme } from '@mui/material/styles';

const theme = useTheme();
// theme.palette.primary.main = '#BB86FC'
// theme.palette.secondary.main = '#03DAC5'
// theme.palette.error.main = '#CF6679'
```

Or use sx prop:

```tsx
<Box sx={{
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  p: 2
}}>
  محتوا
</Box>
```

## Icons

```tsx
import { Star, Favorite, Delete, Edit } from '@mui/icons-material';

<Button startIcon={<Star />}>با آیکون</Button>
<IconButton><Delete /></IconButton>
```

## Spacing

Use theme spacing (1 unit = 8px):

```tsx
<Box sx={{
  p: 2,      // padding: 16px
  m: 3,      // margin: 24px
  mt: 1,     // margin-top: 8px
  gap: 2     // gap: 16px
}}>
```

## More Examples

See full examples at: `/workspaces/Persian_Loan/frontend/src/components/test/MuiThemeTest.tsx`
