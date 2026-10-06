import type { BackupFile, BackupRecord } from './types';
export interface MigrationPackage {
 formato:'CRM LLAMADAS - PAQUETE DE MIGRACION';version:1;idLote:string;fecha:string;zonaHoraria:'America/Los_Angeles';
 colecciones:Record<string,Record<string,any>[]>;pendientesAgenda?:any[];pendientesProspectos?:any[];incidencias?:any[];conteos?:Record<string,number>;
}
export interface MigrationPreview {file:BackupFile;rows:{coleccion:string;nuevos:number;conservados:number}[];conflicts:{id:string;motivo:string}[];pending:number;remapped:number}
export type CurrentMigrationData=Record<string,BackupRecord[]>;
