import { Component } from 'react';
import { Paper, Text, Button, Stack, Center, Group } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconArrowRight } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

/** Detect CSS preload or dynamic chunk load failures (stale deployment). */
function isChunkLoadError(error) {
  const msg = error?.message || '';
  return (
    /Unable to preload CSS/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk/i.test(msg)
  );
}

/**
 * Page-scoped error boundary for route groups.
 * Catches render errors in child page components without killing the entire app.
 * The layout (sidebar, header) remains functional — only the page content shows the error.
 *
 * For CSS/chunk preload errors (stale deployment), it automatically reloads once.
 */
export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[RouteErrorBoundary]', error, errorInfo);

    // Auto-reload once for stale CSS/chunk errors
    if (isChunkLoadError(error)) {
      const key = 'route_error_reloaded';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return;
      }
      // Already reloaded once this session — show error UI
      sessionStorage.removeItem(key);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoBack = () => {
    this.setState({ hasError: false, error: null });
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      const isStaleAsset = isChunkLoadError(this.state.error);

      return (
        <Center py="xl" mih={300}>
          <Paper
            p="xl"
            radius="md"
            withBorder
            style={{
              maxWidth: 480,
              width: '100%',
              background: rallyColors.card,
              borderColor: rallyColors.border,
            }}
          >
            <Stack align="center" gap="md">
              <IconAlertTriangle size={48} stroke={1.5} color={rallyColors.yellow} />
              <Text size="lg" fw={600} c={rallyColors.textPrimary} ta="center">
                {isStaleAsset
                  ? 'نسخه جدیدی از برنامه موجود است'
                  : 'خطایی در این صفحه رخ داده است'}
              </Text>
              <Text size="sm" c={rallyColors.textSecondary} ta="center">
                {isStaleAsset
                  ? 'لطفاً صفحه را بارگذاری مجدد کنید تا آخرین نسخه دریافت شود.'
                  : 'مشکلی در بارگذاری این بخش پیش آمد. سایر بخش‌ها همچنان در دسترس هستند.'}
              </Text>
              {import.meta.env.DEV && this.state.error && (
                <Paper
                  p="sm"
                  radius="sm"
                  style={{
                    width: '100%',
                    background: rallyColors.elevated,
                    border: `1px solid ${rallyColors.border}`,
                    overflowX: 'auto',
                  }}
                >
                  <Text
                    size="xs"
                    c={rallyColors.red}
                    style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                  >
                    {this.state.error.toString()}
                  </Text>
                </Paper>
              )}
              <Group>
                {isStaleAsset ? (
                  <Button
                    color="rally-primary"
                    leftSection={<IconRefresh size={16} />}
                    onClick={this.handleReload}
                  >
                    بارگذاری مجدد
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      color="gray"
                      leftSection={<IconArrowRight size={16} />}
                      onClick={this.handleGoBack}
                    >
                      بازگشت
                    </Button>
                    <Button
                      variant="outline"
                      color="rally-primary"
                      leftSection={<IconRefresh size={16} />}
                      onClick={this.handleReset}
                    >
                      تلاش مجدد
                    </Button>
                  </>
                )}
              </Group>
            </Stack>
          </Paper>
        </Center>
      );
    }

    return this.props.children;
  }
}
