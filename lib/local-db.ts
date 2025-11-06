// Local database utility using IndexedDB for reliable data persistence
interface User {
  id: string
  name: string
  email: string
}

interface DBSchema {
  users: (User & { password: string })[]
  currentUser: User | null
  workerKeys: any[]
  workers: Record<string, any[]>
  branches: Record<string, any>
  schedules: Record<string, any[]>
  settings: Record<string, any>
}

class LocalDatabase {
  private dbName = "smart-scheduler-db"
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains("data")) {
          db.createObjectStore("data", { keyPath: "key" })
        }
      }
    })
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["data"], "readwrite")
      const store = transaction.objectStore("data")
      const request = store.put({ key, value, timestamp: Date.now() })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async get(key: string): Promise<any> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["data"], "readonly")
      const store = transaction.objectStore("data")
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.value : null)
      }
    })
  }

  async remove(key: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["data"], "readwrite")
      const store = transaction.objectStore("data")
      const request = store.delete(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Fallback to localStorage if IndexedDB fails
  private fallbackSet(key: string, value: any): void {
    try {
      localStorage.setItem(`smart-scheduler-${key}`, JSON.stringify(value))
    } catch (error) {
      console.error("Fallback storage failed:", error)
    }
  }

  private fallbackGet(key: string): any {
    try {
      const item = localStorage.getItem(`smart-scheduler-${key}`)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error("Fallback retrieval failed:", error)
      return null
    }
  }

  async safeSet(key: string, value: any): Promise<void> {
    try {
      await this.set(key, value)
    } catch (error) {
      console.warn("IndexedDB failed, using localStorage fallback:", error)
      this.fallbackSet(key, value)
    }
  }

  async safeGet(key: string): Promise<any> {
    try {
      return await this.get(key)
    } catch (error) {
      console.warn("IndexedDB failed, using localStorage fallback:", error)
      return this.fallbackGet(key)
    }
  }
}

export const localDB = new LocalDatabase()
