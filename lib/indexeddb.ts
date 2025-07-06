import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database name and version
const DB_NAME = 'sitesense-db';
const DB_VERSION = 1;

// Store names
export const VIDEO_STORE = 'videos';
export const FILES_STORE = 'files';
export const RESULTS_STORE = 'results';

// Database schema
interface SitesenseDB extends DBSchema {
  [VIDEO_STORE]: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      timestamp: number;
    };
  };
  [FILES_STORE]: {
    key: string;
    value: {
      id: string;
      name: string;
      type: string;
      size: number;
      timestamp: number;
    };
  };
  [RESULTS_STORE]: {
    key: string;
    value: {
      fileId: string;
      resultUrl: string;
      timestamp: number;
    };
  };
}

// Database initialization
export async function openDatabase(): Promise<IDBPDatabase<SitesenseDB>> {
  try {
    console.log('Initializing IndexedDB...');
    const db = await openDB<SitesenseDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create video store
        if (!db.objectStoreNames.contains(VIDEO_STORE)) {
          db.createObjectStore(VIDEO_STORE);
        }

        // Create files store
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE);
        }

        // Create results store
        if (!db.objectStoreNames.contains(RESULTS_STORE)) {
          db.createObjectStore(RESULTS_STORE);
        }
      },
    });
    console.log('IndexedDB opened successfully');
    return db;
  } catch (error) {
    console.error('Error opening IndexedDB:', error);
    throw error;
  }
} 