import React from 'react';
import {
  Users,
  Columns3,
  UserPlus,
  Settings,
  Calendar,
  LogOut,
  Award,
  PhoneCall,
  Headset,
  FileText,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TabId } from '../types';
import { canAccessTab } from '../accessPolicy';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}) => {
  const { userProfile, isSupervisor, isAdmin, telemarketingAgent, logout } = useAuth();

  const navItems = [
    { id: 'pipeline' as TabId, label: 'Pipeline', icon: Columns3 },
    { id: 'trabajo' as TabId, label: 'Mi Trabajo', icon: Headset },
    { id: 'prospectos' as TabId, label: 'Prospectos', icon: Users },
    { id: 'cargar' as TabId, label: 'Cargar Prospectos', icon: UserPlus },
    { id: 'agenda' as TabId, label: 'Agenda', icon: Calendar },
    { id: 'ventas' as TabId, label: 'Ventas y Bonos', icon: Award },
    { id: 'reporteIndividual' as TabId, label: 'Reporte', icon: FileText },
    { id: 'consulta' as TabId, label: 'Consulta', icon: Search },
    { id: 'accesos' as TabId, label: 'Accesos', icon: ShieldCheck },
    { id: 'configuracion' as TabId, label: 'Configuración', icon: Settings },
  ].filter((item) => canAccessTab(item.id, userProfile?.role, isAdmin));

  const content = (
    <aside className="w-64 bg-[#0D2240] text-slate-200 flex flex-col h-full border-r border-[#153460]">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#153460] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B8922A] to-[#d4a938] flex items-center justify-center text-[#0D2240] font-black shadow-lg">
          <PhoneCall className="w-5 h-5 text-[#0D2240]" />
        </div>
        <div>
          <h1 className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5">
            <span>CRM</span>
            <span className="text-[#B8922A]">LLAMADAS</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Telemarketing & Citas</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-[#B8922A] text-[#0D2240] shadow-md shadow-[#B8922A]/20'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#0D2240]' : 'text-[#B8922A]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-[#153460] space-y-3">
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xs font-bold text-white truncate">
            {userProfile?.displayName || 'Usuario'}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {isAdmin ? 'Administrador' : userProfile?.role}
            {telemarketingAgent && ` · ${telemarketingAgent}`}
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block h-screen sticky top-0 shrink-0">{content}</div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-[#0D2240] z-10 shadow-2xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
