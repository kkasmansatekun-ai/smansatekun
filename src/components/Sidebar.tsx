import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cpu,
  Images,
  Network,
  BookOpenCheck,
  Award,
  MonitorCheck,
  ClipboardList,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ChevronDown,
  Server,
  HardDriveDownload,
} from 'lucide-react';
import { MenuKey } from '../types/smansatekun';

export interface NavItemConfig {
  key: MenuKey;
  label: string;
  shortLabel: string;
  parentLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const TOP_NAV_ITEMS: NavItemConfig[] = [
  {
    key: 'galeri',
    label: 'Galeri Dokumentasi',
    shortLabel: 'Galeri Dokumentasi',
    icon: Images,
  },
  {
    key: 'lms',
    label: 'LMS (Learning Management System)',
    shortLabel: 'LMS',
    icon: BookOpenCheck,
  },
  {
    key: 'poin',
    label: 'Poin Murid',
    shortLabel: 'Poin Murid',
    icon: Award,
  },
];

export const LABOR_SUB_ITEMS: NavItemConfig[] = [
  {
    key: 'struktur',
    label: 'Struktur Jabatan',
    shortLabel: 'Struktur Jabatan',
    parentLabel: 'Labor Komputer',
    icon: Network,
  },
  {
    key: 'inventaris',
    label: 'Inventaris Labor Komputer',
    shortLabel: 'Inventaris Labor Komputer',
    parentLabel: 'Labor Komputer',
    icon: MonitorCheck,
  },
  {
    key: 'permintaan',
    label: 'Daftar Permintaan Perangkat',
    shortLabel: 'Daftar Permintaan Perangkat',
    parentLabel: 'Labor Komputer',
    icon: ClipboardList,
  },
];

export const NAV_ITEMS: NavItemConfig[] = [...TOP_NAV_ITEMS, ...LABOR_SUB_ITEMS];

const LABOR_KEYS = new Set<MenuKey>(LABOR_SUB_ITEMS.map((item) => item.key));

interface SidebarProps {
  activeMenu: MenuKey;
  onSelectMenu: (menu: MenuKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenUpload: () => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  onOpenAdminTools: () => void;
}

export function Sidebar({
  activeMenu,
  onSelectMenu,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onOpenUpload,
  isLoggedIn,
  isAdmin,
  onOpenAdminTools,
}: SidebarProps) {
  const isLaborActive = LABOR_KEYS.has(activeMenu);
  const [laborExpanded, setLaborExpanded] = useState<boolean>(true);
  const [compactMenuOpen, setCompactMenuOpen] = useState<boolean>(false);
  const [compactMenuTop, setCompactMenuTop] = useState<number>(220);

  const compactTriggerRef = useRef<HTMLButtonElement>(null);
  const compactFlyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLaborActive) {
      setLaborExpanded(true);
    }
  }, [isLaborActive]);

  useEffect(() => {
    if (!collapsed) {
      setCompactMenuOpen(false);
    }
  }, [collapsed]);

  useEffect(() => {
    if (!compactMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        compactTriggerRef.current?.contains(target) ||
        compactFlyoutRef.current?.contains(target)
      ) {
        return;
      }
      setCompactMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCompactMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [compactMenuOpen]);

  const handleToggleCompactLabor = () => {
    if (!compactMenuOpen && compactTriggerRef.current) {
      const rect = compactTriggerRef.current.getBoundingClientRect();
      setCompactMenuTop(Math.min(rect.top, window.innerHeight - 220));
    }
    setCompactMenuOpen((prev) => !prev);
  };

  const renderNavButton = (
    item: NavItemConfig,
    isMobileDrawer: boolean,
    isCompact: boolean,
    isSubItem = false
  ) => {
    const Icon = item.icon;
    const isActive = activeMenu === item.key;

    return (
      <button
        key={item.key}
        type="button"
        title={isCompact ? item.label : undefined}
        onClick={() => {
          onSelectMenu(item.key);
          setCompactMenuOpen(false);
          if (isMobileDrawer) onCloseMobile();
        }}
        className={`group relative w-full flex items-center ${
          isCompact
            ? 'justify-center px-2 py-2.5'
            : isSubItem
            ? 'gap-2.5 pl-3 pr-3 py-2 text-[13px]'
            : 'gap-3 px-3.5 py-2.5 text-sm'
        } rounded-xl text-left font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          isActive
            ? 'text-white'
            : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        {isActive && (
          <motion.span
            layoutId={isMobileDrawer ? 'activeNavMobile' : 'activeNavDesktop'}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="absolute inset-0 rounded-xl bg-[#0284C7] shadow-[0_6px_18px_rgba(2,132,199,0.38)]"
          />
        )}
        <Icon
          className={`relative z-10 ${
            isSubItem && !isCompact ? 'w-4 h-4' : 'w-[18px] h-[18px]'
          } shrink-0 transition-transform duration-150 group-hover:scale-105 ${
            isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-300'
          }`}
        />
        {!isCompact && (
          <span className="relative z-10 leading-snug line-clamp-2">{item.label}</span>
        )}
      </button>
    );
  };

  const renderSidebarContent = (isMobileDrawer: boolean) => {
    const isCompact = !isMobileDrawer && collapsed;

    return (
      <div className="flex h-full flex-col bg-[#0F172A] text-slate-200 border-r border-slate-800">
        {/* Identitas Sidebar */}
        <div
          className={`flex items-center ${
            isCompact ? 'justify-center px-3' : 'justify-between px-5'
          } h-16 border-b border-white/10 shrink-0`}
        >
          <button
            type="button"
            onClick={() => {
              onSelectMenu('galeri');
              setCompactMenuOpen(false);
              if (isMobileDrawer) onCloseMobile();
            }}
            className="flex items-center gap-3 min-w-0 text-left focus-visible:outline-none"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0284C7] shadow-md shadow-sky-950/60 shrink-0">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            {!isCompact && (
              <span className="block text-base font-bold tracking-tight text-white truncate">
                SMANSATEKUN
              </span>
            )}
          </button>

          {isMobileDrawer ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Tutup menu samping"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            !isCompact && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title="Perkecil Sidebar"
                aria-label="Perkecil Sidebar"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Tombol Perluas saat Sidebar Ringkas */}
        {!isMobileDrawer && isCompact && (
          <div className="flex justify-center pt-3">
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Perluas Sidebar"
              aria-label="Perluas Sidebar"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Daftar Menu Utama & Dropdown Labor Komputer */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1.5" aria-label="Menu Utama">
          {!isCompact && (
            <p className="px-3 pb-2 text-xs font-medium text-slate-400">Navigasi</p>
          )}

          {TOP_NAV_ITEMS.map((item) => renderNavButton(item, isMobileDrawer, isCompact))}

          {/* Menu Induk Dropdown: Labor Komputer */}
          <div className="pt-1">
            {isCompact ? (
              <button
                ref={compactTriggerRef}
                type="button"
                title="Labor Komputer"
                aria-label="Buka dropdown Labor Komputer"
                aria-haspopup="menu"
                aria-expanded={compactMenuOpen}
                onClick={handleToggleCompactLabor}
                className={`relative w-full flex items-center justify-center px-2 py-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isLaborActive || compactMenuOpen
                    ? 'bg-[#0284C7] text-white shadow-[0_6px_18px_rgba(2,132,199,0.38)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Server className="w-[18px] h-[18px]" />
                <ChevronDown
                  className={`w-3 h-3 absolute right-1.5 bottom-1.5 transition-transform duration-200 ${
                    compactMenuOpen ? '-rotate-90' : ''
                  }`}
                />
              </button>
            ) : (
              <div>
                <button
                  type="button"
                  aria-expanded={laborExpanded}
                  aria-controls={isMobileDrawer ? 'labor-dropdown-mobile' : 'labor-dropdown-desktop'}
                  onClick={() => setLaborExpanded((prev) => !prev)}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isLaborActive
                      ? 'bg-white/[0.09] text-white'
                      : 'text-slate-200 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Server
                      className={`w-[18px] h-[18px] shrink-0 ${
                        isLaborActive ? 'text-sky-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate font-semibold">Labor Komputer</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {isLaborActive && !laborExpanded && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-sky-400"
                        aria-hidden="true"
                      />
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        laborExpanded ? 'rotate-180 text-sky-300' : ''
                      }`}
                    />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {laborExpanded && (
                    <motion.div
                      id={isMobileDrawer ? 'labor-dropdown-mobile' : 'labor-dropdown-desktop'}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1.5 ml-4 pl-3 border-l border-white/15 space-y-1">
                        {LABOR_SUB_ITEMS.map((sub) =>
                          renderNavButton(sub, isMobileDrawer, false, true)
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </nav>

        {/* Pemisah Visual & Menu Khusus Pengguna Login (Upload Dokumentasi & Admin Tools) */}
        {(isLoggedIn || isAdmin) && (
          <div className="mt-auto p-3 border-t border-white/10 shrink-0 space-y-2">
            {isAdmin && (
              <button
                type="button"
                title={isCompact ? 'Admin: Backup & ZIP' : undefined}
                onClick={() => {
                  onOpenAdminTools();
                  setCompactMenuOpen(false);
                  if (isMobileDrawer) onCloseMobile();
                }}
                className={`group w-full flex items-center justify-center ${
                  isCompact ? 'p-3' : 'gap-2.5 px-4 py-2.5'
                } rounded-xl bg-white/[0.07] border border-white/15 text-slate-200 hover:bg-white/15 hover:text-white text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
              >
                <HardDriveDownload className="w-4 h-4 text-sky-400 shrink-0" />
                {!isCompact && <span className="whitespace-nowrap">Backup & ZIP Kode</span>}
              </button>
            )}

            {isLoggedIn && (
              <button
                type="button"
                title={isCompact ? 'Upload Dokumentasi' : undefined}
                onClick={() => {
                  onOpenUpload();
                  setCompactMenuOpen(false);
                  if (isMobileDrawer) onCloseMobile();
                }}
                className={`group w-full flex items-center justify-center ${
                  isCompact ? 'p-3' : 'gap-2.5 px-4 py-3'
                } rounded-xl bg-[#0284C7]/15 border border-[#0284C7]/45 text-sky-200 hover:bg-[#0284C7] hover:text-white hover:border-[#0284C7] text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
              >
                <Upload className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:-translate-y-0.5" />
                {!isCompact && <span className="whitespace-nowrap">Upload Dokumentasi</span>}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[78px]' : 'w-[276px]'
        } sticky top-0 h-screen z-30`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Dropdown Melayang untuk Menu Labor Komputer saat Sidebar Desktop Ringkas */}
      <AnimatePresence>
        {collapsed && compactMenuOpen && (
          <motion.div
            ref={compactFlyoutRef}
            role="menu"
            aria-label="Sub-menu Labor Komputer"
            initial={{ opacity: 0, x: -6, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ top: compactMenuTop }}
            className="hidden lg:block fixed left-[86px] z-50 w-64 rounded-2xl bg-[#0F172A] border border-slate-700/80 shadow-2xl p-2 text-slate-200"
          >
            <div className="flex items-center gap-2 px-3 py-2 mb-1 border-b border-white/10">
              <Server className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs font-semibold text-white">Labor Komputer</span>
            </div>
            <div className="space-y-1">
              {LABOR_SUB_ITEMS.map((sub) => {
                const Icon = sub.icon;
                const isActive = activeMenu === sub.key;
                return (
                  <button
                    key={sub.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectMenu(sub.key);
                      setCompactMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-[#0284C7] text-white'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span className="leading-snug">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-[284px] max-w-[85vw] h-full"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
