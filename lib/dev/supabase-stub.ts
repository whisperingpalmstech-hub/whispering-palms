/**
 * A Supabase-shaped client backed by the in-memory dev store.
 *
 * Implements the subset of the query builder this app actually uses - surveyed
 * from the codebase, not guessed:
 *
 *   .from().select().eq().neq().gt().gte().lt().lte().in().not().ilike().like()
 *          .order().limit().range().single().maybeSingle()
 *   .from().insert().update().upsert().delete()
 *   .auth.getUser() / .getSession() / .signInWithPassword() / .signUp()
 *          .signOut() / .resetPasswordForEmail() / .updateUser() / .resend()
 *   .storage.from().upload() / .getPublicUrl() / .remove() / .listBuckets()
 *
 * Anything not implemented returns a clear error rather than undefined, so a
 * gap shows up as a readable message instead of a confusing crash.
 *
 * Builders are thenable, matching supabase-js: `await supabase.from('x')
 * .select()` resolves without an explicit terminator.
 */

import { randomUUID } from 'crypto'
import {
  DEV_USER_ID,
  getDevAuthUser,
  getDevSession,
  getTable,
  setTable,
  type DevRow,
} from './store'

interface Result<T> {
  data: T
  error: { message: string; code?: string; details?: string } | null
  count?: number | null
  status?: number
}

type Filter = (row: DevRow) => boolean

function ok<T>(data: T, count?: number): Result<T> {
  return { data, error: null, count: count ?? null, status: 200 }
}

function err(message: string, code?: string): Result<null> {
  return { data: null, error: { message, code }, status: 400 }
}

/** Loose equality, because ids arrive as both strings and numbers. */
function looseEq(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  return String(a) === String(b)
}

class DevQueryBuilder implements PromiseLike<Result<unknown>> {
  private filters: Filter[] = []
  private selectedColumns = '*'
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitCount: number | null = null
  private rangeBounds: [number, number] | null = null
  private operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private payload: DevRow | DevRow[] | null = null
  private conflictColumns: string[] = []
  private wantsSingle: 'single' | 'maybeSingle' | null = null
  private returnsRows = true

  constructor(private tableName: string) {}

  // --- shaping -------------------------------------------------------------

  select(columns = '*') {
    // On insert/update/upsert this means "return the affected rows".
    if (this.operation === 'select') this.selectedColumns = columns
    this.returnsRows = true
    return this
  }

  // --- filters -------------------------------------------------------------

  eq(column: string, value: unknown) {
    this.filters.push((r) => looseEq(r[column], value))
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push((r) => !looseEq(r[column], value))
    return this
  }

  gt(column: string, value: never) {
    this.filters.push((r) => (r[column] as never) > value)
    return this
  }

  gte(column: string, value: never) {
    this.filters.push((r) => (r[column] as never) >= value)
    return this
  }

  lt(column: string, value: never) {
    this.filters.push((r) => (r[column] as never) < value)
    return this
  }

  lte(column: string, value: never) {
    this.filters.push((r) => (r[column] as never) <= value)
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push((r) => values.some((v) => looseEq(r[column], v)))
    return this
  }

