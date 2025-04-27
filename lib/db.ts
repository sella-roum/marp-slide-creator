import type { DocumentType, VersionType, ChatMessageType } from './types';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'MarpSlideCreatorDB';
const DB_VERSION = 2; // バージョンをインクリメント (例: 1 -> 2)
const DOC_STORE = 'documents';
const VERSION_STORE = 'versions';
const CHAT_STORE = 'chatMessages'; // チャットメッセージ用ストア名

let db: IDBDatabase | null = null;

// --- DB初期化関数 (修正) ---
export function initializeDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve();
      return;
    }

    console.log(`Opening database "${DB_NAME}" with version ${DB_VERSION}...`);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error:", request.error);
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = (event) => {
      db = request.result;
      console.log("Database initialized successfully");

      // 接続が予期せず閉じられた場合のハンドラ
      db.onclose = () => {
        console.warn("Database connection closed unexpectedly.");
        db = null; // DB接続をリセット
      };
      db.onerror = (event) => {
        console.error("Database error after connection:", (event.target as IDBRequest).error);
      };

      resolve();
    };

    request.onupgradeneeded = (event) => {
      console.log("Upgrading database...");
      const target = event.target as IDBOpenDBRequest | null;
      if (!target) return;
      const currentDb = target.result;
      const transaction = target.transaction; // アップグレードトランザクションを取得

      console.log(`Upgrading from version ${event.oldVersion} to ${event.newVersion}`);

      // 既存のストアがない場合のみ作成
      if (!currentDb.objectStoreNames.contains(DOC_STORE)) {
        currentDb.createObjectStore(DOC_STORE, { keyPath: 'id' });
        console.log(`Object store "${DOC_STORE}" created.`);
      }
      if (!currentDb.objectStoreNames.contains(VERSION_STORE)) {
        const versionStore = currentDb.createObjectStore(VERSION_STORE, { keyPath: 'id' });
        // インデックス作成はトランザクション完了後に行われるため、ここでは宣言のみ
        if (!versionStore.indexNames.contains('documentId')) {
             versionStore.createIndex('documentId', 'documentId', { unique: false });
             console.log(`Index "documentId" created for store "${VERSION_STORE}".`);
        }
        console.log(`Object store "${VERSION_STORE}" created.`);
      }
      // --- チャットストア作成 ---
      if (!currentDb.objectStoreNames.contains(CHAT_STORE)) {
        const chatStore = currentDb.createObjectStore(CHAT_STORE, { keyPath: 'id' });
        // documentId と timestamp で検索できるようにインデックスを作成
        // インデックス名は一意にする必要がある
        if (!chatStore.indexNames.contains('docId_ts')) { // インデックス名を変更
            // Multi-entry index for documentId and timestamp
            chatStore.createIndex('docId_ts', ['documentId', 'timestamp'], { unique: false });
            console.log(`Index "docId_ts" created for store "${CHAT_STORE}".`);
        }
         // documentId のみのインデックスも追加 (clearChatMessages で使用)
        if (!chatStore.indexNames.contains('documentId')) {
            chatStore.createIndex('documentId', 'documentId', { unique: false });
            console.log(`Index "documentId" created for store "${CHAT_STORE}".`);
        }
        console.log(`Object store "${CHAT_STORE}" created.`);
      }

      console.log("Database upgrade complete.");
    };

    request.onblocked = () => {
        console.warn("Database upgrade blocked. Please close other tabs using this application.");
        reject(new Error("Database upgrade blocked"));
    };
  });
}

// --- ヘルパー関数: トランザクション取得 ---
function getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    if (!db) {
        console.error("Attempted to get store, but database is not initialized.");
        throw new Error("Database not initialized");
    }
    try {
        const transaction = db.transaction(storeName, mode);
        // トランザクションのエラーハンドリング
        transaction.onerror = (event) => {
            console.error(`Transaction error on store "${storeName}":`, (event.target as IDBTransaction).error);
        };
        transaction.onabort = (event) => {
            console.warn(`Transaction aborted on store "${storeName}":`, (event.target as IDBTransaction).error);
        };
        return transaction.objectStore(storeName);
    } catch (e) {
        console.error(`Failed to start transaction on store "${storeName}":`, e);
        // DB接続が失われている可能性があるので再初期化を試みる (オプション)
        // initializeDB().catch(console.error);
        throw e; // エラーを再スロー
    }
}

// --- ドキュメント関連関数 ---
export async function addDocument(doc: Omit<DocumentType, 'id' | 'versions'>): Promise<string> {
    await initializeDB(); // 念のためDB接続を確認
    const id = uuidv4();
    const newDoc = { ...doc, id };
    const store = getStore(DOC_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(newDoc);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
    });
}

