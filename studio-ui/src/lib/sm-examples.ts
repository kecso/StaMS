export type SmExample = {
  id: string;
  title: string;
  description: string;
  text: string;
};

export const SM_EXAMPLES: SmExample[] = [
  {
    id: 'turnstile',
    title: 'Turnstile',
    description: 'Coin-operated turnstile with alarm counter.',
    text: `machine Turnstile {
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
}`
  },
  {
    id: 'counter',
    title: 'Counter (stops at 10)',
    description: 'Increments a variable on each tick; guards stop it at 10, reset clears it.',
    text: `machine Counter {
  variables { count: float = 0 }
  events { tick reset }
  actions {
    increment { count = count + 1 }
    clear { count = 0 }
  }
  guards {
    belowLimit { count < 9 }
    atLimit { count >= 9 }
  }
  initial state Counting {
    on tick -> Counting guard belowLimit do increment
    on tick -> Full guard atLimit do increment
    on reset -> Counting do clear
  }
  state Full {
    on reset -> Counting do clear
  }
}`
  },
  {
    id: 'traffic-light',
    title: 'Traffic light',
    description: 'Three-state cyclic controller.',
    text: `machine TrafficLight {
  events { tick }
  actions {
    showGreen { }
    showYellow { }
    showRed { }
  }
  initial state Green {
    entry showGreen
    on tick -> Yellow do showYellow
  }
  state Yellow {
    on tick -> Red do showRed
  }
  state Red {
    on tick -> Green do showGreen
  }
}`
  },
  {
    id: 'door',
    title: 'Door lock',
    description: 'Open/closed door with lock actions.',
    text: `machine Door {
  events { open close knock }
  actions {
    lockDoor { }
    unlockDoor { }
    signalKnock { }
  }
  guards {
    mayOpen { }
  }
  initial state Closed {
    entry lockDoor
    on open -> Open guard mayOpen do unlockDoor
    on knock -> Closed do signalKnock
  }
  state Open {
    on close -> Closed do lockDoor
  }
}`
  },
  {
    id: 'vending',
    title: 'Vending machine',
    description: 'Idle, selection, and dispensing flow.',
    text: `machine Vending {
  events { coin select dispense cancel }
  actions {
    acceptPayment { }
    releaseItem { }
    refund { }
  }
  initial state Idle {
    on coin -> Selecting do acceptPayment
  }
  state Selecting {
    on select -> Dispensing
    on cancel -> Idle do refund
  }
  state Dispensing {
    entry releaseItem
    on dispense -> Idle
  }
}`
  }
];

/** Append example text so a document can contain multiple machines. */
export function appendExampleText(current: string, snippet: string): string {
  const base = current.trimEnd();
  const addition = snippet.trim();
  if (!addition) {
    return base;
  }
  if (!base) {
    return addition;
  }
  return `${base}\n\n${addition}`;
}
