/**
 * Currency Input Component
 * Beautiful input for currency amounts with Persian formatting
 */

import { Banknote } from 'lucide-react';

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
}

export function CurrencyInput({
  label,
  value,
  onChange,
  placeholder = '0',
  helperText,
  required = false,
}: CurrencyInputProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
        {label}
        {required && <span className="text-pink-400">*</span>}
      </label>

      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Banknote className="w-5 h-5 text-gray-400" />
        </div>

        <input
          type="text"
          inputMode="numeric"
          value={value.toLocaleString('en-US')}
          onChange={(e) => {
            const numValue = Number(e.target.value.replace(/,/g, ''));
            if (!isNaN(numValue)) {
              onChange(numValue);
            }
          }}
          placeholder={placeholder}
          className="w-full pr-12 pl-4 py-3 bg-bg-darker border-2 border-border-dark rounded-xl text-gray-100 text-lg
                     placeholder:text-gray-1000 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none
                     transition-all duration-200 hover:border-primary-400/50 hover:bg-bg-dark"
        />

        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          تومان
        </div>
      </div>

      {helperText && (
        <p className="text-xs text-gray-400 mr-1">{helperText}</p>
      )}
    </div>
  );
}

export default CurrencyInput;
