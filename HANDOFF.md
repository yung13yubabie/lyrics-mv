# HANDOFF — Lyrics MV Studio

> 給下一個 agent 讀的接手文件。請在開始任何工作前先完整讀完。

---

## 專案位置

```
C:\Users\LIN\Desktop\lyrics-mv\
```

## 這是什麼

Remotion 4.0 的文字 MV 產生器，含：
- **Web UI**：`node scripts/server.mjs` → `http://localhost:7842`
- **CLI**：`node scripts/make-mv.mjs --audio ... --srt ...`

輸出 MP4（16:9 或 9:16），支援多種歌詞動畫效果與 Whisper 語音辨識。

---

## 關鍵檔案

| 檔案 | 說明 |
|------|------|
| `ui/index.html` | Web UI（1246 行）—— 全部 HTML/CSS/JS 都在這一個檔案裡 |
| `scripts/server.mjs` | HTTP + SSE + multipart 解析的 Node.js 伺服器（360 行） |
| `scripts/make-mv.mjs` | CLI 一鍵產生腳本 |
| `scripts/detect-beats.mjs` | 音樂重拍偵測（ffmpeg → RMS → 峰值） |
| `scripts/transcribe-lrc.mjs` | Whisper 語音辨識 → .lrc |
| `src/CaptionPage.tsx` | 歌詞動畫邏輯（267 行） |
| `src/Composition.tsx` | Remotion Composition 主體（174 行） |
| `src/Root.tsx` | Remotion 入口（16:9 + 9:16 兩個 Composition） |

---

## 架構要點

### 渲染流程（Web UI）

```
使用者上傳檔案
  → /render POST（multipart）
  → server 複製檔案到 public/
  → 執行 remotion render MyComp out/mv.mp4
  → SSE /progress 推送進度給前端
  → 完成後前端顯示下載按鈕
```

### SSE 架構重點（已修復）

- `lastRenderState`：server 端記住最後一次渲染結果（done/error）
- 新連線立即補發 `lastRenderState`，解決 encoding 靜默期重連收不到 done 的問題
- 每 20 秒送 `: keepalive\n\n` 防止 proxy/browser 斷線
- 位置：`server.mjs` 第 71–102 行

### AnimationMode（CaptionPage.tsx）

| 值 | 效果 |
|---|---|
| `sentence-fade` | 整句淡入上滑 |
| `line-swap` | 底部滑入、頂部滑出 |
| `char-appear` | 逐字彈出 |
| `char-highlight` | 整句低亮、唱到的字才亮 |
| `scale-echo` | 3 層疊影同步等比放大（新增，已實作） |

---

## 已完成的修復（本 session 前已全部到位）

| 問題 | 修法 | 位置 |
|------|------|------|
| 左欄無法捲動 | `.section { flex-shrink: 0 }` | `index.html` line 118 |
| section 邊框被吃 | 移除 `overflow-x: hidden` | `index.html` line 75 comment |
| 渲染 100% 後沒反應 | SSE `lastRenderState` + keepalive | `server.mjs` line 71–102 |
| ERR_UPLOAD_FILE_CHANGED | `readIntoBlob()`先讀進記憶體 | `index.html` line 1198 |
| favicon 404 | `<link rel="icon" href="data:,">` | `index.html` line 7 |
| 辨識按鈕結構被 textContent 破壞 | 改用 `innerHTML` + HTML 常數 | `index.html` line 1079–1120 |
| 模型下載無預估時間 | `etaTimer` setInterval | `index.html` line 1090 |
| 預覽無法縮放 | scroll wheel zoom（0.5x–3x）+ dblclick 重置 | `index.html` line 971–983 |
| beat 偵測讀不到上傳的 lrc | fallback 讀 `state.srtFile.text()` | `index.html` runDetectBeats |
| 上傳 lrc 未填入 textarea | setupDrop 讀取並填入 | `index.html` srt-drop handler |
| CLI `--anim scale-echo` 被忽略 | validAnims 加入 `"scale-echo"` | `make-mv.mjs` line 159 |

---

## 目前狀態

- 伺服器在 port 7842 **已啟動**（`node scripts/server.mjs`）
- 所有上述修復均已寫入磁碟
- **尚未由使用者驗證**渲染是否端到端成功

---

## 已知未完成 / 待確認事項

1. **端到端渲染驗證**：使用者尚未實際跑一次渲染確認 SSE done 事件是否正確收到
2. **Whisper 首次下載**：~1.5 GB 模型，首次會花數分鐘，ETA timer 已加入但使用者尚未測試
3. **`/huashu-design` 美化**：使用者在之前的 grill-me 中提到想做 UI 美化改版，但因功能修復優先而未實作，尚未確認是否仍有需求

---

## 啟動方式

```bash
cd C:\Users\LIN\Desktop\lyrics-mv
node scripts/server.mjs
# 瀏覽器開 http://localhost:7842
```

## 如果要讀程式碼

**不要一次讀整個 index.html**（1246 行）。建議用 `grep -n "關鍵字"` 定位行號再局部讀。

常用查詢：
```bash
grep -n "runTranscribe\|runDetectBeats\|runRender\|setupDrop" ui/index.html
grep -n "lastRenderState\|broadcast\|sseClients" scripts/server.mjs
```
