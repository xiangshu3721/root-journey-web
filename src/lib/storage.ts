import type { JourneyData } from '../types';

const DB_NAME = 'root-journey-mvp';
const STORE_NAME = 'journey';
const RECORD_ID = 'current-device';
const LEGACY_KEY = 'root-journey-demo-v1';

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadJourney(): Promise<JourneyData | null> {
  try {
    const database = await openDatabase();
    const value = await new Promise<JourneyData | undefined>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(RECORD_ID);
      request.onsuccess = () => resolve(request.result as JourneyData | undefined);
      request.onerror = () => reject(request.error);
    });
    database.close();
    if (value) return value;
    const legacy = localStorage.getItem(LEGACY_KEY);
    return legacy ? JSON.parse(legacy) as JourneyData : null;
  } catch {
    const legacy = localStorage.getItem(LEGACY_KEY);
    return legacy ? JSON.parse(legacy) as JourneyData : null;
  }
}

export async function saveJourney(data: JourneyData) {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(data, RECORD_ID);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(data));
  }
}

export async function clearJourney() {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(RECORD_ID);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } finally {
    localStorage.removeItem(LEGACY_KEY);
  }
}
