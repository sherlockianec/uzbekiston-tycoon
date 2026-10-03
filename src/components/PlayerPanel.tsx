import type React from 'react';
import type { GameState, Player } from '../game/types';
import { formatSom } from '../utils/currency';
import { TOKEN_ICONS } from '../utils/tokenIcons';
import { GROUPS, PROPERTIES, INFRASTRUCTURE, UTILITIES, isPropertyId, isInfrastructureId } from '../game/data/properties';
import { t, localized } from '../i18n/strings';
import { isMortgageUrgent, mortgageLapsLeft } from '../game/engine';
import MoneyFloats from './MoneyFloats';
import Icon from './icons/Icon';
import { assetIconName, groupIconName } from './icons/iconFor';

export function PlayerList({ state }: { state: GameState }) {
  return (
    <div className="panel scroll-y" style={{ padding: 12 }}>
      {state.players.map((p, i) => (
        <PlayerCard key={p.id} player={p} isActive={i === state.currentPlayerIndex} state={state} />
      ))}
    </div>
  );
}

function PlayerCard({ player, isActive, state }: { player: Player; isActive: boolean; state: GameState }) {
  const lang = state.settings.language;
  const ownedCount = Object.values(state.ownership).filter((o) => o.ownerId === player.id).length;
  const classes = ['player-card'];
  if (isActive && !player.bankrupt) classes.push('player-card--active');
  if (player.bankrupt) classes.push('player-card--bankrupt');

  return (
    <div className={classes.join(' ')} style={{ '--player-color': player.tokenColor } as React.CSSProperties}>
      <div className="player-card__head">
        <span className="player-card__token" style={{ background: player.tokenColor }}>
          {TOKEN_ICONS[player.tokenShape]}
        </span>
        <span className="player-card__name">{player.name}</span>
        {player.isAI && (
          <span className="text-muted text-sm" title={player.personality}>
            AI
          </span>
        )}
      </div>
      <div className="player-card__cash money">
        {formatSom(player.cash)}
        <MoneyFloats playerId={player.id} className="money-floats--card" />
      </div>
      <div className="player-card__meta">
        {ownedCount} {t('properties', lang).toLowerCase()}
        {player.inDetention ? ' \u00b7 \u23f8 detention' : ''}
      </div>
      {player.bankrupt && <div className="status-chip">{'\ud83d\udc80'} bankrupt</div>}
    </div>
  );
}

export function MyProperties({
  state,
  playerId,
  onSelectSpace,
}: {
  state: GameState;
  playerId: string;
  onSelectSpace: (id: string) => void;
}) {
  const lang = state.settings.language;
  const owned = Object.entries(state.ownership).filter(([, o]) => o.ownerId === playerId);

  return (
    <div className="panel scroll-y" style={{ padding: 12, flex: 1, minHeight: 0 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-muted)' }}>{t('properties', lang)}</h3>
      {owned.length === 0 && <p className="text-sm text-muted">{'\u2014'}</p>}
      {owned.map(([id, o]) => {
        const def = isPropertyId(id) ? PROPERTIES[id] : isInfrastructureId(id) ? INFRASTRUCTURE[id] : UTILITIES[id];
        return (
          <div key={id} className="trade-item" onClick={() => onSelectSpace(id)} style={{ marginBottom: 6 }}>
            {(() => {
              const groupId = isPropertyId(id) ? PROPERTIES[id].groupId : null;
              const icon = groupId ? groupIconName(groupId) : assetIconName(id);
              const color = groupId ? GROUPS.find((g) => g.id === groupId)?.color : '#6b7c99';
              return icon ? (
                <span className="group-dot" style={{ '--badge-color': color } as React.CSSProperties}>
                  <Icon name={icon} />
                </span>
              ) : null;
            })()}
            <span style={{ flex: 1 }}>{localized(def, lang)}</span>
            {o.mortgaged && (
              <span
                className={isMortgageUrgent(state, id) ? 'lap-warn' : ''}
                title={`${mortgageLapsLeft(state, id) ?? ''} ${t('lapsToRedeem', lang)}`}
              >
                <Icon name="lock" /> {mortgageLapsLeft(state, id) ?? ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
