import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

export const toast = {
  success: (message: string, title?: string) => {
    notifications.show({
      title: title || 'موفق',
      message,
      color: 'green',
      icon: <IconCheck size={16} />,
    });
  },
  error: (message: string, title?: string) => {
    notifications.show({
      title: title || 'خطا',
      message,
      color: 'red',
      icon: <IconX size={16} />,
    });
  },
  info: (message: string, title?: string) => {
    notifications.show({
      title: title || 'اطلاعات',
      message,
      color: 'blue',
      icon: <IconInfoCircle size={16} />,
    });
  },
  warning: (message: string, title?: string) => {
    notifications.show({
      title: title || 'هشدار',
      message,
      color: 'yellow',
      icon: <IconAlertTriangle size={16} />,
    });
  },
};

// Notifications component is now in main.tsx providers
export function Toaster() {
  return null;
}
