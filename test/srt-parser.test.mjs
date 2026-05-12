import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  parseLyricsLike, parseSrt, parseLrc, detectFormat, _internal,
} from '../ui/srt-parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fix = (name) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const fixBuffer = (name) => readFileSync(path.join(__dirname, 'fixtures', name));

test('detectFormat: SRT', () => {
  assert.equal(detectFormat(fix('standard.srt')), 'srt');
});

test('detectFormat: LRC', () => {
  assert.equal(detectFormat(fix('sample.lrc')), 'lrc');
});

test('detectFormat: unknown', () => {
  assert.equal(detectFormat('just some random text without timestamps'), 'unknown');
  assert.equal(detectFormat(''), 'unknown');
  assert.equal(detectFormat(null), 'unknown');
});

test('parseSrt: 標準 SRT', () => {
  const { rows, warnings } = parseSrt(fix('standard.srt'));
  assert.equal(rows.length, 3);
  assert.equal(rows[0].startMs, 14760);
  assert.equal(rows[0].endMs, 17472);
  assert.equal(rows[0].text, '五月的花店開在路口');
  assert.equal(warnings.length, 0);
});

test('parseSrt: 無編號 + 多行字幕', () => {
  const { rows } = parseSrt(fix('no-id-crlf.srt'));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text, 'First line');
  assert.equal(rows[1].text, 'Second line\nwith two rows');
});

test('parseSrt: BOM 去除', () => {
  const buf = fixBuffer('bom-utf8.srt');
  const text = buf.toString('utf8');
  assert.equal(text.charCodeAt(0), 0xFEFF, 'fixture 應該有 BOM');
  const { rows } = parseSrt(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text, '帶 BOM 的中文字幕');
});

test('parseSrt: CRLF 換行', () => {
  const { rows } = parseSrt(fix('crlf.srt'));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text, 'Windows CRLF test');
  assert.equal(rows[1].text, 'Second row');
});

test('parseSrt: 開始時間 >= 結束時間 警告', () => {
  const bad = `1
00:00:05,000 --> 00:00:03,000
反向時間`;
  const { rows, warnings } = parseSrt(bad);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].warning, '開始時間 >= 結束時間');
  assert.ok(warnings.some(w => w.includes('開始時間')));
});

test('parseSrt: 時間重疊 警告', () => {
  const overlap = `1
00:00:01,000 --> 00:00:05,000
第一句

2
00:00:03,000 --> 00:00:06,000
重疊到第一句`;
  const { rows } = parseSrt(overlap);
  assert.equal(rows.length, 2);
  assert.ok(rows[1].warning && rows[1].warning.includes('重疊'));
});

test('parseSrt: 雜訊行不崩潰', () => {
  const garbage = `這是雜訊
0123456789

1
00:00:01,000 --> 00:00:02,000
正常一句`;
  const { rows, warnings } = parseSrt(garbage);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].text, '正常一句');
  assert.ok(warnings.length > 0);
});

test('parseLrc: 標準 LRC + endMs 推導', () => {
  const { rows, warnings } = parseLrc(fix('sample.lrc'));
  assert.equal(rows.length, 4);
  assert.equal(rows[0].startMs, 10500);
  assert.equal(rows[0].endMs, 14200);
  assert.equal(rows[0].text, '這次算我認真想過一場');
  assert.equal(rows[3].endMs, rows[3].startMs + 3000);
  assert.equal(warnings.length, 0);
});

test('parseLrc: 略過 metadata 標籤', () => {
  const { rows } = parseLrc(fix('sample.lrc'));
  assert.ok(rows.every(r => r.text.length > 0));
  assert.ok(rows.every(r => !/^\[(ti|ar|by):/i.test(r.text)));
});

test('parseLyricsLike: 自動偵測 SRT', () => {
  const { rows, sourceFormat } = parseLyricsLike(fix('standard.srt'), 'test');
  assert.equal(sourceFormat, 'srt');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].source, 'test');
});

test('parseLyricsLike: 自動偵測 LRC', () => {
  const { rows, sourceFormat } = parseLyricsLike(fix('sample.lrc'), 'srtRef');
  assert.equal(sourceFormat, 'lrc');
  assert.equal(rows.length, 4);
  assert.equal(rows[0].source, 'srtRef');
});

test('parseLyricsLike: 未知格式', () => {
  const { rows, sourceFormat, warnings } = parseLyricsLike('沒有時間碼的文字');
  assert.equal(sourceFormat, 'unknown');
  assert.equal(rows.length, 0);
  assert.ok(warnings.length > 0);
});

test('tsToMs: 邊界值', () => {
  assert.equal(_internal.tsToMs('00', '00', '00', '000'), 0);
  assert.equal(_internal.tsToMs('01', '00', '00', '000'), 3600000);
  assert.equal(_internal.tsToMs('00', '00', '00', '5'),   500);
  assert.equal(_internal.tsToMs('00', '00', '00', '50'),  500);
  assert.equal(_internal.tsToMs('00', '00', '00', '500'), 500);
});

test('parseSrt: Suno fixture（長檔名情境）', () => {
  const { rows, warnings } = parseSrt(fix('suno-downloader.srt'));
  assert.equal(rows.length, 5);
  assert.equal(rows[0].text, '這次算我認真想過一場');
  assert.equal(rows[4].text, '然後就再也沒見過');
  assert.equal(warnings.length, 0);
});
