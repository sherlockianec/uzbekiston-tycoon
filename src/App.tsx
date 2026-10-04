import { useEffect, useState } from 'react';
import { GameProvider, useGame } from './state/GameProvider';
import StartScreen from './pages/StartScreen';
import NewGameScreen from './pages/NewGameScreen';
import GameScreen from './pages/GameScreen';
import RulesScreen from './pages/RulesScreen';
import { htmlLangFor } from './components/LanguageSwitcher';
import { loadPreferredSettings, saveSettings } from './game/persistence';
import type { Language, Settings } from './game/types';
import { t } from './i18n/strings';

type Screen = 'start' | 'new-game' | 'game' | 'rules';

function AppShell() {
  const { state, startNewGame, loadSavedGame } = useGame();
  const [screen, setScreen] = useState<Screen>('start');
  const [prefs, setPrefs] = useState<Settings>(() => loadPreferredSettings());

  // Changes made inside a game are saved as preferences; pick them up on return to the menu.
  useEffect(() => {
    if (!state) setPrefs(loadPreferredSettings());
  }, [state]);

  const activeLang: Language = state ? state.settings.language : prefs.language;
  useEffect(() => {
    document.documentElement.lang = htmlLangFor(activeLang);
  }, [activeLang]);

  const activeTheme = (state ? state.settings.theme : prefs.theme) ?? 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
  }, [activeTheme]);

  function toggleTheme() {
    const next = { ...prefs, theme: activeTheme === 'light' ? ('dark' as const) : ('light' as const) };
    setPrefs(next);
    saveSettings(next);
  }

  function changeLanguage(language: Language) {
    const next = { ...prefs, language };
    setPrefs(next);
    saveSettings(next);
  }

  const themeButton = (
    <button className="icon-btn theme-toggle" onClick={toggleTheme} aria-label={t('theme', activeLang)} title={t('theme', activeLang)}>
      {activeTheme === 'light' ? '\u263E' : '\u2600'}
    </button>
  );

  // Once a game is active (new or loaded), it always takes over the view.
  const effectiveScreen: Screen = state ? 'game' : screen;

  if (effectiveScreen === 'game' && state) {
    return <GameScreen onQuit={() => setScreen('start')} onPlayAgain={() => setScreen('new-game')} />;
  }
  if (effectiveScreen === 'new-game') {
    return <>{themeButton}<NewGameScreen
        lang={prefs.language}
        onLanguageChange={changeLanguage}
        settings={prefs}
        onStart={(config) => startNewGame(config)}
        onBack={() => setScreen('start')}
      /></>;
  }
  if (effectiveScreen === 'rules') {
    return <>{themeButton}<RulesScreen lang={prefs.language} onLanguageChange={changeLanguage} onBack={() => setScreen('start')} /></>;
  }
  return (
    <>
    {themeButton}
    <StartScreen
      lang={prefs.language}
      onLanguageChange={changeLanguage}
      onNewGame={() => setScreen('new-game')}
      onContinue={() => {
        if (!loadSavedGame()) setScreen('start');
      }}
      onRules={() => setScreen('rules')}
    />
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <div className="app-shell">
        <AppShell />
      </div>
    </GameProvider>
  );
}
