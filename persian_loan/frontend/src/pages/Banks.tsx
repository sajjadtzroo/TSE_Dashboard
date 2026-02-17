/**
 * Banks Page
 */

import { BanksList } from '../features/banks';

export default function Banks() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">بانک‌ها</h2>
      <BanksList />
    </div>
  );
}
