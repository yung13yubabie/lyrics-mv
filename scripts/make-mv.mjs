/**
 * make-mv.mjs — 一鍵產生文字 MV
 *
 * 必要：
 *   --audio  音樂檔案（mp3/wav/m4a…）
 *   --srt    歌詞（.srt 或 .lrc）
 *
 * 可選：
 *   --bg     背景圖（單張）或目錄（批量，平均分配時間）
 *   --dim    遮罩深度 0~1（預設 0.5）
 *   --pos    文字位置：center / lower-third / upper-third（預設 center）
 *   --anim          動畫模式：sentence-fade / line-swap / char-appear / char-highlight / scale-echo
 *   --weight        字重 100~900（預設 700）
 *   --ratio         畫面比例：16:9 / 9:16（預設 16:9）
 *   --accent-color  重音字顏色（預設 #FF6B2B）
 *   --accent-scale  重音字放大倍率（預設 1.15）
 *   --beat          自動偵測重拍並在 LRC 加 *標記*（flag，不帶值）
 *   --title         歌曲名稱（顯示在影片左下角）
 *   --artist        作者名稱（顯示在影片左下角）
 *   --out           輸出路徑（預設 out/mv.mp4）
 */
import path from "path";
import fs from "fs";
import { execSync, execFileSync } from "child_process";

// ── CLI ───────────────────────────────────────────────
const args = process.argv.slice(2);
// Windows CMD 多層引號會讓引號殘留在值裡，統一剝除首尾
const strip = (s) => s ? s.replace(/^"+|"+$/g, "").trim() : s;
const get   = (f) => { const i = args.indexOf(f); return i !== -1 ? strip(args[i+1]) : null; };

const audioArg  = get("--audio");
const srtArg    = get("--srt");
const bgArg     = get("--bg");
const dimArg    = get("--dim");
const posArg    = get("--pos");
const animArg        = get("--anim");
const weightArg      = get("--weight");
const ratioArg       = get("--ratio");
const accentColorArg = get("--accent-color");
const accentScaleArg = get("--accent-scale");
const beatFlag       = args.includes("--beat");
const titleArg       = get("--title")  ?? "";
const artistArg      = get("--artist") ?? "";
const outArg         = get("--out") ?? "out/mv.mp4";

if (!audioArg || !srtArg) {
  console.error("用法: node scripts/make-mv.mjs --audio <音樂> --srt <歌詞>");
  process.exit(1);
}

const audioSrc = path.resolve(audioArg);
const lyricSrc = path.resolve(srtArg);
if (!fs.existsSync(audioSrc)) { console.error(`找不到音樂: ${audioSrc}`); process.exit(1); }
if (!fs.existsSync(lyricSrc)) { console.error(`找不到歌詞: ${lyricSrc}`); process.exit(1); }

// ── LRC → SRT ────────────────────────────────────────
function lrcToSrt(lrcText) {
  const timeRe = /\[(\d{1,3}):(\d{2})\.(\d{1,3})\]/g;
  const entries = [];
  for (const line of lrcText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const timestamps = [];
    let m; timeRe.lastIndex = 0;
    while ((m = timeRe.exec(trimmed)) !== null)
      timestamps.push(+m[1]*60000 + +m[2]*1000 + +m[3].padEnd(3,"0"));
    if (!timestamps.length) continue;
    const text = trimmed.replace(/\[\d{1,3}:\d{2}\.\d{1,3}\]/g,"").trim();
    if (!text) continue;
    for (const ms of timestamps) entries.push({ ms, text });
  }
  entries.sort((a,b) => a.ms - b.ms);
  const fmt = (ms) => {
    const h=Math.floor(ms/3600000), mn=Math.floor((ms%3600000)/60000);
    const s=Math.floor((ms%60000)/1000), mi=ms%1000;
    return `${String(h).padStart(2,"0")}:${String(mn).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(mi).padStart(3,"0")}`;
  };
  return entries.map((e,i)=>{
    const end = i+1 < entries.length ? entries[i+1].ms : e.ms+3000;
    return `${i+1}\n${fmt(e.ms)} --> ${fmt(end)}\n${e.text}`;
  }).join("\n\n");
}

// ── 準備目錄 ──────────────────────────────────────────
const projectRoot = path.join(import.meta.dirname, "..");
const publicDir   = path.join(projectRoot, "public");
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(path.join(projectRoot, path.dirname(outArg)), { recursive: true });

