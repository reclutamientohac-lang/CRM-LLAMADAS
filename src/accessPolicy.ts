import type { TabId } from './types';
export const TELEMARKETING_TABS: readonly TabId[] = ['trabajo', 'prospectos', 'agenda', 'dashboard'];
export function canAccessTab(tab: TabId, isAdmin: boolean): boolean {
  return isAdmin || TELEMARKETING_TABS.includes(tab);
}
