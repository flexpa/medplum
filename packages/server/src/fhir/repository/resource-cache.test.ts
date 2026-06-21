// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { WithId } from '@medplum/core';
import type { Login, Patient, Reference } from '@medplum/fhirtypes';
import { randomUUID } from 'node:crypto';
import { initAppServices, shutdownApp } from '../../app';
import { loadTestConfig } from '../../config/loader';
import * as redisModule from '../../redis';
import { getAuthRedis } from '../../redis';
import {
  deleteResourceCacheEntries,
  deleteResourceCacheEntry,
  getResourceCacheEntries,
  getResourceCacheEntry,
  getResourceCacheKey,
  setResourceCacheEntry,
} from './resource-cache';

jest.mock('hibp');

describe('Repository resource cache', () => {
  beforeAll(async () => {
    const config = await loadTestConfig();
    await initAppServices(config);
  });

  afterAll(async () => {
    await shutdownApp();
  });

  test('Returns resource cache key', () => {
    expect(getResourceCacheKey('Patient', '123')).toStrictEqual('Patient/123');
  });

  test('Sets, reads, and deletes resource cache entry', async () => {
    const patient = buildPatient();

    try {
      await setResourceCacheEntry(patient);

      const cacheEntry = await getResourceCacheEntry<Patient>('Patient', patient.id);
      expect(cacheEntry).toStrictEqual({
        resource: patient,
        projectId: patient.meta?.project,
      });
    } finally {
      await deleteResourceCacheEntry('Patient', patient.id);
    }

    await expect(getResourceCacheEntry<Patient>('Patient', patient.id)).resolves.toBeUndefined();
  });

  test('Bulk reads preserve reference order', async () => {
    const patient1 = buildPatient();
    const patient2 = buildPatient();
    const missingId = randomUUID();

    try {
      await setResourceCacheEntry(patient1);
      await setResourceCacheEntry(patient2);

      const references: Reference[] = [
        { reference: `Patient/${patient1.id}` },
        {},
        { reference: `Patient/${missingId}` },
        { reference: `Patient/${patient2.id}` },
      ];

      const cacheEntries = await getResourceCacheEntries(references);
      expect(cacheEntries).toStrictEqual([
        { resource: patient1, projectId: patient1.meta?.project },
        undefined,
        undefined,
        { resource: patient2, projectId: patient2.meta?.project },
      ]);
    } finally {
      await deleteResourceCacheEntries('Patient', [patient1.id, patient2.id, missingId]);
    }
  });

  test('Deletes resource cache entries', async () => {
    const patient1 = buildPatient();
    const patient2 = buildPatient();

    await setResourceCacheEntry(patient1);
    await setResourceCacheEntry(patient2);

    await deleteResourceCacheEntries('Patient', [patient1.id, patient2.id]);

    await expect(getResourceCacheEntry<Patient>('Patient', patient1.id)).resolves.toBeUndefined();
    await expect(getResourceCacheEntry<Patient>('Patient', patient2.id)).resolves.toBeUndefined();
  });

  test('Login cache entry round-trips via the auth Redis', async () => {
    const login = buildLogin();

    try {
      await setResourceCacheEntry(login);

      const direct = await getAuthRedis().get(getResourceCacheKey('Login', login.id));
      expect(direct).not.toBeNull();

      const cacheEntry = await getResourceCacheEntry<Login>('Login', login.id);
      expect(cacheEntry).toStrictEqual({ resource: login, projectId: login.meta?.project });
    } finally {
      await deleteResourceCacheEntry('Login', login.id);
    }

    await expect(getResourceCacheEntry<Login>('Login', login.id)).resolves.toBeUndefined();
  });

  test('Login is routed to auth Redis; other resources to cache Redis', async () => {
    const authSpy = jest.spyOn(redisModule, 'getAuthRedis');
    const cacheSpy = jest.spyOn(redisModule, 'getCacheRedis');
    const login = buildLogin();
    const patient = buildPatient();

    try {
      authSpy.mockClear();
      cacheSpy.mockClear();
      await setResourceCacheEntry(login);
      expect(authSpy).toHaveBeenCalled();
      expect(cacheSpy).not.toHaveBeenCalled();

      authSpy.mockClear();
      cacheSpy.mockClear();
      await setResourceCacheEntry(patient);
      expect(cacheSpy).toHaveBeenCalled();
      expect(authSpy).not.toHaveBeenCalled();

      authSpy.mockClear();
      cacheSpy.mockClear();
      await getResourceCacheEntry<Login>('Login', login.id);
      expect(authSpy).toHaveBeenCalled();
      expect(cacheSpy).not.toHaveBeenCalled();
    } finally {
      authSpy.mockRestore();
      cacheSpy.mockRestore();
      await deleteResourceCacheEntry('Login', login.id);
      await deleteResourceCacheEntry('Patient', patient.id);
    }
  });

  test('Bulk reads route mixed Login and Patient references to the correct instances', async () => {
    const patient = buildPatient();
    const login = buildLogin();
    const missingId = randomUUID();

    try {
      await setResourceCacheEntry(patient);
      await setResourceCacheEntry(login);

      const references: Reference[] = [
        { reference: `Login/${login.id}` },
        { reference: `Patient/${patient.id}` },
        { reference: `Login/${missingId}` },
      ];

      const cacheEntries = await getResourceCacheEntries(references);
      expect(cacheEntries).toStrictEqual([
        { resource: login, projectId: login.meta?.project },
        { resource: patient, projectId: patient.meta?.project },
        undefined,
      ]);
    } finally {
      await deleteResourceCacheEntry('Login', login.id);
      await deleteResourceCacheEntry('Patient', patient.id);
    }
  });

  test('Bulk reads partition across two distinct instances and reassemble in order', async () => {
    const login1 = `Login/${randomUUID()}`;
    const login2 = `Login/${randomUUID()}`;
    const patient1 = `Patient/${randomUUID()}`;
    const value = (key: string): string => JSON.stringify({ resource: { reference: key }, projectId: 'p' });

    const authStore: Record<string, string> = { [login1]: value(login1), [login2]: value(login2) };
    const cacheStore: Record<string, string> = { [patient1]: value(patient1) };
    const fakeAuth = { mget: jest.fn(async (keys: string[]) => keys.map((k) => authStore[k] ?? null)) };
    const fakeCache = { mget: jest.fn(async (keys: string[]) => keys.map((k) => cacheStore[k] ?? null)) };

    const authSpy = jest.spyOn(redisModule, 'getAuthRedis').mockReturnValue(fakeAuth as never);
    const cacheSpy = jest.spyOn(redisModule, 'getCacheRedis').mockReturnValue(fakeCache as never);

    try {
      const references: Reference[] = [
        { reference: patient1 },
        { reference: login1 },
        { reference: `Login/${randomUUID()}` },
        { reference: login2 },
      ];

      const entries = await getResourceCacheEntries(references);
      expect(entries[0]).toStrictEqual({ resource: { reference: patient1 }, projectId: 'p' });
      expect(entries[1]).toStrictEqual({ resource: { reference: login1 }, projectId: 'p' });
      expect(entries[2]).toBeUndefined();
      expect(entries[3]).toStrictEqual({ resource: { reference: login2 }, projectId: 'p' });

      expect(fakeAuth.mget).toHaveBeenCalledTimes(1);
      expect(fakeCache.mget).toHaveBeenCalledTimes(1);
      expect(fakeAuth.mget.mock.calls[0][0]).toStrictEqual([login1, references[2].reference, login2]);
      expect(fakeCache.mget.mock.calls[0][0]).toStrictEqual([patient1]);
    } finally {
      authSpy.mockRestore();
      cacheSpy.mockRestore();
    }
  });
});

function buildPatient(): WithId<Patient> {
  return {
    resourceType: 'Patient',
    id: randomUUID(),
    meta: {
      project: randomUUID(),
    },
  };
}

function buildLogin(): WithId<Login> {
  return {
    resourceType: 'Login',
    id: randomUUID(),
    authMethod: 'client',
    authTime: new Date().toISOString(),
    user: { reference: `ClientApplication/${randomUUID()}` },
    meta: {
      project: randomUUID(),
    },
  };
}
