import type { Prospecto, UserProfile } from './types';

export const ownerEmail = (value?: string | null) => (value || '').trim().toLowerCase();
export function sellerDefaults(profile: UserProfile) {
  if (profile.role !== 'Vendedor' || !ownerEmail(profile.email) || !profile.telemarketingAgent?.trim() || profile.telemarketingAgent === 'SIN ASIGNAR') throw new Error('El administrador debe asignar una telemarketing a tu cuenta.');
  return { propietarioEmail: ownerEmail(profile.email), propietario: profile.displayName || ownerEmail(profile.email), telemarketing: profile.telemarketingAgent };
}
export function ownsProspect(profile: UserProfile | null, prospect: Partial<Prospecto>) {
  return !!profile && !!ownerEmail(prospect.propietarioEmail) && ownerEmail(prospect.propietarioEmail) === ownerEmail(profile.email);
}
export function sellerUpdateAllowed(previous: Partial<Prospecto>, updates: Partial<Prospecto>) {
  return (['propietarioEmail', 'propietario', 'telemarketing'] as const).every(key => !(key in updates) || updates[key] === previous[key]);
}
