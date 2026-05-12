# Lyrics MV Studio — 規格書

> 任何 AI/Session 接手前請先讀這份文件。

---

## 專案定位

**Remotion 4.0 文字 MV 產生器**
- 輸入：音訊檔 + SRT/LRC 字幕 + 使用者設定
- 輸出：1920×1080（16:9）或 1080×1920（9:16）MP4

兩種操作方式：
1. **Web UI**：`node scripts/server.mjs` → `http://localhost:7842`
2. **CLI**：`node scripts/make-mv.mjs --audio ... --srt ...`

---

## 技術棧

| 層 | 技術 |
|----|------|
| 渲染引擎 | Remotion 4.0.450 + React 19 |
| 字型 | @remotion/google-fonts（NotoSansTC、NotoSerifTC、ZhiMangXing、MaShanZheng） |
| 字幕解析 | @remotion/captions parseSrt() |
| Whisper | @remotion/install-whisper-cpp（本地語音辨識） |
| Schema | Zod v4 |
| 伺服器 | Node.js ESM + 自製 multipart 解析 + SSE |
| UI | 單一 HTML 檔（ui/index.html，無框架，原生 JS） |

---

## 關鍵檔案地圖

```
lyrics-mv/
├── src/
│   ├── Composition.tsx     # Remotion Composition 主體 + CompositionSchema（Zod）
│   ├── CaptionPage.tsx     # 歌詞動畫邏輯（5 種 AnimationMode）
│   ├── Root.tsx            # 入口：MyComp（16:9）+ MyCompVertical（9:16）
│   └── index.ts            # registerRoot
├── scripts/
│   ├── server.mjs          # HTTP + SSE + multipart（~360 行）
│   ├── make-mv.mjs         # CLI 一鍵產生（~250 行）
│   ├── detect-beats.mjs    # 音樂重拍偵測 ffmpeg → RMS
│   ├── transcribe-lrc.mjs  # Whisper → .lrc
│   └── transcribe-words.mjs
├── ui/
│   └── index.html          # 全部 UI（~1250 行，HTML+CSS+JS 合一）
├── public/                 # 靜態資源（上傳的音訊、背景圖、SRT 都放這）
├── out/                    # 渲染輸出目錄
├── .ai/                    # ← 本目錄（AI 協作文件）
└── whisper.cpp/            # Whisper 二進位（Windows x64）
```

---

## CompositionSchema 完整 Props

```typescript
audioFile:         string   // 公開音訊檔名（放 public/）
srtContent:        string   // SRT 字串
durationInSeconds: number   // 影片秒數
bgImages:          Array<{ file: string; duration?: number }>
bgDim:             number   // 0-1，背景遮罩深度
textPosition:      "center" | "lower-third" | "upper-third"
fontSize:          number   // px，預設 68
fontWeight:        number   // 預設 700
textColor:         string   // CSS 色，預設 "#FFE600"
strokeColor:       string   // 描邊色
strokeWidth:       number   // 描邊寬度 px
fontFamily:        string   // CSS font-family 字串
animationMode:     "sentence-fade" | "line-swap" | "char-appear" | "char-highlight" | "scale-echo"
accentColor:       string   // 強調字色
accentScale:       number   // 強調字放大倍率（char-highlight 用）
songTitle:         string   // 歌名（左下浮水印）
artist:            string   // 歌手（左下浮水印）
echoSpread:        number   // scale-echo 層間距，預設 0.09
echoOpacity:       number   // scale-echo 透明度，預設 0.28
echoOffsetX:       number   // scale-echo X 偏移
echoOffsetY:       number   // scale-echo Y 偏移
echoScaleEnd:      number   // scale-echo 最終縮放，預設 1.18
lineHeight:        number   // 行高，預設 1.4
letterSpacing:     number   // em 單位，預設 0.06
srtOffsetMs:       number   // SRT 時間偏移 ms，預設 0
```

---

## AnimationMode 說明

| 模式 | 效果 |
|------|------|
| `sentence-fade` | 整句淡入上滑（預設） |
| `line-swap` | 底部滑入、頂部滑出 |
| `char-appear` | 逐字彈出 |
| `char-highlight` | 整句低亮，唱到的字才亮 |
| `scale-echo` | 3 層疊影同步等比放大 |

scale-echo 有 5 個專屬參數：`echoSpread`、`echoOpacity`、`echoOffsetX`、`echoOffsetY`、`echoScaleEnd`

---

## 渲染流程（Web UI）

```
使用者上傳音訊 + 背景 + SRT
  → POST /render（multipart）
  → server 複製到 public/
  → spawn: npx remotion render MyComp out/mv.mp4 --props='...' --crf=N
  → SSE /progress 推送進度（0-100%）+ done/error 事件
  → 前端顯示下載按鈕
```

---

## 已知限制

- `ui/index.html` 是單一大檔（~1250 行）：讀時用 grep 定位行號再局部讀
- Whisper 模型首次下載 ~1.5 GB，需網路
- whisper.cpp 二進位只支援 Windows x64
- 背景圖上傳後存放在 `public/`，重啟 server 後仍有效
