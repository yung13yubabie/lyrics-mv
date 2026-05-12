# lyrics-mv 文字 MV 產生器

## 快速開始

### 方式 A：圖形介面（推薦）

```bash
cd Desktop\lyrics-mv
node scripts/server.mjs
```
瀏覽器自動開啟 `http://localhost:7842`，拖曳上傳檔案，點按鈕即可渲染。

### 方式 B：命令列（純終端，不開 UI）

```bash
cd Desktop\lyrics-mv
node scripts/make-mv.mjs --audio "音樂.mp3" --srt "歌詞.lrc"
```

輸出在 `out/mv.mp4`。

---

## 完整參數

| 參數 | 說明 | 可選值 | 預設 |
|------|------|--------|------|
| `--audio`  | 音樂檔案 | mp3 / wav / m4a / flac | 必填 |
| `--srt`    | 歌詞檔案 | .srt / .lrc | 必填 |
| `--bg`     | 背景圖片（單張）或資料夾（批量平均分配） | jpg / png / webp / 資料夾路徑 | 無（黑底） |
| `--dim`    | 背景遮罩深度 | 0.0 ~ 1.0 | `0.5` |
| `--pos`    | 文字位置 | `center` / `lower-third` / `upper-third` | `center` |
| `--anim`          | 動畫模式 | `sentence-fade` / `line-swap` / `char-appear` / `char-highlight` / `scale-echo` | `sentence-fade` |
| `--weight`        | 字重 | `100` `300` `400` `700` `900` | `700` |
| `--ratio`         | 畫面比例 | `16:9` / `9:16` | `16:9` |
| `--accent-color`  | 重音字顏色 | 任意 HEX | `#FF6B2B` |
| `--accent-scale`  | 重音字放大倍率 | 1.0 ~ 1.5 | `1.15` |
| `--title`         | 歌曲名稱（顯示在左下角） | 任意文字 | 不顯示 |
| `--artist`        | 作者名稱（顯示在歌名上方） | 任意文字 | 不顯示 |
| `--beat`          | 自動偵測重拍並在 LRC 加 `*標記*`（flag，不帶值） | — | 不啟用 |
| `--out`           | 輸出路徑 | 任意 .mp4 路徑 | `out/mv.mp4` |

### 動畫模式說明

| 模式 | 效果 |
|------|------|
| `sentence-fade` | 整句柔和淡入、上滑進場，適合抒情 |
| `line-swap` | 底部滑入、頂部滑出換行，適合節奏穩定 |
| `char-appear` | 逐字依序彈出，適合說唱、緊湊節奏 |
| `char-highlight` | 整句低亮顯示，唱到的字才亮，適合跟唱 |
| `scale-echo` | 3 層疊影同步等比放大（無時間延遲），適合強力副歌 |

---

## 預覽（Studio）

```bash
npx remotion studio
```

先跑一次 `make-mv.mjs` 讓 public/ 有檔案，再開 Studio 預覽。

---

## 目錄結構

```
lyrics-mv/
├── public/              <- 音樂、背景圖放這裡（腳本自動複製）
├── src/
│   ├── Composition.tsx  <- 主邏輯（SRT 解析、Sequence 排列）
│   ├── CaptionPage.tsx  <- 歌詞樣式（字體/顏色/動畫在這改）
│   └── Root.tsx         <- Remotion 入口（16:9 + 9:16 兩個 Composition）
├── scripts/
│   ├── make-mv.mjs      <- 一鍵產生腳本（命令列用）
│   └── server.mjs       <- Web UI 伺服器
├── out/                 <- 輸出 mp4
└── HOWTO.md             <- 本文件
```

---

## 找 Claude 的情境

| 情境 | 說明 |
|------|------|
| 改樣式 | 字體大小/顏色/動畫效果 |
| 加功能 | 批量背景輪播、歌名水印、字幕外框 |
| 錯誤   | 貼完整錯誤訊息 |

---

## 常見問題

**Q: MP4 黑幕沒有文字**
A: 確認 `--srt` 格式正確。LRC 需要 `[mm:ss.xx]`；SRT 時間分隔用 `,` 不用 `.`。

**Q: 渲染很慢**
A: 3 分鐘的歌約需 5~15 分鐘，視 CPU 效能。

**Q: 背景圖太亮**
A: 加 `--dim 0.7` 或更高。

**Q: Windows 路徑有空格或特殊字元**
A: 用**單層**雙引號包住路徑即可，不要用 `""...""`（三引號）：
```bash
# 正確
--bg "C:\Users\LIN\Downloads\my photo.png"

# 錯誤（多層引號會讓引號殘留在路徑裡）
--bg """C:\Users\LIN\Downloads\my photo.png"""
```

---

## 完整終端指令範例

> 以下全部在 `C:\Users\LIN\Desktop\lyrics-mv` 目錄下執行。
> 路徑有空格時用**單層**雙引號包住即可。

### 最基本（黑底 + 預設金字）

```bash
node scripts/make-mv.mjs ^
  --audio "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt   "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc"
```

輸出：`out/mv.mp4`（16:9，淡入整句，字重 700）

---

