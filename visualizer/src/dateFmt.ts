export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const yyyy = d.getUTCFullYear();
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hour = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy} ${month} ${day} ${hour}:${min}`;
}
