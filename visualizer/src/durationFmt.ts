const SIMPLE_NUMBER_RE = /(\d+(?:\.\d*)?)/;
const MINUTES_RE = /(\d+(?:\.\d*)?)\s*m/;
const SECONDS_RE = /(\d+(?:\.\d*)?)\s*s/;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function toNumberFromString(value: string): number | null {
  if (!value) return null;
  const colonParts = value.split(':').map(part => part.trim());
  if (colonParts.length === 2) {
    const maybeMinutes = Number(colonParts[0]);
    const secondsPart = colonParts[1].replace(/[^\d.]/g, '');
    const maybeSeconds = secondsPart ? Number(secondsPart) : 0;
    if (Number.isFinite(maybeMinutes) && Number.isFinite(maybeSeconds)) {
      return maybeMinutes * 60 + maybeSeconds;
    }
  }
  const structuredMinutes = value.match(MINUTES_RE);
  const structuredSeconds = value.match(SECONDS_RE);
  if (structuredMinutes || structuredSeconds) {
    const minuteValue = structuredMinutes ? Number(structuredMinutes[1]) : 0;
    const secondValue = structuredSeconds ? Number(structuredSeconds[1]) : 0;
    if ((structuredMinutes ? Number.isFinite(minuteValue) : true) && (structuredSeconds ? Number.isFinite(secondValue) : true)) {
      const total = (structuredMinutes ? minuteValue : 0) * 60 + (structuredSeconds ? secondValue : 0);
      if (Number.isFinite(total)) {
        return total;
      }
    }
  }
  const match = value.match(SIMPLE_NUMBER_RE);
  if (match) {
    const numeric = Number(match[1]);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

/**
 * Parse the provided duration input into seconds whenever a meaningful value can be inferred.
 */
export function parseSessionDuration(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const numeric = toFiniteNumber(raw);
  if (numeric !== null) {
    return numeric;
  }
  if (typeof raw === 'string') {
    return toNumberFromString(raw.trim());
  }
  return null;
}

/**
 * Render a session duration as `mm:ss`, rounding to the nearest whole second. Returns an empty string when no duration is available.
 */
export function formatSessionDuration(raw: unknown): string {
  const seconds = parseSessionDuration(raw);
  if (seconds === null) return '';
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const secs = rounded % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(secs).padStart(2, '0');
  return `${paddedMinutes}:${paddedSeconds}`;
}
