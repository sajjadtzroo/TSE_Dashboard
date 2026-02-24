import { Component } from 'react';
import { Paper, Text, Button, Stack, Center } from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

/**
 * React Error Boundary — catches render errors in child components
 * and displays a user-friendly fallback UI with Mantine dark theme styling.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console in development; could send to monitoring in production
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
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
              <IconAlertTriangle
                size={48}
                stroke={1.5}
                color={rallyColors.yellow}
              />
              <Text size="lg" fw={600} c={rallyColors.textPrimary} ta="center">
                خطایی رخ داده است
              </Text>
              <Text size="sm" c={rallyColors.textSecondary} ta="center">
                متاسفانه مشکلی در بارگذاری این بخش پیش آمد. لطفا دوباره تلاش
                کنید.
              </Text>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Paper
                  p="sm"
                  radius="sm"
                  style={{
                    width: '100%',
                    background: rallyColors.elevated,
                    borderColor: rallyColors.border,
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
              <Button
                variant="outline"
                color="rally-primary"
                leftSection={<IconRefresh size={16} />}
                onClick={this.handleReset}
              >
                تلاش مجدد
              </Button>
            </Stack>
          </Paper>
        </Center>
      );
    }

    return this.props.children;
  }
}
