import { useEffect, useState } from 'react';

/** True on phones / small tablets, where the board is panned and zoomed instead of fitted. */
export const NARROW_QUERY = '(max-width: 900px), (max-height: 520px)';

function read(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(NARROW_QUERY).matches;
}

export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState<boolean>(read);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return narrow;
}
