import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { toSrtString, toTxtString, toJsonString, _internal } from '../ui/lyrics-serialize.js';
import { parseSrt } from '../ui/srt-parser.js';

const sampleRows = [
  { id: 'a', startMs: 14760, endMs: 17472, text: '五月的花店開在路口', source: 'srt' },
  { id: 'b', startMs: 17500, endMs: 20000, text: '春天的風吹過',         source: 'srt' },
];

test('msToSrtTimestamp: 逗號毫秒', () => {
  assert.equal(_internal.msToSrtTimestamp(14760), '00:00:14,760');
  assert.equal(_internal.msToSrtTimestamp(3661500), '01:01:01,500');
  assert.equal(_internal.msToSrtTimestamp(0), '00:00:00,000');
});

test('msToTxtTimestamp: 小數點毫秒', () => {
  assert.equal(_internal.msToTxtTimestamp(14760), '00:00:14.760');
  assert.equal(_internal.msToTxtTimestamp(3661500), '01:01:01.500');
});

test('toSrtString: 標準格式', () => {
  const out = toSrtString(sampleRows);
  assert.ok(out.includes('1\n00:00:14,760 --> 00:00:17,472\n五月的花店開在路口'));
  assert.ok(out.includes('2\n00:00:17,500 --> 00:00:20,000\n春天的風吹過'));
});

test('toSrtString: 空陣列', () => {
  assert.equal(toSrtString([]), '');
  assert.equal(toSrtString(null), '');
});

test('toTxtString: 小數點毫秒', () => {
  const out = toTxtString(sampleRows);
  assert.ok(out.includes('[00:00:14.760] 五月的花店開在路口'));
  assert.ok(out.includes('[00:00:17.500] 春天的風吹過'));
  assert.ok(!out.includes('14,760'));
});

test('toJsonString: schema 完整性', () => {
  const json = toJsonString(sampleRows, {
    layer: 'final', audioName: 'song.mp3', isModified: true,
    asrLineCount: 5, srtRefLineCount: 6, diffWarning: false,
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, '1.0');
  assert.equal(parsed.layer, 'final');
  assert.equal(parsed.audioName, 'song.mp3');
  assert.equal(parsed.isModified, true);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].text, '五月的花店開在路口');
  assert.equal(parsed.meta.asrLineCount, 5);
  assert.ok(parsed.meta.exportedAt);
});

test('Round-trip: rows → toSrtString → parseSrt → 同樣 rows', () => {
  const srt = toSrtString(sampleRows);
  const { rows } = parseSrt(srt);
  assert.equal(rows.length, sampleRows.length);
  for (let i = 0; i < rows.length; i++) {
    assert.equal(rows[i].startMs, sampleRows[i].startMs);
    assert.equal(rows[i].endMs,   sampleRows[i].endMs);
    assert.equal(rows[i].text,    sampleRows[i].text);
  }
});

test('Round-trip: 多行字幕保留', () => {
  const multiline = [
    { id: 'a', startMs: 1000, endMs: 3000, text: '第一行\n第二行', source: 'edited' },
  ];
  const srt = toSrtString(multiline);
  const { rows } = parseSrt(srt);
  assert.equal(rows[0].text, '第一行\n第二行');
});

test('TXT 與 SRT 不混淆', () => {
  const srt = toSrtString(sampleRows);
  const txt = toTxtString(sampleRows);
  assert.ok(srt.includes(',760'));
  assert.ok(srt.includes(' --> '));
  assert.ok(txt.includes('.760'));
  assert.ok(!txt.includes(' --> '));
});
