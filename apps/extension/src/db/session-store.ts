import type { AIPlatform } from "@aicc/shared-types";
import type { LocalSession } from "./types";
import { db } from "./database";
import { generateSessionId } from "@/utils/id";

export const sessionStore = {
  async create(platform: AIPlatform, conversationId: string, title: string): Promise<LocalSession> {
    const now = Date.now();
    const session: LocalSession = {
      id: generateSessionId(platform),
      platform,
      conversationId,
      title,
      startedAt: now,
      lastActiveAt: now,
      endedAt: null,
      synced: 0,
    };
    await db.sessions.put(session);
    return session;
  },

  async getById(id: string): Promise<LocalSession | undefined> {
    return db.sessions.get(id);
  },

  async touch(id: string): Promise<void> {
    await db.sessions.where("id").equals(id).modify({ lastActiveAt: Date.now() });
  },

  async updateConversationId(id: string, conversationId: string, title?: string): Promise<void> {
    await db.sessions.where("id").equals(id).modify((s: LocalSession) => {
      s.conversationId = conversationId;
      s.lastActiveAt = Date.now();
      if (title !== undefined) s.title = title;
    });
  },

  async updateTitle(id: string, title: string): Promise<void> {
    await db.sessions.where("id").equals(id).modify({ title });
  },

  async end(id: string): Promise<void> {
    await db.sessions.where("id").equals(id).modify({ endedAt: Date.now() });
  },

  async getPendingSync(limit = 50): Promise<LocalSession[]> {
    return db.sessions.where("synced").equals(0).limit(limit).toArray();
  },

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.sessions.where("id").anyOf(ids).modify({ synced: 1 });
  },

  async getActive(): Promise<LocalSession[]> {
    return db.sessions
      .toCollection()
      .filter((s) => s.endedAt === null)
      .toArray();
  },
};
