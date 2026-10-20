import { createPkceStorage } from "../storage/storage-factory";

// Singleton storage instance
let pkceStorage: ReturnType<typeof createPkceStorage> | null = null;

function getPkceStorage() {
  if (!pkceStorage) {
    pkceStorage = createPkceStorage();
  }
  return pkceStorage;
}

export async function storePkceCode(
  sessionId: string,
  pkceData: { verifier: string; challenge: string; challengeMethod: string }
) {
  const storage = getPkceStorage();
  await storage.store(sessionId, pkceData);
}

export async function getPkceCode(sessionId: string) {
  const storage = getPkceStorage();
  return await storage.get(sessionId);
}

export async function removePkceCode(sessionId: string) {
  const storage = getPkceStorage();
  await storage.remove(sessionId);
}
