import type { PlasmoCSConfig } from "plasmo";
import { ChatGPTCapture } from "@/capture/chatgpt-capture";
import { runContentScript } from "@/capture/content-script-base";

export const config: PlasmoCSConfig = {
  matches: ["https://chat.openai.com/*", "https://chatgpt.com/*"],
  run_at: "document_idle",
};

runContentScript(new ChatGPTCapture());

export {};
