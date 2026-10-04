# Tycoon: O'zbekiston

A browser-based, Uzbekistan-themed property-trading business game for 2-4 players, any
mix of humans (hot-seat on one screen) and AI opponents. Buy properties, develop them
into business empires, trade, take bank loans, and bankrupt your rivals. Built with
React, TypeScript and Vite. No backend required.

Available in **English, O'zbekcha (Latin), Русский and Ўзбекча (Cyrillic)**.

This is a personal / educational vibe-coding project, not affiliated with or endorsed
by any of the real companies referenced as thematic flavor (see the in-app footer).

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the whole test suite once |
| `npm run test:watch` | Same, in watch mode |
| `npm run typecheck` | `tsc --noEmit` only |

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the Actions tab).

`.github/workflows/deploy.yml` builds and publishes `dist/`, passing the repo's own name
as the Vite base path. No secrets or backend are required.

## How the game plays

- **Board:** 40 spaces - 22 properties in 8 colour groups, 4 transport assets, 2 utility
  networks, Income Tax and Business Tax, 2 card decks, the Local Official, and four corners:
  START, Chorsu Choyxona (bottom-left), the Senior Official (top-left) and Tax Inspection (top-right).
- **Money:** Uzbek so'm, formatted `2 500 000 so'm`. Everyone starts with 15 000 000;
  passing START pays 1 500 000.
- **No auctions.** Decline a purchase and the property stays unowned until somebody lands
  there and buys it. Declining is not final: a **Buy** button stays in the centre of the
  board while you stand on the space - also at the START of your next turn, before you
  roll - so you can raise money first and then buy (if nobody else took it).
- **Development:** own a whole group, then upgrade Business → Company → Development →
  Business Center → Holding. Even-building is enforced; the final Holding upgrade costs
  double the earlier ones. The **Build** button lists every upgrade available right now.
- **Mortgages have teeth:** mortgaging pays half the price, redeeming costs the full
  price, and you have **6 laps** (START passes) to redeem before the bank forecloses with
  no compensation. The lock and laps-left show on the board and turn red at 2 or fewer.
- **Bank loans:** borrow up to 10 000 000 at 30% interest. After 3 START passes the bank
  takes principal + interest in ONE payment (10 000 000 -> 13 000 000 at once). A toast
  announces each lap. One loan at a time; early full repayment allowed.
- **No debt, only a negative balance:** rent, taxes and loans are always paid in full -
  the owner gets all of it even if you cannot cover it, and your balance goes negative.
  While below zero you cannot roll or end the turn: sell levels, mortgage, borrow or
  trade until you are at 0 or more - or declare bankruptcy, which returns every property
  to the bank (open to buy and trade again). Nothing is ever handed to a creditor.
- **Taxes:** Income Tax is 12% of cash. Business Tax is 150 000 per unmortgaged asset.
- **Tax Inspection** (jail): you are always sent *forward* there, crossing START (and
  collecting the salary) when you come from past it. Pay a fine that shrinks the longer you wait (600k → 400k →
  200k), use a release paper, or roll doubles. Your properties earn no rent while you're
  inside.
- **Local Official:** a fixed 400 000 payment every time you land there.
- **Senior Official** (corner cell): land on it and you may, only while standing there
  and entirely by choice, gamble once: **40%** lose a random
  300 000-1 200 000, **35%** go straight to Tax Inspection, **25%** gain a random
  500 000-2 500 000. Odds always stay loss > jail > gain.
- **Chorsu Choyxona:** passing it does nothing; if you END your turn on it you skip the
  next dice roll (you can still buy, build, trade, use the bank).
- **Transport network:** only when your dice roll ENDS on an owned transport asset (you
  bought it or paid its owner), travel free once that turn to any other one and resolve
  it as a normal landing. No chaining, and the option never carries to the next turn. Travel is always forward, so a
  destination behind you means a lap past START and you collect the salary.
- **Cards:** 20 Mahalla + 20 Business Opportunity cards with real effects on cash,
  position, taxes, loans (cut / forgive / extend), tax immunity and purchase discounts.
- **Trading:** cash + properties + release papers, with a Balance helper. AI opponents
  both respond to trades and propose their own (at most once per turn).
- **AI:** 5 personalities (Conservative, Aggressive, Developer, Banker, Chaotic) × 3
  difficulties. They buy, develop, redeem mortgages before foreclosure, trade, and the
  Chaotic one occasionally gambles on the bribe - always playing by the same rules as you.
- **End of game:** last player standing wins. The final table ranks everyone (winner,
  then reverse order of bankruptcy).

- **Debt never forces bankruptcy:** when you owe money you can set the dialog aside and use
  the Bank (loan), Trade and the sell/mortgage lists. Declare Bankruptcy is the last resort.
- **Walk first, then consequences:** pawns hop to their tile before the purchase prompt,
  rent, card or a bot's purchase is shown. Every cash change floats up next to the
  player's icon in green (+) or red (-).

Every cost button is **green when you can afford it** and **red, disabled and labelled
"short by X"** when you can't.

## Look and feel

Deep navy, turquoise and gold, with sparing Uzbek geometric texture (girih star, ikat strip). All colours, sizes, radii, shadows and motion timings are design tokens in `src/styles/tokens.css`. Fonts (Manrope for display, Inter for text; both cover Latin, Cyrillic and the Uzbek letters) and every icon are bundled, so the game works fully offline. Icons are original SVG in `src/components/icons/`.

## Architecture

The design is a "pure engine, thin UI" pattern:

```
UI event
  → dispatch({ type: 'ROLL_DICE' })
  → applyCommand(state, command, actingPlayerId, rng)   <- pure, deterministic
  → new GameState
  → React re-renders; an effect autosaves to localStorage
