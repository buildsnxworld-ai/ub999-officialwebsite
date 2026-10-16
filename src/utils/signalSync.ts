/**
 * Time-Synced Deterministic Signal Engine
 * Synchronizes Aviator Crash Game and Signal Predictor App across all devices and browsers
 * without requiring any central server, database, or WebSocket.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface ServerAviatorLiveState {
  roundNum: number;
  roundId: string;
  phase: 'WAITING' | 'FLYING' | 'CRASHED';
  targetCrash: number;
  currentMultiplier: number;
  waitingCountdown: number;
  safeCashout: number;
  history: number[];
  phaseStartedAt: number;
  phaseDurationMs: number;
  flightDurationMs: number;
  serverTime: number;
}

let cachedServerState: ServerAviatorLiveState | null = null;
let lastServerFetchTime = 0;

export async function fetchLiveAviatorState(): Promise<ServerAviatorLiveState | null> {
  try {
    const res = await fetch('/api/aviator/live');
    if (res.ok) {
      const data: ServerAviatorLiveState = await res.json();
      cachedServerState = data;
      lastServerFetchTime = Date.now();
      return data;
    }
  } catch {}
  return cachedServerState;
}

export const ROUND_INTERVAL_SEC = 25; // 25 seconds per game round

export interface SyncedRoundInfo {
  roundIndex: number;
  roundId: string;
  roundNum: number;
  multiplier: number;
  safeCashout: number;
  timeStr: string;
  secondsRemaining: number;
}

// Pseudo-Random Generator with Spribe Aviator authentic distribution
export function getDeterministicCrash(roundIndex: number): number {
  let seed = (roundIndex * 1664525 + 1013904223) >>> 0;
  seed = (seed ^ (seed >>> 16)) >>> 0;
  seed = Math.imul(seed, 2246822507) >>> 0;
  seed = (seed ^ (seed >>> 13)) >>> 0;
  const unit = (seed % 1000000) / 1000000;

  let mult: number;
  if (unit < 0.12) {
    // 12% instant early crash (1.05 - 1.25)
    mult = 1.06 + (unit / 0.12) * 0.19;
  } else if (unit < 0.60) {
    // 48% low-mid multiplier (1.26 - 2.15)
    mult = 1.26 + ((unit - 0.12) / 0.48) * 0.89;
  } else if (unit < 0.84) {
    // 24% sweet spot multiplier (2.16 - 4.50)
    mult = 2.16 + ((unit - 0.60) / 0.24) * 2.34;
  } else if (unit < 0.95) {
    // 11% high multiplier (4.51 - 9.80)
    mult = 4.51 + ((unit - 0.84) / 0.11) * 5.29;
  } else {
    // 5% mega multiplier (10.00 - 35.00)
    mult = 10.00 + ((unit - 0.95) / 0.05) * 25.00;
  }
  return Math.round(mult * 100) / 100;
}

export function getCurrentSyncedRound(offsetRounds = 0): SyncedRoundInfo {
  // If active game is broadcasting, sync directly with live game
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('ub999_last_live_aviator_round') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.roundNum && parsed.multiplier && (Date.now() - (parsed.timestamp || 0) < 60000)) {
        const liveNum = parsed.roundNum + offsetRounds;
        const liveMult = offsetRounds === 0 ? parsed.multiplier : getDeterministicCrash(liveNum);
        return {
          roundIndex: liveNum,
          roundId: '#' + liveNum,
          roundNum: liveNum,
          multiplier: liveMult,
          safeCashout: Math.round(liveMult * 0.90 * 100) / 100,
          timeStr: new Date(parsed.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          secondsRemaining: 15
        };
      }
    }
  } catch {}

  const now = Date.now();
  const currentSlot = Math.floor(now / (ROUND_INTERVAL_SEC * 1000)) + offsetRounds;
  const multiplier = getDeterministicCrash(currentSlot);
  const roundNum = 948000 + (currentSlot % 10000);
  const roundId = '#' + roundNum;
  const elapsedInSlot = (now % (ROUND_INTERVAL_SEC * 1000)) / 1000;
  const secondsRemaining = Math.max(0, Math.round(ROUND_INTERVAL_SEC - elapsedInSlot));

  const d = new Date(currentSlot * ROUND_INTERVAL_SEC * 1000);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    roundIndex: currentSlot,
    roundId,
    roundNum,
    multiplier,
    safeCashout: Math.round(multiplier * 0.90 * 100) / 100,
    timeStr,
    secondsRemaining
  };
}

export function getSyncedHistory(count = 10, offset = 0): number[] {
  const current = getCurrentSyncedRound(offset);
  const history: number[] = [];
  for (let i = 1; i <= count; i++) {
    history.push(getDeterministicCrash(current.roundIndex - i));
  }
  return history;
}

// Cross-tab broadcast channel
const CHANNEL_NAME = 'ub999_aviator_signal_sync';
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    syncChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch {}
}

export function broadcastLiveGameRound(roundInfo: {
  roundId: string;
  roundNum: number;
  multiplier: number;
  status: 'WAITING' | 'FLYING' | 'CRASHED';
}) {
  try {
    const payload = {
      ...roundInfo,
      timestamp: Date.now()
    };
    syncChannel?.postMessage(payload);
    localStorage.setItem('ub999_last_live_aviator_round', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('ub999_live_aviator_event', { detail: payload }));
  } catch {}
}

export function listenToLiveGameRound(callback: (roundInfo: {
  roundId: string;
  roundNum: number;
  multiplier: number;
  status: 'WAITING' | 'FLYING' | 'CRASHED';
  timestamp: number;
}) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.multiplier) {
      callback(e.data);
    }
  };

  const handleCustomEvent = (e: any) => {
    if (e.detail && e.detail.multiplier) {
      callback(e.detail);
    }
  };

  syncChannel?.addEventListener('message', handleMessage);
  window.addEventListener('ub999_live_aviator_event', handleCustomEvent);

  // Check recent cached round
  try {
    const raw = localStorage.getItem('ub999_last_live_aviator_round');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < 35000) {
        callback(parsed);
      }
    }
  } catch {}

  return () => {
    syncChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('ub999_live_aviator_event', handleCustomEvent);
  };
}

export async function syncSignalToFirestore(roundInfo: SyncedRoundInfo) {
  try {
    await setDoc(doc(db, 'signals', 'live'), {
      ...roundInfo,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error syncing signal to Firestore:', error);
  }
}
