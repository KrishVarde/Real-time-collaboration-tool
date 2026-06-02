import { useRef, useCallback } from 'react';

/**
 * Returns a debounced version of the callback.
 * The returned function resets the timer on every call and
 * only fires `fn` after `delay` ms of silence.
 */
export function useDebounce(fn, delay) {
  const timerRef = useRef(null);

  const debounced = useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fn(...args);
        timerRef.current = null;
      }, delay);
    },
    [fn, delay]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { debounced, cancel };
}
