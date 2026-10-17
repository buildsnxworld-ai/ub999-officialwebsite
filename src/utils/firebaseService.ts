import { db } from './firebase';
import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  getDocs,
  disableNetwork
} from 'firebase/firestore';

export let isFirestoreQuotaExhausted = true;

// Immediately disable Firestore network to prevent overloaded retries and backoff delay errors
try {
  disableNetwork(db).catch(() => {});
} catch {}

export const setQuotaExhausted = () => {
  isFirestoreQuotaExhausted = true;
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
};

// Helper to disable network if explicitly needed
const disableFirebaseNetwork = () => {
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
};

// Fire and forget
const firestoreWrite = async (op: () => Promise<void>) => {
  if (isFirestoreQuotaExhausted) return;
  try {
    await op();
  } catch (err) {
    handleFirestoreError(err);
  }
};

export function handleFirestoreError(err: any, unsubFn?: () => void) {
  const errMsg = err instanceof Error ? err.message : String(err);
  if (errMsg.includes('Quota') || errMsg.includes('resource-exhausted') || errMsg.includes('quota')) {
    setQuotaExhausted();
    if (unsubFn) {
      try {
        unsubFn();
      } catch {}
    }
    return;
  }
  console.warn('Firestore notice:', err);
}


export interface UserRecord {
  id: string;
  phone: string;
  username: string;
  balance: number;
  status: 'active' | 'banned';
  createdAt: string;
  lastLogin: string;
  referredBy?: string;
}

