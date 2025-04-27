import type { DocumentType, ChatMessageType, ImageType } from './types';
import { v4 as uuidv4 } from 'uuid';
// 定数をインポート
import { DB_NAME, DB_VERSION, DOC_STORE, CHAT_STORE, IMAGE_STORE } from './constants';

let db: IDBDatabase | null = null;
let initializePromise: Promise<void> | null = null; // 初期化処理中のPromise

// --- DB初期化関数 (重複実行防止とContext連携のため修正) ---
export function initializeDB(): Promise<void> {
  // すでに初期化済みか初期化中なら既存のPromiseを返す
  if (db) {
    return Promise.resolve();
  }
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = new Promise((resolve, reject) => {
    console.log(`Opening database "${DB_NAME}" with version ${DB_VERSION}...`);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database open error:", request.error);
      initializePromise = null; // エラー時はPromiseをリセット
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = (event) => {
      db = request.result;
      console.log("Database initialized successfully via initializeDB");
      db.onclose = () => {
        console.warn("Database connection closed.");
        db = null;
        initializePromise = null; // クローズ時もリセット
      };
      db.onerror = (e) => {
        console.error("Database error after connection:", (e.target as IDBRequest).error);
        // エラーによってはリセットが必要な場合も
        // db = null;
        // initializePromise = null;
      };
      resolve(); // 初期化成功
    };

    request.onupgradeneeded = (event) => {
      console.log("Upgrading database...");
      const target = event.target as IDBOpenDBRequest | null;
      if (!target) return;
      const currentDb = target.result;
      const transaction = target.transaction;

      if (!transaction) {
          console.error("Upgrade transaction is null!");
          return;
      }

      console.log(`Upgrading from version ${event.oldVersion} to ${event.newVersion}`);

      // documents ストア作成
      if (!currentDb.objectStoreNames.contains(DOC_STORE)) {
        currentDb.createObjectStore(DOC_STORE, { keyPath: 'id' });
        console.log(`Object store "${DOC_STORE}" created.`);
      }

      // chatMessages ストア作成
      if (!currentDb.objectStoreNames.contains(CHAT_STORE)) {
        const chatStore = currentDb.createObjectStore(CHAT_STORE, { keyPath: 'id' });
        if (!chatStore.indexNames.contains('docId_ts')) {
            chatStore.createIndex('docId_ts', ['documentId', 'timestamp'], { unique: false });
            console.log(`Index "docId_ts" created for store "${CHAT_STORE}".`);
        }
        if (!chatStore.indexNames.contains('documentId')) {
            chatStore.createIndex('documentId', 'documentId', { unique: false });
            console.log(`Index "documentId" created for store "${CHAT_STORE}".`);
        }
        console.log(`Object store "${CHAT_STORE}" created.`);
      }

      // images ストア作成
      if (!currentDb.objectStoreNames.contains(IMAGE_STORE)) {
        const imageStore = currentDb.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
        if (!imageStore.indexNames.contains('createdAt')) {
            imageStore.createIndex('createdAt', 'createdAt', { unique: false });
            console.log(`Index "createdAt" created for store "${IMAGE_STORE}".`);
        }
        console.log(`Object store "${IMAGE_STORE}" created.`);
      }

      transaction.oncomplete = () => {
          console.log("Database upgrade transaction complete.");
      };
      transaction.onerror = (e) => {
          console.error("Database upgrade transaction error:", transaction.error);
          // アップグレードエラー時もPromiseをリセットすべきか検討
          // initializePromise = null;
      };
    };

    request.onblocked = () => {
        console.warn("Database upgrade blocked. Please close other tabs using this application.");
        initializePromise = null; // ブロック時もリセット
        reject(new Error("Database upgrade blocked"));
    };
  });

  return initializePromise;
}

