import { Center, Loader, Stack, Text } from '@mantine/core';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function Loading({ size = 'md', text }: LoadingProps) {
  return (
    <Center py="xl">
      <Stack align="center" gap="sm">
        <Loader color="rally-green" size={size} />
        {text && (
          <Text size="sm" c="dimmed">
            {text}
          </Text>
        )}
      </Stack>
    </Center>
  );
}

interface LoadingPageProps {
  text?: string;
}

export function LoadingPage({ text: _text }: LoadingPageProps) {
  return (
    <Center h="100vh">
      <Loader color="rally-green" size="lg" />
    </Center>
  );
}

export default Loading;
