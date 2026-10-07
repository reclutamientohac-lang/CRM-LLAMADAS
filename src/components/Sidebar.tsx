import React from 'react';
import {
  Users,
  UserPlus,
  Settings,
  Calendar,
  LayoutDashboard,
  Award,
  BarChart3,
  DatabaseBackup,
  Headphones,
  LogOut,
  ShieldCheck,
  Headset,
  X,
  PhoneCall,
} from 'lucide-react';
import { canAccessTab } from '../accessPolicy';
import { TabId } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  prospectosCount: number;
  seguimientosCount?: number;
  citasCount?: number;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeInStage1: boolean;
  supervisorOnly?: boolean;
  adminOnly?: boolean;
  badge?: number | string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  prospectosCount,
  seguimientosCount = 0,
  citasCount = 0,
}) => {
  const { userProfile, isSupervisor, isAdmin, telemarketingAgent, logout } = useAuth();

  const navItems: NavItem[] = [
    {
      id: 'trabajo',
      label: 'Mi Trabajo',
      icon: Headphones,
      activeInStage1: true,
      badge: seguimientosCount > 0 ? seguimientosCount : undefined,
    },
    {
      id: 'prospectos',
      label: 'Prospectos',
      icon: Users,
      activeInStage1: true,
      badge: prospectosCount > 0 ? prospectosCount : undefined,
    },
    {
      id: 'cargar',
      label: 'Cargar prospectos',
      icon: UserPlus,
      activeInStage1: true,
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      activeInStage1: true,
      badge: citasCount > 0 ? citasCount : undefined,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      activeInStage1: true,
    },
    {
      id: 'ventas',
      label: 'Ventas / Bonos',
      icon: Award,
      activeInStage1: true,
      supervisorOnly: true,
    },
    {
      id: 'individual',
      label: 'Reporte individual',
      icon: BarChart3,
      activeInStage1: true,
    },
    {
      id: 'reportes', label: 'Resumen de gestión', icon: BarChart3, activeInStage1: true,
    },
    {
      id: 'respaldo',
      label: 'Respaldo',
      icon: DatabaseBackup,
      activeInStage1: true,
      adminOnly: true,
    },
    { id: 'accesos', label: 'Usuarios y accesos', icon: ShieldCheck, activeInStage1: true, adminOnly: true },
    {
      id: 'configuracion',
      label: 'Configuración',
      icon: Settings,
      activeInStage1: true,
      supervisorOnly: true,
    },
  ];

  const handleNavClick = (tabId: TabId) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#0D2240] text-slate-200 select-none">
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B8922A] to-[#d4a938] flex items-center justify-center text-[#0D2240] shadow-md font-extrabold text-lg">
            <PhoneCall className="w-5 h-5 text-[#0D2240]" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wide text-white flex items-center gap-1.5">
              <span>CRM</span>
              <span className="text-[#B8922A]">LLAMADAS</span>
            </h1>
            <p className="text-[11px] text-slate-300 font-medium tracking-tight">
              Telemarketing & Citas
            </p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          aria-label="Cerrar menú"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Role / User Mini Banner */}
      <div className="px-5 py-4 bg-[#08162b] border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#B8922A] shrink-0 font-bold text-xs uppercase">
              {userProfile?.displayName ? userProfile.displayName.slice(0, 2) : 'US'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {userProfile?.displayName || userProfile?.email || 'Usuario'}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                {isSupervisor ? (
                  <span className="inline-flex items-center gap-1 text-[#B8922A] font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Administrador</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
                    <Headset className="w-3 h-3" />
                    <span>Telemarketing: {telemarketingAgent || 'Sin Vincular'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Navegación Principal
        </div>
        {navItems.map((item) => {
          // If supervisorOnly and not supervisor, hide or disable
          if (!canAccessTab(item.id, isAdmin)) {
            return null;
          }

          const isSelected = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-[#B8922A] to-[#caa435] text-[#0D2240] font-bold shadow-md shadow-amber-950/20'
                  : item.activeInStage1
                  ? 'text-slate-200 hover:bg-white/10 hover:text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 opacity-80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isSelected ? 'text-[#0D2240]' : item.activeInStage1 ? 'text-[#B8922A]' : 'text-slate-400'
                  }`}
                />
                <span className="text-left">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {!item.activeInStage1 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isSelected
                        ? 'bg-[#0D2240]/20 text-[#0D2240]'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    Próx.
                  </span>
                )}
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? 'bg-[#0D2240] text-[#B8922A]'
                        : 'bg-[#B8922A] text-[#0D2240]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Area */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="text-[11px] text-slate-400 px-2 flex justify-between items-center">
          <span>Etapas 7 y 8 / Sistema Activo</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 z-30 shadow-xl border-r border-slate-200/50">
        {navContent}
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile slide-over drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </div>
    </>
  );
};
