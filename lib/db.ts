import type { DocumentType, ChatMessageType, ImageType } from "./types";
import { v4 as uuidv4 } from "uuid";
// 定数をインポート
import { DB_NAME, DB_VERSION, DOC_STORE, CHAT_STORE, IMAGE_STORE } from "./constants";

let db: IDBDatabase | null = null;
let initializePromise: Promise<void> | null = null; // 初期化処理中のPromise

// --- DB初期化関数 (変更なし) ---
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
        // アップグレードエラー時もPromiseをリセットすべきか検討
        // initializePromise = null;
        reject(new Error("Upgrade transaction is null"));
        return;
      }

      console.log(`Upgrading from version ${event.oldVersion} to ${event.newVersion}`);

      // documents ストア作成 (変更なし)
      if (!currentDb.objectStoreNames.contains(DOC_STORE)) {
        currentDb.createObjectStore(DOC_STORE, { keyPath: "id" });
        console.log(`Object store "${DOC_STORE}" created.`);
      }
      // ★ ここで既存データのマイグレーションが必要な場合があるが、
      // ★ 今回は app/page.tsx での初期値設定で対応するため省略

      // chatMessages ストア作成 (変更なし)
      if (!currentDb.objectStoreNames.contains(CHAT_STORE)) {
        const chatStore = currentDb.createObjectStore(CHAT_STORE, { keyPath: "id" });
        if (!chatStore.indexNames.contains("docId_ts")) {
          chatStore.createIndex("docId_ts", ["documentId", "timestamp"], { unique: false });
          console.log(`Index "docId_ts" created for store "${CHAT_STORE}".`);
        }
        if (!chatStore.indexNames.contains("documentId")) {
          chatStore.createIndex("documentId", "documentId", { unique: false });
          console.log(`Index "documentId" created for store "${CHAT_STORE}".`);
        }
        console.log(`Object store "${CHAT_STORE}" created.`);
      }

      // images ストア作成 (変更なし)
      if (!currentDb.objectStoreNames.contains(IMAGE_STORE)) {
        const imageStore = currentDb.createObjectStore(IMAGE_STORE, { keyPath: "id" });
        if (!imageStore.indexNames.contains("createdAt")) {
          imageStore.createIndex("createdAt", "createdAt", { unique: false });
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
        // reject は request.onerror で処理される
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
  // DB接続チェックを強化
  if (!db) {
    // initializeDB が完了していないか、接続が失われた可能性
    console.error("Database is not initialized or connection lost.");
    // 呼び出し元でハンドリングできるようエラーを投げる
    throw new Error("Database is not initialized. Please ensure DbProvider is mounted and initialized.");
  }

  try {
    const transaction = db.transaction(storeName, mode);
    // エラーログは残すが、Promise の reject は各操作で行う
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
      db = null; // 接続をリセット
      initializePromise = null;
      // 呼び出し元でリトライするか、ユーザーに通知する必要がある
      throw new Error("Database connection lost or transaction inactive. Please try again or reload the page.");
    }
    throw e; // その他のエラーはそのまま投げる
  }
}

// --- ドキュメント関連関数 ---

export async function getDocument(id: string): Promise<DocumentType | null> {
  // DB接続チェックは getStore 内で行われる
  const store = getStore(DOC_STORE, "readonly");
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const doc = request.result;
      if (doc) {
        // ★ 取得したデータに新しいフィールドがない場合にデフォルト値を設定
        const documentData: DocumentType = {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
          selectedTheme: doc.selectedTheme || 'default', // デフォルト値 'default'
          customCss: doc.customCss || '', // デフォルト値 空文字列
        };
        resolve(documentData);
      } else {
        resolve(null);
      }
    };
    // エラーハンドリングを強化
    request.onerror = (event) => {
        console.error(`Failed to get document ${id}:`, request.error);
        reject(request.error ?? new Error(`Failed to get document ${id}`));
    };
  });
}

export async function updateDocument(doc: DocumentType): Promise<void> {
  // ★ 新しいフィールドも含めて更新
  const docToUpdate = {
    ...doc,
    createdAt: new Date(doc.createdAt), // Dateオブジェクトに変換
    updatedAt: new Date(), // 更新日時を現在時刻に
    // selectedTheme と customCss は doc に含まれている前提
  };
  const store = getStore(DOC_STORE, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.put(docToUpdate);
    request.onsuccess = () => resolve();
    // エラーハンドリングを強化
    request.onerror = (event) => {
        console.error(`Failed to update document ${doc.id}:`, request.error);
        reject(request.error ?? new Error(`Failed to update document ${doc.id}`));
    };
  });
}

