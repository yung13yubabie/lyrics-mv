/**
 * server.mjs — 本地 Web UI 伺服器
 * 執行: node scripts/server.mjs
 */
import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";
import { createServer } from "http";
import { execSync } from "child_process";

const projectRoot = path.join(import.meta.dirname, "..");
const publicDir   = path.join(projectRoot, "public");
const uiDir       = path.join(projectRoot, "ui");
const outDir      = path.join(projectRoot, "out");
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(outDir,    { recursive: true });

// ── LRC → SRT ────────────────────────────────────────
function lrcToSrt(lrcText) {
  const timeRe = /\[(\d{1,3}):(\d{2})\.(\d{1,3})\]/g;
  const entries = [];
  for (const line of lrcText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const ts = []; let m; timeRe.lastIndex = 0;
    while ((m = timeRe.exec(trimmed)) !== null)
      ts.push(+m[1]*60000 + +m[2]*1000 + +m[3].padEnd(3,"0"));
    if (!ts.length) continue;
    const text = trimmed.replace(/\[\d{1,3}:\d{2}\.\d{1,3}\]/g,"").trim();
    if (!text) continue;
    for (const ms of ts) entries.push({ ms, text });
  }
  entries.sort((a,b)=>a.ms-b.ms);
  const fmt = ms => {
    const h=Math.floor(ms/3600000), mn=Math.floor((ms%3600000)/60000);
    const s=Math.floor((ms%60000)/1000), mi=ms%1000;
    return `${String(h).padStart(2,"0")}:${String(mn).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(mi).padStart(3,"0")}`;
  };
  return entries.map((e,i)=>{
    const end=i+1<entries.length?entries[i+1].ms:e.ms+3000;
    return `${i+1}\n${fmt(e.ms)} --> ${fmt(end)}\n${e.text}`;
  }).join("\n\n");
}

// ── 簡易 multipart 解析 ───────────────────────────────
function parseMultipart(body, boundary) {
  const parts = {};
  const sep = `--${boundary}`;
  const rawParts = body.split(sep).slice(1);
  for (const part of rawParts) {
    if (part.trim() === "--" || !part.trim()) continue;
    const [headerSection, ...rest] = part.split("\r\n\r\n");
    const content = rest.join("\r\n\r\n").replace(/\r\n--$/, "").replace(/\r\n$/, "");
    const nameMatch = headerSection.match(/name="([^"]+)"/);
    const fileMatch = headerSection.match(/filename="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (fileMatch) {
      const contentTypeMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);
      parts[name] = { filename: fileMatch[1], contentType: contentTypeMatch?.[1]?.trim(), data: Buffer.from(content, "binary") };
    } else {
      parts[name] = content;
    }
  }
  return parts;
}

// ── SSE 廣播 + render 狀態追蹤 ───────────────────────
// 問題：100% 後 encoding 階段無輸出，SSE 靜默斷線重連後 done 事件打空
// 修法：server 端記住最後渲染狀態，新連線立即補發
const sseClients = new Set();
let lastRenderState = null; // { event: 'done'|'error', data: {...} }

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) { try { res.write(msg); } catch {} }
}

// SSE 心跳：每 20s 發一行 comment，防止 proxy/browser 因靜默而斷線
setInterval(() => {
  for (const res of sseClients) { try { res.write(": keepalive\n\n"); } catch {} }
}, 20_000);

