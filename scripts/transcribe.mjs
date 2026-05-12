import path from "path";
import { execSync } from "child_process";
import fs from "fs";
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";

const projectRoot = path.join(import.meta.dirname, "..");
const whisperDir = path.join(projectRoot, "whisper.cpp");
const inputWav = path.join(projectRoot, "public", "song.wav");
const input16k = path.join(projectRoot, "public", "song16k.wav");
const outputJson = path.join(projectRoot, "public", "captions.json");

// Step 1: Convert to 16kHz mono wav (required by Whisper)
console.log("Converting audio to 16kHz mono...");
execSync(
  `ffmpeg -y -i "${inputWav}" -ar 16000 -ac 1 -c:a pcm_s16le "${input16k}"`,
  { stdio: "inherit" }
);

// Step 2: Install Whisper.cpp
console.log("Installing Whisper.cpp...");
await installWhisperCpp({ to: whisperDir, version: "1.5.5" });

// Step 3: Download model (medium for Chinese/multilingual)
console.log("Downloading Whisper medium model (multilingual)...");
await downloadWhisperModel({ model: "medium", folder: whisperDir });

// Step 4: Transcribe
console.log("Transcribing...");
const whisperCppOutput = await transcribe({
  model: "medium",
  whisperPath: whisperDir,
  whisperCppVersion: "1.5.5",
  inputPath: input16k,
  tokenLevelTimestamps: true,
  language: "zh",
});

// Step 5: Convert to Caption format
const { captions } = toCaptions({ whisperCppOutput });

fs.writeFileSync(outputJson, JSON.stringify(captions, null, 2));
console.log(`Done! Captions saved to ${outputJson}`);
console.log(`Total segments: ${captions.length}`);
