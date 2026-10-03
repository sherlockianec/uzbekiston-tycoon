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


## v1.2 checks (do these on desktop and on a phone)
1. Roll: the pawn hops tile by tile; the Buy / Not now dialog appears only AFTER it lands. Play a bot: its purchase and any rent appear only after its pawn has arrived.
2. Every cash change shows a green +amount or red -amount next to the player's icon in the player list and above the pawn on the board (rent, salary, tax, cards, bribe, loans, trades).
3. Railways/Airways/Metro: the travel list never goes backwards; Metro -> Railways shows "passes START: +1 500 000" and pays it.
4. Get sent to Tax Inspection from the far side of the board (card or 3 doubles): the pawn walks forward past START and you gain the salary.
5. Stand on an unowned, unaffordable property: press "Not now", take a loan in Bank, then press Buy in the action bar.
6. Corner top-right is the Senior Official. Land on it: the bribe dialog opens; "Walk away" works; the Bribe button is not shown anywhere else.
7. Get into debt (e.g. land on a big rent with little cash): "Raise money first" closes the dialog; Bank, Trade and Pay debt work; Declare Bankruptcy is optional until you choose it.


## v1.2 Stage 1 checks (look and feel)
1. Start, New Game, Rules and Game screens: navy background, gold title in a rounded display font, turquoise primary button, no emoji left on the board cells (icons instead).
2. Click a property: a dialog opens with a coloured group badge and a thin diamond-pattern strip along its top edge.
3. Tab through the screen with the keyboard: every button shows a gold focus ring.
4. Switch all 4 languages on phone and desktop: no text pokes out of dialogs, buttons or panels. (Board tiles on a phone are still too small for long names - Stage 2.)
5. Turn on your device's "reduce motion": dialogs and toasts appear without sliding.
