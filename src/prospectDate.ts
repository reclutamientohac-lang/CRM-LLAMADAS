// Admite fechas del formulario y fechas históricas españolas, sin reinterpretarlas
// según el idioma o la zona horaria del navegador. Vacío/ inválido siempre al final.
export function prospectDateKey(value: string | null | undefined): string {
  const text = (value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/);
  const spanish = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  const m = iso || spanish;
  if (!m) return '';
  const year = Number(iso ? m[1] : m[3]), month = Number(m[2]), day = Number(iso ? m[3] : m[1]);
  const hour = Number(m[4] || 0), minute = Number(m[5] || 0), second = Number(m[6] || 0);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return '';
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;
}