// --- ヘルパー関数: トランザクション取得 (DB接続チェック強化) ---
function getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    // DB接続が確立していることを前提とする (initializeDBは事前に呼び出される想定)
    if (!db) {
        console.error("Attempted to get store, but database is not initialized or connection lost.");
        // ここでエラーを投げるか、再接続を試みるかはアプリケーションの要件による
        // 再接続を試みる場合:
        // throw new Error("Database connection lost. Please try again.");
        // または initializeDB().then(() => getStore(storeName, mode)).catch(...) のような処理
        throw new Error("Database not initialized or connection lost.");
    }
    try {
        const transaction = db.transaction(storeName, mode);
        transaction.onerror = (event) => console.error(`Transaction error on ${storeName}:`, (event.target as IDBTransaction).error);
        transaction.onabort = (event) => console.warn(`Transaction aborted on ${storeName}:`, (event.target as IDBTransaction).error);
        return transaction.objectStore(storeName);
    } catch (e) {
        console.error(`Failed to start transaction on ${storeName}:`, e);
        // DB接続が失われている可能性を考慮
        if (e instanceof DOMException && (e.name === 'InvalidStateError' || e.name === 'TransactionInactiveError')) {
            console.warn("Database connection might be closed or transaction inactive.");
            db = null; // 接続をリセット
            initializePromise = null;
            // 再度 initializeDB を呼ぶか、ユーザーにリロードを促す
            throw new Error("Database connection lost or transaction inactive. Please try again.");
        }
        throw e;
    }
}

// --- ドキュメント関連関数 (initializeDB呼び出し削除) ---

export async function getDocument(id: string): Promise<DocumentType | null> {
    // await initializeDB(); // 削除
    const store = getStore(DOC_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            const doc = request.result;
            if (doc) {
                const { versions, ...rest } = doc; // 古いデータ形式への互換性
                resolve({
                    ...rest,
                    createdAt: new Date(doc.createdAt),
                    updatedAt: new Date(doc.updatedAt),
                } as DocumentType);
            } else {
                resolve(null);
            }
        }
        request.onerror = () => reject(request.error);
    });
}

export async function updateDocument(doc: DocumentType): Promise<void> {
    // await initializeDB(); // 削除
    const docToUpdate = { ...doc, createdAt: new Date(doc.createdAt), updatedAt: new Date(doc.updatedAt) };
    const store = getStore(DOC_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(docToUpdate);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function deleteDocumentAndRelatedData(documentId: string): Promise<void> {
    // await initializeDB(); // 削除
    if (!db) throw new Error("Database not initialized"); // DB接続チェックは残す

    return new Promise((resolve, reject) => {
        const transaction = db!.transaction([DOC_STORE, CHAT_STORE], 'readwrite');
        const docStore = transaction.objectStore(DOC_STORE);
        const chatStore = transaction.objectStore(CHAT_STORE);

        const docDeleteReq = docStore.delete(documentId);
        docDeleteReq.onerror = () => console.error("Error deleting document:", docDeleteReq.error);

        const chatIndex = chatStore.index('documentId');
        const chatCursorReq = chatIndex.openKeyCursor(IDBKeyRange.only(documentId));
        chatCursorReq.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursor | null>).result;
            if (cursor) {
                chatStore.delete(cursor.primaryKey).onerror = (e) => console.error("Error deleting chat message:", (e.target as IDBRequest).error);
                cursor.continue();
            }
        };
        chatCursorReq.onerror = () => console.error("Error opening chat cursor:", chatCursorReq.error);

        transaction.oncomplete = () => {
            console.log(`Document ${documentId} and related chat data deleted successfully.`);
            resolve();
        };
        transaction.onerror = (event) => {
            console.error("Error deleting document and related chat data:", transaction.error);
            reject(transaction.error);
        };
        transaction.onabort = (event) => {
             console.error("Transaction aborted while deleting document:", transaction.error);
             reject(transaction.error ?? new Error("Transaction aborted"));
        }
    });
}


