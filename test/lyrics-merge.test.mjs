import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  areAdjacent, mergeRows, unmergeRow, updateRow, compareSources,
} from '../ui/lyrics-merge.js';

function sample() {
  return [
    { id: 'a', startMs: 1000, endMs: 2000, text: 'x', source: 'srt' },
    { id: 'b', startMs: 2000, endMs: 3000, text: 'y', source: 'srt' },
    { id: 'c', startMs: 3000, endMs: 4000, text: 'z', source: 'srt' },
    { id: 'd', startMs: 4000, endMs: 5000, text: 'w', source: 'srt' },
  ];
}

test('areAdjacent: 相鄰兩句', () => {
  assert.equal(areAdjacent(sample(), ['a', 'b']), true);
});

test('areAdjacent: 相鄰三句', () => {
  assert.equal(areAdjacent(sample(), ['a', 'b', 'c']), true);
});

test('areAdjacent: 不相鄰', () => {
  assert.equal(areAdjacent(sample(), ['a', 'c']), false);
  assert.equal(areAdjacent(sample(), ['a', 'd']), false);
});

test('areAdjacent: 順序不重要', () => {
  assert.equal(areAdjacent(sample(), ['c', 'a', 'b']), true);
});

test('areAdjacent: 不存在的 id', () => {
  assert.equal(areAdjacent(sample(), ['a', 'zzz']), false);
});

test('mergeRows: spec 範例 xy', () => {
  const merged = mergeRows(sample(), ['a', 'b'], 'concat');
  assert.equal(merged.length, 3);
  assert.equal(merged[0].text, 'xy');
  assert.equal(merged[0].startMs, 1000);
  assert.equal(merged[0].endMs, 3000);
  assert.equal(merged[0].source, 'edited');
  assert.equal(merged[0].mergedFrom.length, 2);
  assert.equal(merged[1].text, 'z');
  assert.equal(merged[2].text, 'w');
});

test('mergeRows: 換行組合（預設）', () => {
  const merged = mergeRows(sample(), ['a', 'b']);
  assert.equal(merged[0].text, 'x\ny');
});

test('mergeRows: 空格組合', () => {
  const merged = mergeRows(sample(), ['a', 'b'], 'space');
  assert.equal(merged[0].text, 'x y');
});

test('mergeRows: 自訂文字', () => {
  const merged = mergeRows(sample(), ['a', 'b'], 'custom', '自訂句');
  assert.equal(merged[0].text, '自訂句');
});

test('mergeRows: 拒絕不相鄰', () => {
  assert.throws(() => mergeRows(sample(), ['a', 'c']), /相鄰/);
});

test('mergeRows: 合併三句', () => {
  const merged = mergeRows(sample(), ['a', 'b', 'c'], 'concat');
  assert.equal(merged.length, 2);
  assert.equal(merged[0].text, 'xyz');
  assert.equal(merged[0].startMs, 1000);
  assert.equal(merged[0].endMs, 4000);
});

test('unmergeRow: 還原合併', () => {
  const merged = mergeRows(sample(), ['a', 'b'], 'concat');
  const restored = unmergeRow(merged, merged[0].id);
  assert.equal(restored.length, 4);
  assert.equal(restored[0].text, 'x');
  assert.equal(restored[1].text, 'y');
  assert.equal(restored[2].text, 'z');
});

test('unmergeRow: 未合併過的 row 應 throw', () => {
  assert.throws(() => unmergeRow(sample(), 'a'), /未經合併/);
});

test('updateRow: 改文字', () => {
  const updated = updateRow(sample(), 'a', { text: '新文字' });
  assert.equal(updated[0].text, '新文字');
  assert.equal(updated[0].source, 'edited');
});

test('updateRow: 改時間，檢查警告', () => {
  const bad = updateRow(sample(), 'a', { startMs: 5000, endMs: 3000 });
  assert.equal(bad[0].warning, '開始時間 >= 結束時間');
});

test('updateRow: 時間重疊偵測', () => {
  const overlap = updateRow(sample(), 'b', { startMs: 500 });
  assert.ok(overlap[1].warning && overlap[1].warning.includes('重疊'));
});

test('compareSources: 行數差異警告', () => {
  const asr = Array.from({ length: 10 }, () => ({ text: 'x'.repeat(5) }));
  const srt = Array.from({ length: 5  }, () => ({ text: 'x'.repeat(5) }));
  const r = compareSources(asr, srt);
  assert.equal(r.diffWarning, true);
  assert.ok(r.reason.includes('行數'));
});

test('compareSources: 文字長度差異警告', () => {
  const asr = Array.from({ length: 10 }, () => ({ text: 'x'.repeat(20) }));
  const srt = Array.from({ length: 10 }, () => ({ text: 'x'.repeat(5)  }));
  const r = compareSources(asr, srt);
  assert.equal(r.diffWarning, true);
  assert.ok(r.reason.includes('文字長度'));
});

test('compareSources: 接近時不警告', () => {
  const asr = Array.from({ length: 10 }, () => ({ text: 'x'.repeat(10) }));
  const srt = Array.from({ length: 11 }, () => ({ text: 'x'.repeat(10) }));
  const r = compareSources(asr, srt);
  assert.equal(r.diffWarning, false);
});

test('compareSources: 任一為 null 時不警告', () => {
  const r1 = compareSources(null, [{ text: 'a' }]);
  const r2 = compareSources([{ text: 'a' }], null);
  assert.equal(r1.diffWarning, false);
  assert.equal(r2.diffWarning, false);
});
