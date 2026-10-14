import type { TabId, Role } from './types';

export const TELEMARKETING_TABS: readonly TabId[] = [
  'trabajo',
  'prospectos', 'pipeline',
  'cargar',
  'agenda',
  'dashboard',
  'individual',
];

export const DISTRIBUIDOR_TABS: readonly TabId[] = [
  'prospectos', 'pipeline',
  'cargar',
  'agenda',
  'dashboard',
  'individual',
];

export function canAccessTab(tab: TabId, role?: Role | string, isAdmin = false): boolean {
  if (isAdmin || role === 'Administrador' || role === 'Supervisor') {
    return true;
  }
  if (role === 'Distribuidor') {
    return DISTRIBUIDOR_TABS.includes(tab);
  }
  if (role === 'Telemarketing') {
    return TELEMARKETING_TABS.includes(tab);
  }
  return false;
}

export function getDefaultTabForRole(role?: Role | string, isAdmin = false): TabId {
  if (isAdmin || role === 'Administrador' || role === 'Supervisor') {
    return 'trabajo';
  }
  if (role === 'Distribuidor') {
    return 'prospectos';
  }
  return 'trabajo';
}

