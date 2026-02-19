/**
 * Password strength scoring and requirement checking utilities.
 * Shared between RegisterPage and ProfilePage.
 */

export function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export const STRENGTH_COLORS = ['red', 'orange', 'yellow', 'lime', 'green'];
export const STRENGTH_LABELS = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'خوب', 'عالی'];

export const PASSWORD_REQUIREMENTS = [
  { label: 'حداقل ۸ کاراکتر', test: (pw) => pw.length >= 8 },
  { label: 'حروف بزرگ و کوچک', test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: 'شامل عدد', test: (pw) => /\d/.test(pw) },
  { label: 'شامل کاراکتر خاص', test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];
