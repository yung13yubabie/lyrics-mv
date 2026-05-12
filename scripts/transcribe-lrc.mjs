/**
 * transcribe-lrc.mjs — 語音辨識 → 可編輯 .lrc
 *
 * 用法：
 *   node scripts/transcribe-lrc.mjs --audio "C:\path\to\song.mp3"
 *
 * 輸出：
 *   同目錄下的 song.lrc（可用記事本編輯後直接餵給 make-mv.mjs）
 *
 * 重音標記語法（手動加在輸出的 .lrc 裡）：
 *   *詞* → 渲染時該詞字色/字體大小不同
 *   範例：[00:12.50]這次算我*認真*想過一場
 */
import path from "path";
import fs   from "fs";
import { execSync } from "child_process";
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";

// ── CLI ───────────────────────────────────────────────
const args  = process.argv.slice(2);
const strip = (s) => s ? s.replace(/^"+|"+$/g, "").trim() : s;
const get   = (f) => { const i = args.indexOf(f); return i !== -1 ? strip(args[i+1]) : null; };

const audioArg = get("--audio");
const langArg  = get("--lang") ?? "zh";
const beatFlag = args.includes("--beat");  // 自動偵測重拍並加 *標記*

if (!audioArg) {
  console.error("用法: node scripts/transcribe-lrc.mjs --audio <音樂路徑> [--lang zh] [--beat]");
  process.exit(1);
}

const audioSrc = path.resolve(audioArg);
if (!fs.existsSync(audioSrc)) { console.error(`找不到檔案: ${audioSrc}`); process.exit(1); }

const projectRoot = path.join(import.meta.dirname, "..");
const whisperDir  = path.join(projectRoot, "whisper.cpp");
const tmpWav      = path.join(projectRoot, "public", "_transcribe_tmp.wav");
const tmp16k      = path.join(projectRoot, "public", "_transcribe_16k.wav");

fs.mkdirSync(path.join(projectRoot, "public"), { recursive: true });

// ── Step 1: 轉 16kHz mono WAV ─────────────────────────
console.log("🎵 轉換音訊格式（16kHz mono）...");
execSync(
  `ffmpeg -y -i "${audioSrc}" -ar 16000 -ac 1 -c:a pcm_s16le "${tmp16k}"`,
  { stdio: "inherit" }
);

// ── Step 2: 安裝 Whisper.cpp ──────────────────────────
console.log("📦 確認 Whisper.cpp...");
await installWhisperCpp({ to: whisperDir, version: "1.5.5" });

// ── Step 3: 下載 medium 模型 ──────────────────────────
console.log("📥 下載語言模型（首次需等待）...");
await downloadWhisperModel({ model: "medium", folder: whisperDir });

// ── Step 4: 辨識 ──────────────────────────────────────
console.log(`🗣  辨識中（語言: ${langArg}）...`);
const whisperOut = await transcribe({
  model:               "medium",
  whisperPath:         whisperDir,
  whisperCppVersion:   "1.5.5",
  inputPath:           tmp16k,
  tokenLevelTimestamps: true,
  language:            langArg,
});

// ── Step 5: 轉成 LRC ──────────────────────────────────
const { captions } = toCaptions({ whisperCppOutput: whisperOut });

const fmtLrc = (ms) => {
  const m  = Math.floor(ms / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
};

let lrcLines = captions.map(c => `[${fmtLrc(c.startMs)}]${c.text}`);

// ── 重拍偵測（--beat）────────────────────────────────
if (beatFlag) {
  console.log("🥁 偵測音樂重拍中...");
  const { detectBeats, markLrcWithBeats } = await import("./detect-beats.mjs");
  const beats    = await detectBeats(audioSrc);
  const rawLrc   = lrcLines.join("\n");
  const marked   = markLrcWithBeats(rawLrc, beats);
  lrcLines       = marked.split("\n");
  console.log(`   偵測到 ${beats.length} 個重拍，已加上 *標記*`);
}

const lrcContent = [
  `[ti:${path.basename(audioSrc, path.extname(audioSrc))}]`,
  `[by:lyrics-mv transcribe]`,
  `[00:00.00]`,
  ...lrcLines,
].join("\n");

const outLrc = path.join(
  path.dirname(audioSrc),
  path.basename(audioSrc, path.extname(audioSrc)) + ".lrc"
);
fs.writeFileSync(outLrc, lrcContent, "utf8");

// ── 清理暫存 ──────────────────────────────────────────
fs.rmSync(tmp16k, { force: true });

console.log(`\n✅ 辨識完成！共 ${captions.length} 行`);
console.log(`📝 輸出：${outLrc}`);
console.log(`\n=== 接下來 ===`);
console.log(`1. 用記事本或 VSCode 打開 .lrc，人工修正錯字`);
console.log(`2. 如需標記重音節，用 *詞* 包起來`);
console.log(`   範例: [00:12.50]這次算我*認真*想過一場`);
console.log(`3. 存檔後執行渲染：`);
console.log(`   node scripts/make-mv.mjs --audio "${audioSrc}" --srt "${outLrc}"`);
