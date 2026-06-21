// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import { stringify } from '@medplum/core';
import type { Reference, Resource } from '@medplum/fhirtypes';
import type { RedisWithoutDuplicate } from '../../redis';
import { getAuthRedis, getCacheRedis } from '../../redis';

const RESOURCE_CACHE_EX_SECONDS = 24 * 60 * 60; // 24 hours in seconds

export interface CacheEntry<T extends Resource = Resource> {
  resource: T;
  projectId: string;
}

/**
 * The resource type whose cache entries are isolated onto the dedicated auth Redis instance.
 *
 * `Login` resources are cache-only (never persisted to Postgres) and are read on the hot path by
 * `getLoginForAccessToken` for every authenticated request. Routing them to a dedicated,
 * `noeviction`-configured instance prevents the high-churn resource cache from evicting a
 * still-valid Login and producing a spurious 401 on a correctly-signed, unexpired token.
 */
const AUTH_REDIS_RESOURCE_TYPE = 'Login';

/**
 * Returns the Redis instance that owns cache entries for the given resource type.
 * `Login` is routed to the dedicated auth Redis; everything else uses the resource cache Redis.
 * @param resourceType - The FHIR resource type.
 * @returns The Redis instance for that resource type.
 */
function getRedisForResourceType(resourceType: string): RedisWithoutDuplicate {
  return resourceType === AUTH_REDIS_RESOURCE_TYPE ? getAuthRedis() : getCacheRedis();
}

/**
 * Returns the Redis instance that owns the cache entry for the given reference (e.g. `Login/123`).
 * Routes references prefixed `Login/` to the auth Redis; every other reference (including any
 * malformed one) uses the resource cache Redis. The trailing slash anchors the match so sibling
 * types such as `LoginAttempt/...` are not misrouted.
 * @param reference - A FHIR reference string of the form `ResourceType/id`.
 * @returns The Redis instance for that reference.
 */
function getRedisForReference(reference: string): RedisWithoutDuplicate {
  return reference.startsWith(`${AUTH_REDIS_RESOURCE_TYPE}/`) ? getAuthRedis() : getCacheRedis();
}

/**
 * Tries to read a cache entry from Redis by resource type and ID.
 * @param resourceType - The resource type.
 * @param id - The resource ID.
 * @returns The cache entry if found; otherwise, undefined.
 */
export async function getResourceCacheEntry<T extends Resource>(
  resourceType: string,
  id: string
): Promise<CacheEntry<WithId<T>> | undefined> {
  const cachedValue = await getRedisForResourceType(resourceType).get(getResourceCacheKey(resourceType, id));
  return cachedValue ? (JSON.parse(cachedValue) as CacheEntry<WithId<T>>) : undefined;
}

/**
 * Performs a bulk read of cache entries from Redis.
 * @param references - Array of FHIR references.
 * @returns Array of cache entries or undefined.
 */
export async function getResourceCacheEntries(references: Reference[]): Promise<(CacheEntry | undefined)[]> {
  const referenceKeys: string[] = [];

  // Build referenceKeys only for valid input references and track their indices in the original
  // array so that the result array is constructed in the correct order. In the same pass, partition
  // each key onto its owning Redis instance: `Login` keys live on the dedicated auth Redis while
  // everything else lives on the resource cache Redis. mget cannot mix instances; an unpartitioned
  // call would silently miss every Login key (cache miss), so this routing must mirror the
  // single-key path above. Partitioning here (rather than in a second loop over `referenceKeys`)
  // also avoids iterating a second time over a user-controlled-length collection.
  const referenceKeyIndices: (number | undefined)[] = new Array(references.length);
  const keyIndicesByRedis = new Map<RedisWithoutDuplicate, number[]>();
  for (let i = 0; i < references.length; i++) {
    const r = references[i];
    if (r.reference) {
      const keyIndex = referenceKeys.length;
      referenceKeys.push(r.reference);
      referenceKeyIndices[i] = keyIndex;
      const redis = getRedisForReference(r.reference);
      const indices = keyIndicesByRedis.get(redis);
      if (indices) {
        indices.push(keyIndex);
      } else {
        keyIndicesByRedis.set(redis, [keyIndex]);
      }
    }
  }

  if (referenceKeys.length === 0) {
    // Return early to avoid calling mget() with no args, which is an error
    return new Array(references.length);
  }

  // Query each instance only with the keys it owns, then scatter the values back into the
  // `referenceKeys`-indexed array.
  const cachedValues = new Array<string | null>(referenceKeys.length);
  await Promise.all(
    Array.from(keyIndicesByRedis.entries()).map(async ([redis, indices]) => {
      const values = await redis.mget(indices.map((keyIndex) => referenceKeys[keyIndex]));
      for (let j = 0; j < indices.length; j++) {
        cachedValues[indices[j]] = values[j];
      }
    })
  );

  const result = new Array<CacheEntry | undefined>(references.length);
  for (let i = 0; i < references.length; i++) {
    const referenceKeyIndex = referenceKeyIndices[i];
    if (referenceKeyIndex === undefined) {
      result[i] = undefined;
    } else {
      const cachedValue = cachedValues[referenceKeyIndex];
      result[i] = cachedValue ? (JSON.parse(cachedValue) as CacheEntry) : undefined;
    }
  }
  return result;
}

/**
 * Writes a cache entry to Redis.
 * @param resource - The resource to cache.
 */
export async function setResourceCacheEntry(resource: WithId<Resource>): Promise<void> {
  const projectId = resource.meta?.project;
  await getRedisForResourceType(resource.resourceType).set(
    getResourceCacheKey(resource.resourceType, resource.id),
    stringify({ resource, projectId }),
    'EX',
    RESOURCE_CACHE_EX_SECONDS
  );
}

/**
 * Deletes a cache entry from Redis.
 * @param resourceType - The resource type.
 * @param id - The resource ID.
 */
export async function deleteResourceCacheEntry(resourceType: string, id: string): Promise<void> {
  await getRedisForResourceType(resourceType).del(getResourceCacheKey(resourceType, id));
}

/**
 * Deletes cache entries from Redis.
 * @param resourceType - The resource type.
 * @param ids - The resource IDs.
 */
export async function deleteResourceCacheEntries(resourceType: string, ids: string[]): Promise<void> {
  const cacheKeys = ids.map((id) => {
    return getResourceCacheKey(resourceType, id);
  });

  await getRedisForResourceType(resourceType).del(cacheKeys);
}

/**
 * Returns the redis cache key for the given resource type and resource ID.
 * @param resourceType - The resource type.
 * @param id - The resource ID.
 * @returns The Redis cache key.
 */
export function getResourceCacheKey(resourceType: string, id: string): string {
  return `${resourceType}/${id}`;
}
