import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { parseSrt } from "@remotion/captions";
import { CaptionPage } from "./CaptionPage";
import type { AnimationMode } from "./CaptionPage";
import { loadFont as loadNotoSansTC, fontFamily as notoSansTCFamily } from "@remotion/google-fonts/NotoSansTC";
import { loadFont as loadNotoSerifTC } from "@remotion/google-fonts/NotoSerifTC";
import { loadFont as loadZhiMangXing } from "@remotion/google-fonts/ZhiMangXing";
import { loadFont as loadMaShanZheng } from "@remotion/google-fonts/MaShanZheng";

loadNotoSansTC();
loadNotoSerifTC();
loadZhiMangXing();
loadMaShanZheng();

// 背景圖片
const BgImageSchema = z.object({
  file:     z.string(),
  duration: z.number().optional(),
});

export const CompositionSchema = z.object({
  audioFile:         z.string().default("song.wav"),
  srtContent:        z.string().default(""),
  durationInSeconds: z.number().default(240),
  bgImages:          z.array(BgImageSchema).default([]),
  bgDim:             z.number().default(0.5),
  textPosition:      z.enum(["center", "lower-third", "upper-third"]).default("center"),
  fontSize:          z.number().default(68),
  fontWeight:        z.number().default(700),
  textColor:         z.string().default("#FFE600"),
  strokeColor:       z.string().default("transparent"),
  strokeWidth:       z.number().default(0),
  fontFamily:        z.string().default("sans-serif"),
  animationMode:     z.enum(["sentence-fade", "line-swap", "char-appear", "char-highlight", "scale-echo"]).default("sentence-fade"),
  accentColor:       z.string().default("#FF6B2B"),
  accentScale:       z.number().default(1.15),
  songTitle:         z.string().default(""),
  artist:            z.string().default(""),
  echoSpread:        z.number().default(0.09),
  echoOpacity:       z.number().default(0.28),
  echoOffsetX:       z.number().default(0),
  echoOffsetY:       z.number().default(0),
  echoScaleEnd:      z.number().default(1.18),
  lineHeight:        z.number().default(1.4),
  letterSpacing:     z.number().default(0.06),
  srtOffsetMs:       z.number().default(0),
});

export type CompositionProps = z.infer<typeof CompositionSchema>;

export const MyComposition: React.FC<CompositionProps> = ({
  audioFile,
  srtContent,
  durationInSeconds,
  bgImages,
  bgDim,
  textPosition,
  fontSize,
  fontWeight,
  textColor,
  strokeColor,
  strokeWidth,
  fontFamily,
  animationMode,
  accentColor,
  accentScale,
  songTitle,
  artist,
  echoSpread,
  echoOpacity,
  echoOffsetX,
  echoOffsetY,
  echoScaleEnd,
  lineHeight,
  letterSpacing,
  srtOffsetMs,
}) => {
  const { fps } = useVideoConfig();
  const totalFrames = Math.ceil(durationInSeconds * 30);

  const captions = useMemo(() => {
    if (!srtContent) return [];
    try {
      return parseSrt({ input: srtContent }).captions.map(c => ({
        ...c,
        startMs: c.startMs + srtOffsetMs,
        endMs:   c.endMs   + srtOffsetMs,
      }));
    }
    catch { return []; }
  }, [srtContent, srtOffsetMs]);

  const bgSlots = useMemo(() => {
    if (!bgImages.length) return [];
    const hasCustom = bgImages.some(b => b.duration != null);
    if (hasCustom) {
      let cursor = 0;
      return bgImages.map(b => {
        const dur = b.duration ?? (durationInSeconds / bgImages.length);
        const slot = {
          file: b.file,
          startFrame: Math.floor(cursor * fps),
          durationInFrames: Math.ceil(dur * fps),
        };
        cursor += dur;
        return slot;
      });
    }
    const perSec = durationInSeconds / bgImages.length;
    return bgImages.map((b, i) => ({
      file: b.file,
      startFrame: Math.floor(i * perSec * fps),
      durationInFrames: Math.ceil(perSec * fps),
    }));
  }, [bgImages, durationInSeconds, fps]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>

      {bgSlots.map((slot, i) => (
        <Sequence key={i} from={slot.startFrame} durationInFrames={slot.durationInFrames}>
          <AbsoluteFill>
            <Img
              src={staticFile(slot.file)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${bgDim})` }} />
          </AbsoluteFill>
        </Sequence>
      ))}

      <Audio src={staticFile(audioFile)} />

      {/* 歌曲資訊浮水印 */}
      {(songTitle || artist) && (
        <AbsoluteFill style={{
          justifyContent: "flex-end",
          alignItems: "flex-start",
          padding: "0 0 28px 32px",
          pointerEvents: "none",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {artist && (
              <div style={{
                fontSize: 13,
                fontFamily: notoSansTCFamily,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "0.12em",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              }}>
                {artist}
              </div>
            )}
            {songTitle && (
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: notoSansTCFamily,
                color: "rgba(255,255,255,0.82)",
                letterSpacing: "0.06em",
                textShadow: "0 1px 6px rgba(0,0,0,0.8)",
              }}>
                {songTitle}
              </div>
            )}
          </div>
        </AbsoluteFill>
      )}

      {captions.map((caption, index) => {
        const startFrame = Math.floor((caption.startMs / 1000) * fps);
        const endFrame   = Math.ceil((caption.endMs / 1000) * fps);
        const dur        = Math.max(endFrame - startFrame, 1);
        if (startFrame >= totalFrames) return null;
        return (
          <Sequence key={index} from={startFrame} durationInFrames={dur}>
            <CaptionPage
              text={caption.text}
              durationInFrames={dur}
              position={textPosition}
              fontSize={fontSize}
              fontWeight={fontWeight}
              textColor={textColor}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              fontFamily={fontFamily}
              animationMode={animationMode as AnimationMode}
              accentColor={accentColor}
              accentScale={accentScale}
              echoSpread={echoSpread}
              echoOpacity={echoOpacity}
              echoOffsetX={echoOffsetX}
              echoOffsetY={echoOffsetY}
              echoScaleEnd={echoScaleEnd}
              lineHeight={lineHeight}
              letterSpacing={letterSpacing}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
