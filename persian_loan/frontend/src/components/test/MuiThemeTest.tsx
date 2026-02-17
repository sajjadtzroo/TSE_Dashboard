/**
 * MUI Theme Test Component
 *
 * This component tests that Material UI components render correctly with the dark theme.
 * Remove this file after testing.
 */

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Chip,
  Alert,
  Switch,
  Checkbox,
  Radio,
  LinearProgress,
  CircularProgress,
  Divider,
  Paper,
  Stack,
} from '@mui/material';
import { Star } from '@mui/icons-material';

export function MuiThemeTest() {
  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h2" gutterBottom>
        تست طراحی Material UI
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        این صفحه برای آزمایش تم تاریک Material UI است
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Buttons */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4">دکمه‌ها</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" color="primary">
            دکمه اصلی
          </Button>
          <Button variant="contained" color="secondary">
            دکمه ثانویه
          </Button>
          <Button variant="outlined" color="primary">
            دکمه خطی
          </Button>
          <Button variant="text" color="primary">
            دکمه متنی
          </Button>
        </Stack>
      </Stack>

      {/* Cards */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4">کارت‌ها</Typography>
        <Stack direction="row" spacing={2}>
          <Card sx={{ minWidth: 275 }}>
            <CardContent>
              <Typography variant="h5" component="div" gutterBottom>
                عنوان کارت
              </Typography>
              <Typography color="text.secondary">
                این یک کارت نمونه است که با تم تاریک طراحی شده است.
              </Typography>
            </CardContent>
          </Card>
          <Paper sx={{ p: 2, minWidth: 275 }}>
            <Typography variant="h6" gutterBottom>
              کامپوننت Paper
            </Typography>
            <Typography color="text.secondary">
              از Paper برای سطوح برجسته استفاده می‌شود.
            </Typography>
          </Paper>
        </Stack>
      </Stack>

      {/* Chips */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4">چیپ‌ها</Typography>
        <Stack direction="row" spacing={1}>
          <Chip label="پیش‌فرض" />
          <Chip label="اصلی" color="primary" />
          <Chip label="ثانویه" color="secondary" />
          <Chip label="خطا" color="error" />
          <Chip label="با آیکون" icon={<Star />} color="primary" />
          <Chip label="قابل حذف" onDelete={() => {}} color="secondary" />
        </Stack>
      </Stack>

      {/* Alerts */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4">هشدارها</Typography>
        <Alert severity="success">این یک پیام موفقیت است</Alert>
        <Alert severity="info">این یک پیام اطلاعاتی است</Alert>
        <Alert severity="warning">این یک پیام هشدار است</Alert>
        <Alert severity="error">این یک پیام خطا است</Alert>
      </Stack>

      {/* Form Controls */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4">فرم‌ها</Typography>
        <Stack spacing={2}>
          <TextField
            label="نام"
            variant="outlined"
            placeholder="نام خود را وارد کنید"
          />
          <TextField
            label="ایمیل"
            variant="outlined"
            type="email"
            placeholder="ایمیل خود را وارد کنید"
          />
          <TextField
            label="توضیحات"
            variant="outlined"
            multiline
            rows={4}
            placeholder="توضیحات را وارد کنید"
          />
        </Stack>
      </Stack>

      {/* Switches and Checkboxes */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4">کنترل‌ها</Typography>
        <Stack direction="row" spacing={4} alignItems="center">
          <Box>
            <Typography variant="body2" gutterBottom>
              سوئیچ
            </Typography>
            <Switch defaultChecked />
            <Switch />
          </Box>
          <Box>
            <Typography variant="body2" gutterBottom>
              چک‌باکس
            </Typography>
            <Checkbox defaultChecked />
            <Checkbox />
          </Box>
          <Box>
            <Typography variant="body2" gutterBottom>
              رادیو
            </Typography>
            <Radio checked />
            <Radio />
          </Box>
        </Stack>
      </Stack>

      {/* Progress */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4">پیشرفت</Typography>
        <LinearProgress value={60} variant="determinate" />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <CircularProgress />
          <CircularProgress variant="determinate" value={75} />
        </Box>
      </Stack>

      {/* Typography */}
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="h4">تایپوگرافی</Typography>
        <Typography variant="h1">سرتیتر 1</Typography>
        <Typography variant="h2">سرتیتر 2</Typography>
        <Typography variant="h3">سرتیتر 3</Typography>
        <Typography variant="h4">سرتیتر 4</Typography>
        <Typography variant="h5">سرتیتر 5</Typography>
        <Typography variant="h6">سرتیتر 6</Typography>
        <Typography variant="body1">
          متن اصلی - لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم از صنعت چاپ
        </Typography>
        <Typography variant="body2">
          متن ثانویه - لورم ایپسوم متن ساختگی با تولید سادگی نامفهوم
        </Typography>
        <Typography variant="caption">متن کپشن - اندازه کوچک</Typography>
      </Stack>
    </Box>
  );
}
