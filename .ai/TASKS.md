# TASKS — Lyrics MV Studio

> 追蹤待辦、進行中、已完成的工作。
> 格式：[ ] 待辦 / [~] 進行中 / [x] 已完成

---

## 待辦

- [ ] **端到端渲染測試**：實際跑一次渲染，驗證 SSE done 事件正確觸發，前端顯示下載按鈕
- [ ] **Whisper 模型下載測試**：首次下載 ~1.5GB 模型，確認 ETA timer 正確顯示
- [ ] **UI 美化改版**：使用 /huashu-design 或 /frontend-design 進行視覺設計升級（用戶確認需求中）
- [ ] **跨瀏覽器測試**：在 Firefox / Edge 確認功能正常

## 進行中

（目前無）

## 已完成

- [x] 5 種 AnimationMode 實作（sentence-fade, line-swap, char-appear, char-highlight, scale-echo）
- [x] Google Fonts 整合（NotoSansTC, NotoSerifTC, ZhiMangXing, MaShanZheng）
- [x] Song Info 浮水印中文亂碼修復
- [x] lineHeight / letterSpacing / srtOffsetMs / CRF 新設定
- [x] scale-echo 即時預覽（ghost 層）
- [x] UI 佈局重構（預覽固定上方 + 設定滾動下方）
- [x] SSE 進度架構修復（lastRenderState + keepalive）
- [x] ERR_UPLOAD_FILE_CHANGED 修復
- [x] CLI --anim scale-echo 支援

---

## 新增工作的格式範例

```
- [ ] **工作名稱**：具體描述，影響範圍，參考檔案
```
