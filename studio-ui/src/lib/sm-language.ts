/**
 * StaMS `.sm` language support for Monaco (syntax highlighting + structural validation).
 *
 * The validator mirrors the constraints in the Langium grammar/validator
 * (src/common/language). It is a pragmatic token-based check, not the full
 * Langium language server — it covers the high-value rules so the editor gives
 * useful feedback before the LSP integration lands.
 */

import type { Monaco } from '@monaco-editor/react';

export const SM_LANGUAGE_ID = 'state-machine';

const KEYWORDS = [
  'machine',
  'variables',
  'events',
  'actions',
  'guards',
  'constraints',
  'state',
  'initial',
  'final',
  'entry',
  'run',
  'exit',
  'on',
  'guard',
  'do',
  'safety',
  'goal'
];

const TYPE_KEYWORDS = ['float', 'string'];

export function registerSmLanguage(monaco: Monaco): void {
  const existing = monaco.languages.getLanguages().some((lang) => lang.id === SM_LANGUAGE_ID);
  if (existing) {
    return;
  }

  monaco.languages.register({ id: SM_LANGUAGE_ID, extensions: ['.sm'], aliases: ['StateMachine', 'sm'] });

  monaco.languages.setLanguageConfiguration(SM_LANGUAGE_ID, {
    comments: { lineComment: '//', blockComment: ['/*', '*/'] },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' }
    ]
  });

  monaco.languages.setMonarchTokensProvider(SM_LANGUAGE_ID, {
    keywords: KEYWORDS,
    typeKeywords: TYPE_KEYWORDS,
    operators: ['->', '=', '==', '!=', '<', '<=', '>', '>=', '+', '-', '*', '/', '&&', '||', '!'],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [/"[^"]*"/, 'string'],
        [/\b\d+(\.\d+)?\b/, 'number'],
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@typeKeywords': 'type',
              '@default': 'identifier'
            }
          }
        ],
        [/->/, 'operator'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
        [/[{}()[\]]/, '@brackets'],
        [/[;,:]/, 'delimiter']
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment']
      ]
    }
  });
}

export type SmDiagnostic = {
  severity: 'error' | 'warning';
  message: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

type Token = {
  type: 'id' | 'string' | 'number' | 'punct' | 'op';
  value: string;
  line: number;
  col: number;
  endCol: number;
};

const MULTI_OPS = ['->', '==', '!=', '<=', '>=', '&&', '||'];
const SINGLE = new Set(['{', '}', '(', ')', '[', ']', ':', ';', ',', '=', '<', '>', '+', '-', '*', '/', '!']);

function lex(text: string): Token[] {
  const tokens: Token[] = [];
  const lines = text.split(/\r?\n/);
  let inBlockComment = false;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    let i = 0;
    while (i < line.length) {
      if (inBlockComment) {
        const end = line.indexOf('*/', i);
        if (end === -1) {
          i = line.length;
        } else {
          inBlockComment = false;
          i = end + 2;
        }
        continue;
      }

      const ch = line[i];

      if (ch === ' ' || ch === '\t') {
        i++;
        continue;
      }
      if (line.startsWith('//', i)) {
        break;
      }
      if (line.startsWith('/*', i)) {
        const end = line.indexOf('*/', i + 2);
        if (end === -1) {
          inBlockComment = true;
          i = line.length;
        } else {
          i = end + 2;
        }
        continue;
      }
      if (ch === '"') {
        const end = line.indexOf('"', i + 1);
        const close = end === -1 ? line.length : end + 1;
        tokens.push({ type: 'string', value: line.slice(i, close), line: l + 1, col: i + 1, endCol: close + 1 });
        i = close;
        continue;
      }
      if (/[a-zA-Z_]/.test(ch)) {
        let j = i + 1;
        while (j < line.length && /\w/.test(line[j])) j++;
        tokens.push({ type: 'id', value: line.slice(i, j), line: l + 1, col: i + 1, endCol: j + 1 });
        i = j;
        continue;
      }
      if (/[0-9]/.test(ch)) {
        let j = i + 1;
        while (j < line.length && /[0-9.]/.test(line[j])) j++;
        tokens.push({ type: 'number', value: line.slice(i, j), line: l + 1, col: i + 1, endCol: j + 1 });
        i = j;
        continue;
      }
      const two = line.substr(i, 2);
      if (MULTI_OPS.includes(two)) {
        tokens.push({ type: 'op', value: two, line: l + 1, col: i + 1, endCol: i + 3 });
        i += 2;
        continue;
      }
      if (SINGLE.has(ch)) {
        tokens.push({ type: ch === '{' || ch === '}' ? 'punct' : 'op', value: ch, line: l + 1, col: i + 1, endCol: i + 2 });
        if (ch === '{' || ch === '}' || ch === '(' || ch === ')' || ch === '[' || ch === ']' || ch === ':' || ch === ';' || ch === ',') {
          tokens[tokens.length - 1].type = 'punct';
        }
        i++;
        continue;
      }
      // Unknown char — skip.
      i++;
    }
  }
  return tokens;
}

