import type { DocumentType, ChatMessageType, ImageType } from "./types";
import { v4 as uuidv4 } from "uuid";
import { DB_NAME, DB_VERSION, DOC_STORE, CHAT_STORE, IMAGE_STORE } from "./constants";

let db: IDBDatabase | null = null;
let initializePromise: Promise<void> | null = null;
export function initializeDB(): Promise<void> {
  if (db) {
    return Promise.resolve();
  }
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = new Promise((resolve, reject) => {
    console.log(`[DB Init] Opening database "${DB_NAME}" with version ${DB_VERSION}...`);
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      console.error("[DB Init Error] Database open error:", error);
      initializePromise = null;
      reject(new Error(`[DB Init] Failed to open IndexedDB: ${error?.message}`));
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.log("[DB Init] Database initialized successfully.");
      db.onclose = () => {
        console.warn("[DB Connection] Database connection closed.");
        db = null;
        initializePromise = null;
      };
      db.onerror = (e) => {
        console.error(
          "[DB Error] Database error after connection:",
          (e.target as IDBRequest).error
        );
      };
      resolve();
    };

    request.onupgradeneeded = (event) => {
      console.log("[DB Upgrade] Upgrading database...");
      const target = event.target as IDBOpenDBRequest | null;
      if (!target) return;
      const currentDb = target.result;
      const transaction = target.transaction;

      if (!transaction) {
        console.error("[DB Upgrade Error] Upgrade transaction is null!");
        initializePromise = null;
        reject(new Error("[DB Upgrade] Transaction is null during upgrade."));
        return;
      }

      console.log(`[DB Upgrade] Upgrading from version ${event.oldVersion} to ${event.newVersion}`);

      try {
        if (!currentDb.objectStoreNames.contains(DOC_STORE)) {
          currentDb.createObjectStore(DOC_STORE, { keyPath: "id" });
          console.log(`[DB Upgrade] Object store "${DOC_STORE}" created.`);
        }

        if (!currentDb.objectStoreNames.contains(CHAT_STORE)) {
          const chatStore = currentDb.createObjectStore(CHAT_STORE, { keyPath: "id" });
          if (!chatStore.indexNames.contains("docId_ts")) {
            chatStore.createIndex("docId_ts", ["documentId", "timestamp"], { unique: false });
            console.log(`[DB Upgrade] Index "docId_ts" created for store "${CHAT_STORE}".`);
          }
          if (!chatStore.indexNames.contains("documentId")) {
            chatStore.createIndex("documentId", "documentId", { unique: false });
            console.log(`[DB Upgrade] Index "documentId" created for store "${CHAT_STORE}".`);
          }
          console.log(`[DB Upgrade] Object store "${CHAT_STORE}" created.`);
        }

        if (!currentDb.objectStoreNames.contains(IMAGE_STORE)) {
          const imageStore = currentDb.createObjectStore(IMAGE_STORE, { keyPath: "id" });
          if (!imageStore.indexNames.contains("createdAt")) {
            imageStore.createIndex("createdAt", "createdAt", { unique: false });
            console.log(`[DB Upgrade] Index "createdAt" created for store "${IMAGE_STORE}".`);
          }
          console.log(`[DB Upgrade] Object store "${IMAGE_STORE}" created.`);
        }
      } catch (upgradeError) {
        console.error("[DB Upgrade Error] Error during object store/index creation:", upgradeError);
        transaction.abort();
        initializePromise = null;
        reject(
          new Error(
            `[DB Upgrade] Failed during schema upgrade: ${upgradeError instanceof Error ? upgradeError.message : String(upgradeError)}`
          )
        );
        return;
      }

      transaction.oncomplete = () => {
        console.log("[DB Upgrade] Database upgrade transaction complete.");
      };
      transaction.onerror = (e) => {
        const error = (e.target as IDBTransaction).error;
        console.error("[DB Upgrade Error] Database upgrade transaction error:", error);
        initializePromise = null;
        reject(new Error(`[DB Upgrade] Transaction error: ${error?.message}`));
      };
      transaction.onabort = (e) => {
        const error = (e.target as IDBTransaction).error;
        console.error("[DB Upgrade Abort] Database upgrade transaction aborted:", error);
        initializePromise = null;
      };
    };

    request.onblocked = () => {
      console.warn(
        "[DB Blocked] Database upgrade blocked. Please close other tabs using this application."
      );
      initializePromise = null;
      reject(new Error("[DB Blocked] Database upgrade blocked"));
    };
  });

  return initializePromise;
}

function getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
  if (!db) {
    console.error(
      `[DB Error: getStore] Attempted to access store "${storeName}", but database is not initialized or connection lost.`
    );
    throw new Error("Database connection is not available. Please reload the application.");
  }
  try {
    const transaction = db.transaction(storeName, mode);
    transaction.onerror = (event) => {
      const error = (event.target as IDBTransaction).error;
      console.error(`[Transaction Error: ${storeName}] Mode: ${mode}, Error:`, error);
    };
    transaction.onabort = (event) => {
      const error = (event.target as IDBTransaction).error;
      console.warn(`[Transaction Abort: ${storeName}] Mode: ${mode}, Reason:`, error);
    };
    return transaction.objectStore(storeName);
  } catch (e) {
    console.error(
      `[DB Error: getStore] Failed to start transaction on "${storeName}" with mode "${mode}":`,
      e
    );
    if (
      e instanceof DOMException &&
      (e.name === "InvalidStateError" ||
        e.name === "TransactionInactiveError" ||
        e.name === "NotFoundError")
    ) {
      console.warn(
        "[DB Warning: getStore] Database connection might be closed, transaction inactive, or store not found."
      );
      db = null;
      initializePromise = null;
      throw new Error(
        "Database connection lost or transaction inactive. Please reload the application."
      );
    }
    throw e;
  }
}

export async function getDocument(id: string): Promise<DocumentType | null> {
  const store = getStore(DOC_STORE, "readonly");
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const doc = request.result;
      if (doc) {
        const { versions, ...rest } = doc;
        resolve({
          ...rest,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
        } as DocumentType);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => {
      console.error(
        `[DB Error: getDocument] Failed to get document with id "${id}":`,
        request.error
      );
      reject(new Error(`Failed to get document: ${request.error?.message}`));
    };
  });
}

export async function updateDocument(doc: DocumentType): Promise<void> {
  const docToUpdate = {
    ...doc,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
  };
  const store = getStore(DOC_STORE, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.put(docToUpdate);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error(
        `[DB Error: updateDocument] Failed to update document with id "${doc.id}":`,
        request.error
      );
      reject(new Error(`Failed to update document: ${request.error?.message}`));
    };
  });
}

export async function deleteDocumentAndRelatedData(documentId: string): Promise<void> {
  if (!db) throw new Error("[DB Error: deleteDocumentAndRelatedData] Database not initialized");

  return new Promise((resolve, reject) => {
    console.log(
      `[DB Operation] Starting transaction to delete document "${documentId}" and related data.`
    );
    const transaction = db!.transaction([DOC_STORE, CHAT_STORE], "readwrite");
    const docStore = transaction.objectStore(DOC_STORE);
    const chatStore = transaction.objectStore(CHAT_STORE);
    let docDeleted = false;
    let chatDeleteErrors = 0;
    let chatDeletedCount = 0;

    const docDeleteReq = docStore.delete(documentId);
    docDeleteReq.onsuccess = () => {
      docDeleted = true;
      console.log(`[DB Operation] Document "${documentId}" delete request successful.`);
    };
    docDeleteReq.onerror = () => {
      console.error(
        `[DB Error: deleteDocumentAndRelatedData] Error deleting document "${documentId}":`,
        docDeleteReq.error
      );
      transaction.abort();
      reject(new Error(`Failed to delete document: ${docDeleteReq.error?.message}`));
    };

    const chatIndex = chatStore.index("documentId");
    const chatCursorReq = chatIndex.openKeyCursor(IDBKeyRange.only(documentId));

    chatCursorReq.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursor | null>).result;
      if (cursor) {
        const chatDeleteReq = chatStore.delete(cursor.primaryKey);
        chatDeleteReq.onsuccess = () => {
          chatDeletedCount++;
        };
        chatDeleteReq.onerror = (e) => {
          chatDeleteErrors++;
          console.error(
            `[DB Error: deleteDocumentAndRelatedData] Error deleting chat message with key ${cursor.primaryKey}:`,
            (e.target as IDBRequest).error
          );
        };
        cursor.continue();
      } else {
        console.log(
          `[DB Operation] Chat message cursor finished for document "${documentId}". ${chatDeletedCount} deleted, ${chatDeleteErrors} errors.`
        );
      }
    };
    chatCursorReq.onerror = () => {
      console.error(
        `[DB Error: deleteDocumentAndRelatedData] Error opening chat cursor for document "${documentId}":`,
        chatCursorReq.error
      );
      transaction.abort();
      reject(new Error(`Failed to open chat cursor: ${chatCursorReq.error?.message}`));
    };

    transaction.oncomplete = () => {
      if (docDeleted) {
        console.log(
          `[DB Operation] Transaction complete for deleting document "${documentId}". ${chatDeletedCount} chat messages deleted.`
        );
        resolve();
      } else {
        console.error(
          `[DB Error: deleteDocumentAndRelatedData] Transaction completed but document "${documentId}" was not marked as deleted.`
        );
        reject(new Error("Document deletion failed within transaction."));
      }
    };
    transaction.onerror = (event) => {
      const error = (event.target as IDBTransaction).error;
      console.error(
        `[Transaction Error: deleteDocumentAndRelatedData] Error deleting document "${documentId}" and related data:`,
        error
      );
      reject(new Error(`Transaction failed during deletion: ${error?.message}`));
    };
    transaction.onabort = (event) => {
      const error = (event.target as IDBTransaction).error;
      console.error(
        `[Transaction Abort: deleteDocumentAndRelatedData] Transaction aborted while deleting document "${documentId}":`,
        error
      );
      reject(error ?? new Error("Transaction aborted during deletion."));
    };
  });
}

