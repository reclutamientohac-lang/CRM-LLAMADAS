import './stage78/style.css';
import { CalendarSync } from './components/CalendarSync';
import { ReportesView } from './components/ReportesView';
import { RespaldoView, BackupBanner } from './components/RespaldoView';
import { ConsultaGlobalView } from './components/ConsultaGlobalView';
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Sidebar } from './components/Sidebar';
import { ProspectosView } from './components/ProspectosView';
import { CargarProspectosView } from './components/CargarProspectosView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { MiTrabajoView } from './components/MiTrabajoView';
import { AgendaView } from './components/AgendaView';
import { RegistrarLlamadaModal } from './components/RegistrarLlamadaModal';
import { RegistrarResultadoCitaModal } from './components/RegistrarResultadoCitaModal';
import { CitaDetailDrawer } from './components/CitaDetailDrawer';
import { ProspectoDetailDrawer } from './components/ProspectoDetailDrawer';
import { EditProspectoModal } from './components/EditProspectoModal';
import { CitasHoyBanner } from './components/CitasHoyBanner';
import { ProximamenteView } from './components/ProximamenteView';
import { AuthView } from './components/AuthView';
import { AccesoNoAutorizadoView } from './components/AccesoNoAutorizadoView';
import { DashboardView } from './components/DashboardView';
import { AccesosView } from './components/AccesosView';
import { VentasBonosView } from './components/VentasBonosView';
import { ReporteIndividualView } from './components/ReporteIndividualView';
import { TabId, Prospecto, Cita } from './types';
import { Menu, Clock, ShieldCheck, Headset, PhoneCall } from 'lucide-react';
import { testConnection } from './firebase';
import { getTodayInLA, isCitaVencidaSinResultado } from './businessRules';

