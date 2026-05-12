import "./index.css";
import { Composition, CalculateMetadataFunction } from "remotion";
import { MyComposition, CompositionSchema, CompositionProps } from "./Composition";

const calculateMetadata: CalculateMetadataFunction<CompositionProps> = async ({ props }) => ({
  durationInFrames: Math.ceil(props.durationInSeconds * 30),
});

const DEFAULT_PROPS: CompositionProps = {
  audioFile:         "song.wav",
  srtContent:        "",
  durationInSeconds: 240,
  bgImages:          [],
  bgDim:             0.5,
  textPosition:      "center",
  fontSize:          68,
  fontWeight:        700,
  textColor:         "#FFE600",
  strokeColor:       "transparent",
  strokeWidth:       0,
  fontFamily:        "sans-serif",
  animationMode:     "sentence-fade",
  accentColor:       "#FF6B2B",
  accentScale:       1.15,
  songTitle:         "",
  artist:            "",
};

export const RemotionRoot: React.FC = () => (
  <>
    {/* 16:9 橫向 */}
    <Composition
      id="MyComp"
      component={MyComposition}
      schema={CompositionSchema}
      durationInFrames={7200}
      fps={30}
      width={1280}
      height={720}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={calculateMetadata}
    />

    {/* 9:16 直向 */}
    <Composition
      id="MyComp-9x16"
      component={MyComposition}
      schema={CompositionSchema}
      durationInFrames={7200}
      fps={30}
      width={720}
      height={1280}
      defaultProps={{ ...DEFAULT_PROPS, fontSize: 52 }}
      calculateMetadata={calculateMetadata}
    />
  </>
);