  ilike(column: string, pattern: string) {
    const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`, 'i')
    this.filters.push((r) => regex.test(String(r[column] ?? '')))
    return this
  }

  like(column: string, pattern: string) {
    const regex = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`)
    this.filters.push((r) => regex.test(String(r[column] ?? '')))
    return this
  }

  /** Only `.not('col', 'is', null)` is used in this codebase. */
  not(column: string, operator: string, value: unknown) {
    if (operator === 'is' && value === null) {
      this.filters.push((r) => r[column] !== null && r[column] !== undefined)
    } else {
      this.filters.push((r) => !looseEq(r[column], value))
    }
    return this
  }

  is(column: string, value: unknown) {
    if (value === null) {
      this.filters.push((r) => r[column] === null || r[column] === undefined)
    } else {
      this.filters.push((r) => looseEq(r[column], value))
    }
    return this
  }

  // --- ordering ------------------------------------------------------------

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  range(from: number, to: number) {
    this.rangeBounds = [from, to]
    return this
  }

  // --- mutations -----------------------------------------------------------

  insert(values: DevRow | DevRow[]) {
    this.operation = 'insert'
    this.payload = values
    this.returnsRows = false
    return this
  }

  update(values: DevRow) {
    this.operation = 'update'
    this.payload = values
    this.returnsRows = false
    return this
  }

  upsert(values: DevRow | DevRow[], options?: { onConflict?: string }) {
    this.operation = 'upsert'
    this.payload = values
    this.conflictColumns = options?.onConflict?.split(',').map((c) => c.trim()) ?? ['id']
    this.returnsRows = false
    return this
  }

  delete() {
    this.operation = 'delete'
    this.returnsRows = false
    return this
  }

  // --- terminators ---------------------------------------------------------

  single() {
    this.wantsSingle = 'single'
    return this
  }

  maybeSingle() {
    this.wantsSingle = 'maybeSingle'
    return this
  }

  then<TResult1 = Result<unknown>, TResult2 = never>(
    onfulfilled?: ((value: Result<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private matching(rows: DevRow[]): DevRow[] {
    return rows.filter((row) => this.filters.every((f) => f(row)))
  }

  private execute(): Result<unknown> {
    const rows = getTable(this.tableName)

    switch (this.operation) {
      case 'insert': {
        const incoming = Array.isArray(this.payload) ? this.payload : [this.payload!]
        const created = incoming.map((row) => ({
          id: row.id ?? randomUUID(),
          created_at: row.created_at ?? new Date().toISOString(),
          ...row,
        }))
        setTable(this.tableName, [...rows, ...created])
        return this.shape(created)
      }

      case 'upsert': {
        const incoming = Array.isArray(this.payload) ? this.payload : [this.payload!]
        const next = [...rows]
        const touched: DevRow[] = []

        for (const row of incoming) {
          const index = next.findIndex((existing) =>
            this.conflictColumns.every((c) => looseEq(existing[c], row[c]))
          )

          if (index >= 0) {
            next[index] = { ...next[index], ...row }
            touched.push(next[index])
          } else {
            const created = {
              id: row.id ?? randomUUID(),
              created_at: row.created_at ?? new Date().toISOString(),
              ...row,
            }
            next.push(created)
            touched.push(created)
          }
        }

        setTable(this.tableName, next)
        return this.shape(touched)
      }

      case 'update': {
        const updated: DevRow[] = []
        const next = rows.map((row) => {
          if (!this.filters.every((f) => f(row))) return row
          const merged = { ...row, ...(this.payload as DevRow) }
          updated.push(merged)
          return merged
        })
        setTable(this.tableName, next)
        return this.shape(updated)
      }

      case 'delete': {
        const removed = this.matching(rows)
        setTable(
          this.tableName,
          rows.filter((row) => !this.filters.every((f) => f(row)))
        )
        return this.shape(removed)
      }

      case 'select':
      default: {
        let result = this.matching(rows)

        if (this.orderBy) {
          const { column, ascending } = this.orderBy
          result = [...result].sort((a, b) => {
            const av = a[column] as never
            const bv = b[column] as never
            if (av === bv) return 0
            return (av > bv ? 1 : -1) * (ascending ? 1 : -1)
          })
        }

        if (this.rangeBounds) {
          result = result.slice(this.rangeBounds[0], this.rangeBounds[1] + 1)
        }

        if (this.limitCount !== null) {
          result = result.slice(0, this.limitCount)
        }

        return this.shape(result)
      }
    }
  }

  /** Apply single/maybeSingle semantics, matching PostgREST behaviour. */
  private shape(rows: DevRow[]): Result<unknown> {
    if (this.wantsSingle === 'single') {
      if (rows.length === 0) {
        // PGRST116 is what supabase-js returns for "no rows"; call sites in this
        // app check for that code specifically.
        return { data: null, error: { message: 'No rows found', code: 'PGRST116' }, status: 406 }
      }
      return ok(rows[0])
    }

    if (this.wantsSingle === 'maybeSingle') {
      return ok(rows[0] ?? null)
    }

    return ok(rows, rows.length)
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const devAuth = {
  async getUser() {
    return { data: { user: getDevAuthUser() }, error: null }
  },

  async getSession() {
    return { data: { session: getDevSession() }, error: null }
  },

  async signInWithPassword(_credentials: { email: string; password: string }) {
    // Any credentials work - that is the point of the bypass.
    return { data: { user: getDevAuthUser(), session: getDevSession() }, error: null }
  },

  async signUp(_credentials: unknown) {
    return { data: { user: getDevAuthUser(), session: getDevSession() }, error: null }
  },

  async signOut() {
    // Nothing to clear: the dev user is always signed in.
    return { error: null }
  },

  async resetPasswordForEmail(_email: string, _options?: unknown) {
    console.log('[dev] Password reset requested - no email is sent in dev mode.')
    return { data: {}, error: null }
  },

  async updateUser(_attributes: unknown) {
    return { data: { user: getDevAuthUser() }, error: null }
  },

  async resend(_options: unknown) {
    console.log('[dev] Confirmation resend requested - no email is sent in dev mode.')
    return { data: {}, error: null }
  },

  async exchangeCodeForSession(_code: string) {
    return { data: { session: getDevSession(), user: getDevAuthUser() }, error: null }
  },

  async verifyOtp(_params: unknown) {
    return { data: { session: getDevSession(), user: getDevAuthUser() }, error: null }
  },

  onAuthStateChange(_callback: unknown) {
    return { data: { subscription: { unsubscribe() {} } } }
  },

  admin: {
    async deleteUser(_id: string) {
      return { data: null, error: null }
    },
    async listUsers() {
      return { data: { users: [getDevAuthUser()] }, error: null }
    },
  },
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/**
 * Uploaded files are kept as data URLs in memory. Enough for the palm-upload
 * flow to complete and display an image; nothing is written to disk.
 */
const uploads = new Map<string, string>()

function devStorageBucket(bucket: string) {
  return {
    async upload(path: string, file: Blob | Buffer | ArrayBuffer, _options?: unknown) {
      let dataUrl = ''
      try {
        const buffer =
          file instanceof Buffer
            ? file
            : Buffer.from(
                file instanceof ArrayBuffer ? file : await (file as Blob).arrayBuffer()
              )
        const type = (file as Blob)?.type || 'image/jpeg'
        dataUrl = `data:${type};base64,${buffer.toString('base64')}`
      } catch {
        dataUrl = ''
      }

      uploads.set(`${bucket}/${path}`, dataUrl)
      return { data: { path, id: randomUUID(), fullPath: `${bucket}/${path}` }, error: null }
    },

    getPublicUrl(path: string) {
      const stored = uploads.get(`${bucket}/${path}`)
      return {
        data: {
          // Falls back to a placeholder so the UI has something to render.
          publicUrl: stored || `/api/dev/placeholder?path=${encodeURIComponent(path)}`,
        },
      }
    },

    async remove(paths: string[]) {
      for (const path of paths) uploads.delete(`${bucket}/${path}`)
      return { data: paths.map((p) => ({ name: p })), error: null }
    },

    async createSignedUrl(path: string, _expiresIn: number) {
      const stored = uploads.get(`${bucket}/${path}`)
      return { data: { signedUrl: stored || `/api/dev/placeholder` }, error: null }
    },

    async list() {
      return {
        data: [...uploads.keys()]
          .filter((k) => k.startsWith(`${bucket}/`))
          .map((k) => ({ name: k.slice(bucket.length + 1) })),
        error: null,
      }
    },
  }
}

const devStorage = {
  from: devStorageBucket,
  async listBuckets() {
    return { data: [{ id: 'palm-images', name: 'palm-images', public: true }], error: null }
  },
  async createBucket() {
    return { data: null, error: null }
  },
}

// ---------------------------------------------------------------------------

/**
 * A stand-in for the Supabase client.
 *
 * Typed as `any` at the boundary: it implements the subset the app uses, not
 * the full SupabaseClient surface, and pretending otherwise in the type system
 * would mean maintaining a parallel set of generics for a dev-only tool.
 */
export function createDevSupabaseClient(): any {
  return {
    from: (table: string) => new DevQueryBuilder(table),
    auth: devAuth,
    storage: devStorage,
    rpc: async (name: string) => ({
      data: null,
      error: { message: `RPC "${name}" is not implemented in dev mode` },
    }),
  }
}

export { DEV_USER_ID }