export async function getDocuments(): Promise<DocumentType[]> {
    await initializeDB();
    const store = getStore(DOC_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as DocumentType[]);
        request.onerror = () => reject(request.error);
    });
}

export async function getDocument(id: string): Promise<DocumentType | null> {
    await initializeDB();
    const store = getStore(DOC_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result as DocumentType | null);
        request.onerror = () => reject(request.error);
    });
}

export async function updateDocument(doc: DocumentType): Promise<void> {
    await initializeDB();
    const store = getStore(DOC_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(doc);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- バージョン関連関数 ---
export async function createVersion(documentId: string, content: string): Promise<string> {
    await initializeDB();
    const id = uuidv4();
    const newVersion: VersionType = {
        id,
        documentId,
        content,
        createdAt: new Date(),
    };
    const store = getStore(VERSION_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(newVersion);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
    });
}

export async function getVersions(documentId: string): Promise<VersionType[]> {
    await initializeDB();
    const store = getStore(VERSION_STORE, 'readonly');
    const index = store.index('documentId');
    return new Promise((resolve, reject) => {
        const request = index.getAll(documentId);
        request.onsuccess = () => {
            const sortedVersions = (request.result as VersionType[]).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() // Dateオブジェクトで比較
            );
            resolve(sortedVersions);
        };
        request.onerror = () => reject(request.error);
    });
}

// --- チャットメッセージ関連関数 ---

/**
 * チャットメッセージを IndexedDB に追加します。
 */
export async function addChatMessage(message: Omit<ChatMessageType, 'id'> & { documentId: string }): Promise<string> {
    await initializeDB(); // DB接続確認
    const id = uuidv4();
    const newMessage: ChatMessageType = { ...message, id, timestamp: new Date(message.timestamp) }; // timestamp を Date オブジェクトに
    const store = getStore(CHAT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(newMessage);
        request.onsuccess = () => resolve(id);
        request.onerror = (event) => {
            console.error("Failed to add chat message:", request.error);
            reject(request.error);
        };
    });
}

/**
 * 指定されたドキュメントIDのチャットメッセージを IndexedDB から取得します。
 * timestamp の昇順でソートして返します。
 */
export async function getChatMessages(documentId: string): Promise<ChatMessageType[]> {
    await initializeDB(); // DB接続確認
    const store = getStore(CHAT_STORE, 'readonly');
    // documentId と timestamp でインデックスを検索 (インデックス名を修正)
    const index = store.index('docId_ts');
    // 指定した documentId の範囲を指定
    // timestamp は Date オブジェクトで比較する必要がある
    const range = IDBKeyRange.bound([documentId, new Date(0)], [documentId, new Date(Date.now() + 1000)]); // 未来の時刻まで含める

    return new Promise((resolve, reject) => {
        const request = index.getAll(range);
        request.onsuccess = () => {
            // 結果はインデックスによりソートされているはずだが、念のためクライアントでもソート
            const sortedMessages = (request.result as ChatMessageType[]).sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            resolve(sortedMessages);
        };
        request.onerror = (event) => {
            console.error("Failed to get chat messages:", request.error);
            reject(request.error);
        };
    });
}

/**
 * 指定されたドキュメントIDのチャットメッセージをすべて IndexedDB から削除します。
 */
export async function clearChatMessages(documentId: string): Promise<void> {
    await initializeDB(); // DB接続確認
    const store = getStore(CHAT_STORE, 'readwrite');
    // documentId のみのインデックスを使用
    const index = store.index('documentId');
    const range = IDBKeyRange.only(documentId);

    return new Promise((resolve, reject) => {
        let deleteCount = 0;
        const cursorRequest = index.openCursor(range);
        cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                const deleteRequest = cursor.delete(); // 見つかったレコードを削除
                deleteRequest.onsuccess = () => {
                    deleteCount++;
                };
                deleteRequest.onerror = (e) => {
                     console.error("Error deleting record:", (e.target as IDBRequest).error);
                     // エラーが発生しても続行を試みる
                     cursor.continue();
                }
                cursor.continue(); // 次のレコードへ
            } else {
                console.log(`Cleared ${deleteCount} chat messages for document ${documentId}`);
                resolve(); // 削除完了
            }
        };
        cursorRequest.onerror = (event) => {
            console.error("Failed to open cursor for clearing chat messages:", cursorRequest.error);
            reject(cursorRequest.error);
        };
    });
}
