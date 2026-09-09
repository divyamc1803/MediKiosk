import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

interface HomeButtonProps {
  className?: string;
  label?: string;
  to?: string;
}

export function HomeButton({ className = '', label, to = '/' }: HomeButtonProps) {
  const { t } = useTranslation();
  const text = label ? t(label) : t('nav.back_to_home', 'Back to Homepage');

  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 shadow-sm transition-all hover:text-teal-600 ${className}`}
      title={t('nav.back_to_home', 'Return to Homepage')}
    >
      <span>🏠</span>
      <span>{text}</span>
    </Link>
  );
}
