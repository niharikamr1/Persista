import type { PlasmoCSConfig } from "plasmo";
import { GeminiCapture } from "@/capture/gemini-capture";
import { runContentScript } from "@/capture/content-script-base";

export const config: PlasmoCSConfig = {
  matches: ["https://gemini.google.com/*"],
  run_at: "document_idle",
};

runContentScript(new GeminiCapture());

export {};