// ── 音樂 ──────────────────────────────────────────────
const audioExt    = path.extname(audioSrc);
const audioPublic = `input-audio${audioExt}`;
fs.copyFileSync(audioSrc, path.join(publicDir, audioPublic));
console.log(`✓ 音樂    → public/${audioPublic}`);

// ── 歌詞（直接讀內容，不靠 fetch）────────────────────
const lyricExt = path.extname(lyricSrc).toLowerCase();
let rawLrc     = fs.readFileSync(lyricSrc, "utf8");

// ── 重拍偵測（--beat）─────────────────────────────────
if (beatFlag) {
  console.log("🥁 偵測音樂重拍中...");
  const { detectBeats, markLrcWithBeats } = await import("./detect-beats.mjs");
  const beats = await detectBeats(audioSrc);
  console.log(`   偵測到 ${beats.length} 個重拍`);
  if (lyricExt === ".lrc") {
    rawLrc = markLrcWithBeats(rawLrc, beats);
    console.log("   已將重拍位置加上 *標記*");
  } else {
    console.log("   ⚠ SRT 格式不支援重拍標記，請先轉為 LRC 再加 --beat");
  }
}

let srtContent = rawLrc;
if (lyricExt === ".lrc") {
  srtContent = lrcToSrt(rawLrc);
  console.log(`✓ LRC → SRT（${srtContent.split("\n\n").length} 行）`);
} else {
  console.log(`✓ SRT 讀取完成`);
}

// ── 背景圖（單張 or 批量目錄）────────────────────────
// 批量圖片目前先複製第一張；GUI 版本再做輪播
let bgPublic;
if (bgArg) {
  const bgPath = path.resolve(bgArg);
  const stat = fs.statSync(bgPath);
  let imgSrc;
  if (stat.isDirectory()) {
    const imgs = fs.readdirSync(bgPath)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map(f => path.join(bgPath, f));
    if (!imgs.length) { console.warn("⚠ 背景目錄內沒有圖片，略過"); }
    else {
      imgSrc = imgs[0];
      if (imgs.length > 1) console.log(`ℹ 批量背景（${imgs.length} 張），目前取第一張；GUI 版本將支援輪播`);
    }
  } else {
    imgSrc = bgPath;
  }
  if (imgSrc) {
    bgPublic = `bg${path.extname(imgSrc)}`;
    fs.copyFileSync(imgSrc, path.join(publicDir, bgPublic));
    console.log(`✓ 背景圖  → public/${bgPublic}`);
  }
}

// ── 音樂長度 ──────────────────────────────────────────
const durRaw = execSync(
  `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${path.join(publicDir, audioPublic)}"`,
  { encoding: "utf8" }
).trim();
const durationInSeconds = parseFloat(durRaw);
console.log(`✓ 音樂長度 ${Math.floor(durationInSeconds/60)}分${(durationInSeconds%60).toFixed(1)}秒`);

// ── Props JSON ────────────────────────────────────────
const validPositions = ["center","lower-third","upper-third"];
const validAnims     = ["sentence-fade","line-swap","char-appear","char-highlight","scale-echo"];
const props = {
  audioFile:     audioPublic,
  srtContent,
  durationInSeconds,
  bgImages:      bgPublic ? [{ file: bgPublic }] : [],
  bgDim:         dimArg    ? parseFloat(dimArg)    : 0.5,
  textPosition:  validPositions.includes(posArg) ? posArg : "center",
  animationMode: validAnims.includes(animArg) ? animArg : "sentence-fade",
  fontWeight:    weightArg      ? parseInt(weightArg)      : 700,
  accentColor:   accentColorArg ?? "#FF6B2B",
  accentScale:   accentScaleArg ? parseFloat(accentScaleArg) : 1.15,
  songTitle:     titleArg,
  artist:        artistArg,
};

const propsFile = path.join(projectRoot, "tmp-props.json");
fs.writeFileSync(propsFile, JSON.stringify(props), "utf8");

// ── Remotion render ───────────────────────────────────
console.log("⏳ 開始渲染...");
const isWin      = process.platform === "win32";
const remotionBin = path.join(projectRoot, "node_modules", ".bin", isWin ? "remotion.cmd" : "remotion");
try {
  const compId = ratioArg === "9:16" ? "MyComp-9x16" : "MyComp";
  execFileSync(
    remotionBin,
    ["render", compId, outArg, `--props=${propsFile}`],
    { cwd: projectRoot, stdio: "inherit", shell: isWin }
  );
} finally {
  fs.rmSync(propsFile, { force: true });
}

console.log(`\n✅ 完成！→ ${path.resolve(outArg)}`);
