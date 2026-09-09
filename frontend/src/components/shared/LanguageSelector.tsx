import React from 'react';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../hooks/useTranslation';

export function LanguageSelector({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="relative inline-flex items-center">
      <select
        aria-label="Language selector"
        title="Choose language / भाषा चुनें"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className={
          className ||
          `text-xs font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl px-2.5 py-1.5 cursor-pointer transition-colors shadow-sm outline-none min-h-[36px] sm:min-h-[38px] ${
            compact ? 'max-w-[75px] sm:max-w-none text-center font-mono' : ''
          }`
        }
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-white text-gray-900 font-medium">
            {compact ? `${l.code.toUpperCase()} (${l.name})` : l.name}
          </option>
        ))}
      </select>
    </div>
  );
}
