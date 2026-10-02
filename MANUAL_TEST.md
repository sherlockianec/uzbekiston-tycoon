# Manual test checklist

Automated tests cannot judge visuals, motion, touch or sound. Run `npm run dev`, then tick
each box. Do it once on desktop and once on a phone (or a narrow browser window).

## Menus and language
- [ ] Start screen shows the language buttons EN / O'ZB / РУС / ЎЗБ; each switches ALL text
- [ ] Choose a language, start a game: the game is in that language
- [ ] Quit to menu, reload the page: the language is remembered
- [ ] Rules page: every section reads sensibly in all four languages; the bribe numbers match the game
- [ ] New game: 2, 3 and 4 players with 1-4 humans and 0-3 AI; bots get their own names; "Start" is blocked with zero humans

## Board and tokens
- [ ] Tiles are readable: name, owner, current rent, development icons
- [ ] Tokens are human busts, clearly visible, and hop tile by tile when moving
- [ ] The two Fintech / Construction / Utility groups no longer look the same colour
- [ ] Local Official tile shows the handshake icon and 400 000 so'm

## A turn
- [ ] Dice animate; doubles roll again; three doubles go to Tax Inspection
- [ ] Landing on an unowned property: Buy button is green if affordable, red + "short by X" if not; declining leaves it unowned (no auction)
- [ ] Card spaces: card appears with text, money changes only after OK; check a loan card with and without a loan
- [ ] Transport asset: Travel button lets you pick another one and resolves it
- [ ] Bribe: result popup for you; no popup for bots; amounts vary between attempts

## Money systems
- [ ] Build: lists only complete groups; unaffordable rows are red; level 5 costs double
- [ ] Mortgage: lock + laps left on tile, red at 2 or fewer; passing START counts it down; at 0 the bank takes it and a toast appears
- [ ] Bank: take a loan; a toast appears each START pass; repay early works; green/red states are right
- [ ] Trade: Balance and +/- buttons work; AI proposes a trade to you sometimes; Accept/Reject work
- [ ] Bankruptcy: warning appears when you could still raise money; leaderboard at the end ranks everyone

## Feel
- [ ] Sound on/off works; reduced-motion setting disables animation
- [ ] No horizontal scroll on a phone; buttons are tappable; modals fit the screen
- [ ] Continue Game resumes exactly where you quit