// deleteDocumentAndRelatedData: (変更なし)
export async function deleteDocumentAndRelatedData(documentId: string): Promise<void> {
  // DB接続チェックは getStore を使う前に必要
  if (!db) {
      throw new Error("Database is not initialized. Please ensure DbProvider is mounted and initialized.");
  }

  return new Promise((resolve, reject) => {
    // トランザクション開始前に db が null でないことを保証
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
        // エラーが発生してもトランザクションは継続される可能性がある
    };

    const chatIndex = chatStore.index("documentId");
    const chatCursorReq = chatIndex.openKeyCursor(IDBKeyRange.only(documentId));

    chatCursorReq.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursor | null>).result;
      if (cursor) {
        const deleteRequest = chatStore.delete(cursor.primaryKey); // chatStore を使う
        deleteRequest.onsuccess = () => {
            chatDeleteCount++;
        };
        deleteRequest.onerror = (e) => {
          const error = (e.target as IDBRequest).error;
          console.error("Error deleting chat message:", error);
          if (!chatDeleteError) chatDeleteError = error; // 最初のエラーのみ記録
          // エラーが発生してもカーソルを進める（部分的な成功を許容）
        };
        cursor.continue();
      }
      // カーソルが終了しても、ここではまだトランザクション完了ではない
    };
    chatCursorReq.onerror = (event) => {
        console.error("Error opening chat cursor:", chatCursorReq.error);
        chatDeleteError = chatCursorReq.error;
        // カーソル取得エラーは致命的なのでトランザクションを中断させる
        if (transaction.abort) {
            try { transaction.abort(); } catch (abortError) { console.error("Error aborting transaction:", abortError); }
        }
        reject(chatCursorReq.error ?? new Error("Error opening chat cursor"));
    };

    transaction.oncomplete = () => {
      // 個別の操作でエラーがあったか確認
      if (docDeleteError || chatDeleteError) {
        console.warn(`Transaction completed, but errors occurred during deletion for document ${documentId}. Doc error: ${docDeleteError}, Chat error: ${chatDeleteError}`);
        // 部分的な成功として resolve するか、エラーとして reject するか選択
        // ここでは警告ログに留め、resolve する
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
      // onabort は onerror の後、または手動で abort() を呼んだ場合に発生
      console.error("Transaction aborted while deleting document:", transaction.error);
      // chatCursorReq.onerror で既に reject されている可能性があるので、ここでは reject しないか、
      // reject する場合は重複しないように注意が必要。
      // reject(transaction.error ?? new Error("Transaction aborted during deletion"));
    };
  });
}


// --- チャットメッセージ関連関数 (変更なし) ---
export async function addChatMessage(
  message: Omit<ChatMessageType, "id"> & { documentId: string }
): Promise<string> {
  const id = uuidv4();
  // timestamp が Date オブジェクトであることを確認
  const newMessage: ChatMessageType = { ...message, id, timestamp: new Date(message.timestamp) };
  const store = getStore(CHAT_STORE, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.add(newMessage);
    request.onsuccess = () => resolve(id);
    request.onerror = (event) => {
      console.error("Failed to add chat message:", request.error);
      reject(request.error ?? new Error("Failed to add chat message")); // reject を確実に行う
    };
  });
}

export async function getChatMessages(documentId: string): Promise<ChatMessageType[]> {
  const store = getStore(CHAT_STORE, "readonly");
  const index = store.index("docId_ts");
  // タイムスタンプの範囲をより安全に
  const lowerBound = new Date(0); // 最小日付
  const upperBound = new Date(Date.now() + 60000); // 現在時刻 + 1分 (未来のタイムスタンプを許容)
  const range = IDBKeyRange.bound([documentId, lowerBound], [documentId, upperBound]);
  return new Promise((resolve, reject) => {
    const request = index.getAll(range);
    request.onsuccess = () => {
      // 結果を Date オブジェクトに変換し、ソート
      const sortedMessages = (request.result as any[])
        .map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp), // Dateオブジェクトに変換
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      resolve(sortedMessages as ChatMessageType[]);
    };
    request.onerror = (event) => {
      console.error("Failed to get chat messages:", request.error);
      reject(request.error ?? new Error("Failed to get chat messages")); // reject を確実に行う
    };
  });
}

export async function clearChatMessages(documentId: string): Promise<void> {
  const store = getStore(CHAT_STORE, "readwrite");
  const index = store.index("documentId");
  const range = IDBKeyRange.only(documentId);
  return new Promise((resolve, reject) => {
    let deleteCount = 0;
    let firstError: DOMException | null = null; // 最初のエラーを記録

    const cursorRequest = index.openCursor(range);
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        const deleteRequest = cursor.delete();
        deleteRequest.onsuccess = () => {
          deleteCount++;
        };
        deleteRequest.onerror = (e) => {
          const error = (e.target as IDBRequest).error;
          console.error("Error deleting record:", error);
          if (!firstError) firstError = error; // 最初のエラーのみ記録
          // エラーが発生しても処理を続ける（部分的な成功を許容）
        };
        cursor.continue();
      } else {
        // カーソル完了
        if (firstError) {
          // 1つでもエラーがあれば reject するか、警告ログに留めるか
          console.warn(`Cleared ${deleteCount} chat messages for document ${documentId}, but encountered errors.`);
          // reject(firstError); // エラーとして扱う場合
          resolve(); // 部分成功として扱う場合
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
                // createdAt が Date オブジェクトであることを保証
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
                // createdAt が Date オブジェクトであることを保証
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
