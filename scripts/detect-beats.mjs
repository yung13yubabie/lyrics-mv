/**
 * detect-beats.mjs — 音訊重拍偵測
 *
 * 使用 ffmpeg 解碼為 PCM → 能量包絡分析 → onset 峰值偵測
 * 不需要額外 Python 或 DSP 套件，只依賴 ffmpeg（專案已內建）
 *
 * 匯出：
 *   detectBeats(audioPath, options?) → Promise<number[]>  // ms 時間戳陣列
 *   markLrcWithBeats(lrcContent, beatMs, windowMs?)       // 在 LRC 行標 *詞*
 */
import { spawn } from "child_process";

// ── Beat Detection ────────────────────────────────────
export async function detectBeats(audioPath, {
  sampleRate  = 8000,   // Hz，8k 已足夠做 onset 分析
  hopMs       = 50,     // ms per energy frame
  sensitivity = 1.4,    // onset 閾值倍率（越小抓越多，越大越保守）
  minGapMs    = 250,    // 兩個 beat 最短間距
} = {}) {

  const hopSamples = Math.floor(sampleRate * hopMs / 1000);

  const pcmBuf = await new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-i", audioPath,
      "-ac", "1",         // mono
      "-ar", String(sampleRate),
      "-f", "s16le",      // signed 16-bit little-endian
      "-"
    ], { stdio: ["ignore", "pipe", "ignore"] });

    const chunks = [];
    proc.stdout.on("data", c => chunks.push(c));
    proc.stdout.on("end",  () => resolve(Buffer.concat(chunks)));
    proc.on("error", reject);
    proc.on("close", code => { if (code !== 0 && code !== null) reject(new Error(`ffmpeg exited ${code}`)); });
  });

  if (!pcmBuf.length) return [];

  const samples = new Int16Array(pcmBuf.buffer, pcmBuf.byteOffset, Math.floor(pcmBuf.byteLength / 2));
  const numFrames = Math.floor(samples.length / hopSamples);

  // 1. RMS energy per frame
  const energy = new Float32Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    let sum = 0;
    const base = i * hopSamples;
    for (let j = 0; j < hopSamples; j++) {
      const s = samples[base + j] / 32768;
      sum += s * s;
    }
    energy[i] = Math.sqrt(sum / hopSamples);
  }

  // 2. Spectral flux: positive energy difference (onset strength)
  const flux = new Float32Array(numFrames);
  for (let i = 1; i < numFrames; i++) {
    flux[i] = Math.max(0, energy[i] - energy[i - 1]);
  }

  // 3. Dynamic threshold: local mean in ±1s window * sensitivity
  const winFrames = Math.round(1000 / hopMs);
  const beats = [];
  let lastBeatMs = -minGapMs;

  for (let i = 1; i < numFrames - 1; i++) {
    const s = Math.max(0, i - winFrames);
    const e = Math.min(numFrames, i + winFrames);
    let localMean = 0;
    for (let k = s; k < e; k++) localMean += flux[k];
    localMean /= (e - s);

    const isLocalPeak = flux[i] > flux[i - 1] && flux[i] >= flux[i + 1];
    const aboveThreshold = flux[i] > localMean * sensitivity;

    if (isLocalPeak && aboveThreshold) {
      const timeMs = i * hopMs;
      if (timeMs - lastBeatMs >= minGapMs) {
        beats.push(timeMs);
        lastBeatMs = timeMs;
      }
    }
  }

  return beats;
}

// ── LRC Beat Marking ─────────────────────────────────
// 將偵測到的 beat 時間點對應到 LRC 行，並加上 *詞* 標記
export function markLrcWithBeats(lrcContent, beatTimesMs, windowMs = 300) {
  const lineRe = /^(\[[\d:.]+\])+(.*)$/;

  return lrcContent.split(/\r?\n/).map(line => {
    const m = line.match(lineRe);
    if (!m) return line;

    // 取第一個時間戳
    const tsMatch = line.match(/\[(\d{1,3}):(\d{2})\.(\d{1,3})\]/);
    if (!tsMatch) return line;
    const lineMs = +tsMatch[1] * 60000 + +tsMatch[2] * 1000 + +tsMatch[3].padEnd(3, "0");

    const onBeat = beatTimesMs.some(b => Math.abs(b - lineMs) < windowMs);
    if (!onBeat) return line;

    const tsPrefix = line.slice(0, line.lastIndexOf("]") + 1);
    const text = line.slice(tsPrefix.length).trim();
    if (!text || text.startsWith("*")) return line; // 已有標記

    // 標記第一個詞：有空格取第一詞，無空格（中文）取前 2 字
    const hasSpaces = text.includes(" ");
    let marked;
    if (hasSpaces) {
      const words = text.split(" ");
      words[0] = `*${words[0]}*`;
      marked = words.join(" ");
    } else {
      const chars = Array.from(text);
      const n = Math.min(2, chars.length);
      marked = `*${chars.slice(0, n).join("")}*${chars.slice(n).join("")}`;
    }
    return tsPrefix + marked;
  }).join("\n");
}