function marker(tok: Token, message: string, severity: 'error' | 'warning' = 'error'): SmDiagnostic {
  return {
    severity,
    message,
    startLineNumber: tok.line,
    startColumn: tok.col,
    endLineNumber: tok.line,
    endColumn: tok.endCol
  };
}

type StateInfo = { nameTok: Token; isInitial: boolean; isFinal: boolean };

export function validateSm(text: string): SmDiagnostic[] {
  const diagnostics: SmDiagnostic[] = [];
  const tokens = lex(text);

  // Brace balance.
  const braceStack: Token[] = [];
  for (const tok of tokens) {
    if (tok.value === '{') braceStack.push(tok);
    else if (tok.value === '}') {
      if (braceStack.length === 0) diagnostics.push(marker(tok, 'Unmatched closing brace "}".'));
      else braceStack.pop();
    }
  }
  braceStack.forEach((tok) => diagnostics.push(marker(tok, 'Unclosed brace "{".')));

  // Walk machines and analyze states within each machine body.
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'id' && tokens[i].value === 'machine') {
      const nameTok = tokens[i + 1];
      // Find the body open brace for this machine.
      let bodyOpen = i + 1;
      while (bodyOpen < tokens.length && tokens[bodyOpen].value !== '{') bodyOpen++;
      if (bodyOpen >= tokens.length) continue;
      const bodyClose = matchBrace(tokens, bodyOpen);
      const bodyEnd = bodyClose === -1 ? tokens.length : bodyClose;

      const states: StateInfo[] = [];
      const eventNames = new Set<string>();

      for (let j = bodyOpen + 1; j < bodyEnd; j++) {
        // Collect event declarations inside the machine's events block.
        if (tokens[j].type === 'id' && tokens[j].value === 'events' && tokens[j + 1]?.value === '{') {
          const evClose = matchBrace(tokens, j + 1);
          for (let k = j + 2; k < (evClose === -1 ? bodyEnd : evClose); k++) {
            if (tokens[k].type === 'id') eventNames.add(tokens[k].value);
          }
        }

        if (tokens[j].type === 'id' && tokens[j].value === 'state') {
          const sName = tokens[j + 1];
          if (!sName || sName.type !== 'id') continue;
          let isInitial = false;
          let isFinal = false;
          for (let b = j - 1; b >= bodyOpen; b--) {
            if (tokens[b].value === 'initial') isInitial = true;
            else if (tokens[b].value === 'final') isFinal = true;
            else break;
          }
          states.push({ nameTok: sName, isInitial, isFinal });
        }
      }

      const stateNames = new Set(states.map((s) => s.nameTok.value));

      // Exactly one initial state.
      const initial = states.filter((s) => s.isInitial);
      if (states.length > 0 && initial.length === 0 && nameTok) {
        diagnostics.push(marker(nameTok, 'Machine must declare exactly one initial state.'));
      } else if (initial.length > 1) {
        initial.slice(1).forEach((s) =>
          diagnostics.push(marker(s.nameTok, 'Machine must declare only one initial state.'))
        );
      }

      // Duplicate names + initial/final conflict.
      const seen = new Set<string>();
      states.forEach((s) => {
        if (seen.has(s.nameTok.value)) {
          diagnostics.push(marker(s.nameTok, `Duplicate state name "${s.nameTok.value}".`));
        }
        seen.add(s.nameTok.value);
        if (s.isInitial && s.isFinal) {
          diagnostics.push(marker(s.nameTok, 'A state cannot be both initial and final.'));
        }
      });

      // Transition references: on EVENT -> TARGET
      for (let j = bodyOpen + 1; j < bodyEnd; j++) {
        if (tokens[j].type === 'id' && tokens[j].value === 'on') {
          const evTok = tokens[j + 1];
          const arrow = tokens[j + 2];
          const targetTok = tokens[j + 3];
          if (evTok?.type === 'id' && eventNames.size > 0 && !eventNames.has(evTok.value)) {
            diagnostics.push(marker(evTok, `Unknown event "${evTok.value}".`, 'warning'));
          }
          if (arrow?.value === '->' && targetTok?.type === 'id' && !stateNames.has(targetTok.value)) {
            diagnostics.push(marker(targetTok, `Unknown target state "${targetTok.value}".`));
          }
        }
      }
    }
  }

  return diagnostics;
}

function matchBrace(tokens: Token[], openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < tokens.length; i++) {
    if (tokens[i].value === '{') depth++;
    else if (tokens[i].value === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