export interface DepositRecord {
  id: string;
  userId: string;
  phone: string;
  method: 'bkash' | 'nagad' | 'rocket';
  amount: number;
  trxId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface WithdrawRecord {
  id: string;
  userId: string;
  phone: string;
  method: 'bkash' | 'nagad' | 'rocket';
  amount: number;
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SystemSettings {
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber?: string;
  bkashNumbers?: string[];
  nagadNumbers?: string[];
  activeBkashIndex?: number;
  activeNagadIndex?: number;
  marqueeNotice?: string;
  winRate?: number;
  aviatorNextTarget?: number;
  aviatorRigMode?: 'auto' | 'high' | 'crash_early' | 'exact';
  updatedAt?: number;
}

export interface LiveSignalData {
  isEnabled: boolean;
  nextCrashMultiplier: number;
  currentRoundId: string;
  updatedAt: string;
  aviator?: {
    multiplier: number;
    accuracy?: number;
    period?: string;
    updatedAt?: string;
    isCustom?: boolean;
  };
}

const DEFAULT_SETTINGS: SystemSettings = {
  bkashNumber: '01349782631',
  nagadNumber: '01768782530',
  rocketNumber: '',
  bkashNumbers: [
    '01349782631',
    '01318097241',
    '01357287095'
  ],
  nagadNumbers: [
    '01768782530',
    '01349845888',
    '01349845906',
    '01349845902',
    '01347246605'
  ],
  activeBkashIndex: 0,
  activeNagadIndex: 0,
  marqueeNotice: '🎉 UB999 অফিশিয়াল প্ল্যাটফর্মে স্বাগতম! প্রথম ডিপোজিটে ১০০% ওয়েলকাম বোনাস!',
  winRate: 65,
  aviatorNextTarget: 2.85,
  aviatorRigMode: 'auto',
  updatedAt: 1791961001287
};

const DEFAULT_SIGNALS: LiveSignalData = {
  isEnabled: true,
  nextCrashMultiplier: 2.85,
  currentRoundId: '#948251',
  updatedAt: new Date().toLocaleTimeString('bn-BD')
};

export const INITIAL_SEED_DEPOSITS: DepositRecord[] = [
  {
    id: 'DEP_1728882001',
    userId: 'user_01711223344',
    phone: '01711223344',
    method: 'bkash',
    amount: 1000,
    trxId: 'BL9A2K998Z',
    status: 'pending',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 'DEP_1728881502',
    userId: 'user_01955667788',
    phone: '01955667788',
    method: 'nagad',
    amount: 2500,
    trxId: 'NG7X810P44',
    status: 'pending',
    createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString()
  },
  {
    id: 'DEP_1728879003',
    userId: 'user_01822334455',
    phone: '01822334455',
    method: 'bkash',
    amount: 500,
    trxId: 'BK3M10992L',
    status: 'approved',
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString()
  }
];

export const INITIAL_SEED_WITHDRAWALS: WithdrawRecord[] = [
  {
    id: 'WTH_1728882101',
    userId: 'user_01799887766',
    phone: '01799887766',
    method: 'bkash',
    amount: 2000,
    accountNumber: '01799887766',
    status: 'pending',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'WTH_1728880402',
    userId: 'user_01633445566',
    phone: '01633445566',
    method: 'nagad',
    amount: 1500,
    accountNumber: '01633445566',
    status: 'pending',
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString()
  }
];

export const INITIAL_SEED_USERS: UserRecord[] = [
  {
    id: '01711223344',
    phone: '01711223344',
    username: 'ub_0171122',
    balance: 1450,
    status: 'active',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    lastLogin: new Date().toISOString()
  },
  {
    id: '01955667788',
    phone: '01955667788',
    username: 'ub_0195566',
    balance: 3200,
    status: 'active',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    lastLogin: new Date().toISOString()
  },
  {
    id: '01799887766',
    phone: '01799887766',
    username: 'ub_0179988',
    balance: 580,
    status: 'active',
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    lastLogin: new Date().toISOString()
  }
];

// Helper to detect dummy placeholder numbers
export const isDummyNumber = (str?: string) => {
  if (!str) return true;
  const clean = str.replace(/[^0-9]/g, '');
  if (!clean || clean.length < 5) return true;
  return clean === '01700000000' || clean === '01800000000' || clean === '01900000000' || clean === '01700006560';
};

// Helper to get local settings safely
export function getLocalSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem('ub999_system_settings');
    let settings = raw ? JSON.parse(raw) : { ...DEFAULT_SETTINGS };

    const bkashNumber = localStorage.getItem('ub999_admin_bkash_number') || localStorage.getItem('ub999_bkash_number');
    if (bkashNumber && !isDummyNumber(bkashNumber)) settings.bkashNumber = bkashNumber;

    const nagadNumber = localStorage.getItem('ub999_admin_nagad_number') || localStorage.getItem('ub999_nagad_number');
    if (nagadNumber && !isDummyNumber(nagadNumber)) settings.nagadNumber = nagadNumber;

    const rawBkashList = localStorage.getItem('ub999_bkash_numbers');
    if (rawBkashList) {
      try {
        const arr = JSON.parse(rawBkashList);
        if (Array.isArray(arr) && arr.some(n => n && !isDummyNumber(n))) {
          settings.bkashNumbers = arr;
        }
      } catch {}
    }

    const rawNagadList = localStorage.getItem('ub999_nagad_numbers');
    if (rawNagadList) {
      try {
        const arr = JSON.parse(rawNagadList);
        if (Array.isArray(arr) && arr.some(n => n && !isDummyNumber(n))) {
          settings.nagadNumbers = arr;
        }
      } catch {}
    }

    return { ...DEFAULT_SETTINGS, ...settings };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// =========================================================================
// SYSTEM SETTINGS (Authoritative Server Sync + Cloud Sync + Anti-Conflict)
// =========================================================================

export function subscribeToSettings(callback: (settings: SystemSettings) => void) {
  // 1. Return local settings immediately
  callback(getLocalSettings());

  // 2. Fetch authoritative settings from server API
  const fetchFromServer = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const serverData = await res.json();
        const local = getLocalSettings();
        if (serverData) {
          const serverHasBkash = Array.isArray(serverData.bkashNumbers) && serverData.bkashNumbers.some((n: string) => n && !isDummyNumber(n));
          const serverHasNagad = Array.isArray(serverData.nagadNumbers) && serverData.nagadNumbers.some((n: string) => n && !isDummyNumber(n));

          const mergedBkashList = Array(10).fill('');
          for (let i = 0; i < 10; i++) {
            const sNum = serverData.bkashNumbers?.[i];
            const lNum = local.bkashNumbers?.[i];
            mergedBkashList[i] = (sNum && !isDummyNumber(sNum)) ? sNum : (lNum && !isDummyNumber(lNum)) ? lNum : '';
          }

          const mergedNagadList = Array(10).fill('');
          for (let i = 0; i < 10; i++) {
            const sNum = serverData.nagadNumbers?.[i];
            const lNum = local.nagadNumbers?.[i];
            mergedNagadList[i] = (sNum && !isDummyNumber(sNum)) ? sNum : (lNum && !isDummyNumber(lNum)) ? lNum : '';
          }

          const activeBkash = (serverData.bkashNumber && !isDummyNumber(serverData.bkashNumber))
            ? serverData.bkashNumber
            : mergedBkashList.find(n => Boolean(n) && !isDummyNumber(n)) || local.bkashNumber || '';

          const activeNagad = (serverData.nagadNumber && !isDummyNumber(serverData.nagadNumber))
            ? serverData.nagadNumber
            : mergedNagadList.find(n => Boolean(n) && !isDummyNumber(n)) || local.nagadNumber || '';

          const merged: SystemSettings = {
            ...DEFAULT_SETTINGS,
            ...local,
            ...serverData,
            bkashNumber: activeBkash,
            nagadNumber: activeNagad,
            bkashNumbers: mergedBkashList,
            nagadNumbers: mergedNagadList,
            updatedAt: Math.max(serverData.updatedAt || 0, local.updatedAt || 0, Date.now())
          };

          try {
            localStorage.setItem('ub999_system_settings', JSON.stringify(merged));
            if (activeBkash) {
              localStorage.setItem('ub999_admin_bkash_number', activeBkash);
              localStorage.setItem('ub999_bkash_number', activeBkash);
            }
            if (activeNagad) {
              localStorage.setItem('ub999_admin_nagad_number', activeNagad);
              localStorage.setItem('ub999_nagad_number', activeNagad);
            }
            localStorage.setItem('ub999_bkash_numbers', JSON.stringify(mergedBkashList));
            localStorage.setItem('ub999_nagad_numbers', JSON.stringify(mergedNagadList));
          } catch {}

          callback(merged);
        }
      }
    } catch {}
  };

  fetchFromServer();
  const pollTimer = setInterval(fetchFromServer, 2500);

  // 3. Listen to local storage & cross-tab events
  const onLocalChange = () => {
    callback(getLocalSettings());
  };
  window.addEventListener('storage', onLocalChange);
  window.addEventListener('ub999_admin_config_updated', onLocalChange);

  // 4. Firestore real-time sync with Anti-Conflict & Anti-Deletion Protection
  let unsubFirestore = () => {};
  if (!isFirestoreQuotaExhausted) {
    try {
      const settingsDoc = doc(db, 'settings', 'general');
      unsubFirestore = onSnapshot(settingsDoc, (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = snapshot.data();
          const local = getLocalSettings();

          // Anti-Conflict Rule 1: If cloudData has older timestamp, do NOT overwrite local! Heal cloud instead.
          if (cloudData.updatedAt && local.updatedAt && cloudData.updatedAt < local.updatedAt) {
            setDoc(settingsDoc, local, { merge: true }).catch(() => {});
            return;
          }

          // If cloudData has numbers, use cloudData directly so admin removals are respected
          const cloudHasBkash = cloudData.bkashNumbers && Array.isArray(cloudData.bkashNumbers) && cloudData.bkashNumbers.some((n: any) => n && !isDummyNumber(n));
          const cloudHasNagad = cloudData.nagadNumbers && Array.isArray(cloudData.nagadNumbers) && cloudData.nagadNumbers.some((n: any) => n && !isDummyNumber(n));

          const finalBkashList = Array(10).fill('');
          for (let i = 0; i < 10; i++) {
            if (cloudHasBkash) {
              const cNum = cloudData.bkashNumbers?.[i];
              finalBkashList[i] = (cNum && !isDummyNumber(cNum)) ? String(cNum).trim() : '';
            } else {
              const lNum = local.bkashNumbers?.[i];
              finalBkashList[i] = (lNum && !isDummyNumber(lNum)) ? String(lNum).trim() : '';
            }
          }

          const finalNagadList = Array(10).fill('');
          for (let i = 0; i < 10; i++) {
            if (cloudHasNagad) {
              const cNum = cloudData.nagadNumbers?.[i];
              finalNagadList[i] = (cNum && !isDummyNumber(cNum)) ? String(cNum).trim() : '';
            } else {
              const lNum = local.nagadNumbers?.[i];
              finalNagadList[i] = (lNum && !isDummyNumber(lNum)) ? String(lNum).trim() : '';
            }
          }

          const activeBkash = (cloudHasBkash && cloudData.bkashNumber && !isDummyNumber(cloudData.bkashNumber))
            ? cloudData.bkashNumber
            : finalBkashList.find(n => Boolean(n) && !isDummyNumber(n)) || local.bkashNumber || '';

          const activeNagad = (cloudHasNagad && cloudData.nagadNumber && !isDummyNumber(cloudData.nagadNumber))
            ? cloudData.nagadNumber
            : finalNagadList.find(n => Boolean(n) && !isDummyNumber(n)) || local.nagadNumber || '';

          const merged: SystemSettings = {
            ...DEFAULT_SETTINGS,
            ...local,
            ...cloudData,
            bkashNumber: activeBkash,
            nagadNumber: activeNagad,
            bkashNumbers: finalBkashList,
            nagadNumbers: finalNagadList,
            updatedAt: Math.max(cloudData.updatedAt || 0, local.updatedAt || 0, Date.now())
          };

          try {
            localStorage.setItem('ub999_system_settings', JSON.stringify(merged));
            if (activeBkash) {
              localStorage.setItem('ub999_admin_bkash_number', activeBkash);
              localStorage.setItem('ub999_bkash_number', activeBkash);
            }
            if (activeNagad) {
              localStorage.setItem('ub999_admin_nagad_number', activeNagad);
              localStorage.setItem('ub999_nagad_number', activeNagad);
            }
            localStorage.setItem('ub999_bkash_numbers', JSON.stringify(finalBkashList));
            localStorage.setItem('ub999_nagad_numbers', JSON.stringify(finalNagadList));
          } catch {}

          callback(merged);
        }
      }, (error) => {
        handleFirestoreError(error, unsubFirestore);
        callback(getLocalSettings());
      });
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return () => {
    clearInterval(pollTimer);
    window.removeEventListener('storage', onLocalChange);
    window.removeEventListener('ub999_admin_config_updated', onLocalChange);
    unsubFirestore();
  };
}

