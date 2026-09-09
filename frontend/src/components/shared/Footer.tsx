import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-950 text-gray-400 border-t border-gray-800 mt-12 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Responsive Grid: 1 col on mobile, 2 on tablet, 4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          
          {/* Column 1: Brand & Emergency Hotline */}
          <div className="space-y-4">
            <Link to="/patient" className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-black text-sm text-white shadow-sm">
                M
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">MediKiosk</span>
            </Link>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              AI-driven digital health intake, adaptive case taking, medical records digitization, and synchronized emergency ambulance dispatch for Indian healthcare.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-2 bg-red-950/80 border border-red-800/80 text-red-300 text-xs font-bold px-3 py-1.5 rounded-xl">
                <span>🚑</span> {t('nav.emergency', 'Emergency')} Hotline: 108 / 112
              </span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-3 sm:mb-4">
              {t('common.quick_links', 'Quick Navigation')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/patient" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <span>🏠</span> {t('nav.home', 'Home')}
                </Link>
              </li>
              <li>
                <Link to="/patient/history" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <span>📋</span> {t('nav.history', 'Health History')}
                </Link>
              </li>
              <li>
                <Link to="/patient/documents" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <span>📄</span> {t('nav.documents', 'Medical Documents')}
                </Link>
              </li>
              <li>
                <Link to="/patient/clinics" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <span>🏥</span> {t('nav.clinics', 'Nearby Care')}
                </Link>
              </li>
              <li>
                <Link to="/patient/profile" className="hover:text-emerald-400 transition-colors flex items-center gap-2">
                  <span>👤</span> {t('nav.profile', 'Patient Profile')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Emergency & Ambulance Network */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-3 sm:mb-4">
              {t('ambulance.network_title', 'Emergency Services')}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/patient/ambulance" className="text-red-400 hover:text-red-300 font-semibold transition-colors flex items-center gap-2">
                  <span>🚨</span> {t('ambulance.request_btn', 'Request Ambulance')}
                </Link>
              </li>
              <li>
                <span className="text-gray-400 flex items-center gap-2">
                  <span>📍</span> Jaipur City Hub (SMS, Fortis)
                </span>
              </li>
              <li>
                <span className="text-gray-400 flex items-center gap-2">
                  <span>🛣️</span> OSRM Road Network Routing
                </span>
              </li>
              <li>
                <Link to="/demo" className="text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-2">
                  <span>⚡</span> {t('nav.switch_account', 'Switch Demo Account')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Compliance, Standards & Privacy */}
          <div className="space-y-3">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-3 sm:mb-4">
              Compliance & Safety
            </h4>
            <div className="space-y-2 text-xs text-gray-400">
              <p className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> ABDM Health Data Exchange Ready
              </p>
              <p className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> DPDP Act 2023 Architecture
              </p>
              <p className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Role-Based Clinical Access (RBAC)
              </p>
              <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-800/80">
                Designed for high-throughput OPD triage and acute emergency navigation.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Copyright & Status Bar */}
        <div className="mt-10 sm:mt-12 pt-6 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p className="text-center sm:text-left">
            © 2026 MediKiosk Platform. Smart Hospital Kiosk & Ambulance Dispatch System.
          </p>
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-400 font-semibold">Jaipur Healthcare Grid Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
