/** Saves in-memory data as a file download. No network involved. */
export function saveFile(name: string, data: BlobPart, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const today = () => new Date().toISOString().slice(0, 10);
