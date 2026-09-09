import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '../../hooks/useTranslation';

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Close menus on route change or Escape key
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { to: '/patient', label: t('nav.home', 'Home'), icon: '🏠' },
    { to: '/patient/history', label: t('nav.history', 'Health History'), icon: '📋' },
    { to: '/patient/documents', label: t('nav.documents', 'Documents'), icon: '📄' },
    { to: '/patient/ambulance', label: t('nav.ambulance', 'Ambulance'), icon: '🚑' },
    { to: '/patient/profile', label: t('nav.profile', 'Profile'), icon: '👤' },
    { to: '/patient/clinics', label: t('nav.clinics', 'Nearby Care'), icon: '🏥' },
  ];

  return (
    <>
      {/* Main Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 w-full shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/patient" className="flex items-center gap-2 group min-h-[44px]">
                <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm group-hover:bg-emerald-700 transition-colors">
                  M
                </div>
                <span className="font-black text-gray-900 text-lg tracking-tight">MediKiosk</span>
              </Link>
            </div>

            {/* Desktop Navigation Links (>= 1024px) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Desktop Navigation">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Language Selector */}
              <div className="hidden sm:block">
                <LanguageSelector />
              </div>
              <div className="sm:hidden">
                <LanguageSelector compact />
              </div>

              {/* Emergency Button - Always accessible */}
              <Link
                to="/patient/ambulance"
                aria-label="Emergency Ambulance Request"
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-colors flex items-center gap-1 shadow-sm shrink-0 min-h-[40px] sm:min-h-[44px]"
              >
                <span>🚑</span>
                <span className="hidden xs:inline sm:inline">{t('nav.emergency', 'Emergency')}</span>
              </Link>

              {/* Desktop Profile Avatar & Dropdown */}
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  aria-expanded={profileDropdownOpen}
                  aria-label="User profile menu"
                  className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 flex items-center justify-center font-bold text-sm border-2 border-emerald-300 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px] min-w-[44px]"
                >
                  {user?.full_name?.charAt(0) || 'U'}
                </button>

                {profileDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95"
                  >
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{user?.full_name}</p>
                      <p className="text-xs text-gray-500 truncate [overflow-wrap:anywhere]">{user?.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                        {user?.role || 'PATIENT'}
                      </span>
                    </div>
                    <Link
                      to="/patient/profile"
                      role="menuitem"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 font-medium transition-colors"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <span>👤</span> {t('nav.profile', 'Patient Profile')}
                    </Link>
                    <Link
                      to="/demo"
                      role="menuitem"
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-teal-700 hover:bg-teal-50 font-bold transition-colors"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      <span>⚡</span> {t('nav.switch_account', 'Switch Demo Account')}
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          logout();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors"
                      >
                        <span>⎋</span> {t('nav.logout', 'Logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Button (< 1024px) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                className="lg:hidden p-2 rounded-xl text-gray-700 hover:text-emerald-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center text-xl font-bold"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu */}
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    M
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm text-gray-900 leading-tight">MediKiosk</h2>
                    <p className="text-[10px] text-emerald-700 font-semibold">Patient Navigation</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              {/* User Identity Chip inside drawer */}
              {user && (
                <div className="p-4 border-b border-gray-100 bg-gray-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-base border border-emerald-300 shrink-0">
                      {user.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate [overflow-wrap:anywhere]">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="p-3 space-y-1" aria-label="Mobile Navigation Drawer">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-colors min-h-[48px] ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Language Selector Section inside Drawer */}
              <div className="p-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Language / भाषा
                </p>
                <LanguageSelector className="w-full text-sm font-bold bg-gray-50 border border-gray-300 text-gray-900 rounded-xl px-3 py-2.5 cursor-pointer" />
              </div>
            </div>

            {/* Bottom Drawer Actions */}
            <div className="p-4 border-t border-gray-100 space-y-2 bg-gray-50/50">
              <Link
                to="/patient/ambulance"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm min-h-[48px]"
              >
                <span>🚑</span>
                <span>{t('nav.emergency', 'Emergency Ambulance')}</span>
              </Link>

              <Link
                to="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full bg-teal-50 hover:bg-teal-100 text-teal-800 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-teal-200 min-h-[44px]"
              >
                <span>⚡</span>
                <span>{t('nav.switch_account', 'Switch Demo Account')}</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-red-600 hover:bg-red-50 py-2 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-red-200 transition-colors min-h-[44px]"
              >
                <span>⎋</span>
                <span>{t('nav.logout', 'Logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DoctorSidebar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close mobile drawer on route change or Escape
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const doctorLinks = [
    { to: '/doctor', label: t('nav.dashboard', 'Dashboard'), icon: '📊' },
    { to: '/doctor/queue', label: t('nav.queue', "Today's Queue"), icon: '👥' },
    { to: '/doctor/alerts', label: t('nav.alerts', 'Emergency Alerts'), icon: '🚨' },
  ];

  return (
    <>
      {/* Mobile Doctor Top Header (< 768px) */}
      <div className="md:hidden bg-gray-900 text-white border-b border-gray-800 p-3 px-4 sticky top-0 z-30 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 min-h-[44px]">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-sm">
            M
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight text-white leading-tight">MediKiosk</h1>
            <p className="text-[10px] text-teal-400 font-semibold">Doctor Clinical Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSelector compact className="text-xs font-bold bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-2 py-1.5" />
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            aria-label={mobileDrawerOpen ? 'Close doctor menu' : 'Open doctor navigation menu'}
            aria-expanded={mobileDrawerOpen}
            className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center text-xl font-bold"
          >
            {mobileDrawerOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Slide-out for Doctor (< 768px) */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-xs bg-gray-900 text-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-gray-800">
            <div>
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-bold text-sm text-white">
                    M
                  </div>
                  <div>
                    <h2 className="font-black text-sm">MediKiosk Doctor</h2>
                    <p className="text-[10px] text-teal-400">Jaipur OPD Division</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close menu"
                  className="p-2 text-gray-400 hover:text-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Links inside Mobile Drawer */}
              <nav className="p-3 space-y-1.5" aria-label="Mobile Doctor Navigation">
                {doctorLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-colors min-h-[48px] ${
                        isActive
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <span className="text-xl">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Language Selector Section */}
              <div className="p-4 border-t border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Language / भाषा
                </p>
                <LanguageSelector className="w-full text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-3 py-2.5" />
              </div>
            </div>

            {/* Doctor Profile Block at Bottom of Mobile Drawer */}
            <div className="p-4 border-t border-gray-800 bg-gray-950 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold border border-teal-500/30 shrink-0">
                  {user?.full_name?.charAt(0) || 'D'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user?.full_name || 'Dr. Sneha Reddy'}</p>
                  <p className="text-xs text-teal-400 font-semibold">Doctor • OPD</p>
                  <p className="text-[11px] text-gray-400 truncate [overflow-wrap:anywhere]">{user?.email || 'sneha@demo.com'}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Link
                  to="/demo"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex-1 text-center py-2 px-3 bg-gray-800 hover:bg-gray-700 text-teal-400 text-xs font-bold rounded-xl border border-gray-700 min-h-[40px] flex items-center justify-center"
                >
                  ⚡ Switch Demo
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileDrawerOpen(false);
                  }}
                  className="py-2 px-3 bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-bold rounded-xl border border-red-800 min-h-[40px] flex items-center justify-center gap-1"
                >
                  <span>⎋</span> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar (>= 768px) */}
      <aside
        aria-label="Doctor Portal Sidebar"
        className={`hidden md:flex bg-gray-900 text-white min-h-screen transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        } shrink-0 relative flex-col justify-between border-r border-gray-800`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-sm">
                  M
                </div>
                <span className="font-bold tracking-tight text-base">MediKiosk</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>

          {!collapsed && (
            <div className="mb-5 px-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1.5">
                Language / भाषा
              </div>
              <LanguageSelector className="text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-200 rounded-xl px-2.5 py-2 cursor-pointer w-full" />
            </div>
          )}

          <nav className="space-y-1.5" aria-label="Doctor Navigation Links">
            {doctorLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-xl shrink-0">{link.icon}</span>
                  {!collapsed && <span className="truncate">{link.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Doctor Profile Info at Bottom of Sidebar */}
        {!collapsed ? (
          <div className="p-4 border-t border-gray-800 bg-gray-900/90">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-sm font-bold border border-teal-500/30 shrink-0">
                {user?.full_name?.charAt(0) || 'D'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white">{user?.full_name || 'Dr. Sneha Reddy'}</p>
                <p className="text-xs text-gray-400 truncate [overflow-wrap:anywhere]">{user?.email || 'sneha@demo.com'}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-gray-400 hover:text-red-400 p-2 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                title={t('nav.logout', 'Logout')}
                aria-label="Logout"
              >
                ⎋
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 border-t border-gray-800 flex justify-center">
            <button
              type="button"
              onClick={logout}
              className="text-gray-400 hover:text-red-400 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title={t('nav.logout', 'Logout')}
              aria-label="Logout"
            >
              ⎋
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
