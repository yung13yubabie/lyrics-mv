// 合併同屏邏輯：只允許相鄰連續句合併

export function areAdjacent(rows, selectedIds) {
  if (!Array.isArray(rows) || !Array.isArray(selectedIds) || selectedIds.length < 2) return false;
  const indices = selectedIds
    .map(id => rows.findIndex(r => r.id === id))
    .filter(i => i !== -1)
    .sort((a, b) => a - b);
  if (indices.length !== selectedIds.length) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
}

function combineText(texts, mode, custom) {
  if (mode === 'concat') return texts.join('');
  if (mode === 'space')  return texts.join(' ');
  if (mode === 'custom') return typeof custom === 'string' ? custom : texts.join('\n');
  return texts.join('\n');
}

let mergeIdCounter = 0;
function nextMergedId() {
  return `merged-${Date.now().toString(36)}-${(mergeIdCounter++).toString(36)}`;
}

export function mergeRows(rows, selectedIds, combineMode = 'newline', customText = '') {
  if (!areAdjacent(rows, selectedIds)) {
    throw new Error('只能合併相鄰的連續歌詞行');
  }
  const sortedIndices = selectedIds
    .map(id => rows.findIndex(r => r.id === id))
    .sort((a, b) => a - b);
  const targets = sortedIndices.map(i => rows[i]);
  const first = targets[0];
  const last  = targets[targets.length - 1];

  const mergedRow = {
    id: nextMergedId(),
    startMs: first.startMs,
    endMs:   last.endMs,
    text:    combineText(targets.map(r => r.text), combineMode, customText),
    source:  'edited',
    mergedFrom: targets.map(r => ({
      id: r.id,
      startMs: r.startMs,
      endMs:   r.endMs,
      text:    r.text,
      source:  r.source,
    })),
  };

  if (mergedRow.startMs >= mergedRow.endMs) {
    mergedRow.warning = '開始時間 >= 結束時間';
  }

  const firstIdx = sortedIndices[0];
  const out = rows.slice();
  out.splice(firstIdx, targets.length, mergedRow);
  return out;
}

export function unmergeRow(rows, rowId) {
  const idx = rows.findIndex(r => r.id === rowId);
  if (idx === -1) throw new Error('找不到要拆解的歌詞行');
  const row = rows[idx];
  if (!Array.isArray(row.mergedFrom) || row.mergedFrom.length === 0) {
    throw new Error('此歌詞行未經合併，無法拆解');
  }
  const restored = row.mergedFrom.map(orig => ({
    id: orig.id,
    startMs: orig.startMs,
    endMs:   orig.endMs,
    text:    orig.text,
    source:  orig.source,
  }));
  const out = rows.slice();
  out.splice(idx, 1, ...restored);
  return out;
}

export function updateRow(rows, rowId, patch) {
  const idx = rows.findIndex(r => r.id === rowId);
  if (idx === -1) throw new Error('找不到要編輯的歌詞行');
  const cur = rows[idx];
  const updated = { ...cur, ...patch, source: 'edited' };

  delete updated.warning;
  if (updated.startMs >= updated.endMs) {
    updated.warning = '開始時間 >= 結束時間';
  }
  const out = rows.slice();
  out[idx] = updated;

  if (idx > 0 && out[idx].startMs < out[idx - 1].endMs) {
    const w = '時間與上一句重疊';
    out[idx].warning = out[idx].warning ? `${out[idx].warning}；${w}` : w;
  }
  return out;
}

export function compareSources(asrRows, srtRows) {
  const result = {
    asrCount: asrRows ? asrRows.length : 0,
    srtCount: srtRows ? srtRows.length : 0,
    asrTextLength: 0,
    srtTextLength: 0,
    diffWarning: false,
    reason: '',
  };
  if (!asrRows || !srtRows || asrRows.length === 0 || srtRows.length === 0) return result;
  result.asrTextLength = asrRows.reduce((s, r) => s + (r.text || '').length, 0);
  result.srtTextLength = srtRows.reduce((s, r) => s + (r.text || '').length, 0);
  const countRatio = Math.abs(result.asrCount - result.srtCount) /
                     Math.max(result.asrCount, result.srtCount);
  const lenRatio = Math.abs(result.asrTextLength - result.srtTextLength) /
                   Math.max(result.asrTextLength, result.srtTextLength, 1);
  if (countRatio > 0.30) {
    result.diffWarning = true;
    result.reason = `行數差異 ${(countRatio * 100).toFixed(0)}%（超過 30%）`;
  } else if (lenRatio > 0.50) {
    result.diffWarning = true;
    result.reason = `文字長度差異 ${(lenRatio * 100).toFixed(0)}%（超過 50%）`;
  }
  return result;
}
