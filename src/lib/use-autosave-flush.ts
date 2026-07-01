'use client';
/**
 * useAutosaveFlush — M4 fix
 *
 * Flushes any pending debounced autosave calls when the component unmounts
 * or the user navigates away (beforeunload). Without this, typed text is
 * silently lost if the user leaves before the 800ms debounce fires.
 *
 * Usage:
 *   const flushRef = useRef<Record<string, () => void>>({});
 *   // In handleAnswerChange: flushRef.current[key] = () => saveAnswer(key, value);
 *   useAutosaveFlush(debounceRef, flushRef);
 */

import { useEffect, RefObject } from 'react';

export function useAutosaveFlush(
  debounceRef: RefObject<Record<string, NodeJS.Timeout>>,
  flushRef: RefObject<Record<string, () => void>>
) {
  useEffect(() => {
    const flush = () => {
      const timers = debounceRef.current ?? {};
      const fns = flushRef.current ?? {};
      Object.keys(timers).forEach(key => {
        clearTimeout(timers[key]);
        fns[key]?.();
      });
    };

    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
