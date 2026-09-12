import { useCallback, useSyncExternalStore } from 'react';

/** Below this width the sidebar becomes a slide-over drawer and settings go full screen. */
export const MOBILE_QUERY = '(max-width: 767px)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
