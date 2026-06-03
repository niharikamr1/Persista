import type { PlasmoCSConfig } from "plasmo";
import { ClaudeCapture } from "@/capture/claude-capture";
import { runContentScript } from "@/capture/content-script-base";

export const config: PlasmoCSConfig = {
  matches: ["https://claude.ai/*"],
  run_at: "document_idle",
};

runContentScript(new ClaudeCapture());

export {};
