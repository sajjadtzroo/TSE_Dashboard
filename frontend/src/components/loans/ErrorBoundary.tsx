import React, { Component, ReactNode } from 'react';
import { Center, Stack, Text, Title, Button, Group, Box, Code } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconHome } from '@tabler/icons-react';
import rallyColors from '../../theme/rallyColors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Center mih="100vh" p="md" style={{ backgroundColor: rallyColors.bg }}>
          <Box maw={600} w="100%">
            <Stack
              align="center"
              gap="lg"
              p="xl"
              style={{
                backgroundColor: rallyColors.glassBg,
                border: `1px solid ${rallyColors.glassBorder}`,
                borderRadius: 12,
                backdropFilter: 'blur(12px)',
              }}
            >
              <Box
                w={80}
                h={80}
                style={{
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconAlertTriangle size={40} color="#ef4444" />
              </Box>

              <Title order={2} ta="center">خطایی رخ داده است</Title>

              <Text c={rallyColors.textSecondary} ta="center">
                متأسفانه در اجرای برنامه مشکلی پیش آمده است. لطفاً دوباره تلاش کنید یا به صفحه اصلی بازگردید.
              </Text>

              {import.meta.env.DEV && this.state.error && (
                <Box
                  w="100%"
                  p="md"
                  style={{
                    backgroundColor: rallyColors.bg,
                    borderRadius: 8,
                    border: `1px solid ${rallyColors.glassBorder}`,
                  }}
                >
                  <Code block c="red" style={{ fontSize: '0.75rem' }}>
                    {this.state.error.message}
                  </Code>
                  {this.state.errorInfo && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', color: rallyColors.textDimmed, fontSize: '0.75rem' }}>
                        Stack Trace
                      </summary>
                      <Code block mt="xs" style={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap' }}>
                        {this.state.errorInfo.componentStack}
                      </Code>
                    </details>
                  )}
                </Box>
              )}

              <Group>
                <Button
                  leftSection={<IconRefresh size={16} />}
                  color="rally-green"
                  onClick={this.handleReset}
                >
                  تلاش مجدد
                </Button>
                <Button
                  leftSection={<IconHome size={16} />}
                  variant="light"
                  color="gray"
                  onClick={this.handleGoHome}
                >
                  بازگشت به خانه
                </Button>
              </Group>

              <Text size="sm" c={rallyColors.textDimmed} ta="center" mt="md" pt="md" style={{ borderTop: `1px solid ${rallyColors.glassBorder}`, width: '100%' }}>
                در صورت تکرار این خطا، لطفاً با پشتیبانی تماس بگیرید.
              </Text>
            </Stack>
          </Box>
        </Center>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
