import { useState, useCallback, useRef } from 'react';

interface UseHistoryReturn<T> {
  state: T;
  setState: (newState: T, recordHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

const MAX_HISTORY = 50;

export function useHistory<T>(initialState: T): UseHistoryReturn<T> {
  const [state, setStateInternal] = useState<T>(initialState);
  const historyRef = useRef<T[]>([initialState]);
  const indexRef = useRef<number>(0);

  const setState = useCallback((newState: T, recordHistory: boolean = true) => {
    if (recordHistory) {
      // Remove any future states if we're not at the end
      const newHistory = historyRef.current.slice(0, indexRef.current + 1);
      newHistory.push(newState);

      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      } else {
        indexRef.current++;
      }

      historyRef.current = newHistory;
    }
    setStateInternal(newState);
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current > 0) {
      indexRef.current--;
      setStateInternal(historyRef.current[indexRef.current]);
    }
  }, []);

  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) {
      indexRef.current++;
      setStateInternal(historyRef.current[indexRef.current]);
    }
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [state];
    indexRef.current = 0;
  }, [state]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < historyRef.current.length - 1,
    clearHistory
  };
}
