import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Supabase auth storage backed by the OS keychain/keystore.
 * SecureStore values should stay small, so long values (the session JSON) are split into chunks.
 */
const CHUNK_SIZE = 1800;
const countKey = (key: string) => `${sanitize(key)}__n`;
const chunkKey = (key: string, i: number) => `${sanitize(key)}__${i}`;

// SecureStore keys may only contain alphanumerics, '.', '-', '_'.
function sanitize(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function splitIntoChunks(value: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) chunks.push(value.slice(i, i + size));
  return chunks.length ? chunks : [''];
}

async function removeChunks(key: string): Promise<void> {
  const n = Number(await SecureStore.getItemAsync(countKey(key)));
  if (Number.isFinite(n) && n > 0) {
    await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i))));
  }
  await SecureStore.deleteItemAsync(countKey(key));
}

const nativeStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = Number(await SecureStore.getItemAsync(countKey(key)));
    if (!Number.isFinite(n) || n <= 0) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i))));
    if (parts.some((p) => p === null)) return null;
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    await removeChunks(key);
    const chunks = splitIntoChunks(value);
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(chunkKey(key, i), c)));
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
  },
  async removeItem(key: string): Promise<void> {
    await removeChunks(key);
  },
};

const webStorage = {
  async getItem(key: string) {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

export const authStorage = Platform.OS === 'web' ? webStorage : nativeStorage;
