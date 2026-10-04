import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { BOARD, BOARD_SIZE, spaceLabel } from '../game/data/board';
import {
  GROUPS,
  PROPERTIES,
  INFRASTRUCTURE,
  UTILITIES,
  isInfrastructureId,
  isPropertyId,
  isUtilityId,
} from '../game/data/properties';
import { computeRent, playersOwning, isMortgageUrgent, mortgageLapsLeft } from '../game/engine';
import { formatNumber } from '../utils/currency';
import type { BoardSpace, GameState, Player } from '../game/types';
import { t, localized } from '../i18n/strings';
import { CORRUPTION_TOLL_AMOUNT } from '../game/data/economy';
import MoneyFloats, { StartFloats } from './MoneyFloats';
import Icon from './icons/Icon';
import { assetIconName, specialIconName } from './icons/iconFor';
import { hopStepMs, pathSteps, reducedMotionPreferred } from '../utils/movement';
import { BOARD_RATIO, CORNER_H_PCT, CORNER_W_PCT, coordsPercent, gridPosition, tileShape } from './boardGeometry';

const INFRA_COLOR = '#6b7c99';
const UTILITY_COLOR = '#d4af37';

/** Black or white, whichever reads better on `hex` (WCAG contrast). */
export function inkOn(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastDark = (L + 0.05) / 0.06;
  return contrastWhite >= contrastDark ? '#ffffff' : '#0b1020';
}

/** The colour a whole tile is filled with (null = neutral tile: cards, taxes, official). */
export function tileColor(spaceId: string): string | null {
  if (isPropertyId(spaceId)) {
    const groupId = PROPERTIES[spaceId].groupId;
    return GROUPS.find((g) => g.id === groupId)?.color ?? null;
  }
  if (isInfrastructureId(spaceId)) return INFRA_COLOR;
  if (isUtilityId(spaceId)) return UTILITY_COLOR;
  return null;
}

function priceOf(spaceId: string): number | undefined {
  if (isPropertyId(spaceId)) return PROPERTIES[spaceId].price;
  if (isInfrastructureId(spaceId)) return INFRASTRUCTURE[spaceId].price;
  if (isUtilityId(spaceId)) return UTILITIES[spaceId].price;
  return undefined;
}

interface BoardProps {
  state: GameState;
  onSelectSpace: (spaceId: string) => void;
  /** Dashboard drawn in the middle of the board (dice, players, buttons, log). */
  centre?: ReactNode;
  /** Phones: draw the board this many CSS px wide (it is then panned/zoomed) instead of fitting the screen. */
  fixedWidth?: number;
}

