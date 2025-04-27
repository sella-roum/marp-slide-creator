import { v4 as uuidv4 } from "uuid"
import type { DocumentType, VersionType, TemplateType, ChatMessageType } from "./types"

// IndexedDB configuration
const DB_NAME = "MarpSlideCreatorDB"
const DB_VERSION = 1
const STORES = {
  DOCUMENTS: "documents",
  VERSIONS: "versions",
  TEMPLATES: "templates",
  CHAT_HISTORY: "chatHistory",
  SETTINGS: "settings",
}

// Default templates
const DEFAULT_TEMPLATES: TemplateType[] = [
  {
    id: "default-template-1",
    title: "Basic Presentation",
    content: `---
marp: true
theme: default
paginate: true
---

# My Presentation

---

## Slide 2

Content goes here

---

## Thank You

Contact: example@example.com`,
    createdAt: new Date(),
    isBuiltIn: true,
  },
  {
    id: "default-template-2",
    title: "Conference Talk",
    content: `---
marp: true
theme: gaia
paginate: true
header: "Conference Name 2023"
footer: "Speaker Name | @twitter_handle"
---

# Main Title

## Subtitle

Speaker Name
Date

---

# Agenda

1. Introduction
2. Main Content
3. Conclusion

---

# Thank You!

Questions?`,
    createdAt: new Date(),
    isBuiltIn: true,
  },
]

// Initialize the database
export const initializeDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("Your browser doesn't support IndexedDB"))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => {
      reject(new Error("Failed to open database"))
    }

    request.onsuccess = (event) => {
      resolve(true)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const transaction = request.transaction

      // Create object stores
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const documentStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: "id" })
        documentStore.createIndex("updatedAt", "updatedAt", { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.VERSIONS)) {
        const versionStore = db.createObjectStore(STORES.VERSIONS, { keyPath: "id" })
        versionStore.createIndex("documentId", "documentId", { unique: false })
        versionStore.createIndex("createdAt", "createdAt", { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
        const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: "id" })
        templateStore.createIndex("isBuiltIn", "isBuiltIn", { unique: false })

        // Add default templates using the existing transaction
        if (transaction) {
          const templateObjectStore = transaction.objectStore(STORES.TEMPLATES)
          DEFAULT_TEMPLATES.forEach((template) => {
            templateObjectStore.add(template)
          })
        }
      }

      if (!db.objectStoreNames.contains(STORES.CHAT_HISTORY)) {
        const chatStore = db.createObjectStore(STORES.CHAT_HISTORY, { keyPath: "id" })
        chatStore.createIndex("documentId", "documentId", { unique: false })
        chatStore.createIndex("timestamp", "timestamp", { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: "id" })
      }
    }
  })
}

// Get a database connection
const getDBConnection = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(new Error("Failed to open database"))
    request.onsuccess = () => resolve(request.result)
  })
}

// Document operations
export const createDocument = async (title: string, content = ""): Promise<DocumentType> => {
  const db = await getDBConnection()
  const document: DocumentType = {
    id: uuidv4(),
    title,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DOCUMENTS, "readwrite")
    const store = transaction.objectStore(STORES.DOCUMENTS)
    const request = store.add(document)

    request.onsuccess = () => resolve(document)
    request.onerror = () => reject(new Error("Failed to create document"))

    transaction.oncomplete = () => db.close()
  })
}

export const getDocuments = async (): Promise<DocumentType[]> => {
  const db = await getDBConnection()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DOCUMENTS, "readonly")
    const store = transaction.objectStore(STORES.DOCUMENTS)
    const index = store.index("updatedAt")
    const request = index.openCursor(null, "prev") // Sort by updatedAt descending

    const documents: DocumentType[] = []

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        documents.push(cursor.value)
        cursor.continue()
      } else {
        resolve(documents)
      }
    }

    request.onerror = () => reject(new Error("Failed to get documents"))

    transaction.oncomplete = () => db.close()
  })
}

export const getDocument = async (id: string): Promise<DocumentType | null> => {
  const db = await getDBConnection()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DOCUMENTS, "readonly")
    const store = transaction.objectStore(STORES.DOCUMENTS)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new Error("Failed to get document"))

    transaction.oncomplete = () => db.close()
  })
}

export const updateDocument = async (document: DocumentType): Promise<DocumentType> => {
  const db = await getDBConnection()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.DOCUMENTS, "readwrite")
    const store = transaction.objectStore(STORES.DOCUMENTS)
    const request = store.put({
      ...document,
      updatedAt: new Date(),
    })

    request.onsuccess = () => resolve(document)
    request.onerror = () => reject(new Error("Failed to update document"))

    transaction.oncomplete = () => db.close()
  })
}

