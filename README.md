# Lyrics MV Studio

> Remotion 4.0 歌詞 MV 產生器。輸入音樂 + 字幕，輸出高畫質 MP4。
> 支援 Web UI 圖形介面與 CLI 命令列兩種操作方式。

---

## 功能特色

- **5 種歌詞動畫**：淡入、行滑動、逐字彈出、字高亮、疊影放大
- **本地語音辨識**：Whisper.cpp 自動辨識歌詞（首次使用自動下載）
- **中文字型支援**：NotoSansTC、NotoSerifTC、ZhiMangXing（行書）、MaShanZheng（楷書）
- **多背景圖輪播**：支援單張或整個資料夾平均分配
- **16:9 / 9:16**：同時支援橫向（YouTube）與直向（Reels / TikTok）
- **Web UI**：拖曳上傳，即時預覽，一鍵渲染

---

## 環境需求

| 工具 | 版本 | 用途 |
|------|------|------|
| [Node.js](https://nodejs.org/) | 18 以上 | 執行腳本與伺服器 |
| [ffmpeg](https://ffmpeg.org/download.html) | 任意 | 音訊格式轉換、重拍偵測 |

> **Windows 安裝 ffmpeg**：下載後解壓，將 `bin/` 資料夾加入系統 PATH。
> 確認方法：在 PowerShell 執行 `ffmpeg -version`。

---

## 安裝

```bash
git clone https://github.com/yung13yubabie/lyrics-mv.git
cd lyrics-mv
npm install
```

> `whisper.cpp` 二進位**不需要手動下載**，第一次執行語音辨識時會自動安裝。

---

## 方式一：Web UI（推薦）

```bash
cd Desktop\lyrics-mv
node scripts/server.mjs
```

瀏覽器開啟 `http://localhost:7842`

### 操作步驟

1. **上傳音樂**：拖曳 mp3 / wav / m4a 到音樂區
2. **上傳字幕**：拖曳 .srt 或 .lrc 到字幕區（若沒有，可用語音辨識生成）
3. **選擇背景**：上傳圖片，或留空使用純黑底
4. **調整設定**：動畫模式、字型、字色、位置（右側面板即時預覽）
5. **點擊渲染**：等待進度條完成，點下載

---

## 方式二：命令列（CLI）

```bash
node scripts/make-mv.mjs --audio "歌曲.mp3" --srt "歌詞.lrc"
```

輸出：`out/mv.mp4`

### 常用參數

| 參數 | 說明 | 預設 |
|------|------|------|
| `--audio` | 音樂檔（mp3/wav/m4a/flac）| 必填 |
| `--srt` | 字幕檔（.srt 或 .lrc）| 必填 |
| `--bg` | 背景圖片或資料夾 | 純黑 |
| `--dim` | 背景遮罩深度（0.0~1.0）| `0.5` |
| `--pos` | 文字位置：`center` / `lower-third` / `upper-third` | `center` |
| `--anim` | 動畫模式（見下表）| `sentence-fade` |
| `--ratio` | 畫面比例：`16:9` / `9:16` | `16:9` |
| `--title` | 歌名（顯示在左下角）| 不顯示 |
| `--artist` | 歌手名（顯示在左下角）| 不顯示 |
| `--out` | 輸出路徑 | `out/mv.mp4` |

### 動畫模式

| 值 | 效果 | 適合場景 |
|----|------|---------|
| `sentence-fade` | 整句淡入上滑 | 抒情慢歌 |
| `line-swap` | 底部滑入、頂部滑出 | 節奏穩定 |
| `char-appear` | 逐字依序彈出 | 說唱、快節奏 |
| `char-highlight` | 整句低亮，唱到的字才亮 | 跟唱練習 |
| `scale-echo` | 3 層疊影同步放大 | 強力副歌 |

### CLI 範例

```bash
# 基本（黑底）
node scripts/make-mv.mjs ^
  --audio "C:\Music\song.mp3" ^
  --srt   "C:\Music\song.lrc"

# 加背景圖 + 直向輸出（Reels/TikTok）
node scripts/make-mv.mjs ^
  --audio  "C:\Music\song.mp3" ^
  --srt    "C:\Music\song.lrc" ^
  --bg     "C:\Music\cover.png" ^
  --dim    0.6 ^
  --ratio  9:16 ^
  --anim   char-highlight ^
  --out    "out\mv_vertical.mp4"

# 加歌名 + 疊影動畫
node scripts/make-mv.mjs ^
  --audio  "C:\Music\song.mp3" ^
  --srt    "C:\Music\song.lrc" ^
  --bg     "C:\Music\cover.png" ^
  --anim   scale-echo ^
  --title  "歌曲名稱" ^
  --artist "歌手名稱"
```

---

## 語音辨識（沒有字幕時）

若手上只有音樂檔，可用 Whisper 自動辨識歌詞：

```bash
node scripts/transcribe-lrc.mjs --audio "C:\Music\song.mp3"
```

**首次執行**會自動下載：
- Whisper.cpp 執行檔（~5MB）
- medium 語言模型（~1.5GB）

需要等待約 5~10 分鐘（視網速）。之後執行不再重複下載。

完成後在同目錄生成 `song.lrc`，可用記事本或 VSCode 修正辨識錯字。

### 辨識選項

```bash
# 指定語言（預設 zh 中文）
node scripts/transcribe-lrc.mjs --audio "song.mp3" --lang en

# 同時偵測重拍並加 *標記*
node scripts/transcribe-lrc.mjs --audio "song.mp3" --beat
```

---

## 重音強調語法

在 `.lrc` 或 `.srt` 裡用 `*詞*` 標記重音字，渲染時該字會套用強調色與放大效果：

```lrc
[00:10.50]這次算我*認真*想過一場
[00:14.20]*愛*到最後還是會*怕*
```

---

## 字幕格式

### SRT 格式

```srt
1
00:00:10,500 --> 00:00:14,200
這次算我認真想過一場

2
00:00:14,200 --> 00:00:18,000
愛到最後還是會怕
```

> 注意：SRT 時間分隔符是 `,`（逗號），不是 `.`（句點）

### LRC 格式

```lrc
[00:10.50]這次算我認真想過一場
[00:14.20]愛到最後還是會怕
```

---

## 目錄結構

```
lyrics-mv/
├── src/
│   ├── Composition.tsx    # Remotion 主體（Schema、字型載入、SRT 解析）
│   ├── CaptionPage.tsx    # 歌詞動畫邏輯（5 種 AnimationMode）
│   └── Root.tsx           # 入口（16:9 + 9:16）
├── scripts/
│   ├── server.mjs         # Web UI 伺服器（port 7842）
│   ├── make-mv.mjs        # CLI 一鍵產生
│   ├── transcribe-lrc.mjs # Whisper 語音辨識
│   └── detect-beats.mjs   # 音樂重拍偵測
├── ui/
│   └── index.html         # Web UI（單一 HTML 檔）
├── public/                # 渲染用靜態資源（.gitignore 排除，自動建立）
├── out/                   # 輸出 MP4（.gitignore 排除）
└── .ai/                   # AI 協作文件（spec-kit、任務追蹤）
```

---

## 常見問題

**Q：MP4 黑幕沒有文字**
A：確認字幕格式正確。SRT 時間分隔用 `,`；LRC 格式為 `[mm:ss.xx]`。

**Q：渲染很慢**
A：3 分鐘的歌約需 5~15 分鐘，視 CPU 效能而定。

**Q：中文顯示亂碼**
A：字型選擇 NotoSansTC 或 NotoSerifTC，確保字型已載入。

**Q：Windows 路徑有空格**
A：用單層雙引號包住路徑：`--audio "C:\My Music\song.mp3"`

**Q：whisper.cpp 下載失敗**
A：確認有網路連線，並確認 `ffmpeg` 已安裝在 PATH 中。

---

## AI 接手指南

本專案有 `.ai/` 目錄，供 AI 或新 Session 快速接手：

```
.ai/
├── HANDOFF.md       # 30 秒掌握全貌（先讀這個）
├── spec-kit.md      # 完整架構規格
├── CURRENT_STATE.md # 目前進度與已知問題
├── TASKS.md         # 待辦清單
└── DECISIONS.md     # 架構決策記錄
```
