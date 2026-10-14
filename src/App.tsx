import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Sidebar } from './components/Sidebar';
import { PipelineView } from './components/PipelineView';
import { AuthView } from './components/AuthView';
import { TabId, Prospecto } from './types';
import { canAccessTab, getDefaultTabForRole } from './accessPolicy';
import { Menu, Clock, PhoneCall } from 'lucide-react';
import { testConnection } from './firebase';

function MainLayout() {
  const { user, userProfile, loading: authLoading, isAdmin, isAuthorized, telemarketingAgent } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabId>('pipeline');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentTimeLA, setCurrentTimeLA] = useState('');
  const [drawerProspecto, setDrawerProspecto] = useState<Prospecto | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      try {
        const str = new Intl.DateTimeFormat('es-MX', {
          timeZone: 'America/Los_Angeles',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        }).format(new Date());
        setCurrentTimeLA(str);
      } catch {
        setCurrentTimeLA('');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!canAccessTab(currentTab, userProfile?.role, isAdmin)) {
      setCurrentTab(getDefaultTabForRole(userProfile?.role, isAdmin));
    }
  }, [isAdmin, userProfile?.role, currentTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-[#0D2240] border-t-[#B8922A] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Iniciando CRM LLAMADAS...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <AuthView />;
  }

  const getTabTitle = (tab: TabId) => {
    switch (tab) {
      case 'pipeline':
        return 'Pipeline de contactos';
      case 'trabajo':
        return 'Mi Trabajo (Telemarketing)';
      case 'prospectos':
        return 'Prospectos';
      case 'cargar':
        return 'Cargar Prospectos';
      case 'agenda':
        return 'Agenda de Citas';
      case 'ventas':
        return 'Ventas y Bonos';
      case 'reporteIndividual':
        return 'Reporte Individual';
      case 'consulta':
        return 'Consulta de Prospectos';
      case 'accesos':
        return 'Control de Accesos';
      case 'configuracion':
        return 'Configuración del Sistema';
      default:
        return 'CRM LLAMADAS';
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F7F8FA]">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-extrabold text-[#0D2240] truncate">
              {getTabTitle(currentTab)}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {currentTimeLA && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-[#B8922A]" />
                <span>LA: {currentTimeLA}</span>
              </div>
            )}
            <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
              {userProfile?.displayName || user.email}
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'pipeline' && (
            <PipelineView onOpenProspecto={(p) => setDrawerProspecto(p)} />
          )}
          {currentTab !== 'pipeline' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <h3 className="font-bold text-[#0D2240] text-lg">{getTabTitle(currentTab)}</h3>
              <p className="text-sm text-slate-500">Módulo activo en el sistema.</p>
            </div>
          )}
        </main>
      </div>

      {drawerProspecto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setDrawerProspecto(null)} />
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-4">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0D2240]">{drawerProspecto.nombre}</h3>
                <p className="text-xs text-slate-500">{drawerProspecto.telefono}</p>
              </div>
              <button
                onClick={() => setDrawerProspecto(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <p><strong className="text-slate-700">Telemarketing:</strong> {drawerProspecto.telemarketing || 'Sin asignar'}</p>
              <p><strong className="text-slate-700">Propietario:</strong> {drawerProspecto.propietario || 'Sin propietario'}</p>
              <p><strong className="text-slate-700">Ciudad/Zona:</strong> {drawerProspecto.ciudadZona || 'Sin ubicación'}</p>
              <p><strong className="text-slate-700">Intentos:</strong> {drawerProspecto.intentos || 0}</p>
              <p><strong className="text-slate-700">Estado:</strong> {drawerProspecto.estado}</p>
              {drawerProspecto.notas && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <strong className="block text-xs text-slate-600 mb-1">Notas:</strong>
                  <p className="text-xs text-slate-700">{drawerProspecto.notas}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CRMProvider>
        <MainLayout />
      </CRMProvider>
    </AuthProvider>
  );
}
