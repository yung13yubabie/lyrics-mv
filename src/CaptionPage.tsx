import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export type AnimationMode = "sentence-fade" | "line-swap" | "char-appear" | "char-highlight" | "scale-echo";

export interface CaptionPageProps {
  text: string;
  durationInFrames: number;
  position?: "center" | "lower-third" | "upper-third";
  fontSize?: number;
  fontWeight?: number;
  textColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontFamily?: string;
  animationMode?: AnimationMode;
  accentColor?: string;
  accentScale?: number;
  lineHeight?: number;
  letterSpacing?: number;
  // scale-echo specific
  echoSpread?: number;
  echoOpacity?: number;
  echoOffsetX?: number;
  echoOffsetY?: number;
  echoScaleEnd?: number;
}

// ── Accent parser ─────────────────────────────────────
interface Segment { text: string; accented: boolean }
interface Char    { char: string; accented: boolean }

function parseAccents(raw: string): Segment[] {
  const out: Segment[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0, m;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) out.push({ text: raw.slice(last, m.index), accented: false });
    out.push({ text: m[1], accented: true });
    last = m.index + m[0].length;
  }
  if (last < raw.length) out.push({ text: raw.slice(last), accented: false });
  return out.length ? out : [{ text: raw, accented: false }];
}

function toChars(segs: Segment[]): Char[] {
  return segs.flatMap(s => Array.from(s.text).map(c => ({ char: c, accented: s.accented })));
}

