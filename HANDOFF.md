# HANDOFF - Tycoon: O'zbekiston (v1.1 feature-complete)

Verified at handoff time (commands actually run): `npx tsc --noEmit` clean; `npx vitest run` **212/212 pass in 15 files**; `npm run build` OK. All handoff steps 1-14 from the previous version are done (see section 8). **Still never played in a real browser** - verification is type-check, unit tests, render tests (200+ real game states x 4 languages, every modal, all 40 cards) and AI-vs-AI simulations. First thing in a new chat: `npm install && npm run dev` and follow `MANUAL_TEST.md`.

---
## 1. Project summary
Browser property-trading business game themed on Uzbekistan (22 real-company-flavored properties, 4 transport, 2 utilities, so'm currency). 2-4 players, any mix of local humans (hot-seat, one screen) and AI bots. No backend. Stack: React 18 + TypeScript + Vite 5 + Vitest 2, plain CSS (one file), no UI libs. Package `uzbekiston-tycoon`.

```
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm test           # vitest run
npm run build      # tsc --noEmit && vite build -> dist/
```
Deploy: push to GitHub `main`, Settings > Pages > Source = GitHub Actions. `.github/workflows/deploy.yml` runs `npm ci`, `npm test`, `npm run build` with `VITE_BASE_PATH=/<repo-name>/` (vite.config.ts reads it; default `/uzbekiston-tycoon/`). Screen routing is a simple state variable in `App.tsx` (no router, so no GH Pages 404 issues).

---
## 2. Identity pillars and every rule the owner set
**Identity:** transparent, above-board business-empire fantasy; hot-seat-first local multiplayer; classic property-trading rules plus a few original systems that slot into the classic ruleset; ONE hand-tunable economy.
**Pillars:** (1) show every number before an action (owner + current rent on tiles, cost on buttons); (2) rules fair, never punitive-by-surprise (a penalty must be visible beforehand); (3) one central economy file, new numbers derive from existing constants; (4) new systems integrate with existing ones (cards touch loans/mortgage/tax) instead of sitting beside them; (5) satire of Uzbek bureaucratic corruption is in-theme (owner's explicit choice).

**Owner rules (all confirmed in chat):**
- Name is "Tycoon: O'zbekiston" - **never "Monopoly"** or "-opoly" (Hasbro trademark). Subtitle "O'zbekiston Business Game".
- **No real company logos** (names as flavor text only + disclaimer footer). Original SVG emblem/tokens.
- **No auction.** Declining a purchase leaves the property unowned until someone lands there and buys.
- **Economy stays "Fast-play-like"** (flat ratios, generous). No Fast/Long mode selection (reference item 11 rejected).
- **Corruption cell ("Local Official")**: mandatory, fixed payment, no choice, same at every stage of the game (400,000 so'm).
- **Bribe gamble ("Bribe a Senior Official")**: voluntary, once per turn: **40% lose a random 300,000-1,200,000 / 35% jail (Tax Inspection) / 25% gain a random 500,000-2,500,000** (amounts rounded to 1,000; mean loss 750k, mean gain 1.5M). Odds must stay loss > jail > gain.
- **Agrobank** = the cheapest bank (banking group, price 1,900,000; id `agrobank`, replaced Ipak Yuli Bank; name change only).
- **4 languages:** English, Uzbek Latin, Russian, Uzbek Cyrillic (type `Language = 'en'|'uz'|'ru'|'uz-cyrl'`).
- **No music, no music toggle.** One sound toggle with procedural WebAudio tones (no audio files).
- **UX:** green/red affordability colour-coding on cost buttons (`.btn--affordable` green, `.btn--unaffordable` red); "risk" style `.btn--risk` for the bribe gamble. Adopt other UX that fits the project.
- Multi-human hot-seat is required (up to 4 humans, zero bots allowed; at least 1 human).
- Bigger board/cells, small logo, animated hop-by-hop bust tokens, owner name + current rent shown on owned tiles, distinct group colours.
- Card shows first; its effect applies only when the player presses OK.
- Transport: landing on a station lets you travel once per turn to any other station (free, no salary on the hop, resolves landing there).
- Bank loan: max 10,000,000, 30% interest, 3 installments collected automatically at START, one loan at a time, early repay allowed.
- Reference game (Godot mobile tycoon; uploaded files are NOT in this repo) is inspiration only: never copy its names, text, code or art.

---
## 3. Architecture
Pattern (same as the reference "pure engine, thin UI"): `applyCommand(state, command, actingPlayerId, rng) -> newState` in `src/game/engine/index.ts`. Pure, synchronous, no React/DOM. Illegal commands are **no-ops** (return the same state reference). RNG is injected (`Rng {next(), int(min,max)}`, mulberry32 in `random.ts`), so tests script dice. `GameProvider` holds state in `useState`, keeps one RNG in a ref, autosaves every change, and runs the **AI loop**: `nextActorId(state)` (whose move it is, incl. mid-trade) -> after `settings.aiSpeedMs` call `decideAiCommand` and dispatch.

```
src/
  App.tsx main.tsx                  screen routing, providers
  game/
    types.ts                        ALL shared types (GameState, Player, commands, CardEffect...)
    persistence.ts                  localStorage save/load (+settings)
    data/ economy.ts                EVERY balance constant + formulas (single tuning file)
          board.ts                  40-slot layout, spaceLabel() (4 languages), nearest* helpers
          properties.ts             22 properties, GROUPS (colours, 4-lang names), infra, utilities, TAXES
          cards.ts                  17 Mahalla + 17 Business cards (typed effects)
    engine/ index.ts                applyCommand (command validation + dispatch), barrel exports
            turn.ts                 dice, movement, grantSalary (mortgage laps + loan installment), landing resolution,
                                    card draw/ack/effects, attemptBribe, detention helpers
            properties.ts           buy (discount), rent, develop/sell (level-5 premium), mortgage/unmortgage, can* guards
            bank.ts                 loans: canTakeLoan/takeLoan/repayLoanEarly
            liquidation.ts          forced liquidation, declareBankruptcy (sets bankruptOrder)
            negotiation.ts          trades (propose/respond/cancel). Auction code was REMOVED.
            helpers.ts              chargePlayer, advanceTurn, liquidValue, update* helpers
            newGame.ts              createNewGame, SAVE_VERSION
            random.ts
    ai/ personalities.ts            5 personalities x 3 difficulties, names
        aiPlayer.ts                 nextActorId, decideAiCommand, buy/bid/trade/develop/liquidate/trade-proposal logic
  state/GameProvider.tsx            context, dispatch, autosave, AI loop
  components/ Board (grid + animated tokens) PlayerPanel ActionBar Dice PropertyInspector CardModal TradeModal
             LiquidationModal BuildModal BankModal NetworkTravelModal BribeModal EndGameModal GameLog Emblem
  pages/ StartScreen NewGameScreen GameScreen RulesScreen
  i18n/strings.ts                   UI chrome in 4 langs (S() helper derives Uz-Cyrillic), t(), tf(), localized()
  i18n/content.ts                   card/description/personality/difficulty/dev-level translations
  i18n/rules.ts                     rules page as data; {placeholders} filled from economy.ts
  i18n/translit.ts                  Uzbek Latin -> Cyrillic (placeholder-safe)
  hooks/useSound.ts  utils/currency.ts (formatSom: "2 500 000 so'm")  utils/tokenIcons.ts  styles/global.css
tests/ engine.test.ts render.test.tsx gamescreen.test.tsx
```
**Phases:** AWAITING_ROLL, AWAITING_PURCHASE_DECISION, AWAITING_CARD_ACK, AWAITING_LIQUIDATION, AWAITING_TRADE_RESPONSE, GAME_OVER (IN_AUCTION exists but is unreachable).
**Commands:** ROLL_DICE, BUY_PROPERTY, DECLINE_PURCHASE, ACK_CARD, PAY_DETENTION_FINE, USE_RELEASE_PAPER, END_TURN, DEVELOP, SELL_DEVELOPMENT, MORTGAGE, UNMORTGAGE, TAKE_LOAN, REPAY_LOAN_EARLY, TRAVEL_NETWORK, ATTEMPT_BRIBE, DISMISS_BRIBE_RESULT, PROPOSE_TRADE, RESPOND_TRADE, CANCEL_TRADE, LIQUIDATE_MORTGAGE, LIQUIDATE_SELL_DEVELOPMENT, DECLARE_BANKRUPTCY (+ dormant PLACE_BID/PASS_AUCTION).
**Key state fields:** `players[]` (cash, position, inDetention, detentionTurns, releasePapers, `loan{principal,installmentAmount,installmentsLeft}`, `taxImmunity`, `purchaseDiscountPercent`, `bankrupt`, `bankruptOrder`), `ownership[id]{ownerId, level, mortgaged, mortgageLapsRemaining}`, `pendingDebt{amount,payeeId,reason,kind:'rent'|'tax'|'card'|'loan'}`, `drawnCard`, `cardCausedMove`, `pendingRentMultiplier`, `bribeResult`, per-turn flags `networkTravelUsed`, `bribeGambleUsedThisTurn`, `tradeProposedThisTurn` (all reset in `advanceTurn`), `log[]`.
**Save format:** JSON of whole `GameState` under localStorage `uzbekiston-tycoon:save:v1`; settings under `uzbekiston-tycoon:settings:v1`. `SAVE_VERSION = 1` in `newGame.ts`; `loadGame` discards mismatching versions. **WARNING: state shape changed a lot since v1 but the version was NOT bumped - see Remaining Work #1.**

---
## 4. Economy table (all in `src/game/data/economy.ts` unless noted)
| Item | Value | Notes / ratio |
|---|---|---|
| STARTING_CASH | 15,000,000 | ~7.8x average property price (avg 1.93M) |
| GO_SALARY | 1,500,000 | 10% of start cash |
| Property prices (properties.ts) | bazaars 600k/700k; retail 900k/1.0M/1.1M; telecom 1.2/1.3/1.4M; fintech 1.6/1.7/1.8M; banking **Agrobank 1.9M**/2.0/2.1M; construction 2.3/2.4/2.5M; mining 2.6/2.8/3.0M; capital 3.5M/4.0M | 8 groups, 22 properties |
| Base rent | round1000(price x 7%) | `buildRentTable` |
| Rent multipliers | [1, 2, 4, 9, 20, 35, 55] x base | idx0 base, idx1 full group unbuilt (2x), idx2-6 levels 1-5; level 5 = 385% of price |
| Development cost lvl 1-4 | round1000(price x 50%) | `developmentCostFor` |
| Development cost lvl 5 | 2 x lvl 1-4 cost | `developmentCostLevel5For` |
| Sell-back | 50% of the cost paid for that level | `refundForCurrentLevel` (exported, engine/properties.ts) |
| Mortgage advance | 50% of price | `mortgageValueFor` |
| Redemption | mortgageValue x (1 + 100%) = full price | `MORTGAGE_REDEMPTION_INTEREST_PERCENT = 100` |
| Mortgage deadline | 6 laps of the owner (START passes) then bank forecloses, no compensation | `MORTGAGE_DEADLINE_LAPS`; decrement in `turn.ts grantSalary` |
| Infrastructure | price 2,000,000; rent by count owned [250k, 500k, 1M, 2M] | `INFRASTRUCTURE_*` |
| Utilities | price 1,500,000; rent = dice sum x 4 (one) or x 10 (both) x 20,000 | `UTILITY_*` |
| Income Tax | 12% of cash, rounded to 1000 | `INCOME_TAX_PERCENT`, cell `income-tax` (idx 4) |
| Business Tax | 150,000 per unmortgaged asset owned (props+infra+utils) | `PROPERTY_TAX_PER_ASSET` (1% of start); cell id still `customs-duty` (idx 38), kind `perAsset` |
| Local Official toll | 400,000 flat, mandatory | `CORRUPTION_TOLL_AMOUNT`; cell `local-official` (idx 36) |
| Bribe gamble | loss 40% (random 300k-1.2M), jail 35%, gain 25% (random 500k-2.5M) | `BRIBE_GAMBLE_*`, `randomBribeAmount()`; EV ~ +37k cash before jail cost |
| Detention fine | schedule [600k, 400k, 200k] indexed by failed attempts; max 3 turns; forced release uses last tier | `DETENTION_FINE_SCHEDULE`, `MAX_DETENTION_TURNS` |
| Jailed owner rent | properties of a jailed owner earn 0 | `engine/properties.ts computeRent` |
| Loan | 500k-10M, +30% total, 3 equal installments (rounded to 1000), at START | `MIN/MAX_LOAN_AMOUNT`, `LOAN_INTEREST_PERCENT`, `LOAN_INSTALLMENTS`; ceiling = 67% of start cash |
Board (idx): 0 START, 1 Chorsu Bazaar, 2 Mahalla, 3 Qumtepa Bazaar, 4 Income Tax, 5 Railways, 6 Korzinka, 7 Business card, 8 Havas, 9 Makro, 10 Tax Inspection, 11 Mobiuz, 12 Uzbekneftegaz, 13 Ucell, 14 Beeline, 15 Airways, 16 Click, 17 Mahalla, 18 Payme, 19 Uzum, 20 Rest, 21 Agrobank, 22 Business card, 23 Hamkorbank, 24 Kapitalbank, 25 Qanot Sharq, 26 Murad, 27 Enter Eng., 28 Uzbekenergo, 29 AKFA, 30 Go to Inspection, 31 Uzmetkombinat, 32 Almalyk, 33 Mahalla, 34 Navoiy, 35 Tashkent Metro, 36 Local Official, 37 Tashkent City, 38 Business Tax, 39 TIBC. Group colours: bazaars #A08868, retail #4FA8D8, telecom #8B6FD9, fintech #E0568F, banking #C0392B, construction #E0793A, mining #3F9F63, capital #2FB8AF, infra #6B7C99, utility #D4AF37.

---
## 5. Reference Mechanics Spec (condensed) and decisions
Source: a Godot-built mobile tycoon game (files analysed in chat, not stored here). Tags: [O]=observed, [I]=inferred, [U]=unknown.
- **Turn:** roll, move, resolve, free post-roll actions (build/sell/mortgage/redeem/credit/deal), end turn. End turn hard-blocked if cash < 0 (raise-money-or-bankrupt dialog) or if a mortgage is overdue. 3rd consecutive double is prevented, not punished. Default 1 die, 2 optional. 36 cells, 22 props, 4 stations. [O]
- **Buy:** immediate, blocked if unaffordable; no auction (next lander may buy). Full group doubles base rent. [O]
- **Deals:** multi-property + cash slider (step buttons, snap to hundreds, "Balance" auto-equalizer); AI proposes deals unless disabled; mortgaged assets tradable (debt travels). [O]
- **Build:** full unmortgaged group, 5 levels, sell-back 50%, level 5 costs 2x. [O]
- **Mortgage:** 50% advance, redeem 100% of price, **6 laps or bank seizes**. Bonus cards can forgive/refund/extend. [O]
- **Credit:** 30% over 3 laps, one at a time, ceiling by mode, slider with live preview, repay only in full, auto-collect with notification; cards can forgive / cut 30% / extend. [O]
- **Tax:** one tax = flat per unmortgaged business (100); hazard cell steals up to 300 (alt default 500 seen). [O]
- **Decks:** asymmetric - Chance mixed; Chest all-positive (jail-free, 50% off next buy, tax immunity, hazard immunity, debt relief); some sticky, some instant. [O]
- **Bank robbery:** voluntary 3-outcome gamble (win/miss/jail 3 turns); percentages [U]; tutorial rigs RNG to a first win. [O]
- **Jail:** 2 turns (3 if robbery); own properties pay nothing while jailed; buyout drops 500 -> 200, flat 1000 after robbery. [O]
- **Bankruptcy:** second confirmation if net worth still positive; estate returns to bank; end screen ranks all players by net worth. [O]
- **Economy (fast / long):** start 12,500 / 10,000; salary 1,000 / 200; credit ceiling 3,000 / 1,000; max rent 500% flat / 116% at top tier (cheap tiers ~67%); build cost 50% price (lvl5 100%) / 25-32% (lvl5 ~50%); prices identical (400-2,500). [O]
- **Meta layer** (coins, ads, online tickets, themes): not applicable. [O]
- **Missing / unknown:** core GameModel state machine, AI logic, robbery percentages, turn-limit values, exact cell map. [U]

**Decisions:** items 1-10 APPROVED; item 11 (fast/long modes) REJECTED (stay fast-like); item 12 approved as mandatory fixed "local official" payment; item 13 approved as own-theme bribe gamble with 40/35/25 odds; bank-robbery-as-crime rejected; Agrobank rename approved; music toggle rejected; green/red affordability approved. Items: 1 end-game leaderboard, 2 bankruptcy warning, 3 trade balance/steps, 4 AI-initiated trades, 5 new loan/tax/discount card effects, 6 jailed owner earns no rent, 7 decreasing detention fine, 8 per-asset tax, 9 level-5 premium, 10 mortgage deadline + full-price redemption.

---
## 6. Status (checked against code and tests)
| # | Feature | Status | Where / tests |
|---|---|---|---|
| 1 | End-game leaderboard | DONE | `rankPlayers` (helpers.ts), `EndGameModal.tsx`; tests in features.test.ts, playthrough.test.tsx |
| 2 | Bankruptcy warning | DONE | `shouldWarnBeforeBankruptcy`, `LiquidationModal.tsx`; tested |
| 3 | Trade steps + Balance | DONE | `balanceTradeCash` (helpers.ts), `TradeModal.tsx`; tested incl. caps |
| 4 | AI-initiated trades | DONE | `pickTradeProposal` (exported), once-per-turn cap `tradeProposedThisTurn`; tested |
| 5 | Loan/tax-immunity/discount cards | DONE | 8 cards in `cards.ts`, effects in `turn.ts`; cards.test.ts |
| 6 | Jailed owner earns no rent | DONE | `computeRent`; features.test.ts |
| 7 | Decreasing detention fine | DONE | features.test.ts |
| 8 | Per-asset Business Tax (unmortgaged only) | DONE | features.test.ts |
| 9 | Level-5 cost premium | DONE | `costToReachNextLevel`/`refundForCurrentLevel`/`totalDevelopmentRefund` in helpers.ts used by engine, AI, BuildModal, Inspector, liquidValue; develop.test.ts |
| 10 | Mortgage deadline + full-price redeem | DONE | engine + countdown UI (Board, PlayerPanel, Inspector, red at <=2 laps) + foreclosure toast; mortgage.test.ts |
| - | Corruption cell (Local Official) | DONE | slot 36, icon + tooltip, fixed 400k toll, not affected by tax immunity; corruption.test.ts |
| - | Bribe gamble | DONE | random amounts, odds 40/35/25; bribe.test.ts (boundaries, ranges, once/turn, liquidation, AI-no-popup, 20k-roll statistics) |
| - | Agrobank | DONE | |
| - | No auction | DONE | all auction code, state, commands, constants removed; engine.test.ts covers the new rule |
| - | 4 languages | DONE (needs native proofreading) | UI, cards, property descriptions, personalities, rules page. Uz-Cyrillic generated by `translit.ts`. **Game log is still English-only** (engine builds plain strings). i18n.test.tsx guards completeness + a source scan for hardcoded English |
| - | Language picker + persisted preferences | DONE | `LanguageSwitcher`, `loadPreferredSettings`, GameProvider saves settings; menus follow the chosen language (was hardcoded 'en') |
| - | Affordability colours | DONE | `CostButton` on Buy/Develop/Unmortgage/Repay/Pay fine; Take loan green/red; affordability.test.tsx |
| - | Loan auto-pay + foreclosure toasts | DONE | `notices[]` in state (human players only, cleared on turn advance), `NoticeToasts`; notices.test.tsx |
| - | Save versioning | DONE | `SAVE_VERSION = 2`, `parseSave`, friendly message for outdated/corrupt saves |
| - | Multi-human hot-seat, board, hop animation, bust tokens | DONE | visually unverified in a real browser |
| - | README | DONE | rewritten for current rules |

## 7. Known bugs and lessons (do not repeat)
1. **Raw unicode escapes in JSX text** (`<span>\u2014</span>`) render literally. Only valid inside JS strings/`{'\u2014'}`/template literals. Caused the "Properties \u2014" bug and again in 6 files; fixed at handoff. Prefer plain ASCII (" - ", "x") in JSX text. Scan: `grep -rn '\\u[0-9a-f]\{4\}' src --include=*.tsx` and inspect lines not inside quotes.
2. **Move then resolveLanding race:** `moveForward/moveToTarget` can trigger a loan installment liquidation via `grantSalary`. Callers must use `resolveLandingUnlessLiquidating` (engine/index.ts) - never call `resolveLanding` blindly after a move.
3. **Card flow:** `drawCard` only shows the card; effect applies in `acknowledgeCard`. `cardCausedMove` (+ `pendingRentMultiplier`) decides whether landing is re-resolved; otherwise ACK would re-draw a card on the same space. `settleDebtIfAffordable` also checks `cardCausedMove`.
4. **Stale AI results:** AI `bribeResult` would linger and appear for the next human. Fixed: result only set for human players; `advanceTurn` clears it. Any new transient result field needs the same rule.
5. **Bribe overlay vs liquidation:** a bribe loss that cannot be paid enters AWAITING_LIQUIDATION; GameScreen closes the overlay in an effect. Keep that guard.
6. **Tests that land on card spaces** draw from a real shuffled deck - force the deck (`state.mahallaDeck = ['birthday-gift', ...]`) or pick a roll landing on a plain property. Use `scriptedRng([d1,d2])` (only `.int` consumed); `createNewGame(config, seed)` consumes RNG for shuffles so use a separate rng per command.
7. After changing state shape, existing tests that `toEqual` ownership/player objects break (happened with `mortgageLapsRemaining`). Update expectations, not the engine.
8. TypeScript: values narrowed by an early return are NOT narrowed inside nested closures - use `!` or a local const (hit in TradeModal twice).
9. Tooling: `create_file` always needs the `path` argument; `str_replace` needs the exact current text (view first); deleting a file then failing to recreate it breaks the build (GameScreen was lost once).
10. Renames: `humanId` became `actorId` / `playerId` everywhere (multi-human). Do not reintroduce a fixed "the human".
11. Cell ids vs names: `customs-duty` is displayed as "Business Tax"; Agrobank has id `agrobank`; `ipak-yuli-bank` no longer exists.
12. Utility rent preview uses dice sum 7 / "10x dice roll" text; do not show it as a fixed number.
13. **Transliteration must skip `{placeholders}`** and treat `'` after an ALL-CAPS name (`BOSHLANISH'dan`) as plain glue, not a tutuq (fixed + tested in translit.test.ts). `yo'` is y+o' (not yo), `ng'` is n+g' (not ng).
14. **Avoid Latin loanwords in Uzbek text** that don't transliterate cleanly (`ts`, `c`, English phrases); rewrite with native words.
15. **Toasts/results are human-only** (`addNotice` ignores AI players). Any all-AI test that wants toasts must flag a seat `isAI:false`.
16. **Default setup slot names are empty**, so AI bots get `pickAiName` names (they used to be prefilled "Player 2" and never got names).
17. **Update docs from code constants**: the rules page reads `economy.ts` via `ruleVars()`. It also once claimed "ranked by net worth" while the code ranked by bankruptcy order - the test now forbids that phrase.
18. **Settings were never persisted** (only inside the game save). Fixed; do not remove the settings effect in `GameProvider`.
19. JSX in a test needs a `.tsx` file; Node APIs in tests need `@types/node` (now a devDependency).

---
## 8. Remaining work
Steps 1-14 of the previous plan are DONE. What is left, in order:
1. **Manual playthrough** using `MANUAL_TEST.md` (desktop + phone, each language). Acceptance: every box ticked or a bug logged. This is the largest remaining risk.
2. **Native-speaker proofreading** of Uzbek (Latin + Cyrillic) and Russian text: `strings.ts`, `content.ts`, `rules.ts`, `translit.ts` edge cases.
3. **Translate the game log.** Replace plain-string `appendLog(state, text)` with structured entries `{key, params}` formatted in `GameLog` via `tf()`. Acceptance: log lines follow the language switch; keep an English fallback so old saves still load (bump `SAVE_VERSION`).
4. Counter-offers in trading; sound files; rent-collected / largest-transaction stats; Playwright end-to-end tests.
5. Balance review from real play: AI-vs-AI games run 190-690 turns (4 players); consider whether that is too long for humans.

Out of scope (explicitly rejected): Fast/Long modes, music, real logos, auctions, crime-themed robbery, "Monopoly" naming.

---

## 9. Suggested working method
- One small change at a time; after EACH run `npx tsc --noEmit && npx vitest run && npm run build`, then summarize what changed, files touched, and tests added.
- Write the failing test first for engine rules (use `scriptedRng`, force decks, set state fields directly for setup).
- Prefer reading the file (`view`) immediately before editing; never edit from memory. Keep economy numbers only in `economy.ts` and derive ratios.
- Never call `resolveLanding` directly after movement (lesson 2); never put raw `\uXXXX` in JSX text (lesson 1).
- Keep the engine pure and UI-free; UI only dispatches commands as `actorId`.
- Before any release: run a real browser playthrough, then update README, bump version, zip without `node_modules`/`dist`.


---
## 9. v1.2 changes (gameplay + UX, engine-visible)
`SAVE_VERSION` is now **3** (board layout changed). Verified: `tsc` clean, `vitest` 236/236 in 17 files, `npm run build` OK. Still never viewed in a real browser (no browser in the authoring sandbox) - run `MANUAL_TEST.md` section v1.2.

1. **Walk first, consequences after.** The engine still resolves a move and its landing in one `applyCommand`. `GameProvider` now keeps the real state (AI, autosave) and a *presented* state: when a command moves a pawn, `planMovementHold` (`src/utils/movement.ts`) shows the new position + dice but the OLD cash/ownership/phase for `steps x hopStepMs + 450ms`; `busy` is true meanwhile (actions hidden, AI loop paused, dispatch ignored). Prompts, rent, cards and bot purchases therefore appear only after the pawn arrives. Off when animations are off or `prefers-reduced-motion`.
2. **Money floats.** `GameProvider` diffs cash in the presented state and emits `floats` (+green / -red); `MoneyFloats` renders them on player cards and above board tokens (transform/opacity only).
3. **Transport is forward-only** and collects the salary when it crosses START (`moveToTarget(..., true, 'travel')`).
4. **Tax Inspection is forward-only**: `sendToDetention` walks forward to cell 10 and pays the salary if that crosses START (from > 10). Triple doubles no longer clobber a liquidation triggered by that salary.
5. **Buy stays available**: `BUY_PROPERTY` also works in `AWAITING_ROLL` when the player has rolled this turn and stands on an unowned ownable space. The purchase dialog's button is now "Not now" with a hint. ActionBar shows a green/red Buy button.
6. **Senior Official is cell 30** (`corner-bribe`, id `bribe-official`); the old go-to-inspection corner is gone. `ATTEMPT_BRIBE` requires standing there; the dialog opens automatically on landing for humans (button "Walk away" to decline); AI `pickBribe` only fires there, after its roll.
7. **Debt is not mandatory bankruptcy**: in `AWAITING_LIQUIDATION` the commands `TAKE_LOAN`, `SELL_DEVELOPMENT`, `MORTGAGE`, `PROPOSE_TRADE`, and the new `PAY_DEBT` work; the debt auto-settles the moment cash covers it. A trade started in debt returns there (`tradeReturnPhase`). The debt dialog has "Raise money first" (set aside); the action bar then shows Pay debt / Debt options / Bank / Trade.
- Additive state fields (optional, UI hints only): `lastMove` (direction/kind for animation), `tradeReturnPhase`.
- New tests: `tests/v12-rules.test.ts`, `tests/movement-hold.test.ts`; `bribe`/`ai` tests now start on the bribe cell.

### Not done yet (from the v1.2 brief)
The "Look & Feel" visual stages 1-5 (design system, 2.5D board, bust pawns, dice/cards/money feedback, polish) have NOT been started: they were queued behind these rule fixes, one stage at a time with screenshot feedback. Bot balance (Banker never wins, bots rarely build/trade, long games) is also untouched.


---
## 10. v1.2 "Look & Feel" - Stage 1 (design system) DONE
Verified: `tsc` clean, `vitest` 241/241 in 19 files, `npm run build` OK, and - for the first time - **screenshots in a real headless Chromium** at 1280x720 and 390x844 in all 4 languages (start, new game, game, property dialog, Build, Bank) with an automatic text-overflow scan. Stages 2-5 are NOT started.

**Where things live**
- `src/styles/tokens.css` - the ONE place for colour ramps (navy / turquoise / gold), meaning colours, type scale, spacing, radii, shadows, motion, z-layers, and two Uzbek texture patterns (girih star, ikat strip; original inline SVG). `global.css` only consumes tokens.
- `src/styles/fonts.css` - bundled fonts (no network): **Manrope** (display: titles, buttons, numbers) + **Inter** (text), variable weights, latin / latin-ext / cyrillic / cyrillic-ext subsets only (cyrillic-ext covers Uzbek qu, gh, h, w). Files come from `@fontsource-variable/*` (SIL OFL); ~280 KB in the build.
- `src/components/icons/` - `Icon.tsx`, `paths.tsx` (24 original line icons: 8 property groups, 4 transport, 2 utilities, network stop, 2 card decks, corruption, Senior Official, Tax Inspection, START, Rest, Tax, lock), `iconFor.ts` (id -> icon). `.i-accent` shapes take gold `--icon-accent`.
- Restyled: buttons (bevel, press, gold focus ring, 44px touch targets), panels, modals (spring-in, ikat strip, display-font headings), toasts, player cards (player-colour edge, gold glow when active), card face (girih texture). Icons are wired into board cells, the property dialog (group badge), Build and travel lists, "my properties".

**Real bugs found by the first browser run and fixed (CSS only)**
1. Desktop: board was taller than its area (top row cut, bottom row under the action bar). Board is now sized from its container (`container-type: size`, `width: min(100cqw, 100cqh)`).
2. Phone: left panel, board and right panel all kept `grid-row: 1` and piled on top of each other. Fixed (`grid-row: auto` in the <=980px block); board first, action bar sticky and opaque, log capped.
3. Start screen was top-aligned; language buttons touched the emblem; setup name box cut its placeholder on phones; `background-attachment: fixed` removed (janky on iOS).
4. Data bug: Uzbek-Cyrillic "Chorsu choyxonasi" contained an ARABIC letter (U+062E) instead of Cyrillic h. Fixed; `tests/scripts.test.ts` now fails on any Arabic/Hebrew/Indic/Thai/CJK letter in `src/`.

**Known, deliberately left for Stage 2 (board and tiles)**: on a phone each board tile is only ~31 px wide, so long names ("Налоговая инспекция", "Подоходный налог") cannot fit; prices wrap on desktop; "Business Opportunity" is truncated; pawns overlap tile text; dice are plain cream squares with no pips until a roll. The Stage 2 answer is bigger tiles + zoom/pan + a Flat/Tilted toggle.

**How the screenshots were made** (repeat before reporting any later stage): `npm run build && npx vite preview --port 4173`, then Python Playwright with `executable_path='/opt/pw-browsers/chromium'`, `--no-sandbox`; a mid-game save (80 turns of AI play, 24 properties owned) is injected into `localStorage['uzbekiston-tycoon:save:v1']`, settings into `...:settings:v1`, and the page is overflow-scanned in JS (`scrollWidth > clientWidth` on non-ellipsis elements).
