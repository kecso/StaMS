/**
 * Download the current `.sm` document as a file (browser save-as).
 */
export function downloadSmFile(text: string, baseName: string): void {
  const trimmed = baseName.trim() || 'machine';
  const filename = trimmed.toLowerCase().endsWith('.sm') ? trimmed : `${trimmed}.sm`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