export default function Board({ state, onSelectSpace, centre, fixedWidth }: BoardProps) {
  const living = state.players.filter((p) => !p.bankrupt);
  const wrapStyle: CSSProperties | undefined = fixedWidth
    ? { width: fixedWidth, height: fixedWidth / BOARD_RATIO, minWidth: fixedWidth }
    : undefined;
  const boardStyle = {
    '--cw': `${CORNER_W_PCT}%`,
    '--ch': `${CORNER_H_PCT}%`,
  } as CSSProperties;
  return (
    <div className={`board-wrap${fixedWidth ? ' board-wrap--fixed' : ''}`} style={wrapStyle}>
      <div className="board" style={boardStyle}>
        {BOARD.map((space) => (
          <Cell key={space.id} space={space} state={state} onSelect={onSelectSpace} />
        ))}
        <div className="board__center">{centre}</div>
        <div className="board__start-floats" style={{ left: `${coordsPercent(0).left}%`, top: `${coordsPercent(0).top}%` }}>
          <StartFloats />
        </div>
        <div className="board__tokens-layer">
          {living.map((p) => (
            <AnimatedToken
              key={p.id}
              player={p}
              allPlayers={living}
              animate={state.settings.animations}
              backward={state.lastMove?.playerId === p.id && state.lastMove.backward}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DevBlocks({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <span className={`cell__dev${level >= 5 ? ' cell__dev--holding' : ''}`} aria-label={`level ${level}`}>
      {level >= 5 ? <span className="cell__dev-block cell__dev-block--star" /> : Array.from({ length: level }).map((_, i) => <span key={i} className="cell__dev-block" />)}
    </span>
  );
}

function Cell({ space, state, onSelect }: { space: BoardSpace; state: GameState; onSelect: (id: string) => void }) {
  const { row, col } = gridPosition(space.index);
  const label = spaceLabel(space);
  const lang = state.settings.language;
  const shape = tileShape(space.index);
  const gridStyle: CSSProperties = { gridRow: row, gridColumn: col };
  const name = localized(label, lang);
  const nameClass = name.length > 11 ? ' cell__name--long' : name.length > 8 ? ' cell__name--mid' : '';
  const specialIcon = specialIconName(space);

  if (shape === 'corner') {
    return (
      <div
        className={`cell cell--corner cell--${space.id}`}
        style={gridStyle}
        title={space.kind === 'corner-bribe' ? t('bribeExplain', lang) : undefined}
      >
        <span className="cell__icon">{specialIcon && <Icon name={specialIcon} />}</span>
        <span className="cell__name">{name}</span>
      </div>
    );
  }

  const ownable = isPropertyId(space.id) || isInfrastructureId(space.id) || isUtilityId(space.id);
  const ownership = ownable ? state.ownership[space.id] : null;
  const owner: Player | null = ownership?.ownerId ? state.players.find((p) => p.id === ownership.ownerId) ?? null : null;
  const price = ownable ? priceOf(space.id) : undefined;
  const fill = tileColor(space.id);

  let rentDisplay: string | null = null;
  if (owner && ownership && !ownership.mortgaged) {
    if (isUtilityId(space.id)) {
      const count = playersOwning(state, owner.id, Object.keys(UTILITIES)).length;
      rentDisplay = `${count >= 2 ? 10 : 4}\u00d7`;
    } else {
      rentDisplay = formatNumber(computeRent(state, space.id, 7));
    }
  }

  const classes = ['cell', `cell--${shape}`];
  if (fill) classes.push('cell--filled');
  if (owner) classes.push('cell--owned');
  if (ownership?.mortgaged) classes.push('cell--mortgaged');
  if (space.kind.startsWith('card')) classes.push(`cell--${space.kind}`);
  if (space.kind === 'tax') classes.push('cell--tax');
  if (space.kind === 'corruption') classes.push('cell--corruption');

  const style = {
    ...gridStyle,
    '--tile-bg': fill ?? 'var(--tile-neutral)',
    '--tile-ink': fill ? inkOn(fill) : 'var(--tile-neutral-ink)',
    '--owner-color': owner?.tokenColor,
    '--owner-ink': owner ? inkOn(owner.tokenColor) : undefined,
  } as CSSProperties;

  const icon = specialIcon ?? assetIconName(space.id);

  return (
    <div
      className={classes.join(' ')}
      style={style}
      title={space.kind === 'corruption' ? t('corruptionTip', lang) : name}
      onClick={() => onSelect(space.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(space.id);
        }
      }}
    >
      <div className="cell__head">
        {icon && (
          <span className="cell__icon">
            <Icon name={icon} />
          </span>
        )}
        <span className={`cell__name${nameClass}`}>{name}</span>
      </div>
      <div className="cell__status">
        {ownership && ownership.level > 0 && isPropertyId(space.id) && <DevBlocks level={ownership.level} />}
        {space.kind === 'corruption' && <span className="cell__price">{formatNumber(CORRUPTION_TOLL_AMOUNT)}</span>}
        {ownable && !owner && price !== undefined && <span className="cell__price">{formatNumber(price)}</span>}
        {owner && (
          <span className="cell__owner" style={{ background: owner.tokenColor, color: inkOn(owner.tokenColor) }}>
            {owner.name}
          </span>
        )}
        {rentDisplay && <span className="cell__rent">{rentDisplay}</span>}
        {ownership?.mortgaged && (
          <span
            className={`cell__lock ${isMortgageUrgent(state, space.id) ? 'lap-warn' : ''}`}
            title={`${mortgageLapsLeft(state, space.id) ?? ''} ${t('lapsToRedeem', lang)}`}
          >
            <Icon name="lock" /> {mortgageLapsLeft(state, space.id) ?? ''}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Animated tokens -----------------------------------------------------------

/** Steps a token through every intermediate space, in the direction the move
 * actually went (forward around the board, except "go back" cards), instead of
 * jumping straight from the old space to the new one. */
function useHopPath(actualPosition: number, animate: boolean, backward: boolean) {
  const [displayPos, setDisplayPos] = useState(actualPosition);
  const [hopping, setHopping] = useState(false);
  const [glideMs, setGlideMs] = useState(0);
  const prevRef = useRef(actualPosition);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];

    if (actualPosition === prevRef.current) return;
    const from = prevRef.current;
    const to = actualPosition;
    prevRef.current = actualPosition;

    if (!animate || reducedMotionPreferred()) {
      setDisplayPos(to);
      return;
    }

    const steps = pathSteps(from, to, backward);
    if (steps === 0) {
      setDisplayPos(to);
      return;
    }

    const stepMs = hopStepMs(steps);
    setGlideMs(stepMs);
    for (let i = 1; i <= steps; i++) {
      const id = window.setTimeout(() => {
        const next = backward ? (((from - i) % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE : (from + i) % BOARD_SIZE;
        setDisplayPos(next);
        // The pawn glides across every tile without pausing; one small bounce when it arrives.
        if (i === steps) {
          setHopping(true);
          timers.current.push(window.setTimeout(() => setHopping(false), 260));
        }
      }, i * stepMs);
      timers.current.push(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualPosition, animate]);

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
    },
    []
  );

  return { displayPos, hopping, glideMs };
}

// Offsets in units of the token size, so clustered pawns scale with the board.
const CLUSTER_OFFSETS = [
  { dx: 0, dy: 0 },
  { dx: 0.32, dy: -0.18 },
  { dx: -0.32, dy: 0.18 },
  { dx: 0.32, dy: 0.3 },
];

function AnimatedToken({
  player,
  allPlayers,
  animate,
  backward,
}: {
  player: Player;
  allPlayers: Player[];
  animate: boolean;
  backward: boolean;
}) {
  const { displayPos, hopping, glideMs } = useHopPath(player.position, animate, backward);
  const { left, top } = coordsPercent(displayPos);

  const sharingSpace = allPlayers.filter((p) => p.position === player.position);
  const idxAmong = Math.max(0, sharingSpace.findIndex((p) => p.id === player.id));
  const offset = sharingSpace.length > 1 ? CLUSTER_OFFSETS[idxAmong % CLUSTER_OFFSETS.length] : { dx: 0, dy: 0 };
  const arrived = displayPos === player.position;

  const style: CSSProperties = {
    left: `${left}%`,
    top: `${top}%`,
    transition: glideMs && !arrived ? `left ${glideMs}ms linear, top ${glideMs}ms linear` : undefined,
    marginLeft: arrived ? `calc(var(--token-size) * ${offset.dx})` : 0,
    marginTop: arrived ? `calc(var(--token-size) * ${offset.dy})` : 0,
  };

  return (
    <div className={`board-token${hopping ? ' board-token--hopping' : ''}`} style={style} title={player.name}>
      <TokenBust color={player.tokenColor} initial={player.name.trim().charAt(0).toUpperCase() || '?'} />
      <MoneyFloats playerId={player.id} className="money-floats--token" />
    </div>
  );
}

function TokenBust({ color, initial }: { color: string; initial: string }) {
  return (
    <svg viewBox="0 0 40 40" className="board-token__svg" aria-hidden="true">
      <path d="M5 39 C5 25 11 19 20 19 C29 19 35 25 35 39 Z" fill={color} stroke="var(--token-outline)" strokeWidth="2.4" />
      <circle cx="20" cy="12.5" r="10" fill={color} stroke="var(--token-outline)" strokeWidth="2.4" />
      <text x="20" y="17" textAnchor="middle" fontSize="11" fontWeight="800" fill={inkOn(color)}>
        {initial}
      </text>
    </svg>
  );
}
