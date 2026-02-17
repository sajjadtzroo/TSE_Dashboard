import { notifications } from '@mantine/notifications';

export const showSuccess = (message: string) => {
  notifications.show({ message, color: 'green', title: 'موفق' });
};

export const showError = (message: string) => {
  notifications.show({ message, color: 'red', title: 'خطا' });
};

export const showWarning = (message: string) => {
  notifications.show({ message, color: 'yellow', title: 'هشدار' });
};

export const showInfo = (message: string) => {
  notifications.show({ message, color: 'blue', title: 'اطلاعات' });
};

export const showLoading = (message: string) => {
  return notifications.show({ message, loading: true, autoClose: false });
};

export const dismissToast = (id: string) => {
  notifications.hide(id);
};

export const dismissAll = () => {
  notifications.cleanQueue();
  notifications.clean();
};

export const updateToast = (
  id: string,
  message: string,
  type: 'success' | 'error' | 'loading',
) => {
  const colorMap = { success: 'green', error: 'red', loading: 'blue' } as const;
  notifications.update({
    id,
    message,
    color: colorMap[type],
    loading: type === 'loading',
    autoClose: type !== 'loading' ? 3000 : false,
  });
};

export const showPromise = async <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  },
): Promise<T> => {
  const id = showLoading(messages.loading);
  try {
    const data = await promise;
    const successMsg = typeof messages.success === 'function' ? messages.success(data) : messages.success;
    notifications.update({ id: id!, message: successMsg, color: 'green', loading: false, autoClose: 3000 });
    return data;
  } catch (err) {
    const errorMsg = typeof messages.error === 'function' ? messages.error(err) : messages.error;
    notifications.update({ id: id!, message: errorMsg, color: 'red', loading: false, autoClose: 5000 });
    throw err;
  }
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  promise: showPromise,
  dismiss: dismissToast,
  dismissAll,
  update: updateToast,
};
