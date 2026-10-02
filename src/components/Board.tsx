import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
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
import { DEVELOPMENT_LEVEL_ICONS } from '../game/data/economy';
import { computeRent, playersOwning, isMortgageUrgent, mortgageLapsLeft } from '../game/engine';
import { formatSom } from '../utils/currency';
import type { BoardSpace, GameState, Player } from '../game/types';
import Emblem from './Emblem';
import { t, localized } from '../i18n/strings';
import { CORRUPTION_TOLL_AMOUNT } from '../game/data/economy';

const ICON_CARD_MAHALLA = '\ud83c\udff0';
const ICON_CARD_BUSINESS = '\ud83d\udcbc';
const ICON_CORRUPTION = '\ud83e\udd1d';
const ICON_TAX = '\ud83d\udcb8';
const ICON_LOCK = '\ud83d\udd12';
const ICON_START = '\ud83c\udfc1';
const ICON_DETENTION = '\ud83d\udd0d';
const ICON_REST = '\ud83c\udf75';
const ICON_GO_TO_DETENTION = '\ud83d\udea8';

function gridPosition(index: number): { row: number; col: number } {
  if (index === 0) return { row: 11, col: 11 };
  if (index <= 9) return { row: 11, col: 11 - index };
  if (index === 10) return { row: 11, col: 1 };
  if (index <= 19) return { row: 11 - (index - 10), col: 1 };
  if (index === 20) return { row: 1, col: 1 };
  if (index <= 29) return { row: 1, col: 1 + (index - 20) };
  if (index === 30) return { row: 1, col: 11 };
  return { row: 1 + (index - 30), col: 11 };
}

function coordsPercent(index: number): { left: number; top: number } {
  const { row, col } = gridPosition(index);
  return { left: ((col - 0.5) / 11) * 100, top: ((row - 0.5) / 11) * 100 };
}

function groupColor(spaceId: string): string | null {
  if (isPropertyId(spaceId)) {
    const groupId = PROPERTIES[spaceId].groupId;
    return GROUPS.find((g) => g.id === groupId)?.color ?? null;
  }
  if (isInfrastructureId(spaceId)) return '#6b7c99';
  if (isUtilityId(spaceId)) return '#D4AF37';
  return null;
}

function cornerIcon(spaceId: string): string {
  switch (spaceId) {
    case 'start':
      return ICON_START;
    case 'detention':
      return ICON_DETENTION;
    case 'rest':
      return ICON_REST;
    case 'go-to-detention':
      return ICON_GO_TO_DETENTION;
    default:
      return '';
  }
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
}