export async function updateSystemSettings(newSettings: Partial<SystemSettings>) {
  const now = newSettings.updatedAt || Date.now();
  const settingsWithTime: SystemSettings = {
    ...getLocalSettings(),
    ...newSettings,
    updatedAt: now
  };

  // 1. Immediately write to localStorage so current tab & same-device tabs update instantly
  try {
    localStorage.setItem('ub999_system_settings', JSON.stringify(settingsWithTime));

    if (settingsWithTime.bkashNumber) {
      localStorage.setItem('ub999_admin_bkash_number', settingsWithTime.bkashNumber);
      localStorage.setItem('ub999_bkash_number', settingsWithTime.bkashNumber);
    }
    if (settingsWithTime.nagadNumber) {
      localStorage.setItem('ub999_admin_nagad_number', settingsWithTime.nagadNumber);
      localStorage.setItem('ub999_nagad_number', settingsWithTime.nagadNumber);
    }
    if (settingsWithTime.bkashNumbers && Array.isArray(settingsWithTime.bkashNumbers)) {
      localStorage.setItem('ub999_bkash_numbers', JSON.stringify(settingsWithTime.bkashNumbers));
    }
    if (settingsWithTime.nagadNumbers && Array.isArray(settingsWithTime.nagadNumbers)) {
      localStorage.setItem('ub999_nagad_numbers', JSON.stringify(settingsWithTime.nagadNumbers));
    }
    window.dispatchEvent(new Event('ub999_admin_config_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (localErr) {
    console.error('Local save error:', localErr);
  }

  // 2. Authoritative Server Sync (/api/settings)
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsWithTime)
    });
  } catch (apiErr) {
    console.warn('Server sync notice:', apiErr);
  }

  // 3. Cloud Firestore Sync (background, non-blocking)
  if (!isFirestoreQuotaExhausted) {
    try {
      const settingsDoc = doc(db, 'settings', 'general');
      await setDoc(settingsDoc, settingsWithTime, { merge: true });
    } catch (cloudErr) {
      handleFirestoreError(cloudErr);
    }
  }
}

