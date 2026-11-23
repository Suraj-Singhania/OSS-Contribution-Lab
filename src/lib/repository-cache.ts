const OVERVIEW_STORAGE_PREFIX = "repository-overview:";
const SAVED_QUESTIONS_PREFIX = "saved-project-questions:";
const DIGEST_DATABASE_NAME = "repository-digests";
const DIGEST_DATABASE_VERSION = 1;
const DIGEST_OBJECT_STORE = "digests";
const DIGEST_STORAGE_PREFIX = ":repository-digest:";

export async function clearRepositoryCache(repositoryUrl: string) {
  const repositoryKey = repositoryPath(repositoryUrl);
  if (!repositoryKey) return;

  try {
    window.localStorage.removeItem(
      `${OVERVIEW_STORAGE_PREFIX}${repositoryUrl}`,
    );
  } catch {
    // Continue clearing IndexedDB if local storage is unavailable.
  }

  try {
    const database = await openDigestDatabase();
    const transaction = database.transaction(DIGEST_OBJECT_STORE, "readwrite");
    const store = transaction.objectStore(DIGEST_OBJECT_STORE);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (
        typeof cursor.key === "string" &&
        cursor.key.endsWith(`${DIGEST_STORAGE_PREFIX}${repositoryKey}`)
      ) {
        cursor.delete();
      }
      cursor.continue();
    };
    await transactionComplete(transaction);
    database.close();
  } catch {
    // Local cache cleanup is best effort when IndexedDB is unavailable.
  }
}

export function clearSavedProjectQuestions(projectId: string) {
  try {
    window.localStorage.removeItem(`${SAVED_QUESTIONS_PREFIX}${projectId}`);
  } catch {
    // Saved-question cleanup is best effort when local storage is unavailable.
  }
}

function repositoryPath(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
      return null;
    }
    const [owner, repo] = url.pathname.split("/").filter(Boolean).slice(0, 2);
    if (!owner || !repo) return null;
    return `${owner.toLowerCase()}/${repo.replace(/\.git$/i, "").toLowerCase()}`;
  } catch {
    return null;
  }
}

function openDigestDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(
      DIGEST_DATABASE_NAME,
      DIGEST_DATABASE_VERSION,
    );
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DIGEST_OBJECT_STORE)) {
        request.result.createObjectStore(DIGEST_OBJECT_STORE, {
          keyPath: "key",
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Digest storage is blocked."));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
