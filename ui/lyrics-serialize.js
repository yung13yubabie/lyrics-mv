// 序列化：rows[] → SRT / TXT / JSON 字串

function pad(n, w = 2) { return String(n).padStart(w, '0'); }

function msToSrtTimestamp(ms) {
  const m = Math.max(0, Math.floor(ms));
  const h = Math.floor(m / 3600000);
  const min = Math.floor((m % 3600000) / 60000);
  const sec = Math.floor((m % 60000) / 1000);
  const milli = m % 1000;
  return `${pad(h)}:${pad(min)}:${pad(sec)},${pad(milli, 3)}`;
}

function msToTxtTimestamp(ms) {
  const m = Math.max(0, Math.floor(ms));
  const h = Math.floor(m / 3600000);
  const min = Math.floor((m % 3600000) / 60000);
  const sec = Math.floor((m % 60000) / 1000);
  const milli = m % 1000;
  return `${pad(h)}:${pad(min)}:${pad(sec)}.${pad(milli, 3)}`;
}

export function toSrtString(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const blocks = rows.map((r, i) => {
    const start = msToSrtTimestamp(r.startMs);
    const end   = msToSrtTimestamp(r.endMs);
    return `${i + 1}\n${start} --> ${end}\n${r.text}`;
  });
  return blocks.join('\n\n') + '\n';
}

export function toTxtString(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  return rows.map(r => `[${msToTxtTimestamp(r.startMs)}] ${r.text}`).join('\n') + '\n';
}

export function toJsonString(rows, meta = {}) {
  const payload = {
    version: '1.0',
    layer: meta.layer || 'unknown',
    audioName: meta.audioName || null,
    isModified: meta.isModified !== undefined ? meta.isModified : false,
    rows: (rows || []).map(r => ({
      startMs: r.startMs,
      endMs:   r.endMs,
      text:    r.text,
      source:  r.source || 'unknown',
      ...(r.warning ? { warning: r.warning } : {}),
      ...(r.mergedFrom ? { mergedFrom: r.mergedFrom } : {}),
    })),
    meta: {
      asrLineCount:    meta.asrLineCount ?? null,
      srtRefLineCount: meta.srtRefLineCount ?? null,
      diffWarning:     meta.diffWarning ?? false,
      diffReason:      meta.diffReason ?? '',
      exportedAt:      new Date().toISOString(),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export const _internal = { msToSrtTimestamp, msToTxtTimestamp };
