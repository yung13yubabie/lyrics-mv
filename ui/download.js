// 下載 helper：產生 Blob 並觸發瀏覽器下載

export function downloadBlob(content, filename, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

export function suggestFilename(baseName, layer, ext) {
  const safe = (baseName || 'lyrics').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_');
  return `${safe}.${layer}.${ext}`;
}