// ── Component ─────────────────────────────────────────
export const CaptionPage: React.FC<CaptionPageProps> = ({
  text,
  durationInFrames,
  position = "center",
  fontSize = 68,
  fontWeight = 700,
  textColor = "#FFE600",
  strokeColor = "transparent",
  strokeWidth = 0,
  fontFamily = "sans-serif",
  animationMode = "sentence-fade",
  accentColor = "#FF6B2B",
  accentScale = 1.15,
  lineHeight = 1.4,
  letterSpacing = 0.06,
  echoSpread  = 0.09,
  echoOpacity = 0.28,
  echoOffsetX = 0,
  echoOffsetY = 0,
  echoScaleEnd = 1.18,
}) => {
  const frame = useCurrentFrame();

  const alignMap = {
    center:        "center",
    "lower-third": "flex-end",
    "upper-third": "flex-start",
  } as const;
  const padMap = {
    center:        "0 80px",
    "lower-third": "0 80px 90px",
    "upper-third": "90px 80px 0",
  };

  const webkitStroke =
    strokeWidth > 0 ? { WebkitTextStroke: `${strokeWidth}px ${strokeColor}` } : {};

  const container: React.CSSProperties = {
    justifyContent: "center",
    alignItems: alignMap[position],
    padding: padMap[position],
  };

  const baseText: React.CSSProperties = {
    fontSize,
    fontWeight,
    fontFamily,
    textAlign: "center",
    lineHeight,
    letterSpacing: `${letterSpacing}em`,
    maxWidth: "100%",
    wordBreak: "break-word",
    ...webkitStroke,
  };

  const segments = parseAccents(text);
  const chars    = toChars(segments);

  // ── Shared accent renderer ───────────────────────────
  const renderSegments = (style: React.CSSProperties) => (
    <div style={style}>
      {segments.map((seg, i) =>
        seg.accented ? (
          <span key={i} style={{
            color: accentColor,
            fontSize: fontSize * accentScale,
            fontWeight: Math.min(900, (fontWeight as number) + 200) as React.CSSProperties["fontWeight"],
            display: "inline-block",
            transform: "translateY(-1px)",
          }}>
            {seg.text}
          </span>
        ) : (
          <span key={i} style={{ color: textColor }}>{seg.text}</span>
        )
      )}
    </div>
  );

  // ── sentence-fade ─────────────────────────────────────
  // 增強：scale-in 進場 + hold 期間微呼吸 + 更強光暈
  if (animationMode === "sentence-fade") {
    const ENTER = 10, EXIT = 6;
    const opacity = interpolate(
      frame,
      [0, ENTER, durationInFrames - EXIT, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const slideY  = interpolate(frame, [0, ENTER], [24, 0], { extrapolateRight: "clamp" });
    const scaleIn = interpolate(frame, [0, ENTER], [0.88, 1.0], { extrapolateRight: "clamp" });

    // 微呼吸：在 hold 期間 scale 輕微放大再收回
    const breathe = durationInFrames > 20
      ? interpolate(
          frame,
          [ENTER, durationInFrames * 0.5, durationInFrames - EXIT],
          [1.0, 1.022, 1.0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      : 1.0;

    return (
      <AbsoluteFill style={container}>
        {renderSegments({
          ...baseText,
          opacity,
          transform: `translateY(${slideY}px) scale(${scaleIn * breathe})`,
          textShadow: `0 0 80px ${textColor}55, 0 0 30px ${textColor}33, 0 2px 8px rgba(0,0,0,0.9)`,
        })}
      </AbsoluteFill>
    );
  }

  // ── line-swap ─────────────────────────────────────────
  // 增強：更大滑移距離 + 進場壓縮/出場略微放大
  if (animationMode === "line-swap") {
    const SLIDE = 8;
    const opacity = interpolate(
      frame,
      [0, SLIDE, durationInFrames - SLIDE, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const inY  = interpolate(frame, [0, SLIDE], [40, 0], { extrapolateRight: "clamp" });
    const outY = interpolate(frame, [durationInFrames - SLIDE, durationInFrames], [0, -40], { extrapolateLeft: "clamp" });
    const tY   = frame < durationInFrames - SLIDE ? inY : outY;

    const scaleIn  = interpolate(frame, [0, SLIDE], [0.92, 1.0], { extrapolateRight: "clamp" });
    const scaleOut = interpolate(frame, [durationInFrames - SLIDE, durationInFrames], [1.0, 1.06], { extrapolateLeft: "clamp" });
    const sc = frame < durationInFrames - SLIDE ? scaleIn : scaleOut;

    return (
      <AbsoluteFill style={container}>
        {renderSegments({
          ...baseText,
          opacity,
          transform: `translateY(${tY}px) scale(${sc})`,
          textShadow: `0 0 50px ${textColor}44, 0 0 20px rgba(255,255,255,0.1), 0 2px 10px rgba(0,0,0,0.95)`,
        })}
      </AbsoluteFill>
    );
  }

  // ── char-appear ───────────────────────────────────────
  // 增強：彈跳 overshoot（1.5→1.12→0.96→1.0）+ 微旋轉 + 出現時短暫光芒
  if (animationMode === "char-appear") {
    const fpChar = Math.max(1, Math.floor(durationInFrames / chars.length));
    return (
      <AbsoluteFill style={container}>
        <div style={{ ...baseText }}>
          {chars.map(({ char, accented }, i) => {
            const t0    = i * fpChar;
            const SPRING = Math.min(fpChar, 9);

            const op  = interpolate(frame, [t0, t0 + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            // 彈跳：大→回彈→略縮→穩定
            const sc  = SPRING >= 6
              ? interpolate(
                  frame,
                  [t0, t0 + SPRING * 0.22, t0 + SPRING * 0.65, t0 + SPRING],
                  [1.55, 1.12, 0.96, 1.0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                )
              : interpolate(frame, [t0, t0 + SPRING], [1.3, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const rot  = interpolate(frame, [t0, t0 + SPRING], [-6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cy   = interpolate(frame, [t0, t0 + SPRING], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            // 出現瞬間光暈漸消
            const glowOp = interpolate(frame, [t0, t0 + 1, t0 + 7], [1.0, 1.0, 0.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const color  = accented ? accentColor : textColor;
            const finalScale = sc * (accented ? accentScale : 1.0);

            return (
              <span key={i} style={{
                display: "inline-block",
                opacity: op,
                transform: `translateY(${cy}px) scale(${finalScale}) rotate(${rot}deg)`,
                color,
                fontSize: fontSize,
                whiteSpace: char === " " ? "pre" : "normal",
                textShadow: glowOp > 0.05 ? `0 0 ${28 * glowOp}px ${color}, 0 0 ${10 * glowOp}px ${color}aa` : "none",
              }}>
                {char}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── char-highlight ────────────────────────────────────
  // 增強：當前字有脈衝光暈 + 略微放大 + 掃過後留有微光餘韻
  if (animationMode === "char-highlight") {
    const progress  = durationInFrames > 0 ? frame / durationInFrames : 0;
    const hlPos     = progress * chars.length;
    const currentIdx = Math.floor(hlPos);
    const fadeOp    = interpolate(
      frame,
      [0, 4, durationInFrames - 4, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    // 脈衝節奏（~2.5Hz）
    const pulseGlow = 0.5 + 0.5 * Math.sin((frame / 6) * Math.PI);

    return (
      <AbsoluteFill style={container}>
        <div style={{ ...baseText, opacity: fadeOp }}>
          {chars.map(({ char, accented }, i) => {
            const lit      = i < hlPos;
            const isCurrent = i === currentIdx;
            const color    = lit ? (accented ? accentColor : textColor) : textColor;
            // 當前字脈衝放大；剛掃過的字有輕微餘韻
            const recency  = Math.max(0, 1 - (currentIdx - i) * 0.35);
            const charScale = isCurrent ? 1.08 + pulseGlow * 0.05 : 1.0;
            const glowStr   = isCurrent ? pulseGlow : (lit ? recency * 0.25 : 0);
            const baseOp   = lit ? 1 : 0.2;

            return (
              <span key={i} style={{
                display: "inline-block",
                color,
                opacity: baseOp,
                fontSize: (lit && accented) ? fontSize * accentScale : fontSize,
                whiteSpace: char === " " ? "pre" : "normal",
                transform: `scale(${charScale})`,
                textShadow: glowStr > 0.03
                  ? `0 0 ${24 * glowStr}px ${color}, 0 0 ${8 * glowStr}px ${color}bb`
                  : "none",
              }}>
                {char}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── scale-echo ────────────────────────────────────────
  // 三層疊影，支援：放大幅度、層間距、層亮度、X/Y 偏移
  if (animationMode === "scale-echo") {
    const ENTER = 8, EXIT = 6;

    const masterOp = interpolate(
      frame,
      [0, ENTER, durationInFrames - EXIT, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    // 從 0.9 開始 → scaleEnd，製造更明顯的放大感
    const scale = interpolate(
      frame,
      [ENTER, Math.max(ENTER + 1, durationInFrames - EXIT)],
      [0.9, echoScaleEnd],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // 3 層：後影→中影→主體
    // ratio 控制相對大小；dx/dy 控制空間偏移
    const layers = [
      { ratio: 1.0 - echoSpread * 2, op: echoOpacity * 0.42, dx: echoOffsetX * 2, dy: echoOffsetY * 2, blur: 1.6 },
      { ratio: 1.0 - echoSpread,     op: echoOpacity,          dx: echoOffsetX,     dy: echoOffsetY,     blur: 0.6 },
      { ratio: 1.0,                   op: 1.0,                  dx: 0,               dy: 0,               blur: 0   },
    ] as const;

    const segNodes = segments.map((seg, i) =>
      seg.accented ? (
        <span key={i} style={{
          color: accentColor,
          fontSize: fontSize * accentScale,
          fontWeight: Math.min(900, (fontWeight as number) + 200) as React.CSSProperties["fontWeight"],
          display: "inline-block",
          transform: "translateY(-1px)",
        }}>
          {seg.text}
        </span>
      ) : (
        <span key={i} style={{ color: textColor }}>{seg.text}</span>
      )
    );

    return (
      <AbsoluteFill style={container}>
        {layers.map(({ ratio, op, dx, dy, blur }, li) => (
          <AbsoluteFill key={li} style={{ ...container, opacity: masterOp * op }}>
            <div style={{
              ...baseText,
              transform: `translateX(${dx}px) translateY(${dy}px) scale(${scale * ratio})`,
              transformOrigin: "center center",
              filter: blur > 0 ? `blur(${blur}px)` : undefined,
              textShadow: li === 2
                ? `0 0 80px ${textColor}55, 0 0 30px ${textColor}33, 0 2px 8px rgba(0,0,0,0.9)`
                : li === 1
                ? `0 0 40px ${textColor}44`
                : "none",
            }}>
              {segNodes}
            </div>
          </AbsoluteFill>
        ))}
      </AbsoluteFill>
    );
  }

  return null;
};
