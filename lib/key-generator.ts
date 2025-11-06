import { localDB } from "./local-db"

export class KeyGenerator {
  private static async getAllExistingKeys(): Promise<string[]> {
    try {
      const franchises = (await localDB.safeGet("franchises")) || []
      const workerKeys = (await localDB.safeGet("workerKeys")) || []

      const franchiseKeys = franchises.map((f: any) => f.key)
      const workerKeyStrings = workerKeys.map((w: any) => w.key)

      return [...franchiseKeys, ...workerKeyStrings]
    } catch (error) {
      console.error("Error getting existing keys:", error)
      return []
    }
  }

  private static generateKeyString(prefix: string, identifier: string): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    const uuid = crypto.randomUUID().substring(0, 8).toUpperCase()
    return `${prefix}-${identifier}-${timestamp}-${random}-${uuid}`
  }

  static async generateFranchiseKey(franchiseName: string): Promise<string> {
    const existingKeys = await this.getAllExistingKeys()
    let attempts = 0
    let key: string

    do {
      const identifier = franchiseName
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "X")
      key = this.generateKeyString("FR", identifier)
      attempts++

      if (attempts > 100) {
        throw new Error("Unable to generate unique franchise key after 100 attempts")
      }
    } while (existingKeys.includes(key))

    return key
  }

  static async generateWorkerKey(managerId: string): Promise<string> {
    const existingKeys = await this.getAllExistingKeys()
    let attempts = 0
    let key: string

    do {
      const identifier = managerId.substring(0, 8).toUpperCase() || "WORKER"
      key = this.generateKeyString("WK", identifier)
      attempts++

      if (attempts > 100) {
        throw new Error("Unable to generate unique worker key after 100 attempts")
      }
    } while (existingKeys.includes(key))

    return key
  }

  static async validateKeyUniqueness(key: string): Promise<boolean> {
    const existingKeys = await this.getAllExistingKeys()
    return !existingKeys.includes(key)
  }
}