// =========================================================================
// LIVE SIGNALS (Server + Local + Cloud Sync)
// =========================================================================

export function subscribeToLiveSignals(callback: (signals: LiveSignalData) => void) {
  const getLocalSignals = (): LiveSignalData => {
    try {
      const saved = localStorage.getItem('ub999_live_signals');
      return saved ? JSON.parse(saved) : DEFAULT_SIGNALS;
    } catch {
      return DEFAULT_SIGNALS;
    }
  };

  callback(getLocalSignals());

  const fetchSignals = async () => {
    try {
      const res = await fetch('/api/signals');
      if (res.ok) {
        const sig = await res.json();
        if (sig && typeof sig.isEnabled === 'boolean') {
          localStorage.setItem('ub999_live_signals', JSON.stringify(sig));
          callback(sig);
        }
      }
    } catch {}
  };

  fetchSignals();
  const pollTimer = setInterval(fetchSignals, 3000);

  const onLocal = () => callback(getLocalSignals());
  window.addEventListener('storage', onLocal);
  window.addEventListener('ub999_signals_updated', onLocal);

  let unsub = () => {};
  if (!isFirestoreQuotaExhausted) {
    try {
      const signalsDoc = doc(db, 'signals', 'live');
      unsub = onSnapshot(signalsDoc, (snapshot) => {
        if (snapshot.exists()) {
          const merged = { ...DEFAULT_SIGNALS, ...snapshot.data() } as LiveSignalData;
          try {
            localStorage.setItem('ub999_live_signals', JSON.stringify(merged));
          } catch {}
          callback(merged);
        }
      }, (error) => {
        handleFirestoreError(error, unsub);
        callback(getLocalSignals());
      });
    } catch (err) {
      handleFirestoreError(err);
      callback(getLocalSignals());
    }
  }

  return () => {
    clearInterval(pollTimer);
    window.removeEventListener('storage', onLocal);
    window.removeEventListener('ub999_signals_updated', onLocal);
    unsub();
  };
}

