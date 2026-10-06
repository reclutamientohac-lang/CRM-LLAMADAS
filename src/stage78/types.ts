import type { Prospecto, Gestion, Cita, Venta, Retroalimentacion } from '../types';
export type Dimension = 'propietario'|'fecha'|'telemarketing'|'tipoProspecto'|'origen'|'ciudadZona'|'estado'|'temperatura'|'idLote'|'estadoCita';
export type Measure = 'prospectos'|'asignados'|'sinAsignar'|'contactados'|'contactos'|'efectivos'|'citas'|'realizadas'|'pendientes'|'ventas'|'monto'|'bonoGenerado'|'bonoPagable'|'pctContactados'|'pctEfectividad'|'pctCita'|'pctVenta';
export interface ReportFilters { desde:string; hasta:string; base:'fechaRecepcion'|'fechaProspeccion'|'fechaHora'|'fechaCreacion'|'fechaCita'; enfoque:'Actividad'|'Cohorte'; periodo:'día'|'semana'|'mes'; values:Partial<Record<Dimension,string[]>> }
export interface ReportData { prospectos:Prospecto[]; gestiones:Gestion[]; citas:Cita[]; ventas:Venta[]; retroalimentaciones:Retroalimentacion[] }
export interface ReportRow { key:string; groups:string[]; metrics:Record<Measure,number>; ids:{prospectos:string[];gestiones:string[];citas:string[];ventas:string[]} }
export interface ReportResult { rows:ReportRow[]; total:ReportRow; data:ReportData }
export interface BackupRecord { id:string; data:Record<string,any>; types?:Record<string,string> }
export interface BackupFile { app:'CRM LLAMADAS'; version:1; fecha:string; usuario:string; collections:Record<string,BackupRecord[]>; hash?:string; lecturaInicio?:string; lecturaFin?:string }
export interface Progress { message:string; done:number; total:number }
