import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS, loadSettings, type Settings } from './settings';

export function useSettings(): Settings {
  return useLiveQuery(() => loadSettings(), [], DEFAULT_SETTINGS);
}