```

```
src/
  game/
    types.ts          All shared types: GameState, Player, commands, notices...
    data/              Static reference data (never mutated at runtime)
      economy.ts       Every price/rent/cost/probability constant in one place
      board.ts         The 40-space layout
      properties.ts    22 properties, 4 transport assets, 2 utilities, taxes
      cards.ts         40 original Mahalla / Business Opportunity cards
    engine/            Pure functions only - zero React, zero DOM
      random.ts        Seedable PRNG (deterministic, so it's testable)
      newGame.ts       Builds a fresh GameState; SAVE_VERSION lives here
      helpers.ts       charge, log, notices, rankPlayers, balanceTradeCash...
      properties.ts    Buying, rent, development, mortgage countdown
      turn.ts          Dice, movement, landing, cards, detention, bribe gamble
      bank.ts          Loans
      negotiation.ts   Trading
      bankruptcy.ts    Bankruptcy (assets return to the bank)
      index.ts         applyCommand(state, command, actingPlayerId, rng)
    ai/                Personalities, difficulty, and the decision logic
    persistence.ts     localStorage save/load (versioned) + saved preferences
  state/GameProvider.tsx   Context: dispatch, autosave, preferences, AI turn loop
  components/          Board, panels, modals, CostButton, toasts, language switcher
    icons/             Icon + the original SVG icon set
  styles/              tokens.css (design tokens), fonts.css (bundled fonts), global.css
  pages/               Start / New Game / Game / Rules screens
  i18n/
    strings.ts         UI chrome in 4 languages, t() / tf() / localized()
    content.ts         Card, description and AI-personality translations
    rules.ts           The rules page as data (numbers filled from economy.ts)
    translit.ts        Uzbek Latin → Cyrillic transliterator
```

Saves are versioned (`SAVE_VERSION`, currently 3; v1.2 changed the board). A save from an older, incompatible
version is rejected with a friendly message rather than crashing; player preferences
(language, sound, AI speed) are stored separately and survive across games.

### Languages

UI text, card titles and texts, property descriptions, AI personalities and the whole
rules page exist in all four languages. **Uzbek Cyrillic is generated from the Uzbek
Latin text** by a tested transliterator, so the two Uzbek scripts can't drift apart.

> **Native-speaker review is recommended.** The Uzbek and Russian were written without a
> native proofreader. The tests guarantee completeness and correct scripts, not
> idiom.

### Why a hand-written engine instead of boardgame.io?

boardgame.io is a good fit for this genre, but a small hand-rolled reducer was easier to
get fully correct and unit-tested end to end. Swapping boardgame.io in later - mainly for
real networked multiplayer - would mean replacing `GameProvider`'s dispatch loop, without
touching the engine.

### Design notes

- **No "Monopoly" branding.** Monopoly is a Hasbro trademark. The genre mechanics are
  generic; the layout, names, card text and visuals here are original.
- **No real company logos.** Real company names appear as flavor text with a disclaimer;
  no logo artwork is embedded.
- **Tunable economy.** Every number lives in `game/data/economy.ts`; the rules page reads
  from it, so the in-app text can never disagree with the engine.

## Tests

`npm test` runs ~200 tests covering: the engine (dice, movement, rent, building, mortgages
and the foreclosure countdown, taxes, all cards, detention, loans, bankruptcy, trading,
save versioning), the bribe odds (including a 20 000-roll statistical check), the AI
(including full AI-vs-AI games that must reach a winner without a single illegal move),
affordability colours, toasts, transliteration, and translation completeness.
A source-scanning test fails if hardcoded English sneaks back into a component.

## Roadmap

Done: everything above. Known gaps, roughly in priority order:

1. **The game log is English-only.** Log lines are built as plain strings inside the
   engine. Translating them means storing structured log entries (a key + parameters)
   and formatting them in the UI.
2. **Native-speaker proofreading** of the Uzbek and Russian text.
3. **Never played in a real browser by the author of these changes.** All verification
   was automated (type-check, unit/render tests, AI-vs-AI simulations). Do a manual
   playthrough on desktop and a phone before sharing: layout, token hop animation,
   dice animation, and sound are the things tests can't judge.
4. **Trading is single-proposal** - no counter-offers.
5. **No sound files** - a few procedural WebAudio tones stand in.
6. **Stats:** rent collected/paid and "largest transaction" would need new engine counters.
7. **No end-to-end browser tests** (e.g. Playwright).
8. Real **networked multiplayer** would need a backend or boardgame.io.

## License

MIT - see `LICENSE`.
