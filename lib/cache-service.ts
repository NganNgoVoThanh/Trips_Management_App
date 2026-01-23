// lib/cache-service.ts
// Simple in-memory caching service for frequently accessed data
// ✅ PERFORMANCE OPTIMIZATION: Reduce database queries

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL = 60000 // 1 minute default

  /**
   * Get value from cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    const now = Date.now()
    const age = now - entry.timestamp

    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp
      if (age > entry.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Clear entries by pattern (starts with)
   */
  clearPattern(pattern: string): void {
    const keysToDelete: string[] = []

    this.cache.forEach((_, key) => {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Get or set pattern - fetch from cache or execute function
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Not in cache, fetch and store
    const data = await fetchFn()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    let valid = 0

    this.cache.forEach((entry) => {
      const age = now - entry.timestamp
      if (age > entry.ttl) {
        expired++
      } else {
        valid++
      }
    })

    return {
      total: this.cache.size,
      valid,
      expired,
      hitRate: 0 // TODO: Track hits/misses
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService()

// Auto-cleanup expired entries every 5 minutes
if (typeof window === 'undefined') {
  // Only run on server
  setInterval(() => {
    cacheService.clearExpired()
  }, 5 * 60 * 1000)
}

// Cache key builders for common patterns
export const CacheKeys = {
  trips: (userId?: string, status?: string) =>
    `trips:${userId || 'all'}:${status || 'all'}`,

  trip: (id: string) =>
    `trip:${id}`,

  userRequests: (userId: string) =>
    `join-requests:${userId}`,

  optimizationGroups: (status?: string) =>
    `optimization-groups:${status || 'all'}`,

  stats: (type: string) =>
    `stats:${type}`,

  locationName: (locationId: string) =>
    `location:${locationId}:name`
}

// Invalidation helpers
export const invalidateCache = {
  trips: () => cacheService.clearPattern('trips:'),
  trip: (id: string) => cacheService.delete(CacheKeys.trip(id)),
  userRequests: (userId: string) => cacheService.delete(CacheKeys.userRequests(userId)),
  optimizationGroups: () => cacheService.clearPattern('optimization-groups:'),
  stats: () => cacheService.clearPattern('stats:'),
  all: () => cacheService.clear()
}