export async function addChatMessage(
  message: Omit<ChatMessageType, "id"> & { documentId: string }
): Promise<string> {
  const id = uuidv4();
  const newMessage: ChatMessageType = { ...message, id, timestamp: new Date(message.timestamp) };
  const store = getStore(CHAT_STORE, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.add(newMessage);
    request.onsuccess = () => resolve(id);
    request.onerror = (event) => {
      console.error(
        `[DB Error: addChatMessage] Failed to add chat message for doc "${message.documentId}":`,
        request.error
      );
      reject(new Error(`Failed to add chat message: ${request.error?.message}`));
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
      try {
        const sortedMessages = (request.result as any[])
          .map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        resolve(sortedMessages as ChatMessageType[]);
      } catch (mapError) {
        console.error(
          `[DB Error: getChatMessages] Error processing chat messages for doc "${documentId}":`,
          mapError
        );
        reject(
          new Error(
            `Failed to process chat messages: ${mapError instanceof Error ? mapError.message : String(mapError)}`
          )
        );
      }
    };
    request.onerror = (event) => {
      console.error(
        `[DB Error: getChatMessages] Failed to get chat messages for doc "${documentId}":`,
        request.error
      );
      reject(new Error(`Failed to get chat messages: ${request.error?.message}`));
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
        deleteRequest.onsuccess = () => {
          deleteCount++;
        };
        deleteRequest.onerror = (e) => {
          const error = (e.target as IDBRequest).error;
          if (!firstError) firstError = error;
          console.error(
            `[DB Error: clearChatMessages] Error deleting record with key ${cursor.primaryKey}:`,
            error
          );
        };
        cursor.continue();
      } else {
        console.log(
          `[DB Operation] Cleared ${deleteCount} chat messages for document ${documentId}.`
        );
        if (firstError) {
          reject(new Error(`Failed to delete some chat messages: ${firstError.message}`));
        } else {
          resolve();
        }
      }
    };
    cursorRequest.onerror = (event) => {
      console.error(
        `[DB Error: clearChatMessages] Failed to open cursor for clearing chat messages for doc "${documentId}":`,
        cursorRequest.error
      );
      reject(new Error(`Failed to open chat cursor: ${cursorRequest.error?.message}`));
    };
  });
}

export async function addImage(imageData: Omit<ImageType, "id" | "createdAt">): Promise<string> {
  const id = uuidv4();
  const newImage: ImageType = { ...imageData, id, createdAt: new Date() };
  const store = getStore(IMAGE_STORE, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.add(newImage);
    request.onsuccess = () => resolve(id);
    request.onerror = (event) => {
      console.error(`[DB Error: addImage] Failed to add image "${imageData.name}":`, request.error);
      reject(new Error(`Failed to add image: ${request.error?.message}`));
    };
  });
}

export async function getImages(): Promise<ImageType[]> {
  const store = getStore(IMAGE_STORE, "readonly");
  const index = store.index("createdAt");
  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, "prev");
    const images: ImageType[] = [];
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        try {
          const img = cursor.value as any;
          images.push({ ...img, createdAt: new Date(img.createdAt) });
          cursor.continue();
        } catch (mapError) {
          console.error(
            `[DB Error: getImages] Error processing image data with key ${cursor.primaryKey}:`,
            mapError
          );
          cursor.continue();
        }
      } else {
        resolve(images);
      }
    };
    request.onerror = (event) => {
      console.error("[DB Error: getImages] Failed to get images:", request.error);
      reject(new Error(`Failed to get images: ${request.error?.message}`));
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
        try {
          resolve({ ...img, createdAt: new Date(img.createdAt) } as ImageType);
        } catch (mapError) {
          console.error(
            `[DB Error: getImage] Error processing image data for id "${id}":`,
            mapError
          );
          reject(
            new Error(
              `Failed to process image data: ${mapError instanceof Error ? mapError.message : String(mapError)}`
            )
          );
        }
      } else {
        resolve(null);
      }
    };
    request.onerror = (event) => {
      console.error(`[DB Error: getImage] Failed to get image with id "${id}":`, request.error);
      reject(new Error(`Failed to get image: ${request.error?.message}`));
    };
  });
}

export async function deleteImage(id: string): Promise<void> {
  const store = getStore(IMAGE_STORE, "readwrite");
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error(
        `[DB Error: deleteImage] Failed to delete image with id "${id}":`,
        request.error
      );
      reject(new Error(`Failed to delete image: ${request.error?.message}`));
    };
  });
}
