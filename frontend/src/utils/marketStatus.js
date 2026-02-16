import rallyColors from '../theme/rallyColors';

export const MARKET_HOURS = { open: '09:00', close: '12:30' };
export const PRE_MARKET_START = '08:30';
export const MARKET_DAYS = [6, 0, 1, 2, 3]; // Sat-Wed (JS day numbers)

export function getTehranMarketStatus() {
  const now = new Date();
  const tehranTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }),
  );
  const hours = tehranTime.getHours();
  const minutes = tehranTime.getMinutes();
  const day = tehranTime.getDay();
  const timeInMinutes = hours * 60 + minutes;

  const isFriday = day === 5;
  const isThursday = day === 4;

  if (isFriday) {
    return { status: 'closed', label: 'بسته', color: rallyColors.textDimmed };
  }

  const preMarketStart = 8 * 60 + 30;
  const marketOpen = 9 * 60;
  const marketClose = 12 * 60 + 30;

  if (isThursday && timeInMinutes >= marketClose) {
    return { status: 'closed', label: 'بسته', color: rallyColors.textDimmed };
  }

  if (timeInMinutes >= preMarketStart && timeInMinutes < marketOpen) {
    return { status: 'pre-market', label: 'پیش‌گشایش', color: rallyColors.yellow };
  }

  if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
    return { status: 'open', label: 'باز', color: rallyColors.green };
  }

  return { status: 'closed', label: 'بسته', color: rallyColors.textDimmed };
}

export function formatTehranTime() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
