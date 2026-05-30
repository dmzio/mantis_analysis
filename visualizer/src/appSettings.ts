import { reactive } from 'vue';
import { DEFAULT_TRACE_STYLE, TRACE_STYLES, TraceStyleId } from './traceStyles';

export type DriftMode = 'original' | 'corrected';

export interface AppSettings {
  dark: boolean;
  traceStyle: TraceStyleId;
  driftCorrection: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  dark: true,
  traceStyle: DEFAULT_TRACE_STYLE,
  driftCorrection: true
};

function readStoredSettings(): Record<string, any> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('appSettings') || '{}');
  } catch {
    return {};
  }
}

export function loadAppSettings(): AppSettings {
  const stored = readStoredSettings();
  const storedDark = typeof localStorage === 'undefined'
    ? DEFAULT_APP_SETTINGS.dark
    : (localStorage.getItem('darkMode') ?? String(DEFAULT_APP_SETTINGS.dark)) === 'true';
  const traceStyle = TRACE_STYLES[stored.traceStyle as TraceStyleId]
    ? stored.traceStyle as TraceStyleId
    : DEFAULT_APP_SETTINGS.traceStyle;
  return {
    dark: typeof stored.dark === 'boolean' ? stored.dark : storedDark,
    traceStyle,
    driftCorrection: typeof stored.driftCorrection === 'boolean'
      ? stored.driftCorrection
      : DEFAULT_APP_SETTINGS.driftCorrection
  };
}

export const appSettings = reactive<AppSettings>(loadAppSettings());

export function persistAppSettings(partial: Partial<AppSettings>): void {
  if (typeof localStorage === 'undefined') return;
  const current = readStoredSettings();
  localStorage.setItem('appSettings', JSON.stringify({ ...current, ...partial }));
}

export function updateAppSettings(partial: Partial<AppSettings>): void {
  Object.assign(appSettings, partial);
  persistAppSettings(partial);
}

export function resetAppSettings(): void {
  Object.assign(appSettings, loadAppSettings());
}

export function getActiveDriftMode(): DriftMode {
  return appSettings.driftCorrection ? 'corrected' : 'original';
}
