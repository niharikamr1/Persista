export type AIPlatform = "chatgpt" | "claude" | "gemini";

export type PlatformConfig = {
  platform: AIPlatform;
  enabled: boolean;
  captureScreenshots: boolean;
  captureFiles: boolean;
};
