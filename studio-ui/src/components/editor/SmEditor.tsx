'use client';

import Editor, { loader, type Monaco, type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useRef } from 'react';

import { SM_LANGUAGE_ID, registerSmLanguage, type SmDiagnostic } from '@/lib/sm-language';

// Load Monaco from the studio's own origin (see scripts/copy-monaco.mjs) rather
// than the default CDN, so it works offline / behind a proxy.
loader.config({ paths: { vs: '/monaco/vs' } });

type SmEditorProps = {
  value: string;
  onChange: (value: string) => void;
  diagnostics: SmDiagnostic[];
  readOnly?: boolean;
};

function applyMarkers(monaco: Monaco, modelUri: string | null, diagnostics: SmDiagnostic[]) {
  const model = modelUri
    ? monaco.editor.getModel(monaco.Uri.parse(modelUri))
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
}

export default function SmEditor({
  value,
  onChange,
  diagnostics,
  readOnly = false
}: SmEditorProps) {
  const monacoRef = useRef<Monaco | null>(null);
  const modelUriRef = useRef<string | null>(null);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    registerSmLanguage(monaco);
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    monacoRef.current = monaco;
    const model = editor.getModel();
    modelUriRef.current = model ? model.uri.toString() : null;
  }, []);

  useEffect(() => {
    if (monacoRef.current) {
      applyMarkers(monacoRef.current, modelUriRef.current, diagnostics);
    }
  }, [diagnostics]);

  const handleChange = useCallback(
    (next: string | undefined) => {
      onChange(next ?? '');
    },
    [onChange]
  );

  return (
    <Editor
      height="100%"
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