export async function updateLiveSignals(newSignals: Partial<LiveSignalData>) {
  try {
    const saved = localStorage.getItem('ub999_live_signals');
    const cur = saved ? JSON.parse(saved) : DEFAULT_SIGNALS;
    const updated = { ...cur, ...newSignals };
    localStorage.setItem('ub999_live_signals', JSON.stringify(updated));
    window.dispatchEvent(new Event('ub999_signals_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  try {
    await fetch('/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSignals)
    });
  } catch {}

  // Sync to Firestore using official SDK (only if quota is available)
  if (!isFirestoreQuotaExhausted) {
    try {
      const signalsDoc = doc(db, 'signals', 'live');
      const multiplier = typeof newSignals.nextCrashMultiplier === 'number' && newSignals.nextCrashMultiplier > 0
        ? newSignals.nextCrashMultiplier
        : (newSignals.aviator?.multiplier || 2.50);
      const roundId = newSignals.currentRoundId || newSignals.aviator?.period || `#${Math.floor(100000 + Math.random() * 900000)}`;

      await setDoc(signalsDoc, {
        ...newSignals,
        nextCrashMultiplier: multiplier,
        currentRoundId: roundId,
        updatedAt: newSignals.updatedAt || new Date().toLocaleTimeString('bn-BD'),
        timestamp: Date.now(),
        aviator: {
          multiplier,
          period: roundId,
          accuracy: 99,
          isCustom: Boolean(newSignals.aviator?.isCustom)
        }
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

// =========================================================================
// DEPOSITS (Authoritative Server Sync + Local + Cloud Sync)
// =========================================================================

function getLocalDeposits(): DepositRecord[] {
  try {
    const rawAll = localStorage.getItem('ub999_all_deposits');
    if (rawAll) {
      const parsed = JSON.parse(rawAll);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const rawApp = localStorage.getItem('ub999_deposit_records');
    if (rawApp) {
      const parsed = JSON.parse(rawApp);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          id: item.id || 'DEP_' + Date.now(),
          userId: item.userId || item.phone || '01712345678',
          phone: item.phone || '01712345678',
          method: (item.method && item.method.toLowerCase().includes('nagad')) ? 'nagad' : 'bkash',
          amount: Number(item.amount) || 500,
          trxId: item.trxId || 'TRX_' + Date.now(),
          status: item.status === 'সফল' || item.status === 'approved' ? 'approved' : item.status === 'বাতিল' ? 'rejected' : 'pending',
          createdAt: item.createdAt || new Date().toISOString()
        }));
      }
    }
    return INITIAL_SEED_DEPOSITS;
  } catch {
    return INITIAL_SEED_DEPOSITS;
  }
}

export function subscribeToDeposits(callback: (deposits: DepositRecord[]) => void) {
  // 1. Immediately return local deposits
  callback(getLocalDeposits());

  // 2. Fetch from Server API
  const fetchFromServer = async () => {
    try {
      const res = await fetch('/api/deposits');
      if (res.ok) {
        const serverDeps = await res.json();
        if (Array.isArray(serverDeps) && serverDeps.length > 0) {
          const local = getLocalDeposits();
          const map = new Map<string, DepositRecord>();
          local.forEach(d => map.set(d.id, d));
          serverDeps.forEach((d: DepositRecord) => map.set(d.id, d));
          const combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          localStorage.setItem('ub999_all_deposits', JSON.stringify(combined));
          callback(combined);
        }
      }
    } catch {}

    // 2b. Direct Firestore REST query fallback to guarantee cloud sync across all hosting setups
    try {
      const queryRes = await fetch("https://firestore.googleapis.com/v1/projects/plenary-charge-tzbz0/databases/ai-studio-multiappecosyste-b6f431e7-e9f9-4425-912d-c3133dd3c899/documents:runQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "deposits" }],
            orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
            limit: 50
          }
        })
      });
      if (queryRes.ok) {
        const queryData = await queryRes.json();
        if (Array.isArray(queryData)) {
          const cloudDeps: DepositRecord[] = [];
          for (const item of queryData) {
            if (item.document && item.document.fields) {
              const f = item.document.fields;
              cloudDeps.push({
                id: f.id?.stringValue || item.document.name.split('/').pop(),
                userId: f.userId?.stringValue || f.phone?.stringValue || '',
                phone: f.phone?.stringValue || '',
                method: (f.method?.stringValue || 'bkash') as any,
                amount: f.amount?.doubleValue ?? Number(f.amount?.integerValue || 0),
                trxId: f.trxId?.stringValue || '',
                status: (f.status?.stringValue || 'pending') as any,
                createdAt: f.createdAt?.stringValue || new Date().toISOString()
              });
            }
          }
          if (cloudDeps.length > 0) {
            const local = getLocalDeposits();
            const map = new Map<string, DepositRecord>();
            local.forEach(d => map.set(d.id, d));
            cloudDeps.forEach(d => map.set(d.id, d));
            const combined = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            localStorage.setItem('ub999_all_deposits', JSON.stringify(combined));
            callback(combined);
          }
        }
      }
    } catch {}
  };

  fetchFromServer();
  const pollTimer = setInterval(fetchFromServer, 2500);

  // 3. Local events
  const onLocal = () => callback(getLocalDeposits());
  window.addEventListener('storage', onLocal);
  window.addEventListener('ub999_deposit_records_updated', onLocal);

  // 4. Firestore (if accessible and quota not exhausted)
  let unsub = () => {};
  if (!isFirestoreQuotaExhausted) {
    try {
      const depositsCol = collection(db, 'deposits');
      const q = query(depositsCol, orderBy('createdAt', 'desc'), limit(50));
      unsub = onSnapshot(q, (snapshot) => {
        const cloudRecords: DepositRecord[] = [];
        snapshot.forEach(docSnap => {
          cloudRecords.push({ id: docSnap.id, ...docSnap.data() } as DepositRecord);
        });
        if (cloudRecords.length > 0) {
          const local = getLocalDeposits();
          const map = new Map<string, DepositRecord>();
          local.forEach(d => map.set(d.id, d));
          cloudRecords.forEach(d => map.set(d.id, d));
          const combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          localStorage.setItem('ub999_all_deposits', JSON.stringify(combined));
          callback(combined);
        }
      }, (error) => {
        handleFirestoreError(error, unsub);
        callback(getLocalDeposits());
      });
    } catch (err) {
      handleFirestoreError(err);
      callback(getLocalDeposits());
    }
  }

  return () => {
    clearInterval(pollTimer);
    window.removeEventListener('storage', onLocal);
    window.removeEventListener('ub999_deposit_records_updated', onLocal);
    unsub();
  };
}

