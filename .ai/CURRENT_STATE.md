# CURRENT_STATE — Lyrics MV Studio

> 每次 session 結束後更新此文件。
> 最後更新：2026-05-12

---

## 伺服器狀態

- **Port**: 7842
- **啟動指令**: `cd C:\Users\LIN\Desktop\lyrics-mv && node scripts/server.mjs`
- **狀態**: 上次 session 確認 HTTP 200，但 server 並非常駐，重開電腦後需重啟

---

## 已完成功能（截至 2026-05-12）

### 核心功能
- [x] Web UI 控制面板（port 7842）
- [x] Remotion 渲染（16:9 + 9:16）
- [x] SSE 進度推送（含 keepalive + lastRenderState 補發）
- [x] 多背景圖輪播
- [x] Whisper 本地語音辨識 → SRT

### 動畫模式
- [x] `sentence-fade`（整句淡入）
- [x] `line-swap`（行滑動）
- [x] `char-appear`（逐字彈出）
- [x] `char-highlight`（字逐一高亮）
- [x] `scale-echo`（3 層疊影放大）

### 字型
- [x] @remotion/google-fonts 整合（模組頂層 loadFont()）
- [x] NotoSansTC（現代無襯線，預設浮水印字型）
- [x] NotoSerifTC（明體）
- [x] ZhiMangXing（行書）
- [x] MaShanZheng（楷書）
- [x] Song Info 浮水印中文亂碼修復（改用 notoSansTCFamily）

### 進階設定（最近新增）
- [x] `lineHeight` slider（0.8-2.4，預設 1.4）
- [x] `letterSpacing` slider（0-0.30em，預設 0.06）
- [x] `srtOffsetMs` 輸入（-5000 至 +5000ms）
- [x] CRF 品質 slider（10-35，預設 18）
- [x] scale-echo 即時預覽（ghost 層在 UI 中模擬）

### UI 佈局
- [x] 右側面板重構：上半部固定顯示預覽、下半部滾動設定
- [x] 移除 tab 切換，改為連續捲動設定區

### Bug 修復
- [x] 左欄無法捲動
- [x] section 邊框被吃
- [x] 渲染 100% 後沒反應（SSE lastRenderState）
- [x] ERR_UPLOAD_FILE_CHANGED（readIntoBlob 先讀記憶體）
- [x] favicon 404
- [x] 辨識按鈕結構被 textContent 破壞
- [x] beat 偵測讀不到上傳的 lrc
- [x] CLI --anim scale-echo 被忽略

---

## 待確認 / 未完成

| 項目 | 狀態 | 備註 |
|------|------|------|
| 端到端渲染驗證 | 未確認 | 使用者尚未跑一次完整渲染確認 SSE done 事件 |
| Whisper 首次下載 | 未測試 | ~1.5GB，ETA timer 已加但未實際測試 |
| UI 美化改版 | 未實作 | 使用者曾提到 /huashu-design，功能優先所以暫緩 |
| 跨瀏覽器測試 | 未測試 | 只在 Chrome 確認過 |

---

## 最近改動的檔案

```
src/CaptionPage.tsx    -- lineHeight / letterSpacing props
src/Composition.tsx    -- 4 個 Google Fonts 載入 + srtOffsetMs + lineHeight + letterSpacing
scripts/server.mjs     -- lineHeight / letterSpacing / srtOffsetMs / crf 傳入 props
ui/index.html          -- 全面重構佈局 + 新 sliders + echo ghost 預覽
```
