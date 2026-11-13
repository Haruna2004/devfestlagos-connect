import { useCallback, useState } from "react";

// Intros you've acted on (said hi) or dismissed. Kept on this phone only.
const KEY = "connect.introsHidden";

export function loadHidden(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function useHiddenIntros() {
  const [hidden, setHidden] = useState(loadHidden);
  const hide = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        // storage blocked: hidden for this session only
      }
      return next;
    });
  }, []);
  return { hidden, hide };
}
