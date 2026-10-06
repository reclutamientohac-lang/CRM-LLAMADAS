import React from 'react';
import {
  Calendar,
  LayoutDashboard,
  Award,
  BarChart3,
  DatabaseBackup,
  Headphones,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { TabId } from '../types';

interface ProximamenteViewProps {
  tabId: TabId;
  onNavigateToProspectos: () => void;
}

const TAB_INFO: Record<
  string,
  {
    title: string;
    subtitle: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    features: string[];
  }
> = {
  trabajo: {
    title: 'Mi Trabajo',
    subtitle: 'Cola de llamadas y seguimiento diario para telemarketing',
    description:
      'En las siguientes etapas, este módulo permitirá a cada agente de telemarketing marcar llamadas en tiempo real, ver la cola de prospectos prioritarios según temperatura y registrar resultados con un solo clic.',
    icon: Headphones,
    features: [
      'Cola inteligente de llamadas según temperatura y antigüedad',
      'Marcación rápida y temporizador de llamada',
      'Registro directo de intentos y contactos efectivos',
      'Botones rápidos para agendar o reagendar',
    ],
  },
  agenda: {
    title: 'Agenda de Citas',
    subtitle: 'Calendario de citas para los vendedores',
    description:
      'Gestión centralizada del calendario de citas agendadas por el equipo de telemarketing para los vendedores en terreno.',
    icon: Calendar,
    features: [
      'Vista mensual, semanal y diaria de citas',
      'Asignación de citas por zona y vendedor disponible',
      'Alertas de confirmación de citas',
      'Sincronización de disponibilidad',
    ],
  },
  dashboard: {
    title: 'Dashboard de Rendimiento',
    subtitle: 'Métricas e indicadores en tiempo real',
    description:
      'Panel ejecutivo con tasas de conversión, citas agendadas, llamadas efectivas por agente y distribución de prospectos.',
    icon: LayoutDashboard,
    features: [
      'Embudo de conversión (Leads ➔ Contactados ➔ Citas)',
      'Productividad por agente de telemarketing',
      'Rendimiento por tipo de prospecto y origen',
      'Monitoreo de leads fríos por reactivar',
    ],
  },
  ventas: {
    title: 'Ventas y Bonos',
    subtitle: 'Liquidación y control de incentivos por citas efectivas',
    description:
      'Cálculo automatizado de bonos para las telemarketings según citas demostradas y ventas cerradas por los emprendedores.',
    icon: Award,
    features: [
      'Tabulador de bonos por cita calificada',
      'Cálculo de comisiones por venta cerrada',
      'Histórico de pagos y bonificaciones por período',
      'Reglas de penalización por citas canceladas',
    ],
  },
  reportes: {
    title: 'Reportes y Analítica',
    subtitle: 'Exportación y reportes detallados del equipo',
    description:
      'Generación de reportes operativos, cumplimiento de metas de llamadas y auditoría de prospectos.',
    icon: BarChart3,
    features: [
      'Reporte consolidado por rango de fechas',
      'Exportación a Excel / CSV',
      'Auditoría de reasignaciones y tiempos de respuesta',
      'Análisis de efectividad de orígenes y campañas',
    ],
  },
  respaldo: {
    title: 'Respaldo y Seguridad',
    subtitle: 'Copias de seguridad e histórico de base de datos',
    description:
      'Descarga periódica de respaldos completos en formato JSON / Excel para resguardo externo de los datos.',
    icon: DatabaseBackup,
    features: [
      'Descarga manual de respaldo completo',
      'Historial de auditoría y cambios del sistema',
      'Restauración de copias previas',
      'Políticas de retención y archivo de leads antiguos',
    ],
  },
};

export const ProximamenteView: React.FC<ProximamenteViewProps> = ({
  tabId,
  onNavigateToProspectos,
}) => {
  const info = TAB_INFO[tabId] || {
    title: 'Módulo en Construcción',
    subtitle: 'Próximamente disponible',
    description: 'Este módulo se habilitará en las siguientes etapas del CRM LLAMADAS.',
    icon: Clock,
    features: [],
  };

  const IconComponent = info.icon;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 sm:p-12 text-center relative overflow-hidden">
        {/* Glow decorative background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#B8922A]/10 blur-3xl pointer-events-none rounded-full" />

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0D2240] text-[#B8922A] shadow-md shadow-slate-900/10 mb-6">
          <IconComponent className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8922A]/15 text-[#9a781f] border border-[#B8922A]/30 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Etapa 1: Módulo reservado</span>
        </div>

        <h1 className="text-3xl font-extrabold text-[#0D2240] tracking-tight mb-2">
          {info.title}
        </h1>
        <p className="text-lg font-medium text-slate-600 mb-6">{info.subtitle}</p>

        <p className="text-slate-500 max-w-2xl mx-auto text-base leading-relaxed mb-8">
          {info.description}
        </p>

        {info.features.length > 0 && (
          <div className="bg-[#F7F8FA] rounded-xl p-6 max-w-xl mx-auto text-left border border-slate-200/70 mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Funcionalidades que se integrarán aquí:
            </h3>
            <ul className="space-y-2.5">
              {info.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0D2240]/10 text-[#0D2240] font-bold text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onNavigateToProspectos}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0D2240] hover:bg-[#163665] text-white font-semibold text-sm shadow-md transition-colors cursor-pointer"
          >
            <span>Ir a la lista de Prospectos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
