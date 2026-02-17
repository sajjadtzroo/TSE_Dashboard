/**
 * Number Input Component
 * Beautiful input for numeric values
 */

import { Hash } from 'lucide-react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  helperText?: string;
  suffix?: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = '0',
  helperText,
  suffix,
  icon: Icon = Hash,
  required = false,
}: NumberInputProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
        {label}
        {required && <span className="text-pink-400">*</span>}
      </label>

      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>

        <input
          type="number"
          value={value}
          onChange={(e) => {
            const numValue = Number(e.target.value);
            if (!isNaN(numValue)) {
              if ((min === undefined || numValue >= min) && (max === undefined || numValue <= max)) {
                onChange(numValue);
              }
            }
          }}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className={`w-full pr-12 py-3 bg-bg-darker border-2 border-border-dark rounded-xl text-gray-100 text-lg
                     placeholder:text-gray-1000 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none
                     transition-all duration-200 hover:border-primary-400/50 hover:bg-bg-dark
                     ${suffix ? 'pl-16' : 'pl-4'}`}
        />

        {suffix && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {suffix}
          </div>
        )}
      </div>

      {helperText && (
        <p className="text-xs text-gray-400 mr-1">{helperText}</p>
      )}
    </div>
  );
}

export default NumberInput;
