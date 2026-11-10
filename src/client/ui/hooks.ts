import { createContext, useCallback, useContext } from 'react';
import type { Locale } from '../../core/meta/settings.js';
import { activeSettings, appStore, type AppState } from '../app/appState.js';
import { translate } from '../app/i18n.js';
import { useStore } from '../app/store.js';
import type { GameClient } from '../game/GameClient.js';

export const GameContext = createContext<GameClient | null>(null);

export function useGame(): GameClient {
  const game = useContext(GameContext);
  if (!game) throw new Error('GameContext is missing');
  return game;
}

export function useApp<S>(selector: (state: AppState) => S): S {
  return useStore(appStore, selector);
}

export function useLocale(): Locale {
  return useApp((state) => activeSettings(state).locale);
}

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

/** Translation function bound to the current language; components re-render when it changes. */
export function useT(): Translator {
  const locale = useLocale();
  return useCallback((key, vars) => translate(locale, key, vars), [locale]);
}
