export type SmExample = {
  id: string;
  title: string;
  description: string;
  text: string;
  /** Includes `constraints { ... }` blocks for the Verify drawer. */
  hasVerification?: boolean;
};

/** Canonical verification walkthrough (matches `examples/turnstile.sm`). */
export const VERIFICATION_EXAMPLE_ID = 'turnstile';

/** Read the first machine-level `description "..."` from `.sm` text. */
export function extractMachineDescription(text: string): string | undefined {
  const match = text.match(/^\s*description\s+"([^"]*)"/m);
  return match?.[1];
}

function withDescription(example: Omit<SmExample, 'description'> & { description?: string }): SmExample {
  return {
    ...example,
    description: example.description ?? extractMachineDescription(example.text) ?? example.title
  };
}

const RAW_EXAMPLES: Array<Omit<SmExample, 'description'> & { description?: string }> = [
  {
    id: VERIFICATION_EXAMPLE_ID,
    title: 'Turnstile',
    hasVerification: true,
    text: `machine Turnstile {
  description "Coin-operated turnstile with safety and goal constraints."

  variables {
    alarmCount: float = 0.0
  }

  events {
    coin
    push
  }

  actions {
    unlock {
      alarmCount = alarmCount + 1.0
    }
    lock {
      alarmCount = 0.0
    }
    alarm {
      alarmCount = alarmCount + 1.0
    }
  }

  guards {
    canUnlock {
      alarmCount == 0.0
    }
  }

  constraints {
    safety noAlarmWhenLocked {
      alarmCount >= 0.0
    }
    goal eventuallyUnlocked {
      inState(Unlocked)
    }
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
    title: 'Counter',
    hasVerification: true,
    text: `machine Counter {
  description "Counts to full with safety and goal constraints; reset only from Full."

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
  constraints {
    safety countNonNegative {
      count >= 0
    }
    goal eventuallyFull {
      count >= 9
    }
  }
  initial state Counting {
    on tick -> Counting guard belowLimit do increment
    on tick -> Full guard atLimit do increment
  }
  state Full {
    on reset -> Counting do clear
  }
}`
  },
  {
    id: 'traffic-light',
    title: 'Traffic light',
    text: `machine TrafficLight {
  description "Three-state cyclic controller."

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
    text: `machine Door {
  description "Open/closed door with lock actions."

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
    text: `machine Vending {
  description "Idle, selection, and dispensing flow."

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

export const SM_EXAMPLES: SmExample[] = RAW_EXAMPLES.map(withDescription);

export function getExampleById(id: string): SmExample | undefined {
  return SM_EXAMPLES.find((item) => item.id === id);
}

export function getVerificationExample(): SmExample {
  return getExampleById(VERIFICATION_EXAMPLE_ID) ?? SM_EXAMPLES[0];
}

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

/** Replace document text with a single example (used for “load example”). */
export function loadExampleText(example: SmExample): string {
  return example.text.trim();
}