async function syncDepositToFirestoreREST(deposit: DepositRecord) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/plenary-charge-tzbz0/databases/ai-studio-multiappecosyste-b6f431e7-e9f9-4425-912d-c3133dd3c899/documents/deposits/${deposit.id}`;
    const body = {
      fields: {
        id: { stringValue: deposit.id },
        userId: { stringValue: deposit.userId || deposit.phone },
        phone: { stringValue: deposit.phone },
        method: { stringValue: deposit.method },
        amount: { doubleValue: Number(deposit.amount) || 0 },
        trxId: { stringValue: deposit.trxId || '' },
        status: { stringValue: deposit.status },
        createdAt: { stringValue: deposit.createdAt || new Date().toISOString() }
      }
    };
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('REST deposit sync error:', err);
  }
}

export async function submitDepositRequest(req: Omit<DepositRecord, 'id' | 'status' | 'createdAt'>) {
  const id = 'DEP_' + Date.now();
  const data: DepositRecord = {
    ...req,
    id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // 1. Save local
  try {
    const current = getLocalDeposits();
    const updated = [data, ...current];
    localStorage.setItem('ub999_all_deposits', JSON.stringify(updated));
    window.dispatchEvent(new Event('ub999_deposit_records_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  // 2. Save server
  try {
    await fetch('/api/deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch {}

  // 3. Direct Firestore REST sync so deposits from ALL devices immediately reach Firestore Cloud!
  await syncDepositToFirestoreREST(data);

  // 4. Save firestore SDK (non-blocking)
  if (!isFirestoreQuotaExhausted) {
    try {
      const depositDoc = doc(db, 'deposits', id);
      await setDoc(depositDoc, data);
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return data;
}

export async function updateDepositStatus(depositId: string, status: 'approved' | 'rejected') {
  let updatedRecord: DepositRecord | null = null;
  // 1. Update local
  try {
    const current = getLocalDeposits();
    const updated = current.map(d => {
      if (d.id === depositId) {
        updatedRecord = { ...d, status };
        return updatedRecord;
      }
      return d;
    });
    localStorage.setItem('ub999_all_deposits', JSON.stringify(updated));
    window.dispatchEvent(new Event('ub999_deposit_records_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  // 2. Update server
  try {
    await fetch(`/api/deposits/${depositId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch {}

  // 3. Direct Firestore REST sync
  if (updatedRecord) {
    await syncDepositToFirestoreREST(updatedRecord);
  }

  // 4. Update firestore (non-blocking)
  if (!isFirestoreQuotaExhausted) {
    try {
      const depositDoc = doc(db, 'deposits', depositId);
      await updateDoc(depositDoc, { status });
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

// =========================================================================
// WITHDRAWALS (Authoritative Server Sync + Local + Cloud Sync)
// =========================================================================

function getLocalWithdrawals(): WithdrawRecord[] {
  try {
    const rawAll = localStorage.getItem('ub999_all_withdrawals');
    if (rawAll) {
      const parsed = JSON.parse(rawAll);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const rawApp = localStorage.getItem('ub999_withdraw_records');
    if (rawApp) {
      const parsed = JSON.parse(rawApp);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          id: item.id || 'WTH_' + Date.now(),
          userId: item.userId || item.phone || '01712345678',
          phone: item.phone || item.accountNumber || '01712345678',
          method: (item.method && item.method.toLowerCase().includes('nagad')) ? 'nagad' : 'bkash',
          amount: Number(item.amount) || 500,
          accountNumber: item.accountNumber || item.phone || '01712345678',
          status: item.status === 'সফল' || item.status === 'approved' ? 'approved' : item.status === 'বাতিল' ? 'rejected' : 'pending',
          createdAt: item.createdAt || new Date().toISOString()
        }));
      }
    }
    return INITIAL_SEED_WITHDRAWALS;
  } catch {
    return INITIAL_SEED_WITHDRAWALS;
  }
}

