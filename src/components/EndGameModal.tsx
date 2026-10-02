import { useActiveGame } from '../state/GameProvider';
import { liquidValue, rankPlayers } from '../game/engine';
import { formatSom } from '../utils/currency';
import { TOKEN_ICONS } from '../utils/tokenIcons';
import { t, tf } from '../i18n/strings';
import type { Player } from '../game/types';

const TROPHY = '\ud83c\udfc6';

export default function EndGameModal({
  onPlayAgain,
  onReturnToMenu,
}: {
  onPlayAgain: () => void;
  onReturnToMenu: () => void;
}) {
  const { state } = useActiveGame();
  const lang = state.settings.language;
  if (state.phase !== 'GAME_OVER' || !state.winnerId) return null;

  const winner = state.players.find((p) => p.id === state.winnerId)!;
  const netWorth = liquidValue(state, winner.id);
  const propertiesOwned = Object.values(state.ownership).filter((o) => o.ownerId === winner.id).length;
  const developments = Object.values(state.ownership)
    .filter((o) => o.ownerId === winner.id)
    .reduce((sum, o) => sum + o.level, 0);

  const ranked: Player[] = rankPlayers(state);

  return (
    <div className="modal-overlay">
      <div className="panel panel--gold-edge modal victory-modal">
        <div className="victory-modal__trophy">{TROPHY}</div>
        <h2>{t('victory', lang)}</h2>
        <p className="text-sm text-muted">{tf('winnerLine', lang, { name: winner.name })}</p>
        <div className="victory-stats">
          <Stat label={t('netWorth', lang)} value={formatSom(netWorth)} />
          <Stat label={t('cash', lang)} value={formatSom(winner.cash)} />
          <Stat label={t('properties', lang)} value={String(propertiesOwned)} />
          <Stat label={t('developmentsStat', lang)} value={String(developments)} />
          <Stat label={t('round', lang)} value={String(state.turnNumber)} />
          <Stat label={t('playersHeading', lang)} value={String(state.players.length)} />
        </div>

        <h3 style={{ fontSize: 12, color: 'var(--text-muted)', margin: '18px 0 8px', textAlign: 'left' }}>
          {t('leaderboard', lang)}
        </h3>
        <div className="trade-list" style={{ maxHeight: 220 }}>
          {ranked.map((p, i) => (
            <div key={p.id} className="trade-item" style={{ opacity: p.bankrupt ? 0.7 : 1 }}>
              <span className="tabular" style={{ width: 22, textAlign: 'center', fontWeight: 700, color: 'var(--gold-soft)' }}>
                {i + 1}
              </span>
              <span
                className="player-card__token"
                style={{ background: p.tokenColor, width: 22, height: 22, fontSize: 11 }}
              >
                {TOKEN_ICONS[p.tokenShape]}
              </span>
              <span style={{ flex: 1 }}>{p.name}</span>
              {p.bankrupt ? (
                <span className="text-sm text-muted">{'\ud83d\udc80'} {t('bankruptLabel', lang)}</span>
              ) : (
                <span className="money">{formatSom(liquidValue(state, p.id))}</span>
              )}
            </div>
          ))}
        </div>

        <div className="modal__actions" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={onReturnToMenu}>
            {t('returnToMenu', lang)}
          </button>
          <button className="btn btn--primary" onClick={onPlayAgain}>
            {t('playAgain', lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="victory-stats__item">
      <div className="victory-stats__label">{label}</div>
      <div className="victory-stats__value tabular">{value}</div>
    </div>
  );
}
