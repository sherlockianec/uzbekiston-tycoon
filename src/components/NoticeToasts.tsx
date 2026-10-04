import { useEffect } from 'react';
import type { GameNotice, Language } from '../game/types';
import { ownableDef } from '../game/engine';
import { formatSom } from '../utils/currency';
import { t, localized } from '../i18n/strings';
import { useActiveGame } from '../state/GameProvider';

export const TOAST_DURATION_MS = 7000;

/** Pure: the sentence a notice shows, in the given language. */
export function noticeText(n: GameNotice, lang: Language): string {
  if (n.kind === 'loanPaid') {
    return t('toastLoanPaid', lang).replace('{amount}', formatSom(n.amount));
  }
  if (n.kind === 'loanLap') {
    return t('toastLoanLap', lang).replace('{amount}', formatSom(n.amount)).replace('{n}', String(n.remaining));
  }
  const name = n.spaceId ? localized(ownableDef(n.spaceId), lang) : '';
  return t('toastForeclosed', lang).replace('{name}', name);
}

function Toast({ notice, lang, onDismiss }: { notice: GameNotice; lang: Language; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice.id]);
  return (
    <div className={`toast toast--${notice.kind}`}>
      <span className="toast__text">{noticeText(notice, lang)}</span>
      <button className="toast__close" onClick={onDismiss} aria-label={t('dismiss', lang)}>
        {'\u00d7'}
      </button>
    </div>
  );
}

export default function NoticeToasts() {
  const { state, dispatch } = useActiveGame();
  const lang = state.settings.language;
  const notices = state.notices ?? [];
  if (notices.length === 0) return null;
  const actorId = state.players[state.currentPlayerIndex].id;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {notices.map((n) => (
        <Toast key={n.id} notice={n} lang={lang} onDismiss={() => dispatch({ type: 'DISMISS_NOTICE', id: n.id }, actorId)} />
      ))}
    </div>
  );
}
