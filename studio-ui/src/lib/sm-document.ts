/**
 * Local persistence for the single workspace `.sm` document.
 */

const DOC_KEY = 'stams:doc';

export function loadDoc(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(DOC_KEY);
}

export function saveDoc(text: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(DOC_KEY, text);
}

export const EXAMPLE_SM = `machine Turnstile {
  variables { alarmCount: float = 0.0 }
  events { coin push }
  actions {
    unlock { alarmCount = 0.0 }
    lock { alarmCount = 0.0 }
    alarm { alarmCount = alarmCount + 1.0 }
  }
  guards {
    canUnlock { alarmCount == 0.0 }
  }
  initial state Locked {
    entry lock
    on coin -> Unlocked guard canUnlock do unlock
    on push -> Locked do alarm
  }
  state Unlocked {
    on push -> Locked do lock
    on coin -> Unlocked
  }
}
`;