export default function Board({ state, onSelectSpace }: BoardProps) {
  const lang = state.settings.language;
  const living = state.players.filter((p) => !p.bankrupt);
  return (
    <div className="board-wrap">
      <div className="board">
        {BOARD.map((space) => (
          <Cell key={space.id} space={space} state={state} onSelect={onSelectSpace} />
        ))}
        <div className="board__center">
          <Emblem className="board__center-emblem" />
          <div className="board__center-title">{t('appTitle', lang)}</div>
        </div>
        <div className="board__tokens-layer">
          {living.map((p) => (
            <AnimatedToken key={p.id} player={p} allPlayers={living} animate={state.settings.animations} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Cell({ space, state, onSelect }: { space: BoardSpace; state: GameState; onSelect: (id: string) => void }) {
  const { row, col } = gridPosition(space.index);
  const label = spaceLabel(space);
  const lang = state.settings.language;
  const isCorner = space.kind.startsWith('corner');
  const gridStyle: CSSProperties = { gridRow: row, gridColumn: col };

  if (isCorner) {
    return (
      <div className="cell cell--corner" style={gridStyle}>
        <span className="cell__icon">{cornerIcon(space.id)}</span>
        <span className="cell__name">{localized(label, lang)}</span>
      </div>
    );
  }

  const ownable = isPropertyId(space.id) || isInfrastructureId(space.id) || isUtilityId(space.id);
  const ownership = ownable ? state.ownership[space.id] : null;
  const owner: Player | null = ownership?.ownerId ? state.players.find((p) => p.id === ownership.ownerId) ?? null : null;
  const price = ownable ? priceOf(space.id) : undefined;
  const bar = groupColor(space.id);
  const devIcon =
    ownership && isPropertyId(space.id) && ownership.level > 0 ? DEVELOPMENT_LEVEL_ICONS[ownership.level] : null;

  let rentDisplay: string | null = null;
  if (owner && ownership && !ownership.mortgaged) {
    if (isUtilityId(space.id)) {
      const count = playersOwning(state, owner.id, Object.keys(UTILITIES)).length;
      rentDisplay = `${count >= 2 ? 10 : 4}\u00d7`;
    } else {
      rentDisplay = formatSom(computeRent(state, space.id, 7));
    }
  }

  const cellClasses = ['cell'];
  if (owner) cellClasses.push('cell--owned');
  if (ownership?.mortgaged) cellClasses.push('cell--mortgaged');

  const cellStyle = {
    ...gridStyle,
    '--owner-color': owner?.tokenColor,
  } as CSSProperties;

  return (
    <div className={cellClasses.join(' ')} style={cellStyle} title={space.kind === 'corruption' ? t('corruptionTip', lang) : undefined} onClick={() => onSelect(space.id)} role="button" tabIndex={0}>
      {bar && <div className="cell__bar" style={{ background: bar }} />}
      <div className="cell__body">
        {space.kind === 'card-mahalla' && <span className="cell__icon">{ICON_CARD_MAHALLA}</span>}
        {space.kind === 'card-business' && <span className="cell__icon">{ICON_CARD_BUSINESS}</span>}
        {space.kind === 'tax' && <span className="cell__icon">{ICON_TAX}</span>}
        {space.kind === 'corruption' && <span className="cell__icon">{ICON_CORRUPTION}</span>}
        {space.kind === 'corruption' && <span className="cell__price">{formatSom(CORRUPTION_TOLL_AMOUNT)}</span>}
        {devIcon && <span className="cell__icon">{devIcon}</span>}
        <span className="cell__name">{localized(label, lang)}</span>
        {owner && (
          <span className="cell__owner" style={{ background: owner.tokenColor }}>
            {owner.name}
          </span>
        )}
        {ownable && !owner && price !== undefined && <span className="cell__price">{formatSom(price)}</span>}
        {rentDisplay && <span className="cell__rent">{rentDisplay}</span>}
        {ownership?.mortgaged && (
          <span
            className={`cell__lock ${isMortgageUrgent(state, space.id) ? 'lap-warn' : ''}`}
            title={`${mortgageLapsLeft(state, space.id) ?? ''} ${t('lapsToRedeem', lang)}`}
          >
            {ICON_LOCK} {mortgageLapsLeft(state, space.id) ?? ''}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Animated tokens -----------------------------------------------------------

function reducedMotionPreferred(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Steps a token through every intermediate space (taking whichever
 * direction, forward or backward, is the shorter path) instead of jumping
 * straight from the old space to the new one. */
function useHopPath(actualPosition: number, animate: boolean) {
  const [displayPos, setDisplayPos] = useState(actualPosition);
  const [hopping, setHopping] = useState(false);
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

    const forwardDist = (to - from + BOARD_SIZE) % BOARD_SIZE;
    const backwardDist = (from - to + BOARD_SIZE) % BOARD_SIZE;
    const goForward = forwardDist <= backwardDist;
    const steps = goForward ? forwardDist : backwardDist;

    if (steps === 0 || steps > 20) {
      setDisplayPos(to);
      return;
    }

    const stepMs = 230;
    for (let i = 1; i <= steps; i++) {
      const id = window.setTimeout(() => {
        const next = goForward ? (from + i) % BOARD_SIZE : (((from - i) % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
        setDisplayPos(next);
        setHopping(true);
        const clearId = window.setTimeout(() => setHopping(false), stepMs - 30);
        timers.current.push(clearId);
      }, i * stepMs);
      timers.current.push(id);
    }
  }, [actualPosition, animate]);

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
    },
    []
  );

  return { displayPos, hopping };
}

const CLUSTER_OFFSETS = [
  { dx: 0, dy: 0 },
  { dx: 11, dy: -7 },
  { dx: -11, dy: 7 },
  { dx: 11, dy: 9 },
];

function AnimatedToken({ player, allPlayers, animate }: { player: Player; allPlayers: Player[]; animate: boolean }) {
  const { displayPos, hopping } = useHopPath(player.position, animate);
  const { left, top } = coordsPercent(displayPos);

  const sharingSpace = allPlayers.filter((p) => p.position === player.position);
  const idxAmong = Math.max(0, sharingSpace.findIndex((p) => p.id === player.id));
  const offset = sharingSpace.length > 1 ? CLUSTER_OFFSETS[idxAmong % CLUSTER_OFFSETS.length] : { dx: 0, dy: 0 };
  const arrived = displayPos === player.position;

  const style: CSSProperties = {
    left: `${left}%`,
    top: `${top}%`,
    marginLeft: arrived ? offset.dx : 0,
    marginTop: arrived ? offset.dy : 0,
  };

  return (
    <div className={`board-token${hopping ? ' board-token--hopping' : ''}`} style={style} title={player.name}>
      <TokenBust color={player.tokenColor} initial={player.name.trim().charAt(0).toUpperCase() || '?'} />
    </div>
  );
}

function TokenBust({ color, initial }: { color: string; initial: string }) {
  return (
    <svg viewBox="0 0 40 40" className="board-token__svg" aria-hidden="true">
      <path d="M5 39 C5 25 11 19 20 19 C29 19 35 25 35 39 Z" fill={color} stroke="#0a0f1c" strokeWidth="2" />
      <circle cx="20" cy="12.5" r="10" fill={color} stroke="#0a0f1c" strokeWidth="2" />
      <text x="20" y="17" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0a0f1c">
        {initial}
      </text>
    </svg>
  );
}