export function subscribeToWithdrawals(callback: (withdrawals: WithdrawRecord[]) => void) {
  callback(getLocalWithdrawals());

  const fetchFromServer = async () => {
    try {
      const res = await fetch('/api/withdrawals');
      if (res.ok) {
        const serverWths = await res.json();
        if (Array.isArray(serverWths) && serverWths.length > 0) {
          const local = getLocalWithdrawals();
          const map = new Map<string, WithdrawRecord>();
          local.forEach(w => map.set(w.id, w));
          serverWths.forEach((w: WithdrawRecord) => map.set(w.id, w));
          const combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          localStorage.setItem('ub999_all_withdrawals', JSON.stringify(combined));
          callback(combined);
        }
      }
    } catch {}

    // Direct Firestore REST query fallback to guarantee cloud sync across all hosting setups
    try {
      const queryRes = await fetch("https://firestore.googleapis.com/v1/projects/plenary-charge-tzbz0/databases/ai-studio-multiappecosyste-b6f431e7-e9f9-4425-912d-c3133dd3c899/documents:runQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "withdrawals" }],
            orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
            limit: 50
          }
        })
      });
      if (queryRes.ok) {
        const queryData = await queryRes.json();
        if (Array.isArray(queryData)) {
          const cloudWths: WithdrawRecord[] = [];
          for (const item of queryData) {
            if (item.document && item.document.fields) {
              const f = item.document.fields;
              cloudWths.push({
                id: f.id?.stringValue || item.document.name.split('/').pop(),
                userId: f.userId?.stringValue || f.phone?.stringValue || '',
                phone: f.phone?.stringValue || '',
                method: (f.method?.stringValue || 'bkash') as any,
                amount: f.amount?.doubleValue ?? Number(f.amount?.integerValue || 0),
                accountNumber: f.accountNumber?.stringValue || f.phone?.stringValue || '',
                status: (f.status?.stringValue || 'pending') as any,
                createdAt: f.createdAt?.stringValue || new Date().toISOString()
              });
            }
          }
          if (cloudWths.length > 0) {
            const local = getLocalWithdrawals();
            const map = new Map<string, WithdrawRecord>();
            local.forEach(w => map.set(w.id, w));
            cloudWths.forEach(w => map.set(w.id, w));
            const combined = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            localStorage.setItem('ub999_all_withdrawals', JSON.stringify(combined));
            callback(combined);
          }
        }
      }
    } catch {}
  };

  fetchFromServer();
  const pollTimer = setInterval(fetchFromServer, 2500);

  const onLocal = () => callback(getLocalWithdrawals());
  window.addEventListener('storage', onLocal);
  window.addEventListener('ub999_withdraw_records_updated', onLocal);

  let unsub = () => {};
  if (!isFirestoreQuotaExhausted) {
    try {
      const withdrawalsCol = collection(db, 'withdrawals');
      const q = query(withdrawalsCol, orderBy('createdAt', 'desc'), limit(50));
      unsub = onSnapshot(q, (snapshot) => {
        const cloudRecords: WithdrawRecord[] = [];
        snapshot.forEach(docSnap => {
          cloudRecords.push({ id: docSnap.id, ...docSnap.data() } as WithdrawRecord);
        });
        if (cloudRecords.length > 0) {
          const local = getLocalWithdrawals();
          const map = new Map<string, WithdrawRecord>();
          local.forEach(w => map.set(w.id, w));
          cloudRecords.forEach(w => map.set(w.id, w));
          const combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          localStorage.setItem('ub999_all_withdrawals', JSON.stringify(combined));
          callback(combined);
        }
      }, (error) => {
        handleFirestoreError(error, unsub);
        callback(getLocalWithdrawals());
      });
    } catch (err) {
      handleFirestoreError(err);
      callback(getLocalWithdrawals());
    }
  }

  return () => {
    clearInterval(pollTimer);
    window.removeEventListener('storage', onLocal);
    window.removeEventListener('ub999_withdraw_records_updated', onLocal);
    unsub();
  };
}

