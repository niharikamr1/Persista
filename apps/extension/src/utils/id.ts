export function generateId(): string {
  return crypto.randomUUID();
}

export function generateSessionId(platform: string): string {
  return `sess_${platform}_${crypto.randomUUID().replace(/-/g, "")}`;
}
