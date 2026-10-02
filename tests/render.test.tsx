import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_SETTINGS } from '../src/game/persistence';
import App from '../src/App';
import StartScreen from '../src/pages/StartScreen';
import RulesScreen from '../src/pages/RulesScreen';
import NewGameScreen from '../src/pages/NewGameScreen';
import Emblem from '../src/components/Emblem';

// react-dom/server never runs effects, so this only exercises the
// render-time code path (props/state -> JSX) — but that already catches a
// good class of bugs (undefined property access, bad conditionals, missing
// keys triggering warnings, etc.) well beyond what tsc alone verifies.

describe('render smoke tests', () => {
  it('renders the app shell (start screen) without throwing', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Tycoon');
  });

  it('renders the start screen standalone', () => {
    const html = renderToStaticMarkup(
      <StartScreen lang="en" onLanguageChange={() => {}} onNewGame={() => {}} onContinue={() => {}} onRules={() => {}} />
    );
    expect(html.length).toBeGreaterThan(0);
  });

  it('renders the rules screen', () => {
    const html = renderToStaticMarkup(<RulesScreen lang="en" onLanguageChange={() => {}} onBack={() => {}} />);
    expect(html).toContain('How to Play');
  });

  it('renders the new game setup screen with its default options', () => {
    const html = renderToStaticMarkup(<NewGameScreen lang="en" onLanguageChange={() => {}} settings={DEFAULT_SETTINGS} onStart={() => {}} onBack={() => {}} />);
    expect(html).toContain('Players');
    expect(html).toContain('Human');
  });

  it('renders the emblem SVG', () => {
    const html = renderToStaticMarkup(<Emblem />);
    expect(html).toContain('<svg');
  });
});
