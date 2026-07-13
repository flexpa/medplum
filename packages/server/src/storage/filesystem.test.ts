// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { ContentType } from '@medplum/core';
import type { Binary } from '@medplum/fhirtypes';
import { Readable } from 'stream';
import { loadTestConfig } from '../config/loader';
import { streamToString } from '../test.setup';
import { getBinaryStorage, initBinaryStorage } from './loader';

describe('FileSystemStorage', () => {
  beforeAll(async () => {
    await loadTestConfig();
  });

  test('Undefined binary storage', () => {
    initBinaryStorage('binary');
    expect(() => getBinaryStorage()).toThrow();
  });

  test('File system storage', async () => {
    initBinaryStorage('file:binary');

    const storage = getBinaryStorage();
    expect(storage).toBeDefined();

    // Write a file
    const binary = {
      resourceType: 'Binary',
      id: '123',
      meta: {
        versionId: '456',
      },
    } as Binary;

    // Create a request
    const req = new Readable();
    req.push('foo');
    req.push(null);
    (req as any).headers = {};
    await storage.writeBinary(binary, 'test.txt', ContentType.TEXT, req);

    // Request the binary
    const stream = await storage.readBinary(binary);
    expect(stream).toBeDefined();

    // Verify that the file matches the expected contents
    const content = await streamToString(stream);
    expect(content).toStrictEqual('foo');
  });

  test('deleteBinary removes all versions', async () => {
    initBinaryStorage('file:binary');
    const storage = getBinaryStorage();

    // Write two versions of the same binary
    const v1 = { resourceType: 'Binary', id: 'del-1', meta: { versionId: 'v1' } } as Binary;
    const v2 = { resourceType: 'Binary', id: 'del-1', meta: { versionId: 'v2' } } as Binary;
    for (const binary of [v1, v2]) {
      const req = new Readable();
      req.push('foo');
      req.push(null);
      (req as any).headers = {};
      await storage.writeBinary(binary, 'test.txt', ContentType.TEXT, req);
    }
    await expect(storage.readBinary(v1)).resolves.toBeDefined();
    await expect(storage.readBinary(v2)).resolves.toBeDefined();

    // Deleting the binary removes every version
    await storage.deleteBinary(v1);
    await expect(storage.readBinary(v1)).rejects.toThrow('File not found');
    await expect(storage.readBinary(v2)).rejects.toThrow('File not found');

    // Deleting a binary with no stored objects is a no-op
    await expect(storage.deleteBinary({ resourceType: 'Binary', id: 'never-existed' } as Binary)).resolves.toBeUndefined();
  });

  test('Should throw an error when file is not found in readBinary()', async () => {
    initBinaryStorage('file:binary');

    const storage = getBinaryStorage();
    expect(storage).toBeDefined();

    // Create a binary resource that does not exist on the filesystem
    const binary = {
      resourceType: 'Binary',
      id: 'does-not-exist',
      meta: {
        versionId: 'does-not-exist',
      },
    } as Binary;

    await expect(storage.readBinary(binary)).rejects.toThrow('File not found');
  });
});
