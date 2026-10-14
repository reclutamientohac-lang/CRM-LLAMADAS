import { TabId, Role } from './types';

export const TELEMARKETING_TABS: readonly TabId[] = [
  'trabajo',
  'prospectos',
  'pipeline',
  'cargar',
  'agenda',
  'dashboard',
];

export const DISTRIBUIDOR_TABS: readonly TabId[] = [
  'prospectos',
  'pipeline',
  'cargar',
  'agenda',
  'dashboard',
];

export function canAccessTab(tab: TabId, role?: Role, isAdmin?: boolean): boolean {
  if (isAdmin) return true;
  if (!role) return false;
  if (role === 'Supervisor') return true;
  if (role === 'Distribuidor') return DISTRIBUIDOR_TABS.includes(tab);
  if (role === 'Telemarketing') return TELEMARKETING_TABS.includes(tab);
  return false;
}

export function getDefaultTabForRole(role?: Role, isAdmin?: boolean): TabId {
  if (isAdmin || role === 'Supervisor') {
    return 'trabajo';
  }
  if (role === 'Distribuidor') {
    return 'pipeline';
  }
  return 'trabajo';
}