// --- チャットメッセージ関連関数 (initializeDB呼び出し削除) ---
export async function addChatMessage(message: Omit<ChatMessageType, 'id'> & { documentId: string }): Promise<string> {
    // await initializeDB(); // 削除
    const id = uuidv4();
    const newMessage: ChatMessageType = { ...message, id, timestamp: new Date(message.timestamp) };
    const store = getStore(CHAT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(newMessage);
        request.onsuccess = () => resolve(id);
        request.onerror = (event) => { console.error("Failed to add chat message:", request.error); reject(request.error); };
    });
}

export async function getChatMessages(documentId: string): Promise<ChatMessageType[]> {
    // await initializeDB(); // 削除
    const store = getStore(CHAT_STORE, 'readonly');
    const index = store.index('docId_ts');
    // タイムスタンプの範囲をより安全に
    const lowerBound = new Date(0);
    const upperBound = new Date(Date.now() + 60000); // 1分未来まで許容
    const range = IDBKeyRange.bound([documentId, lowerBound], [documentId, upperBound]);
    return new Promise((resolve, reject) => {
        const request = index.getAll(range);
        request.onsuccess = () => {
            const sortedMessages = (request.result as any[]).map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
            })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            resolve(sortedMessages as ChatMessageType[]);
        };
        request.onerror = (event) => { console.error("Failed to get chat messages:", request.error); reject(request.error); };
    });
}

export async function clearChatMessages(documentId: string): Promise<void> {
    // await initializeDB(); // 削除
    const store = getStore(CHAT_STORE, 'readwrite');
    const index = store.index('documentId');
    const range = IDBKeyRange.only(documentId);
    return new Promise((resolve, reject) => {
        let deleteCount = 0;
        const cursorRequest = index.openCursor(range);
        cursorRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                const deleteRequest = cursor.delete();
                deleteRequest.onsuccess = () => { deleteCount++; };
                deleteRequest.onerror = (e) => { console.error("Error deleting record:", (e.target as IDBRequest).error); /* エラーでもカーソルを進める */ cursor.continue(); }
                cursor.continue();
            } else {
                console.log(`Cleared ${deleteCount} chat messages for document ${documentId}`);
                resolve();
            }
        };
        cursorRequest.onerror = (event) => { console.error("Failed to open cursor for clearing chat messages:", cursorRequest.error); reject(cursorRequest.error); };
    });
}

// --- 画像関連関数 (initializeDB呼び出し削除) ---
export async function addImage(imageData: Omit<ImageType, 'id' | 'createdAt'>): Promise<string> {
    // await initializeDB(); // 削除
    const id = uuidv4();
    const newImage: ImageType = { ...imageData, id, createdAt: new Date() };
    const store = getStore(IMAGE_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(newImage);
        request.onsuccess = () => resolve(id);
        request.onerror = (event) => { console.error("Failed to add image:", request.error); reject(request.error); };
    });
}

export async function getImages(): Promise<ImageType[]> {
    // await initializeDB(); // 削除
    const store = getStore(IMAGE_STORE, 'readonly');
    const index = store.index('createdAt');
    return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // 最新のものから取得
        const images: ImageType[] = [];
        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                const img = cursor.value as any;
                images.push({ ...img, createdAt: new Date(img.createdAt) });
                cursor.continue();
            } else {
                resolve(images);
            }
        };
        request.onerror = (event) => { console.error("Failed to get images:", request.error); reject(request.error); };
    });
}

export async function getImage(id: string): Promise<ImageType | null> {
    // await initializeDB(); // 削除
    const store = getStore(IMAGE_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            const img = request.result;
            if (img) {
                resolve({ ...img, createdAt: new Date(img.createdAt) } as ImageType);
            } else {
                resolve(null);
            }
        };
        request.onerror = (event) => { console.error(`Failed to get image ${id}:`, request.error); reject(request.error); };
    });
}

export async function deleteImage(id: string): Promise<void> {
    // await initializeDB(); // 削除
    const store = getStore(IMAGE_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => { console.error(`Failed to delete image ${id}:`, request.error); reject(request.error); };
    });
}