export const deleteDocument = async (id: string): Promise<boolean> => {
  const db = await getDBConnection()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.DOCUMENTS, STORES.VERSIONS, STORES.CHAT_HISTORY], "readwrite")

    // Delete document
    const docStore = transaction.objectStore(STORES.DOCUMENTS)
    const docRequest = docStore.delete(id)

    // Delete associated versions
    const versionStore = transaction.objectStore(STORES.VERSIONS)
    const versionIndex = versionStore.index("documentId")
    const versionRequest = versionIndex.openCursor(IDBKeyRange.only(id))

    versionRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    // Delete associated chat history
    const chatStore = transaction.objectStore(STORES.CHAT_HISTORY)
    const chatIndex = chatStore.index("documentId")
    const chatRequest = chatIndex.openCursor(IDBKeyRange.only(id))

    chatRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    transaction.oncomplete = () => {
      db.close()
      resolve(true)
    }

    transaction.onerror = () => reject(new Error("Failed to delete document"))
  })
}

// Version operations
export const createVersion = async (
  documentId: string,
  content: string,
  description?: string,
): Promise<VersionType> => {
  const db = await getDBConnection()

  const version: VersionType = {
    id: uuidv4(),
    documentId,
    content,
    createdAt: new Date(),
    description,
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.VERSIONS, "readwrite")
    const store = transaction.objectStore(STORES.VERSIONS)
    const request = store.add(version)

    request.onsuccess = () => resolve(version)
    request.onerror = () => reject(new Error("Failed to create version"))

    transaction.oncomplete = () => db.close()
  })
}

export const getVersions = async (documentId: string): Promise<VersionType[]> => {
  const db = await getDBConnection()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.VERSIONS, "readonly")
    const store = transaction.objectStore(STORES.VERSIONS)
    const index = store.index("documentId")
    const request = index.openCursor(IDBKeyRange.only(documentId))

    const versions: VersionType[] = []

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        versions.push(cursor.value)
        cursor.continue()
      } else {
        // Sort by createdAt descending
        versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        resolve(versions)
      }
    }

    request.onerror = () => reject(new Error("Failed to get versions"))

    transaction.oncomplete = () => db.close()
  })
}

// Template operations
export const getTemplates = async (): Promise<TemplateType[]> => {
  const db = await getDBConnection()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TEMPLATES, "readonly")
    const store = transaction.objectStore(STORES.TEMPLATES)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error("Failed to get templates"))

    transaction.oncomplete = () => db.close()
  })
}

export const createTemplate = async (title: string, content: string): Promise<TemplateType> => {
  const db = await getDBConnection()

  const template: TemplateType = {
    id: uuidv4(),
    title,
    content,
    createdAt: new Date(),
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TEMPLATES, "readwrite")
    const store = transaction.objectStore(STORES.TEMPLATES)
    const request = store.add(template)

    request.onsuccess = () => resolve(template)
    request.onerror = () => reject(new Error("Failed to create template"))

    transaction.oncomplete = () => db.close()
  })
}

// Chat history operations
export const saveChatMessage = async (
  documentId: string,
  role: "user" | "assistant",
  content: string,
): Promise<ChatMessageType> => {
  const db = await getDBConnection()

  const message: ChatMessageType = {
    id: uuidv4(),
    documentId,
    role,
    content,
    timestamp: new Date(),
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CHAT_HISTORY, "readwrite")
    const store = transaction.objectStore(STORES.CHAT_HISTORY)
    const request = store.add(message)

    request.onsuccess = () => resolve(message)
    request.onerror = () => reject(new Error("Failed to save chat message"))

    transaction.oncomplete = () => db.close()
  })
}

export const getChatHistory = async (documentId: string): Promise<ChatMessageType[]> => {
  const db = await getDBConnection()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CHAT_HISTORY, "readonly")
    const store = transaction.objectStore(STORES.CHAT_HISTORY)
    const index = store.index("documentId")
    const request = index.openCursor(IDBKeyRange.only(documentId))

    const messages: ChatMessageType[] = []

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        messages.push(cursor.value)
        cursor.continue()
      } else {
        // Sort by timestamp ascending
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        resolve(messages)
      }
    }

    request.onerror = () => reject(new Error("Failed to get chat history"))

    transaction.oncomplete = () => db.close()
  })
}
