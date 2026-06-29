import { useEffect, useState } from 'react';

import { validateSm, type SmDiagnostic } from '@/lib/sm-language';

export type SmValidationSource = 'langium' | 'local' | 'idle';

export type SmValidationState = {
  valid: boolean;
  diagnostics: SmDiagnostic[];
  source: SmValidationSource;
  loading: boolean;
};

const PARSE_URL = '/api/stams/parse';
const DEBOUNCE_MS = 350;

type ParseResponse = {
  ok?: boolean;
  diagnostics?: SmDiagnostic[];
};

export async function fetchSmDiagnostics(
  text: string,
  signal?: AbortSignal
): Promise<Omit<SmValidationState, 'loading'>> {
  try {
    const res = await fetch(PARSE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal
    });
    if (!res.ok) {
      throw new Error(`parse HTTP ${res.status}`);
    }
    const data = (await res.json()) as ParseResponse;
    const diagnostics = data.diagnostics ?? [];
    return {
      valid: Boolean(data.ok),
      diagnostics,
      source: 'langium'
    };
  } catch (err) {
    if (signal?.aborted) {
      throw err;
    }
    const diagnostics = validateSm(text);
    return {
      valid: !diagnostics.some((d) => d.severity === 'error'),
      diagnostics,
      source: 'local'
    };
  }
}

/** Debounced Langium validation via POST /api/stams/parse; falls back to local rules offline. */
export function useSmValidation(text: string): SmValidationState {
  const [state, setState] = useState<SmValidationState>({
    valid: true,
    diagnostics: [],
    source: 'idle',
    loading: false
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true }));

    const timer = window.setTimeout(() => {
      void fetchSmDiagnostics(text, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) {
            setState({ ...result, loading: false });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setState((prev) => ({ ...prev, loading: false }));
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [text]);

  return state;
}

export function countDiagnostics(diagnostics: SmDiagnostic[]): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const d of diagnostics) {
    if (d.severity === 'error') errors++;
    else warnings++;
  }
  return { errors, warnings };
}
