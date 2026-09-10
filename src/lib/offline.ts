import type { SupabaseClient } from '@supabase/supabase-js'

export type OfflineScope = {
  userId: string
  organizationId: string
}

export type OfflineOperationStatus = 'pending' | 'in_flight' | 'succeeded' | 'failed' | 'conflict'
export type OfflineOperationKind = 'sale' | 'customer'

export type OfflineOperation = {
  operationId: string
  userId: string
  organizationId: string
  kind: OfflineOperationKind
  payload: Record<string, unknown>
  status: OfflineOperationStatus
  retries: number
  lastError?: string
  createdAt: string
  updatedAt: string
}

export type SaleDraft = {
  cart: { product_id: string; quantity: number }[]
  customer: string
}

type CacheKind = 'products' | 'customers' | 'recent-sales'
type CacheRecord = { id: string; scope: string; kind: CacheKind; value: unknown; updatedAt: string }
type DraftRecord = { id: string; scope: string; kind: 'sale'; value: SaleDraft; updatedAt: string }

const DB_NAME = 'zerobyte-offline'
const DB_VERSION = 1
const scopeId = (scope: OfflineScope) => `${scope.userId}:${scope.organizationId}`
const operationId = () => crypto.randomUUID()

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is unavailable'))
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Could not open offline storage'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('cache')) {
        const store = db.createObjectStore('cache', { keyPath: 'id' })
        store.createIndex('scope-kind', ['scope', 'kind'], { unique: false })
      }
      if (!db.objectStoreNames.contains('drafts')) {
        const store = db.createObjectStore('drafts', { keyPath: 'id' })
        store.createIndex('scope-kind', ['scope', 'kind'], { unique: true })
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'operationId' })
        store.createIndex('scope-status', ['scope', 'status'], { unique: false })
        store.createIndex('user', 'userId', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
  return dbPromise
}

async function transaction<T>(storeName: 'cache' | 'drafts' | 'syncQueue', mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest | void) {
  const db = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = action(tx.objectStore(storeName))
    if (request) {
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => reject(request.error ?? new Error('Offline storage operation failed'))
    } else {
      tx.oncomplete = () => resolve(undefined as T)
      tx.onerror = () => reject(tx.error ?? new Error('Offline storage operation failed'))
    }
  })
}

export async function readScopedCache<T>(scope: OfflineScope, kind: CacheKind): Promise<T[]> {
  try {
    const records = await transaction<CacheRecord[]>('cache', 'readonly', (store) => store.index('scope-kind').getAll([scopeId(scope), kind]))
    return records.map((record) => record.value as T)
  } catch {
    return []
  }
}

export async function writeScopedCache<T extends { id: string }>(scope: OfflineScope, kind: CacheKind, values: T[]) {
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite')
    const store = tx.objectStore('cache')
    const index = store.index('scope-kind')
    const cursorRequest = index.openCursor([scopeId(scope), kind])
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        values.forEach((value) => store.put({ id: `${scopeId(scope)}:${kind}:${value.id}`, scope: scopeId(scope), kind, value, updatedAt: new Date().toISOString() } satisfies CacheRecord))
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Could not write offline cache'))
    })
  } catch {
    // Caching is optional; the network path remains the source of truth.
  }
}

export async function saveSaleDraft(scope: OfflineScope, value: SaleDraft) {
  try {
    await transaction('drafts', 'readwrite', (store) => store.put({ id: `${scopeId(scope)}:sale`, scope: scopeId(scope), kind: 'sale', value, updatedAt: new Date().toISOString() } satisfies DraftRecord))
  } catch {
    // A browser without IndexedDB can still complete online sales.
  }
}

export async function readSaleDraft(scope: OfflineScope) {
  try {
    const record = await transaction<DraftRecord | undefined>('drafts', 'readonly', (store) => store.get(`${scopeId(scope)}:sale`))
    return record?.value
  } catch {
    return undefined
  }
}