function MainLayout() {
  const {
    user,
    userProfile,
    loading: authLoading,
    isSupervisor,
    isAdmin,
    isAuthorized,
    telemarketingAgent,
  } = useAuth();
  const { prospectos, citas } = useCRM();

  const [currentTab, setCurrentTab] = useState<TabId>('trabajo');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentTimeLA, setCurrentTimeLA] = useState('');

  // Modals for Mi Trabajo, Agenda & App Level
  const [modalLlamadaProspecto, setModalLlamadaProspecto] = useState<Prospecto | null>(null);
  const [drawerProspecto, setDrawerProspecto] = useState<Prospecto | null>(null);
  const [editingProspecto, setEditingProspecto] = useState<Prospecto | null>(null);
  const [selectedCitaDetail, setSelectedCitaDetail] = useState<Cita | null>(null);
  const [modalResultadoCita, setModalResultadoCita] = useState<Cita | null>(null);

  // Test server connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Update Los Angeles clock every minute
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0D2240] flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#B8922A] to-[#d4a938] flex items-center justify-center text-[#0D2240] shadow-xl mb-4 font-black">
          <PhoneCall className="w-7 h-7 text-[#0D2240] animate-bounce" />
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-wide">CRM LLAMADAS</h2>
        <p className="text-xs text-slate-300 mt-1">Iniciando sistema seguro...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  if (!isAuthorized) {
    return <AccesoNoAutorizadoView />;
  }

  // Count follow-ups for today or overdue
  const todayLA = getTodayInLA();
  const seguimientosCount = prospectos.filter(
    (p) =>
      !p.archivado &&
      p.estado === 'Seguimiento programado' &&
      p.fechaProximaAccion &&
      p.fechaProximaAccion <= todayLA &&
      (isSupervisor || !telemarketingAgent || p.telemarketing === telemarketingAgent)
  ).length;

  // Count active appointments for today or overdue pending results
  const citasCount = citas.filter((c) => {
    if (c.estadoCita === 'Cancelada') return false;
    if (!isSupervisor && telemarketingAgent && c.telemarketing !== telemarketingAgent) return false;
    return c.fechaCita === todayLA || isCitaVencidaSinResultado(c, todayLA);
  }).length;

  // Header Title by Tab
  const getTabTitle = (tab: TabId) => {
    switch (tab) {
      case 'trabajo':
        return 'Mi Trabajo (Telemarketing)';
      case 'prospectos':
        return 'Prospectos';
      case 'cargar':
        return 'Cargar Prospectos';
      case 'configuracion':
        return 'Configuración del Sistema';
      case 'agenda':
        return 'Agenda de Citas';
      case 'dashboard':
        return 'Dashboard & Métricas';
      case 'accesos':
        return 'Control de Accesos';
      case 'ventas':
        return 'Ventas / Bonos';
      case 'individual':
        return 'Reporte individual';
      case 'consulta':
        return 'Consulta Global';
      case 'reportes':
        return 'Reportes';
      case 'respaldo':
        return 'Respaldo';
      default:
        return 'CRM LLAMADAS';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Sidebar (Desktop + Mobile) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        prospectosCount={prospectos.filter((p) => !p.archivado).length}
        seguimientosCount={seguimientosCount}
        citasCount={citasCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-[#0D2240] tracking-tight">
                  {getTabTitle(currentTab)}
                </h2>
                <span className="hidden sm:inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#B8922A]/15 text-[#9a781f] border border-[#B8922A]/30">
                  Etapas 7 y 8 · Reportes y Respaldo
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Status Bar */}
          <div className="flex items-center gap-3">
            {/* Los Angeles Time */}
            {currentTimeLA && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-[#B8922A]" />
                <span>LA: {currentTimeLA}</span>
              </div>
            )}

            {/* User Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {userProfile?.displayName || user.email}
                </div>
                <div className="text-[10px] text-slate-500">
                  {isSupervisor ? (
                    <span className="text-[#B8922A] font-bold">Supervisor</span>
                  ) : (
                    <span className="text-sky-600 font-semibold">
                      Agente: {telemarketingAgent || 'Sin asignar'}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-[#0D2240] text-[#B8922A] flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {userProfile?.displayName ? userProfile.displayName.slice(0, 2) : 'US'}
              </div>
            </div>
          </div>
        </header>

        {/* Citas de Hoy Alert Banner & Browser Notifications */}
        <CitasHoyBanner onSelectProspecto={(p) => setDrawerProspecto(p)} />
        <BackupBanner onNavigate={() => setCurrentTab('respaldo')} />
        <CalendarSync showExisting={currentTab === 'agenda'} />

        {/* Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'trabajo' && (
            <MiTrabajoView
              onOpenLlamadaModal={(p) => setModalLlamadaProspecto(p)}
              onOpenDetailDrawer={(p) => setDrawerProspecto(p)}
            />
          )}
          {currentTab === 'prospectos' && <ProspectosView />}
          {currentTab === 'cargar' && <CargarProspectosView />}
          {currentTab === 'agenda' && (
            <AgendaView
              onOpenRegistrarResultado={(c) => setModalResultadoCita(c)}
              onOpenCitaDetail={(c) => setSelectedCitaDetail(c)}
              onOpenProspectoDetail={(p) => setDrawerProspecto(p)}
            />
          )}
          {currentTab === 'dashboard' && (
            <DashboardView
              onOpenProspecto={(p) => setDrawerProspecto(p)}
              onOpenCita={(c) => setSelectedCitaDetail(c)}
            />
          )}
          {currentTab === 'ventas' && (
            <VentasBonosView
              onOpenProspectoDetail={(p) => setDrawerProspecto(p)}
              onOpenCitaDetail={(c) => setSelectedCitaDetail(c)}
            />
          )}
          {currentTab === 'individual' && (
            <ReporteIndividualView
              onOpenProspectoDetail={(p) => setDrawerProspecto(p)}
              onOpenCitaDetail={(c) => setSelectedCitaDetail(c)}
            />
          )}
          {currentTab === 'reportes' && <ReportesView onOpenProspecto={setDrawerProspecto} />}
          {currentTab === 'respaldo' && isAdmin && <RespaldoView onOpenProspecto={setDrawerProspecto} />}
          {currentTab === 'consulta' && isSupervisor && <ConsultaGlobalView onOpenProspecto={setDrawerProspecto} />}
          {currentTab === 'accesos' && <AccesosView />}
          {currentTab === 'configuracion' && <ConfiguracionView />}
          {currentTab !== 'trabajo' &&
            currentTab !== 'prospectos' &&
            currentTab !== 'cargar' &&
            currentTab !== 'agenda' &&
            currentTab !== 'dashboard' &&
            currentTab !== 'ventas' &&
            currentTab !== 'reportes' &&
            currentTab !== 'individual' &&
            currentTab !== 'respaldo' &&
            currentTab !== 'consulta' &&
            currentTab !== 'accesos' &&
            currentTab !== 'configuracion' && (
              <ProximamenteView
                tabId={currentTab}
                onNavigateToProspectos={() => setCurrentTab('prospectos')}
              />
            )}
        </main>
      </div>

      {/* Global Modals for App Layout */}
      {modalLlamadaProspecto && (
        <RegistrarLlamadaModal
          prospecto={modalLlamadaProspecto}
          onClose={() => setModalLlamadaProspecto(null)}
          onSuccess={() => setModalLlamadaProspecto(null)}
        />
      )}

      {selectedCitaDetail && (
        <CitaDetailDrawer
          cita={selectedCitaDetail}
          onClose={() => setSelectedCitaDetail(null)}
          onOpenProspectoDetail={(p) => {
            setSelectedCitaDetail(null);
            setDrawerProspecto(p);
          }}
          onOpenRegistrarResultado={(c) => {
            setSelectedCitaDetail(null);
            setModalResultadoCita(c);
          }}
        />
      )}

      {modalResultadoCita && (
        <RegistrarResultadoCitaModal
          cita={modalResultadoCita}
          onClose={() => setModalResultadoCita(null)}
          onSuccess={() => setModalResultadoCita(null)}
        />
      )}

      {drawerProspecto && (
        <ProspectoDetailDrawer
          prospecto={drawerProspecto}
          onClose={() => setDrawerProspecto(null)}
          onEdit={(p) => {
            setDrawerProspecto(null);
            setEditingProspecto(p);
          }}
          onOpenRegistrarLlamada={(p) => {
            setDrawerProspecto(null);
            setModalLlamadaProspecto(p);
          }}
          onOpenCitaDetail={(c) => {
            setDrawerProspecto(null);
            setSelectedCitaDetail(c);
          }}
        />
      )}

      {editingProspecto && (
        <EditProspectoModal
          prospecto={editingProspecto}
          onClose={() => setEditingProspecto(null)}
          onSaved={() => setEditingProspecto(null)}
        />
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
