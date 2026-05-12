// SRT / LRC 寬鬆解析器
// 處理 BOM、CRLF/LF、混合毫秒分隔符、無編號 SRT、LRC 推導 endMs、多行字幕、單行容錯

const SRT_TIME_RE = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;
const LRC_TIME_RE = /^\[(\d{1,2}):(\d{2})[.:](\d{1,3})\]/;

let rowIdCounter = 0;
function nextRowId() {
  return `row-${Date.now().toString(36)}-${(rowIdCounter++).toString(36)}`;
}

function stripBom(s) {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

function tsToMs(h, m, s, ms) {
  const msPadded = String(ms).padEnd(3, '0').slice(0, 3);
  return (+h) * 3600000 + (+m) * 60000 + (+s) * 1000 + (+msPadded);
}

export function detectFormat(rawText) {
  if (!rawText || typeof rawText !== 'string') return 'unknown';
  const text = stripBom(rawText);
  if (SRT_TIME_RE.test(text)) return 'srt';
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    if (LRC_TIME_RE.test(lines[i].trim())) return 'lrc';
  }
  return 'unknown';
}

export function parseLyricsLike(rawText, sourceLabel = 'unknown') {
  if (!rawText || typeof rawText !== 'string') {
    return { rows: [], warnings: ['輸入為空，無法解析'], sourceFormat: 'unknown' };
  }
  const fmt = detectFormat(rawText);
  if (fmt === 'srt') return { ...parseSrt(rawText, sourceLabel), sourceFormat: 'srt' };
  if (fmt === 'lrc') return { ...parseLrc(rawText, sourceLabel), sourceFormat: 'lrc' };
  return {
    rows: [],
    warnings: ['未偵測到 SRT 或 LRC 時間碼，請確認檔案格式'],
    sourceFormat: 'unknown',
  };
}

export function parseSrt(rawText, sourceLabel = 'srt') {
  const text = stripBom(rawText).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = text.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
  const rows = [];
  const warnings = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].split('\n');
    let timeIdx = -1;
    let timeMatch = null;
    for (let j = 0; j < Math.min(lines.length, 3); j++) {
      const m = lines[j].match(SRT_TIME_RE);
      if (m) { timeMatch = m; timeIdx = j; break; }
    }
    if (!timeMatch) {
      warnings.push(`第 ${i + 1} 區塊找不到時間碼，已略過`);
      continue;
    }
    const startMs = tsToMs(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
    const endMs   = tsToMs(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
    const textBody = lines.slice(timeIdx + 1).join('\n').trim();
    if (!textBody) {
      warnings.push(`第 ${i + 1} 區塊沒有歌詞文字，已略過`);
      continue;
    }
    const row = { id: nextRowId(), startMs, endMs, text: textBody, source: sourceLabel };
    if (startMs >= endMs) {
      row.warning = '開始時間 >= 結束時間';
      warnings.push(`第 ${rows.length + 1} 行：開始時間 >= 結束時間`);
    }
    rows.push(row);
  }

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].startMs < rows[i - 1].endMs) {
      const w = '時間與上一句重疊';
      rows[i].warning = rows[i].warning ? `${rows[i].warning}；${w}` : w;
      warnings.push(`第 ${i + 1} 行：${w}`);
    }
  }

  return { rows, warnings };
}

export function parseLrc(rawText, sourceLabel = 'lrc') {
  const text = stripBom(rawText).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  const draft = [];
  const warnings = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) continue;
    const m = trimmed.match(LRC_TIME_RE);
    if (!m) continue;
    const minutes = +m[1];
    const seconds = +m[2];
    const fraction = m[3];
    const ms = fraction.length === 2 ? +fraction * 10 : +fraction;
    const startMs = minutes * 60000 + seconds * 1000 + ms;
    const body = trimmed.slice(m[0].length).trim();
    if (!body) continue;
    draft.push({ startMs, text: body });
  }

  draft.sort((a, b) => a.startMs - b.startMs);
  const rows = [];
  for (let i = 0; i < draft.length; i++) {
    const cur = draft[i];
    const next = draft[i + 1];
    const endMs = next ? next.startMs : cur.startMs + 3000;
    const row = {
      id: nextRowId(),
      startMs: cur.startMs,
      endMs,
      text: cur.text,
      source: sourceLabel,
    };
    if (row.startMs >= row.endMs) {
      row.warning = '開始時間 >= 結束時間';
      warnings.push(`第 ${rows.length + 1} 行：開始時間 >= 結束時間`);
    }
    rows.push(row);
  }
  if (rows.length === 0) warnings.push('未解析出任何 LRC 行');
  return { rows, warnings };
}

export const _internal = { tsToMs, stripBom, SRT_TIME_RE, LRC_TIME_RE };