export async function clearSaleDraft(scope: OfflineScope) {
  try {
    await transaction('drafts', 'readwrite', (store) => store.delete(`${scopeId(scope)}:sale`))
  } catch {
    // Best effort cleanup.
  }
}

export async function enqueueOfflineOperation(scope: OfflineScope, kind: OfflineOperationKind, payload: Record<string, unknown>, id = operationId()) {
  const now = new Date().toISOString()
  const operation: OfflineOperation = { operationId: id, userId: scope.userId, organizationId: scope.organizationId, kind, payload, status: 'pending', retries: 0, createdAt: now, updatedAt: now }
  await transaction('syncQueue', 'readwrite', (store) => store.put(operation))
  return operation
}

export async function readOfflineOperations(scope: OfflineScope) {
  try {
    const records = await transaction<OfflineOperation[]>('syncQueue', 'readonly', (store) => store.getAll())
    return records.filter((record) => record.userId === scope.userId && record.organizationId === scope.organizationId && record.status !== 'succeeded')
  } catch {
    return []
  }
}

async function updateOperation(operation: OfflineOperation) {
  await transaction('syncQueue', 'readwrite', (store) => store.put(operation))
}

export async function clearOfflineUserData(userId: string) {
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['cache', 'drafts', 'syncQueue'], 'readwrite')
      ;(['cache', 'drafts', 'syncQueue'] as const).forEach((name) => {
        const store = tx.objectStore(name)
        const index = name === 'syncQueue' ? store.index('user') : store
        const request = name === 'syncQueue' ? index.openCursor(userId) : store.openCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) return
          const value = cursor.value as { scope?: string; userId?: string }
          if (name === 'syncQueue' ? value.userId === userId : value.scope?.startsWith(`${userId}:`)) cursor.delete()
          cursor.continue()
        }
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Offline persistence is best-effort; a browser without IndexedDB should still run online.
  }
}

function isConflict(error: Error) {
  return /insufficient stock|does not belong|not authorized|select one|unsupported|must be|already exists/i.test(error.message)
}

export async function syncOfflineQueue(client: SupabaseClient, scope: OfflineScope) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { processed: 0, remaining: (await readOfflineOperations(scope)).length }
  const operations = (await readOfflineOperations(scope)).filter((operation) => operation.status !== 'conflict' && operation.retries < 5)
  let processed = 0
  for (const operation of operations) {
    const inFlight = { ...operation, status: 'in_flight' as const, updatedAt: new Date().toISOString() }
    await updateOperation(inFlight)
    try {
      if (operation.kind === 'sale') {
        const { error } = await client.rpc('create_sale_with_operation', { ...operation.payload, operation_id: operation.operationId })
        if (error) throw new Error(error.message)
      } else {
        const { data, error } = await client.rpc('create_customer_with_operation', { ...operation.payload, operation_id: operation.operationId })
        if (error) throw new Error(error.message)
        if (data) {
          const customers = await readScopedCache<Record<string, unknown> & { id: string }>(scope, 'customers')
          const pendingId = String(operation.payload.client_id ?? '')
          if (pendingId) await writeScopedCache(scope, 'customers', customers.map((customer) => customer.id === pendingId ? { ...customer, id: data, pending: false } : customer))
        }
      }
      await updateOperation({ ...inFlight, status: 'succeeded', updatedAt: new Date().toISOString() })
      processed += 1
    } catch (reason) {
      const error = reason instanceof Error ? reason : new Error('Could not sync operation')
      const conflict = isConflict(error)
      await updateOperation({ ...inFlight, status: conflict ? 'conflict' : inFlight.retries >= 4 ? 'failed' : 'pending', retries: inFlight.retries + 1, lastError: error.message, updatedAt: new Date().toISOString() })
      if (!conflict && inFlight.retries < 4) break
    }
  }
  return { processed, remaining: (await readOfflineOperations(scope)).length }
}

export function newOfflineOperationId() {
  return operationId()
}
