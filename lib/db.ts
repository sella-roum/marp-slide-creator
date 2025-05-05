import type { DocumentType, ChatMessageType, ImageType } from "./types";
import { v4 as uuidv4 } from "uuid";
// 定数をインポート
import { DB_NAME, DB_VERSION, DOC_STORE, CHAT_STORE, IMAGE_STORE } from "./constants";

let db: IDBDatabase | null = null;
let initializePromise: Promise<void> | null = null; // 初期化処理中のPromise

// --- DB初期化関数 (onupgradeneeded のコメントを修正) ---
export function initializeDB(): Promise<void> {
  // すでに初期化済みか初期化中なら既存のPromiseを返す
  if (db) {
    return Promise.resolve();
  }
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = new Promise((resolve, reject) => {
    // ★ DBバージョンを上げる必要がある場合はここを変更 (例: 5)
    console.log(`Opening database "${DB_NAME}" with version ${DB_VERSION}...`);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database open error:", request.error);
      initializePromise = null; // エラー時はPromiseをリセット
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message ?? "Unknown error"}`));
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
        reject(new Error("Upgrade transaction is null"));
        return;
      }

      console.log(`Upgrading from version ${event.oldVersion} to ${event.newVersion}`);

      // documents ストア作成 (変更なし)
      if (!currentDb.objectStoreNames.contains(DOC_STORE)) {
        currentDb.createObjectStore(DOC_STORE, { keyPath: "id" });
        console.log(`Object store "${DOC_STORE}" created.`);
      }

      // chatMessages ストア作成/更新
      if (!currentDb.objectStoreNames.contains(CHAT_STORE)) {
        const chatStore = currentDb.createObjectStore(CHAT_STORE, { keyPath: "id" });
        chatStore.createIndex("docId_ts", ["documentId", "timestamp"], { unique: false });
        chatStore.createIndex("documentId", "documentId", { unique: false });
        console.log(`Object store "${CHAT_STORE}" created.`);
      } else {
        // 既存ストアの場合、新しいフィールドは put/add 時に自動追加される
        // 既存データのマイグレーションが必要な場合はここで行う
        // 例: 古い markdownCode を slideMarkdown/cssCode に移行するなど
        // 今回はマイグレーションは省略
        console.log(`Object store "${CHAT_STORE}" already exists. New fields (slideMarkdown, cssCode) will be added on update/add.`);
      }

      // images ストア作成 (変更なし)
      if (!currentDb.objectStoreNames.contains(IMAGE_STORE)) {
        const imageStore = currentDb.createObjectStore(IMAGE_STORE, { keyPath: "id" });
        imageStore.createIndex("createdAt", "createdAt", { unique: false });
        console.log(`Object store "${IMAGE_STORE}" created.`);
      }

      transaction.oncomplete = () => {
        console.log("Database upgrade transaction complete.");
      };
      transaction.onerror = (e) => {
        console.error("Database upgrade transaction error:", transaction.error);
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

// --- ヘルパー関数: トランザクション取得 (変更なし) ---
function getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
  if (!db) {
    console.error("Database is not initialized or connection lost.");
    throw new Error("Database is not initialized. Please ensure DbProvider is mounted and initialized.");
  }
  try {
    const transaction = db.transaction(storeName, mode);
    transaction.onerror = (event) =>
      console.error(`Transaction error on ${storeName}:`, (event.target as IDBTransaction).error);
    transaction.onabort = (event) =>
      console.warn(`Transaction aborted on ${storeName}:`, (event.target as IDBTransaction).error);
    return transaction.objectStore(storeName);
  } catch (e) {
    console.error(`Failed to start transaction on ${storeName}:`, e);
    if (
      e instanceof DOMException &&
      (e.name === "InvalidStateError" || e.name === "TransactionInactiveError")
    ) {
      console.warn("Database connection might be closed or transaction inactive. Resetting connection state.");
      db = null;
      initializePromise = null;
      throw new Error("Database connection lost or transaction inactive. Please try again or reload the page.");
    }
    throw e;
  }
}

// --- ドキュメント関連関数 (変更なし) ---
export async function getDocument(id: string): Promise<DocumentType | null> {
  const store = getStore(DOC_STORE, "readonly");
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const doc = request.result;
      if (doc) {
        const documentData: DocumentType = {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
          selectedTheme: doc.selectedTheme || 'default',
          customCss: doc.customCss || '',
        };
        resolve(documentData);
      } else {
        resolve(null);
      }
    };
    request.onerror = (event) => {
        console.error(`Failed to get document ${id}:`, request.error);
        reject(request.error ?? new Error(`Failed to get document ${id}`));
    };
  });
}

export async function updateDocument(doc: DocumentType): Promise<void> {
  const docToUpdate = {
    ...doc,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(),
  };
  const store = getStore(DOC_STORE, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.put(docToUpdate);
    request.onsuccess = () => resolve();
    request.onerror = (event) => {
        console.error(`Failed to update document ${doc.id}:`, request.error);
        reject(request.error ?? new Error(`Failed to update document ${doc.id}`));
    };
  });
}

export async function deleteDocumentAndRelatedData(documentId: string): Promise<void> {
  if (!db) {
      throw new Error("Database is not initialized. Please ensure DbProvider is mounted and initialized.");
  }
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([DOC_STORE, CHAT_STORE], "readwrite");
    const docStore = transaction.objectStore(DOC_STORE);
    const chatStore = transaction.objectStore(CHAT_STORE);
    let docDeleteError: DOMException | null = null;
    let chatDeleteError: DOMException | null = null;
    let chatDeleteCount = 0;
    const docDeleteReq = docStore.delete(documentId);
    docDeleteReq.onerror = (event) => {
        console.error("Error deleting document:", docDeleteReq.error);
        docDeleteError = docDeleteReq.error;
    };
    const chatIndex = chatStore.index("documentId");
    const chatCursorReq = chatIndex.openKeyCursor(IDBKeyRange.only(documentId));
    chatCursorReq.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursor | null>).result;
      if (cursor) {
        const deleteRequest = chatStore.delete(cursor.primaryKey);
        deleteRequest.onsuccess = () => { chatDeleteCount++; };
        deleteRequest.onerror = (e) => {
          const error = (e.target as IDBRequest).error;
          console.error("Error deleting chat message:", error);
          if (!chatDeleteError) chatDeleteError = error;
        };
        cursor.continue();
      }
    };
    chatCursorReq.onerror = (event) => {
        console.error("Error opening chat cursor:", chatCursorReq.error);
        chatDeleteError = chatCursorReq.error;
        if (transaction.abort) {
            try { transaction.abort(); } catch (abortError) { console.error("Error aborting transaction:", abortError); }
        }
        reject(chatCursorReq.error ?? new Error("Error opening chat cursor"));
    };
    transaction.oncomplete = () => {
      if (docDeleteError || chatDeleteError) {
        console.warn(`Transaction completed, but errors occurred during deletion for document ${documentId}. Doc error: ${docDeleteError}, Chat error: ${chatDeleteError}`);
        resolve();
      } else {
        console.log(`Document ${documentId} and ${chatDeleteCount} related chat messages deleted successfully.`);
        resolve();
      }
    };
    transaction.onerror = (event) => {
      console.error("Transaction error deleting document and related chat data:", transaction.error);
      reject(transaction.error ?? new Error("Transaction error during deletion"));
    };
    transaction.onabort = (event) => {
      console.error("Transaction aborted while deleting document:", transaction.error);
    };
  });
}

// --- ▼ チャットメッセージ関連関数 (修正) ▼ ---
export async function addChatMessage(
  message: Omit<ChatMessageType, "id"> & { documentId: string }
): Promise<string> {
  const id = uuidv4();
  // 新しいフィールドも含めて保存
  const newMessage: ChatMessageType = {
    id,
    documentId: message.documentId,
    role: message.role,
    content: message.content,
    timestamp: new Date(message.timestamp),
    slideMarkdown: message.slideMarkdown, // 追加
    cssCode: message.cssCode,           // 追加
  };
  const store = getStore(CHAT_STORE, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.add(newMessage);
    request.onsuccess = () => resolve(id);
    request.onerror = (event) => {
      console.error("Failed to add chat message:", request.error);
      reject(request.error ?? new Error("Failed to add chat message"));
    };
  });
}

export async function getChatMessages(documentId: string): Promise<ChatMessageType[]> {
  const store = getStore(CHAT_STORE, "readonly");
  const index = store.index("docId_ts");
  const lowerBound = new Date(0);
  const upperBound = new Date(Date.now() + 60000);
  const range = IDBKeyRange.bound([documentId, lowerBound], [documentId, upperBound]);
  return new Promise((resolve, reject) => {
    const request = index.getAll(range);
    request.onsuccess = () => {
      // 新しいフィールドも含まれるはず
      const sortedMessages = (request.result as any[])
        .map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      resolve(sortedMessages as ChatMessageType[]);
    };
    request.onerror = (event) => {
      console.error("Failed to get chat messages:", request.error);
      reject(request.error ?? new Error("Failed to get chat messages"));
    };
  });
}

export async function clearChatMessages(documentId: string): Promise<void> {
  const store = getStore(CHAT_STORE, "readwrite");
  const index = store.index("documentId");
  const range = IDBKeyRange.only(documentId);
  return new Promise((resolve, reject) => {
    let deleteCount = 0;
    let firstError: DOMException | null = null;
    const cursorRequest = index.openCursor(range);
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        const deleteRequest = cursor.delete();
        deleteRequest.onsuccess = () => { deleteCount++; };
        deleteRequest.onerror = (e) => {
          const error = (e.target as IDBRequest).error;
          console.error("Error deleting record:", error);
          if (!firstError) firstError = error;
        };
        cursor.continue();
      } else {
        if (firstError) {
          console.warn(`Cleared ${deleteCount} chat messages for document ${documentId}, but encountered errors.`);
          resolve();
        } else {
          console.log(`Cleared ${deleteCount} chat messages for document ${documentId}`);
          resolve();
        }
      }
    };
    cursorRequest.onerror = (event) => {
      console.error("Failed to open cursor for clearing chat messages:", cursorRequest.error);
      reject(cursorRequest.error ?? new Error("Failed to open cursor for clearing chat messages"));
    };
  });
}
// --- ▲ チャットメッセージ関連関数 (修正) ▲ ---

// --- 画像関連関数 (変更なし) ---
export async function addImage(imageData: Omit<ImageType, "id" | "createdAt">): Promise<string> {
    const id = uuidv4();
    const newImage: ImageType = { ...imageData, id, createdAt: new Date() };
    const store = getStore(IMAGE_STORE, "readwrite");
    return new Promise((resolve, reject) => {
        const request = store.add(newImage);
        request.onsuccess = () => resolve(id);
        request.onerror = (event) => {
            console.error("Failed to add image:", request.error);
            reject(request.error ?? new Error("Failed to add image"));
        };
    });
}

export async function getImages(): Promise<ImageType[]> {
    const store = getStore(IMAGE_STORE, "readonly");
    const index = store.index("createdAt");
    return new Promise((resolve, reject) => {
        const request = index.openCursor(null, "prev"); // 最新のものから取得
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
        request.onerror = (event) => {
            console.error("Failed to get images:", request.error);
            reject(request.error ?? new Error("Failed to get images"));
        };
    });
}

export async function getImage(id: string): Promise<ImageType | null> {
    const store = getStore(IMAGE_STORE, "readonly");
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
        request.onerror = (event) => {
            console.error(`Failed to get image ${id}:`, request.error);
            reject(request.error ?? new Error(`Failed to get image ${id}`));
        };
    });
}

export async function deleteImage(id: string): Promise<void> {
    const store = getStore(IMAGE_STORE, "readwrite");
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error(`Failed to delete image ${id}:`, request.error);
            reject(request.error ?? new Error(`Failed to delete image ${id}`));
        };
    });
}
