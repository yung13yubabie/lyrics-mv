// 三層歌詞 store + final derived getter + subscriber 模式
import { compareSources } from './lyrics-merge.js';

function deepClone(rows) {
  return rows
    ? rows.map(r => ({
        ...r,
        mergedFrom: r.mergedFrom ? r.mergedFrom.map(x => ({ ...x })) : undefined,
      }))
    : null;
}

export function createLyricsStore() {
  const internal = { asr: null, srtRef: null, edited: null };
  const listeners = new Set();

  function notify() {
    for (const cb of listeners) {
      try { cb(); } catch (e) { console.error('store listener error', e); }
    }
  }

  function getFinal() {
    return internal.edited ?? internal.srtRef ?? internal.asr ?? [];
  }
  function isModified() {
    return internal.edited !== null;
  }
  function ensureEditedInitialized() {
    if (internal.edited === null) {
      const base = internal.srtRef ?? internal.asr;
      internal.edited = deepClone(base) ?? [];
    }
  }

  return {
    setAsr(rows) {
      internal.asr = rows ? rows.map(r => ({ ...r, source: 'asr' })) : null;
      notify();
    },
    setSrtRef(rows) {
      internal.srtRef = rows ? rows.map(r => ({ ...r, source: 'srt' })) : null;
      notify();
    },
    setEdited(rows) {
      internal.edited = rows ? deepClone(rows) : null;
      notify();
    },
    applyEditedTransform(fn) {
      ensureEditedInitialized();
      internal.edited = fn(internal.edited);
      notify();
    },
    resetEdited()  { internal.edited = null; notify(); },
    clearAsr()     { internal.asr    = null; notify(); },
    clearSrtRef()  { internal.srtRef = null; notify(); },
    getAsr()       { return internal.asr; },
    getSrtRef()    { return internal.srtRef; },
    getEdited()    { return internal.edited; },
    getFinal,
    isModified,
    getCompareResult() {
      return compareSources(internal.asr, internal.srtRef);
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
