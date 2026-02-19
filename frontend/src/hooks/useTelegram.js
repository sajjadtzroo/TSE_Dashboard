/**
 * useTelegram — hook for Telegram Mini App integration.
 *
 * Exposes:
 *  - isTelegram: true when running inside Telegram WebApp
 *  - tg: the raw window.Telegram.WebApp object (or null)
 *  - user: Telegram user info { id, first_name, username, language_code }
 *  - themeParams: Telegram color theme (bg_color, text_color, hint_color, …)
 *  - haptic: helper functions for haptic feedback
 *  - expand(): expand the Mini App to full height
 *  - close(): close the Mini App
 */
import { useCallback, useMemo } from 'react';

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window?.Telegram?.WebApp : null;
  const isTelegram = !!tg?.initData;

  const user = useMemo(() => {
    if (!isTelegram) return null;
    try {
      return tg.initDataUnsafe?.user ?? null;
    } catch {
      return null;
    }
  }, [isTelegram, tg]);

  const themeParams = useMemo(() => {
    if (!isTelegram) return {};
    return tg.themeParams ?? {};
  }, [isTelegram, tg]);

  const haptic = useMemo(() => ({
    impact: (style = 'medium') => tg?.HapticFeedback?.impactOccurred(style),
    notification: (type = 'success') => tg?.HapticFeedback?.notificationOccurred(type),
    selection: () => tg?.HapticFeedback?.selectionChanged(),
  }), [tg]);

  const expand = useCallback(() => tg?.expand(), [tg]);
  const close = useCallback(() => tg?.close(), [tg]);

  return { isTelegram, tg, user, themeParams, haptic, expand, close };
}