### 加背景圖 + 遮罩調深

```bash
node scripts/make-mv.mjs ^
  --audio "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt   "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg    "C:\Users\LIN\Downloads\cover.png" ^
  --dim   0.6
```

---

### 電影字幕風（下方 · 淡入 · 適合 MV）

```bash
node scripts/make-mv.mjs ^
  --audio  "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt    "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg     "C:\Users\LIN\Downloads\cover.png" ^
  --dim    0.65 ^
  --pos    lower-third ^
  --anim   sentence-fade ^
  --weight 400
```

---

### 短影音風（逐字高亮 · 置中 · 粗體）

```bash
node scripts/make-mv.mjs ^
  --audio  "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt    "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg     "C:\Users\LIN\Downloads\cover.png" ^
  --dim    0.5 ^
  --pos    center ^
  --anim   char-highlight ^
  --weight 900
```

---

### 上下換行風（line-swap · 適合節奏明確）

```bash
node scripts/make-mv.mjs ^
  --audio  "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt    "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg     "C:\Users\LIN\Downloads\cover.png" ^
  --dim    0.55 ^
  --anim   line-swap ^
  --weight 700
```

---

### 輸出 9:16 直向（IG Reels / TikTok）

```bash
node scripts/make-mv.mjs ^
  --audio  "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt    "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg     "C:\Users\LIN\Downloads\cover.png" ^
  --dim    0.6 ^
  --ratio  9:16 ^
  --anim   char-highlight ^
  --weight 900 ^
  --out    "out/mv_916.mp4"
```

---

### 批量背景圖（整個資料夾平均輪播）

```bash
node scripts/make-mv.mjs ^
  --audio "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt   "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg    "C:\Users\LIN\Downloads\photos\" ^
  --dim   0.6
```

> 資料夾內所有 jpg/png/webp 平均分配時間輪播。

---

### 加歌名 + 作者名稱（顯示在左下角）

```bash
node scripts/make-mv.mjs ^
  --audio  "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt    "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg     "C:\Users\LIN\Downloads\cover.png" ^
  --title  "(桂花盃)阿斯巴甜" ^
  --artist "某某歌手"
```

---

### 自動偵測重拍並標記（--beat）

```bash
node scripts/make-mv.mjs ^
  --audio  "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt    "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg     "C:\Users\LIN\Downloads\cover.png" ^
  --beat ^
  --accent-color "#FF6B2B" ^
  --accent-scale 1.2
```

> `--beat` 會自動偵測鼓點，在 LRC 的對應詞加上 `*標記*`，再渲染出重音效果。

---

### 完整參數全開

```bash
node scripts/make-mv.mjs ^
  --audio        "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt          "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg           "C:\Users\LIN\Downloads\cover.png" ^
  --dim          0.65 ^
  --pos          center ^
  --anim         char-highlight ^
  --weight       900 ^
  --ratio        16:9 ^
  --accent-color "#FF6B2B" ^
  --accent-scale 1.2 ^
  --title        "(桂花盃)阿斯巴甜" ^
  --artist       "某某歌手" ^
  --out          "out\(桂花盃)阿斯巴甜_final.mp4"
```

---

## 重音節標記（節拍強調文字）

在 `.lrc` 或 `.srt` 裡用 `*詞*` 包住要強調的字，渲染時該字會套用重音色與放大。

### LRC 範例

```lrc
[00:10.50]這次算我*認真*想過一場
[00:14.20]*愛*到最後還是會*怕*
[00:18.00]才明白*愛*一個人的方式
```

### SRT 範例

```srt
3
00:00:10,500 --> 00:00:14,200
這次算我*認真*想過一場
```

> 沒有標記 `*` 的字正常顯示；有 `*` 的字套用 `--accent-color` 顏色 + `--accent-scale` 放大倍率。

---

## 語音辨識流程（沒有歌詞時）

### Step 1：自動辨識 → 輸出 .lrc

```bash
node scripts/transcribe-lrc.mjs --audio "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3"
```

> 首次執行會下載 Whisper.cpp + 模型（約 1.5GB），需等待。
> 完成後在同目錄輸出 `(桂花盃)阿斯巴甜.lrc`。

指定語言（預設 `zh`）：

```bash
node scripts/transcribe-lrc.mjs --audio "song.mp3" --lang en
```

辨識的同時自動偵測重拍並加標記：

```bash
node scripts/transcribe-lrc.mjs --audio "song.mp3" --beat
```

### Step 2：人工修正 + 加重音標記

用記事本 / VSCode 打開輸出的 `.lrc`，修正辨識錯字，對副歌重音詞加 `*詞*`：

```lrc
[00:10.50]這次算我*認真*想過一場
[00:14.20]*愛*到最後還是會*怕*
```

### Step 3：渲染

```bash
node scripts/make-mv.mjs ^
  --audio        "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.mp3" ^
  --srt          "C:\Users\LIN\Downloads\(桂花盃)阿斯巴甜.lrc" ^
  --bg           "C:\Users\LIN\Downloads\cover.png" ^
  --anim         char-highlight ^
  --accent-color "#FF6B2B" ^
  --accent-scale 1.2
```
