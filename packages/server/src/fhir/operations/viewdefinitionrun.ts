import { allOk, badRequest, evalSqlOnFhir, Operator, parseSearchRequest } from '@medplum/core';
import { FhirRequest, FhirResponse } from '@medplum/fhir-router';
import { Resource, ViewDefinition } from '@medplum/fhirtypes';
import { getAuthenticatedContext } from '../../context';

type ViewDefinitionRunParameters = {
  patient?: string;
  group?: string;
  source?: string;
  _count?: number;
  _page?: number;
};

/**
 * Handles ViewDefinition $run operation.
 *
 * Endpoint: POST /ViewDefinition/$run
 * 
 * See: https://sql-on-fhir.org/ig/latest/api.html#run-bulk-queries
 * @param req - The FHIR request with ViewDefinition in body.
 * @returns The FHIR response.
 */
export async function viewDefinitionRunHandler(req: FhirRequest): Promise<FhirResponse> {
  const ctx = getAuthenticatedContext();
  
  // ViewDefinition must be passed in request body
  if (!req.body) {
    return [badRequest('ViewDefinition must be provided in request body')];
  }
  
  const viewDefinition = req.body as ViewDefinition;

  // Parse query parameters
  const params: ViewDefinitionRunParameters = {
    patient: req.query.patient as string,
    group: req.query.group as string,  
    source: req.query.source as string,
    _count: req.query._count ? parseInt(req.query._count as string, 10) : undefined,
    _page: req.query._page ? parseInt(req.query._page as string, 10) : undefined,
  };

  // Build search request for the base resource type
  const searchRequest = parseSearchRequest(`${viewDefinition.resource}?`);
  
  // Add filtering based on parameters
  if (params.patient) {
    // Filter resources related to specific patient (use _id for Patient resources)
    if (!searchRequest.filters) {
      searchRequest.filters = [];
    }
    const filterCode = viewDefinition.resource === 'Patient' ? '_id' : 'patient';
    searchRequest.filters.push({
      code: filterCode,
      operator: Operator.EQUALS,
      value: params.patient,
    });
  }

  if (params.group) {
    // Filter resources related to specific group
    if (!searchRequest.filters) {
      searchRequest.filters = [];
    }
    searchRequest.filters.push({
      code: 'group',
      operator: Operator.EQUALS,
      value: params.group,
    });
  }

  // Apply pagination
  if (params._count) {
    searchRequest.count = params._count;
  }
  
  if (params._page && params._count) {
    searchRequest.offset = (params._page - 1) * params._count;
  }

  // Execute search to get resources
  const searchResult = await ctx.repo.search(searchRequest);
  const resources = searchResult.entry?.map(e => e.resource as Resource) || [];

  // Execute SQL on FHIR evaluation
  const rows = evalSqlOnFhir(viewDefinition, resources);

  // Return results as JSON
  return [allOk, rows as any];
}