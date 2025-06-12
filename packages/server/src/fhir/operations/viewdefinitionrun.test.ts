import { allOk } from '@medplum/core';
import { FhirRequest, FhirResponse } from '@medplum/fhir-router';
import { Patient, ViewDefinition } from '@medplum/fhirtypes';
import { randomUUID } from 'crypto';
import express from 'express';
import { initApp, shutdownApp } from '../../app';
import { loadTestConfig } from '../../config/loader';
import { withTestContext } from '../../test.setup';
import { viewDefinitionRunHandler } from './viewdefinitionrun';

describe('ViewDefinition $run', () => {
  const app = express();

  beforeAll(async () => {
    const config = await loadTestConfig();
    await initApp(app, config);
  });

  afterAll(async () => {
    await shutdownApp();
  });

  test('Basic ViewDefinition execution', () =>
    withTestContext(async () => {
      // Create test patient
      const patient: Patient = {
        resourceType: 'Patient',
        id: randomUUID(),
        name: [{ family: 'TestFamily', given: ['TestGiven'] }],
        active: true,
      };

      // Create ViewDefinition
      const viewDefinition: ViewDefinition = {
        resource: 'Patient',
        status: 'active',
        select: [
          {
            column: [
              {
                name: 'id',
                path: 'id',
                type: 'id',
              },
              {
                name: 'family_name',
                path: 'name.family',
                type: 'string',
              },
              {
                name: 'given_name',
                path: 'name.given',
                type: 'string',
                collection: true,
              },
            ],
          },
        ],
      };

      // Create mock request
      const req: FhirRequest = {
        method: 'POST',
        url: '/fhir/R4/ViewDefinition/$run',
        pathname: '/fhir/R4/ViewDefinition/$run',
        params: {},
        query: {},
        body: viewDefinition,
        headers: {
          'content-type': 'application/json',
        },
      };

      // Execute the handler
      const response: FhirResponse = await viewDefinitionRunHandler(req);

      // Verify response
      expect(response).toHaveLength(2);
      expect(response[0]).toEqual(allOk);
      expect(Array.isArray(response[1])).toBe(true);

      // The response should be an array of rows
      const rows = response[1] as any[];
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThanOrEqual(0);
    }));

  test('ViewDefinition with query parameters', () =>
    withTestContext(async () => {
      const viewDefinition: ViewDefinition = {
        resource: 'Patient',
        status: 'active',
        select: [
          {
            column: [
              {
                name: 'id',
                path: 'id',
                type: 'id',
              },
            ],
          },
        ],
      };

      const req: FhirRequest = {
        method: 'POST',
        url: '/fhir/R4/ViewDefinition/$run?_count=10&active=true',
        pathname: '/fhir/R4/ViewDefinition/$run',
        params: {},
        query: {
          _count: '10',
          active: 'true',
        },
        body: viewDefinition,
        headers: {
          'content-type': 'application/json',
        },
      };

      const response: FhirResponse = await viewDefinitionRunHandler(req);

      expect(response).toHaveLength(2);
      expect(response[0]).toEqual(allOk);
      expect(Array.isArray(response[1])).toBe(true);
    }));

  test('Missing ViewDefinition in body returns error', () =>
    withTestContext(async () => {
      const req: FhirRequest = {
        method: 'POST',
        url: '/fhir/R4/ViewDefinition/$run',
        pathname: '/fhir/R4/ViewDefinition/$run',
        params: {},
        query: {},
        body: null,
        headers: {
          'content-type': 'application/json',
        },
      };

      const response: FhirResponse = await viewDefinitionRunHandler(req);

      expect(response).toHaveLength(1);
      expect(response[0].resourceType).toBe('OperationOutcome');
      expect(response[0].issue?.[0]?.details?.text).toBe('ViewDefinition must be provided in request body');
    }));
});