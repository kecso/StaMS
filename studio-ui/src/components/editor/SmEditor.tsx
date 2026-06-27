'use client';

import Editor, { loader, type Monaco, type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useRef } from 'react';

import {
  SM_LANGUAGE_ID,
  registerSmLanguage,
  validateSm,
  type SmDiagnostic
} from '@/lib/sm-language';

export type SmValidationState = {
  valid: boolean;
  diagnostics: SmDiagnostic[];
};

// Load Monaco from the studio's own origin (see scripts/copy-monaco.mjs) rather
// than the default CDN, so it works offline / behind a proxy.
loader.config({ paths: { vs: '/monaco/vs' } });

type SmEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (state: SmValidationState) => void;
  readOnly?: boolean;
};

export default function SmEditor({
  value,
  onChange,
  onValidationChange,
  readOnly = false
}: SmEditorProps) {
  const monacoRef = useRef<Monaco | null>(null);
  const modelUriRef = useRef<string | null>(null);
  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  const runValidation = useCallback((monaco: Monaco, text: string) => {
    const diagnostics = validateSm(text);
    const valid = !diagnostics.some((d) => d.severity === 'error');

    onValidationChangeRef.current?.({ valid, diagnostics });

    const model = modelUriRef.current
      ? monaco.editor.getModel(monaco.Uri.parse(modelUriRef.current))
      : monaco.editor.getModels()[0];
    if (!model) {
      return;
    }
    const markers = diagnostics.map((d) => ({
      message: d.message,
      severity:
        d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      startLineNumber: d.startLineNumber,
      startColumn: d.startColumn,
      endLineNumber: d.endLineNumber,
      endColumn: d.endColumn
    }));
    monaco.editor.setModelMarkers(model, 'sm', markers);
  }, []);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    registerSmLanguage(monaco);
  }, []);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      monacoRef.current = monaco;
      const model = editor.getModel();
      modelUriRef.current = model ? model.uri.toString() : null;
      runValidation(monaco, editor.getValue());
    },
    [runValidation]
  );

  // Re-validate when parent updates text (load doc, insert example, etc.).
  useEffect(() => {
    if (monacoRef.current) {
      runValidation(monacoRef.current, value);
    }
  }, [value, runValidation]);

  const handleChange = useCallback(
    (next: string | undefined) => {
      const text = next ?? '';
      onChange(text);
      if (monacoRef.current) {
        runValidation(monacoRef.current, text);
      }
    },
    [onChange, runValidation]
  );

  return (
    <Editor
      language={SM_LANGUAGE_ID}
      theme="vs-dark"
      value={value}
      onChange={handleChange}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: 'Consolas, "Courier New", monospace',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: 'selection'
      }}
    />
  );
}
