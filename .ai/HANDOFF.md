# HANDOFF — 給下一個 AI / Session

> 新 session 開始時，依序讀以下文件：
> 1. 本文件（2 分鐘掌握全貌）
> 2. `.ai/spec-kit.md`（架構詳情）
> 3. `.ai/CURRENT_STATE.md`（目前進度）
> 4. `.ai/TASKS.md`（待辦工作）

---

## 30 秒摘要

**這是什麼**：Remotion 4.0 歌詞 MV 產生器，Web UI + CLI 雙模式

**怎麼啟動**：
```bash
cd C:\Users\LIN\Desktop\lyrics-mv
node scripts/server.mjs
# 瀏覽器開 http://localhost:7842
```

**目前狀態**：功能完整，有 4 個未驗證事項（見 TASKS.md）

---

## 常用 grep 指令

```bash
# 找 UI 中的函式
grep -n "runTranscribe\|runDetectBeats\|runRender\|setupDrop" ui/index.html

# 找 server 中的 SSE 邏輯
grep -n "lastRenderState\|broadcast\|sseClients" scripts/server.mjs

# 找 CaptionPage 中某個 animationMode
grep -n "scale-echo\|echoSpread" src/CaptionPage.tsx
```

**重要**：`ui/index.html` 有 ~1250 行，一定要用 grep 定位後再局部讀，不要整個讀

---

## 近期做了什麼（最後幾個 session）

1. **Google Fonts 整合**：加了 NotoSansTC/NotoSerifTC/ZhiMangXing/MaShanZheng，修了中文浮水印亂碼
2. **新設定**：lineHeight、letterSpacing、srtOffsetMs、CRF
3. **scale-echo 即時預覽**：UI 中用 ghost div 模擬 3 層疊影
4. **UI 重構**：上半固定預覽、下半滾動設定（移除 tab 切換）

---

## 接手時的第一件事

1. 確認伺服器是否在跑：`curl http://localhost:7842`
2. 查看 `.ai/TASKS.md` 的待辦清單
3. 若使用者說「上次的問題」，看 CURRENT_STATE.md 的「待確認」表格

---

## 特別注意事項

- **不要改動 `whisper.cpp/`**：是編譯好的二進位，改了會壞
- **新增動畫模式**：需同時改 `CaptionPage.tsx`、`CompositionSchema`（Zod enum）、`server.mjs`（validAnims）、`ui/index.html`（下拉選單）四個地方
- **新增字型**：需在 `Composition.tsx` 頂層 import + loadFont()，並在 `ui/index.html` 的 font select 加 option
