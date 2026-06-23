import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

export interface WatchPartyState {
  partyCode: string | null;
  isHost: boolean;
  memberCount: number;
  messages: string[];
  isActive: boolean;
}

interface WatchPartyContextValue extends WatchPartyState {
  createParty: (mediaId: string) => string;
  joinParty: (code: string) => boolean;
  leaveParty: () => void;
  syncEvent: (type: 'play' | 'pause' | 'seek', time?: number) => void;
}

const WatchPartyContext = createContext<WatchPartyContextValue | null>(null);

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function WatchPartyProvider({ children }: { children: React.ReactNode }) {
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);

  const createParty = useCallback((mediaId: string) => {
    const code = generateCode();
    setPartyCode(code);
    setIsHost(true);
    setMemberCount(1);
    setIsActive(true);
    setMessages([`🎬 Watch party started! Share code: ${code}`]);
    return code;
  }, []);

  const joinParty = useCallback((code: string) => {
    setPartyCode(code.toUpperCase());
    setIsHost(false);
    setMemberCount(2);
    setIsActive(true);
    setMessages([`✅ Joined party ${code.toUpperCase()}`]);
    return true;
  }, []);

  const leaveParty = useCallback(() => {
    setPartyCode(null);
    setIsHost(false);
    setMemberCount(0);
    setMessages([]);
    setIsActive(false);
  }, []);

  const syncEvent = useCallback((type: 'play' | 'pause' | 'seek', time?: number) => {
    const msg = type === 'play' ? '▶️ Host resumed' : type === 'pause' ? '⏸ Host paused' : `⏩ Host seeked to ${Math.floor(time || 0)}s`;
    setMessages(prev => [...prev.slice(-9), msg]);
  }, []);

  return (
    <WatchPartyContext.Provider value={{
      partyCode, isHost, memberCount, messages, isActive,
      createParty, joinParty, leaveParty, syncEvent,
    }}>
      {children}
    </WatchPartyContext.Provider>
  );
}

export function useWatchParty() {
  const ctx = useContext(WatchPartyContext);
  if (!ctx) throw new Error('useWatchParty must be used within WatchPartyProvider');
  return ctx;
}
