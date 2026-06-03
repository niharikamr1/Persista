import { create } from "zustand";

type Session = {
  id: string;
  platform: string;
  startedAt: string;
  eventCount: number;
};

type SessionState = {
  sessions: Session[];
  activePlatforms: string[];
  setSessions: (sessions: Session[]) => void;
  setActivePlatforms: (platforms: string[]) => void;
};

export const useSessionStore = create<SessionState>()((set) => ({
  sessions: [],
  activePlatforms: [],
  setSessions: (sessions) => set({ sessions }),
  setActivePlatforms: (activePlatforms) => set({ activePlatforms }),
}));