async function syncWithdrawToFirestoreREST(withdraw: WithdrawRecord) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/plenary-charge-tzbz0/databases/ai-studio-multiappecosyste-b6f431e7-e9f9-4425-912d-c3133dd3c899/documents/withdrawals/${withdraw.id}`;
    const body = {
      fields: {
        id: { stringValue: withdraw.id },
        userId: { stringValue: withdraw.userId || withdraw.phone },
        phone: { stringValue: withdraw.phone },
        method: { stringValue: withdraw.method },
        amount: { doubleValue: Number(withdraw.amount) || 0 },
        accountNumber: { stringValue: withdraw.accountNumber || withdraw.phone },
        status: { stringValue: withdraw.status },
        createdAt: { stringValue: withdraw.createdAt || new Date().toISOString() }
      }
    };
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('REST withdraw sync error:', err);
  }
}

export async function submitWithdrawRequest(req: Omit<WithdrawRecord, 'id' | 'status' | 'createdAt'>) {
  const id = 'WTH_' + Date.now();
  const data: WithdrawRecord = {
    ...req,
    id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    const current = getLocalWithdrawals();
    const updated = [data, ...current];
    localStorage.setItem('ub999_all_withdrawals', JSON.stringify(updated));
    window.dispatchEvent(new Event('ub999_withdraw_records_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  try {
    await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch {}

  // Direct Firestore REST sync so withdrawals from ALL devices immediately reach Cloud!
  await syncWithdrawToFirestoreREST(data);

  if (!isFirestoreQuotaExhausted) {
    try {
      const withdrawDoc = doc(db, 'withdrawals', id);
      await setDoc(withdrawDoc, data);
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  return data;
}

export async function updateWithdrawStatus(withdrawId: string, status: 'approved' | 'rejected') {
  let updatedRecord: WithdrawRecord | null = null;
  try {
    const current = getLocalWithdrawals();
    const updated = current.map(w => {
      if (w.id === withdrawId) {
        updatedRecord = { ...w, status };
        return updatedRecord;
      }
      return w;
    });
    localStorage.setItem('ub999_all_withdrawals', JSON.stringify(updated));
    window.dispatchEvent(new Event('ub999_withdraw_records_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  try {
    await fetch(`/api/withdrawals/${withdrawId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch {}

  if (updatedRecord) {
    await syncWithdrawToFirestoreREST(updatedRecord);
  }

  if (!isFirestoreQuotaExhausted) {
    try {
      const withdrawDoc = doc(db, 'withdrawals', withdrawId);
      await updateDoc(withdrawDoc, { status });
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

// =========================================================================
// USERS (Server + Local + Cloud Sync)
// =========================================================================

function getLocalUsers(): UserRecord[] {
  try {
    const rawAll = localStorage.getItem('ub999_registered_users');
    if (rawAll) {
      const parsed = JSON.parse(rawAll);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return INITIAL_SEED_USERS;
  } catch {
    return INITIAL_SEED_USERS;
  }
}

export function subscribeToUsers(callback: (users: UserRecord[]) => void) {
  callback(getLocalUsers());

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const serverUsers = await res.json();
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          const local = getLocalUsers();
          const map = new Map<string, UserRecord>();
          local.forEach(u => map.set(u.id, u));
          serverUsers.forEach((u: UserRecord) => map.set(u.id, u));
          const combined = Array.from(map.values());
          localStorage.setItem('ub999_registered_users', JSON.stringify(combined));
          callback(combined);
        }
      }
    } catch {}
  };

  fetchUsers();
  const pollTimer = setInterval(fetchUsers, 3000);

  const onLocal = () => callback(getLocalUsers());
  window.addEventListener('storage', onLocal);
  window.addEventListener('ub999_users_updated', onLocal);

  let unsub = () => {};
  if (!isFirestoreQuotaExhausted) {
    try {
      const usersCol = collection(db, 'users');
      unsub = onSnapshot(usersCol, (snapshot) => {
        const cloudUsers: UserRecord[] = [];
        snapshot.forEach(docSnap => {
          cloudUsers.push({ id: docSnap.id, ...docSnap.data() } as UserRecord);
        });
        if (cloudUsers.length > 0) {
          const local = getLocalUsers();
          const map = new Map<string, UserRecord>();
          local.forEach(u => map.set(u.id, u));
          cloudUsers.forEach(u => map.set(u.id, u));
          const combined = Array.from(map.values());
          localStorage.setItem('ub999_registered_users', JSON.stringify(combined));
          callback(combined);
        }
      }, (error) => {
        handleFirestoreError(error, unsub);
        callback(getLocalUsers());
      });
    } catch (err) {
      handleFirestoreError(err);
      callback(getLocalUsers());
    }
  }

  return () => {
    clearInterval(pollTimer);
    window.removeEventListener('storage', onLocal);
    window.removeEventListener('ub999_users_updated', onLocal);
    unsub();
  };
}

export async function saveOrUpdateUser(user: UserRecord) {
  try {
    const local = getLocalUsers();
    const idx = local.findIndex(u => u.id === user.id || u.phone === user.phone);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...user };
    } else {
      local.unshift(user);
    }
    localStorage.setItem('ub999_registered_users', JSON.stringify(local));
    window.dispatchEvent(new Event('ub999_users_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    try {
      const userDoc = doc(db, 'users', user.id);
      await setDoc(userDoc, user, { merge: true });
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

export async function updateUserBalance(userId: string, newBalance: number) {
  try {
    const local = getLocalUsers();
    const updated = local.map(u => (u.id === userId || u.phone === userId) ? { ...u, balance: newBalance } : u);
    localStorage.setItem('ub999_registered_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('ub999_users_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  try {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance: newBalance })
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    try {
      const userDoc = doc(db, 'users', userId);
      await updateDoc(userDoc, { balance: newBalance });
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}

export async function updateUserStatus(userId: string, status: 'active' | 'blocked') {
  try {
    const local = getLocalUsers();
    const updated = local.map(u => (u.id === userId || u.phone === userId) ? { ...u, status } : u);
    localStorage.setItem('ub999_registered_users', JSON.stringify(updated));
    window.dispatchEvent(new Event('ub999_users_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {}

  try {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch {}

  if (!isFirestoreQuotaExhausted) {
    try {
      const userDoc = doc(db, 'users', userId);
      await updateDoc(userDoc, { status });
    } catch (err) {
      handleFirestoreError(err);
    }
  }
}