// ── HTTP 伺服器 ───────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // SSE 進度
  if (url.pathname === "/progress") {
    res.writeHead(200, { "Content-Type":"text/event-stream", "Cache-Control":"no-cache", Connection:"keep-alive" });
    sseClients.add(res);
    // 若渲染已完成（重連後補發 done/error）
    if (lastRenderState) {
      const { event, data } = lastRenderState;
      try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
    }
    req.on("close", () => sseClients.delete(res));
    return;
  }

  // ── 語音辨識 API ──────────────────────────────────────
  if (url.pathname === "/transcribe" && req.method === "POST") {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", async () => {
      try {
        const buf      = Buffer.concat(chunks);
        const ct       = req.headers["content-type"] || "";
        const boundary = ct.split("boundary=")[1];
        if (!boundary) { res.writeHead(400); res.end("No boundary"); return; }
        const parts = parseMultipart(buf.toString("binary"), boundary);

        const audioFile = parts["audio"];
        if (!audioFile?.data) { res.writeHead(400); res.end("Missing audio"); return; }

        const audioExt  = path.extname(audioFile.filename) || ".mp3";
        const tmpAudio  = path.join(publicDir, `_tr_audio${audioExt}`);
        fs.writeFileSync(tmpAudio, audioFile.data);

        const lang = (parts["lang"] ?? "zh").toString().trim() || "zh";

        // 動態 import（避免頂層載入）
        const {
          downloadWhisperModel,
          installWhisperCpp,
          transcribe,
          toCaptions,
        } = await import("@remotion/install-whisper-cpp");

        const whisperDir = path.join(projectRoot, "whisper.cpp");
        const tmp16k     = path.join(publicDir, "_tr_16k.wav");

        // ffmpeg 轉 16kHz mono
        const { execSync: es2 } = await import("child_process");
        es2(`ffmpeg -y -i "${tmpAudio}" -ar 16000 -ac 1 -c:a pcm_s16le "${tmp16k}"`,
          { stdio: "ignore" });

        await installWhisperCpp({ to: whisperDir, version: "1.5.5" });
        await downloadWhisperModel({ model: "medium", folder: whisperDir });

        const whisperOut = await transcribe({
          model: "medium", whisperPath: whisperDir, whisperCppVersion: "1.5.5",
          inputPath: tmp16k, tokenLevelTimestamps: true, language: lang,
        });
        const { captions } = toCaptions({ whisperCppOutput: whisperOut });

        const fmtLrc = ms => {
          const m  = Math.floor(ms / 60000);
          const s  = Math.floor((ms % 60000) / 1000);
          const cs = Math.floor((ms % 1000) / 10);
          return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
        };
        const lrc = captions.map(c => `[${fmtLrc(c.startMs)}]${c.text}`).join("\n");

        fs.rmSync(tmp16k, { force: true });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, lrc }));
      } catch (e) {
        console.error(e);
        if (!res.headersSent) { res.writeHead(500); res.end(JSON.stringify({ ok: false, error: String(e) })); }
      }
    });
    return;
  }

  // ── 重拍偵測 API ──────────────────────────────────────
  if (url.pathname === "/detect-beats" && req.method === "POST") {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", async () => {
      try {
        const buf      = Buffer.concat(chunks);
        const ct       = req.headers["content-type"] || "";
        const boundary = ct.split("boundary=")[1];
        if (!boundary) { res.writeHead(400); res.end("No boundary"); return; }
        const parts = parseMultipart(buf.toString("binary"), boundary);

        const audioFile = parts["audio"];
        if (!audioFile?.data) { res.writeHead(400); res.end("Missing audio"); return; }

        const audioExt = path.extname(audioFile.filename) || ".mp3";
        const tmpAudio = path.join(publicDir, `_beat_audio${audioExt}`);
        fs.writeFileSync(tmpAudio, audioFile.data);

        const lrcInput = (parts["lrc"] ?? "").toString();

        const { detectBeats, markLrcWithBeats } = await import("./detect-beats.mjs");
        const beats    = await detectBeats(tmpAudio);
        const markedLrc = lrcInput ? markLrcWithBeats(lrcInput, beats) : "";

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, beats, lrc: markedLrc }));
      } catch (e) {
        console.error(e);
        if (!res.headersSent) { res.writeHead(500); res.end(JSON.stringify({ ok: false, error: String(e) })); }
      }
    });
    return;
  }

  // 下載輸出
  if (url.pathname === "/download") {
    const file = path.join(outDir, "mv.mp4");
    if (!fs.existsSync(file)) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type":"video/mp4", "Content-Disposition":`attachment; filename="mv.mp4"` });
    fs.createReadStream(file).pipe(res);
    return;
  }

  // 渲染 API
  if (url.pathname === "/render" && req.method === "POST") {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", async () => {
      try {
        const buf = Buffer.concat(chunks);
        const ct  = req.headers["content-type"] || "";
        const boundary = ct.split("boundary=")[1];
        if (!boundary) { res.writeHead(400); res.end("No boundary"); return; }
        const parts = parseMultipart(buf.toString("binary"), boundary);

        // 音樂
        const audioFile = parts["audio"];
        if (!audioFile?.data) { res.writeHead(400); res.end("Missing audio"); return; }
        const audioExt    = path.extname(audioFile.filename) || ".wav";
        const audioPublic = `input-audio${audioExt}`;
        fs.writeFileSync(path.join(publicDir, audioPublic), audioFile.data);

        // 歌詞
        const srtFile = parts["srt"];
        if (!srtFile?.data) { res.writeHead(400); res.end("Missing srt"); return; }
        const lyricText = srtFile.data.toString("utf8");
        const srtContent = path.extname(srtFile.filename).toLowerCase() === ".lrc"
          ? lrcToSrt(lyricText) : lyricText;

        // 背景圖（支援多張，格式: bg0, bg1, bg2...）
        const bgImages = [];
        const bgDurations = JSON.parse(parts["bgDurations"] || "[]");
        let bi = 0;
        while (parts[`bg${bi}`]) {
          const img = parts[`bg${bi}`];
          const ext = path.extname(img.filename) || ".jpg";
          const fname = `bg${bi}${ext}`;
          fs.writeFileSync(path.join(publicDir, fname), img.data);
          bgImages.push({ file: fname, duration: bgDurations[bi] ?? undefined });
          bi++;
        }

        // 音樂長度
        const durRaw = execSync(
          `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${path.join(publicDir, audioPublic)}"`,
          { encoding: "utf8" }
        ).trim();
        const durationInSeconds = parseFloat(durRaw);

        // 文字設定
        const settings = JSON.parse(parts["settings"] || "{}");

        const props = {
          audioFile:     audioPublic,
          srtContent,
          durationInSeconds,
          bgImages,
          bgDim:         parseFloat(settings.bgDim ?? "0.5"),
          textPosition:  settings.textPosition ?? "center",
          fontSize:      parseInt(settings.fontSize ?? "68"),
          fontWeight:    parseInt(settings.fontWeight ?? "700"),
          textColor:     settings.textColor ?? "#FFE600",
          strokeColor:   settings.strokeColor ?? "transparent",
          strokeWidth:   parseInt(settings.strokeWidth ?? "0"),
          fontFamily:    settings.fontFamily ?? "sans-serif",
          animationMode: settings.animationMode ?? "sentence-fade",
          accentColor:   settings.accentColor   ?? "#FF6B2B",
          accentScale:   parseFloat(settings.accentScale ?? "1.15"),
          songTitle:     settings.songTitle     ?? "",
          artist:        settings.artist        ?? "",
          echoSpread:    parseFloat(settings.echoSpread   ?? "0.09"),
          echoOpacity:   parseFloat(settings.echoOpacity  ?? "0.28"),
          echoOffsetX:   parseFloat(settings.echoOffsetX  ?? "0"),
          echoOffsetY:   parseFloat(settings.echoOffsetY  ?? "0"),
          echoScaleEnd:  parseFloat(settings.echoScaleEnd ?? "1.18"),
          lineHeight:    parseFloat(settings.lineHeight    ?? "1.4"),
          letterSpacing: parseFloat(settings.letterSpacing ?? "0.06"),
          srtOffsetMs:   parseInt(settings.srtOffsetMs    ?? "0"),
        };

        const propsFile = path.join(projectRoot, "tmp-props.json");
        fs.writeFileSync(propsFile, JSON.stringify(props), "utf8");
        const outFile = path.join(outDir, "mv.mp4");
        const compId  = (settings.aspectRatio === "9:16") ? "MyComp-9x16" : "MyComp";

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, message: "渲染開始" }));

        // 背景執行渲染並串流進度
        lastRenderState = null; // 新渲染開始，清空上次狀態
        broadcast("start", { message: "開始渲染..." });
        const isWin = process.platform === "win32";
        const remotionBin = path.join(projectRoot, "node_modules", ".bin", isWin ? "remotion.cmd" : "remotion");
        try {
          const { spawn } = await import("child_process");
          // 用 cmd.exe /c 明確呼叫 .cmd，避免 DEP0190 及 shell 引號問題
          const spawnCmd  = isWin ? "cmd.exe" : remotionBin;
          const crf = parseInt(settings.crf ?? "18");
          const crfFlag = `--crf=${crf}`;
          const spawnArgs = isWin
            ? ["/c", remotionBin, "render", compId, outFile, `--props=${propsFile}`, crfFlag]
            : ["render", compId, outFile, `--props=${propsFile}`, crfFlag];
          const child = spawn(spawnCmd, spawnArgs, { cwd: projectRoot });

          const errLines = [];
          const onData = d => {
            const line = d.toString();
            const m = line.match(/(\d+)%/);
            if (m) broadcast("progress", { percent: parseInt(m[1]), message: line.trim() });
          };
          child.stdout.on("data", onData);
          child.stderr.on("data", d => {
            const line = d.toString();
            errLines.push(line.trim());
            onData(d);
          });
          child.on("close", code => {
            fs.rmSync(propsFile, { force: true });
            if (code === 0) {
              lastRenderState = { event: "done", data: { message: "渲染完成！" } };
              broadcast("done", lastRenderState.data);
            } else {
              const detail = errLines.filter(l => l).slice(-6).join(" | ");
              const msg = `渲染失敗 (exit ${code})${detail ? ": " + detail : ""}`;
              lastRenderState = { event: "error", data: { message: msg } };
              broadcast("error", lastRenderState.data);
            }
          });
        } catch (e) {
          broadcast("error", { message: String(e) });
        }
      } catch (e) {
        console.error(e);
        if (!res.headersSent) { res.writeHead(500); res.end(String(e)); }
      }
    });
    return;
  }

  // 靜態檔案
  let filePath = url.pathname === "/" ? path.join(uiDir, "index.html") : path.join(uiDir, url.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext  = path.extname(filePath);
    const mime = { ".html":"text/html;charset=utf-8", ".css":"text/css", ".js":"application/javascript" }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404); res.end("Not found");
  }
});

const PORT = 7842;
server.listen(PORT, () => {
  console.log(`\n🎬 Lyrics MV Studio 已啟動`);
  console.log(`   瀏覽器開啟: http://localhost:${PORT}\n`);
  // Windows 自動開啟瀏覽器
  try { execSync(`start http://localhost:${PORT}`); } catch {}
});
