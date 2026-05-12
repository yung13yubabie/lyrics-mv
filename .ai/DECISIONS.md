# DECISIONS — Lyrics MV Studio

> 記錄關鍵架構決策與原因，避免未來重複討論同樣問題。

---

## D-001：Google Fonts 在模組頂層 loadFont()

**決策**：字型在 `Composition.tsx` 頂層呼叫 `loadFont()`，不在 component 內部

**原因**：Remotion 要求字型在 bundle 初始化時就載入，放在 component 裡會導致字型在某些 frame 尚未就緒

**影響檔案**：`src/Composition.tsx` line 14-22

---

## D-002：浮水印字型固定用 notoSansTCFamily

**決策**：`songTitle` / `artist` 浮水印的 `fontFamily` 固定用 `notoSansTCFamily`，不跟隨使用者的 fontFamily 設定

**原因**：使用者選的字型可能是書法體（ZhiMangXing）在小字號下不可讀；浮水印是功能性文字，需要優先可讀性

**影響檔案**：`src/Composition.tsx` line 155, 167

---

## D-003：SSE lastRenderState 補發機制

**決策**：server 端保存 `lastRenderState`，新 SSE 連線建立時立即補發

**原因**：渲染期間（encoding 階段）進度長時間無輸出，使用者切換 tab 或網路短暫斷線後重連，原本的 done 事件已錯過

**影響檔案**：`scripts/server.mjs` line 71-102

---

## D-004：ui/index.html 單一大檔策略

**決策**：整個 UI 保持在一個 HTML 檔案，不拆分 JS/CSS 模組

**原因**：server.mjs 直接用 `fs.readFile` 回傳這個檔案；拆分需要改動 server 的靜態服務邏輯，複雜度不值得

**注意**：讀這個檔案時不要整個讀，用 grep 定位行號再局部讀

---

## D-005：背景圖複製到 public/，不用臨時路徑

**決策**：上傳的音訊、背景圖、SRT 都複製到 `public/` 目錄，Remotion 用 `staticFile()` 存取

**原因**：Remotion 渲染時只能存取 `public/` 目錄內的靜態資源，無法存取任意路徑

---

## D-006：echo ghost 預覽縮放係數 0.4

**決策**：UI 中 echo ghost 的 offset 乘以 0.4 模擬渲染效果

**原因**：預覽區域約為渲染解析度的 40%（preview ~400px vs render 1080px），需要縮放才有視覺對應

**影響**：這是近似值，預覽和實際渲染仍有細微差異
