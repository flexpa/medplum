// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import {
  LOINC_ALLERGIES_SECTION,
  LOINC_ASSESSMENTS_SECTION,
  LOINC_DEVICES_SECTION,
  LOINC_DISABILITY_STATUS,
  LOINC_ENCOUNTERS_SECTION,
  LOINC_FUNCTIONAL_STATUS_SECTION,
  LOINC_GOALS_SECTION,
  LOINC_HEALTH_CONCERNS_SECTION,
  LOINC_IMMUNIZATIONS_SECTION,
  LOINC_INSURANCE_SECTION,
  LOINC_MEDICATIONS_SECTION,
  LOINC_NOTE_DOCUMENT,
  LOINC_NOTES_SECTION,
  LOINC_PATIENT_SUMMARY_DOCUMENT,
  LOINC_PLAN_OF_TREATMENT_SECTION,
  LOINC_PROBLEMS_SECTION,
  LOINC_PROCEDURES_SECTION,
  LOINC_REASON_FOR_REFERRAL_SECTION,
  LOINC_RESULTS_SECTION,
  LOINC_SOCIAL_HISTORY_SECTION,
  LOINC_VITAL_SIGNS_SECTION,
} from '@medplum/ccda';
import type { ProfileResource, WithId } from '@medplum/core';
import {
  allOk,
  badRequest,
  createReference,
  EMPTY,
  escapeHtml,
  findCodeBySystem,
  formatCodeableConcept,
  formatDate,
  formatObservationValue,
  generateId,
  HTTP_TERMINOLOGY_HL7_ORG,
  LOINC,
  OperationOutcomeError,
  resolveId,
} from '@medplum/core';
import type { FhirRequest, FhirResponse } from '@medplum/fhir-router';
import type {
  Account,
  AllergyIntolerance,
  Bundle,
  CarePlan,
  ClinicalImpression,
  Composition,
  CompositionEvent,
  CompositionSection,
  Condition,
  DeviceUseStatement,
  DiagnosticReport,
  Encounter,
  Goal,
  Immunization,
  MedicationRequest,
  Observation,
  OperationDefinition,
  OperationDefinitionParameter,
  Organization,
  Patient,
  Practitioner,
  PractitionerRole,
  Procedure,
  Reference,
  Resource,
  ResourceType,
  ServiceRequest,
} from '@medplum/fhirtypes';
import type { AuthenticatedRequestContext } from '../../context';
import { getAuthenticatedContext } from '../../context';
import { getLogger } from '../../logger';
import type { PatientEverythingParameters } from './patienteverything';
import { getPatientEverything } from './patienteverything';
import { parseInputParameters } from './utils/parameters';

export const OBSERVATION_CATEGORY_SYSTEM = `${HTTP_TERMINOLOGY_HL7_ORG}/CodeSystem/observation-category`;

export const SECTION_ALIAS_MAP: Record<string, string> = {
  allergies: LOINC_ALLERGIES_SECTION,
  medications: LOINC_MEDICATIONS_SECTION,
  problems: LOINC_PROBLEMS_SECTION,
  immunizations: LOINC_IMMUNIZATIONS_SECTION,
  procedures: LOINC_PROCEDURES_SECTION,
  results: LOINC_RESULTS_SECTION,
  vitalsigns: LOINC_VITAL_SIGNS_SECTION,
  socialhistory: LOINC_SOCIAL_HISTORY_SECTION,
  encounters: LOINC_ENCOUNTERS_SECTION,
  devices: LOINC_DEVICES_SECTION,
  assessments: LOINC_ASSESSMENTS_SECTION,
  planofcare: LOINC_PLAN_OF_TREATMENT_SECTION,
  goals: LOINC_GOALS_SECTION,
  healthconcerns: LOINC_HEALTH_CONCERNS_SECTION,
  functionalstatus: LOINC_FUNCTIONAL_STATUS_SECTION,
  notes: LOINC_NOTES_SECTION,
  reasonforreferral: LOINC_REASON_FOR_REFERRAL_SECTION,
  insurance: LOINC_INSURANCE_SECTION,
};

const VALID_SECTION_CODES: Set<string> = new Set(Object.values(SECTION_ALIAS_MAP));

export function resolveSectionCode(value: string): string | undefined {
  if (VALID_SECTION_CODES.has(value)) {
    return value;
  }
  return SECTION_ALIAS_MAP[value.toLowerCase()];
}

// International Patient Summary Implementation Guide
// https://build.fhir.org/ig/HL7/fhir-ips/index.html

// Patient summary operation
// https://build.fhir.org/ig/HL7/fhir-ips/OperationDefinition-summary.html

export const operation = {
  resourceType: 'OperationDefinition',
  id: 'summary',
  name: 'IpsSummary',
  title: 'IPS Summary',
  status: 'active',
  kind: 'operation',
  affectsState: false,
  code: 'summary',
  resource: ['Patient'],
  system: false,
  type: true,
  instance: true,
  parameter: [
    ['author', 'in', 0, 1, 'Reference'],
    ['authoredOn', 'in', 0, 1, 'instant'],
    ['start', 'in', 0, 1, 'date'],
    ['end', 'in', 0, 1, 'date'],
    ['_since', 'in', 0, 1, 'instant'],
    ['identifier', 'in', 0, 1, 'string'],
    ['profile', 'in', 0, 1, 'canonical'],
    ['_section', 'in', 0, '*', 'code'],
    ['return', 'out', 0, 1, 'Bundle'],
  ].map(([name, use, min, max, type]) => ({ name, use, min, max, type }) as OperationDefinitionParameter),
} satisfies OperationDefinition;

const resourceTypes: ResourceType[] = [
  'Account',
  'AllergyIntolerance',
  'CarePlan',
  'ClinicalImpression',
  'Coverage',
  'Condition',
  'DeviceUseStatement',
  'DiagnosticReport',
  'Encounter',
  'Goal',
  'Immunization',
  'MedicationRequest',
  'Observation',
  'Procedure',
  'RelatedPerson',
  'ServiceRequest',
];

export type CompositionAuthorResource = Practitioner | PractitionerRole | Organization;

export interface PatientSummaryParameters extends PatientEverythingParameters {
  author?: Reference<CompositionAuthorResource>;
  authoredOn?: string;
  _section?: string[];
}

/**
 * Handles a Patient summary request.
 * Searches for all resources related to the patient.
 * @param req - The FHIR request.
 * @returns The FHIR response.
 */
export async function patientSummaryHandler(req: FhirRequest): Promise<FhirResponse> {
  const ctx = getAuthenticatedContext();
  const { id } = req.params;
  const params = parseInputParameters<PatientSummaryParameters>(operation, req);
  const bundle = await getPatientSummary(ctx, { reference: `Patient/${id}` }, params);
  return [allOk, bundle];
}

/**
 * Executes the Patient $summary operation.
 * Searches for all resources related to the patient.
 * @param ctx - The authenticated request context.
 * @param patientRef - The patient reference.
 * @param params - The operation input parameters.
 * @returns The patient summary search result bundle.
 */
export async function getPatientSummary(
  ctx: AuthenticatedRequestContext,
  patientRef: Reference<Patient>,
  params: PatientSummaryParameters = {}
): Promise<Bundle> {
  const repo = ctx.repo;
  const authorRef = (params.author ?? ctx.profile) as Reference<CompositionAuthorResource>;
  const author = await repo.readReference(authorRef);
  const patient = await repo.readReference(patientRef);

  let sectionFilter: Set<string> | undefined;
  if (params._section && params._section.length > 0) {
    sectionFilter = new Set<string>();
    for (const value of params._section) {
      const code = resolveSectionCode(value);
      if (!code) {
        throw new OperationOutcomeError(badRequest(`Invalid _section value: '${value}'`));
      }
      sectionFilter.add(code);
    }
  }

  params._type = resourceTypes;
  const everythingBundle = await getPatientEverything(repo, patient, params);
  const everything = (everythingBundle.entry?.map((e) => e.resource) ?? []) as WithId<Resource>[];
  const builder = new PatientSummaryBuilder(author, patient, everything, params, sectionFilter);
  return builder.build();
}

export type ResultResourceType = DiagnosticReport | Observation;
export type PlanResourceType = CarePlan | Goal | ServiceRequest;

/**
 * Builder for the Patient Summary.
 *
 * The main complexity is in the choice of which section to put each resource.
 */
export class PatientSummaryBuilder {
  private readonly author: CompositionAuthorResource;
  private readonly patient: Patient;
  private readonly everything: WithId<Resource>[];
  private readonly params: PatientSummaryParameters;
  private readonly participants: ProfileResource[] = [];
  private readonly allergies: AllergyIntolerance[] = [];
  private readonly medications: MedicationRequest[] = [];
  private readonly problemList: Condition[] = [];
  private readonly results: ResultResourceType[] = [];
  private readonly socialHistory: Observation[] = [];
  private readonly vitalSigns: Observation[] = [];
  private readonly procedures: Procedure[] = [];
  private readonly encounters: Encounter[] = [];
  private readonly assessments: ClinicalImpression[] = [];
  private readonly planOfTreatment: PlanResourceType[] = [];
  private readonly immunizations: Immunization[] = [];
  private readonly devices: DeviceUseStatement[] = [];
  private readonly goals: Goal[] = [];
  private readonly healthConcerns: Condition[] = [];
  private readonly functionalStatus: Observation[] = [];
  private readonly notes: ClinicalImpression[] = [];
  private readonly reasonForReferral: ServiceRequest[] = [];
  private readonly insurance: Account[] = [];
  private readonly nestedIds = new Set<string>();
  private readonly sectionFilter: Set<string> | undefined;

  constructor(
    author: CompositionAuthorResource,
    patient: Patient,
    everything: WithId<Resource>[],
    params: PatientSummaryParameters = {},
    sectionFilter?: Set<string>
  ) {
    this.author = author;
    this.patient = patient;
    this.everything = everything;
    this.params = params;
    this.sectionFilter = sectionFilter;
  }

  private isSectionIncluded(loincCode: string): boolean {
    return !this.sectionFilter || this.sectionFilter.has(loincCode);
  }

  build(): Bundle {
    this.buildNestedIds();
    this.chooseSectionForResources();
    return this.buildBundle(this.buildComposition());
  }

  /**
   * Builds a set of nested IDs for resources that are members of other resources.
   * Nested resources are not included in sections directly.
   * For example, observations that are members of other observations.
   * Or observations that are members of diagnostic reports.
   */
  private buildNestedIds(): void {
    for (const resource of this.everything) {
      if (resource.resourceType === 'Observation' && resource.hasMember) {
        for (const member of resource.hasMember) {
          if (member.reference) {
            this.nestedIds.add(resolveId(member) as string);
          }
        }
      }

      if (resource.resourceType === 'DiagnosticReport' && resource.result) {
        for (const result of resource.result) {
          if (result.reference) {
            this.nestedIds.add(resolveId(result) as string);
          }
        }
      }

      if (resource.resourceType === 'CarePlan' && resource.activity) {
        for (const activity of resource.activity) {
          if (activity.reference?.reference) {
            this.nestedIds.add(resolveId(activity.reference) as string);
          }
        }
      }

      if (resource.resourceType === 'Encounter' && resource.diagnosis) {
        for (const diagnosis of resource.diagnosis) {
          if (diagnosis.condition?.reference) {
            this.nestedIds.add(resolveId(diagnosis.condition) as string);
          }
        }
      }

      if (resource.resourceType === 'Condition' && resource.evidence) {
        for (const evidence of resource.evidence) {
          if (evidence.detail) {
            for (const detail of evidence.detail) {
              if (detail.reference) {
                this.nestedIds.add(resolveId(detail) as string);
              }
            }
          }
        }
      }

      if (resource.resourceType === 'Account' && resource.coverage) {
        for (const coverage of resource.coverage) {
          if (coverage.coverage?.reference) {
            this.nestedIds.add(resolveId(coverage.coverage) as string);
          }
        }
      }
    }
  }

  /**
   * Chooses the section for each resource.
   * Nested resources are not included in sections directly.
   */
  private chooseSectionForResources(): void {
    for (const resource of this.everything) {
      if (this.nestedIds.has(resource.id)) {
        continue;
      }
      this.chooseSectionForResource(resource);
    }
  }

  /**
   * Chooses the section for a resource.
   * This is the most ambiguous part of the summary builder, because there are no rules.
   * The objective is to do a reasonable job, and create a framework for future improvements.
   * @param resource - The resource to choose a section for.
   */
  private chooseSectionForResource(resource: Resource): void {
    switch (resource.resourceType) {
      // Participants
      case 'Practitioner':
      case 'RelatedPerson':
        this.participants.push(resource);
        break;

      // Simple resource types - add to section directly
      case 'Account':
        this.insurance.push(resource);
        break;
      case 'AllergyIntolerance':
        this.allergies.push(resource);
        break;
      case 'CarePlan':
        this.planOfTreatment.push(resource);
        break;
      case 'DeviceUseStatement':
        this.devices.push(resource);
        break;
      case 'DiagnosticReport':
        this.results.push(resource);
        break;
      case 'Encounter':
        this.encounters.push(resource);
        break;
      case 'Goal':
        this.goals.push(resource);
        break;
      case 'Immunization':
        this.immunizations.push(resource);
        break;
      case 'MedicationRequest':
        this.medications.push(resource);
        break;
      case 'Procedure':
        this.procedures.push(resource);
        break;

      // Complex resource types - choose section based on resource type
      case 'ClinicalImpression':
        this.chooseSectionForClinicalImpression(resource);
        break;
      case 'Condition':
        this.chooseSectionForCondition(resource);
        break;
      case 'Observation':
        this.chooseSectionForObservation(resource);
        break;
      case 'ServiceRequest':
        this.chooseSectionForServiceRequest(resource);
        break;

      default:
        getLogger().debug('Unsupported resource type in Patient Summary', { resourceType: resource.resourceType });
    }
  }

  private chooseSectionForClinicalImpression(clinicalImpression: ClinicalImpression): void {
    const code = clinicalImpression.code?.coding?.[0]?.code;
    if (code === LOINC_NOTE_DOCUMENT) {
      this.notes.push(clinicalImpression);
    } else {
      this.assessments.push(clinicalImpression);
    }
  }

  private chooseSectionForCondition(condition: Condition): void {
    const categoryCode = findCodeBySystem(condition.category, LOINC);
    if (categoryCode === LOINC_HEALTH_CONCERNS_SECTION) {
      this.healthConcerns.push(condition);
    } else {
      this.problemList.push(condition);
    }
  }

  private chooseSectionForObservation(obs: Observation): void {
    const code = obs.code?.coding?.[0]?.code;
    const categoryCode = findCodeBySystem(obs.category, OBSERVATION_CATEGORY_SYSTEM);
    switch (categoryCode) {
      case 'social-history':
        this.socialHistory.push(obs);
        break;
      case 'survey':
        if (code === 'd5' || code === LOINC_DISABILITY_STATUS) {
          this.functionalStatus.push(obs);
        } else {
          this.socialHistory.push(obs);
        }
        break;
      case 'vital-signs':
        this.vitalSigns.push(obs);
        break;
      default:
        this.results.push(obs);
        break;
    }
  }

  private chooseSectionForServiceRequest(serviceRequest: ServiceRequest): void {
    const code = serviceRequest.code?.coding?.[0]?.code;
    if (code === '310449005') {
      // Note from Chart Lux Consulting:
      // USCDI v3 comment - the value set for this referral code is over 1000 entries and code is required - simple approach could be to offer a few options
      // for user to choose from; here are 3 common ones (referral to hospital is in 315.b.1 test data)
      // 310449005 - Referral to hospital
      // 44383000 - Patient referral for consultation
      // 103696004 - Patient referral to specialist
      this.reasonForReferral.push(serviceRequest);
    } else {
      this.planOfTreatment.push(serviceRequest);
    }
  }

  private buildComposition(): Composition {
    // Composition profile
    // https://build.fhir.org/ig/HL7/fhir-ips/StructureDefinition-Composition-uv-ips.html

    // Minimal example
    // https://build.fhir.org/ig/HL7/fhir-ips/Composition-composition-minimal.json.html

    const composition: Composition = {
      resourceType: 'Composition',
      id: generateId(),
      status: 'final',
      type: { coding: [{ system: LOINC, code: LOINC_PATIENT_SUMMARY_DOCUMENT, display: 'Patient Summary' }] },
      subject: createReference(this.patient),
      date: this.params.authoredOn ?? new Date().toISOString(),
      author: [createReference(this.author)],
      title: 'Medical Summary',
      confidentiality: 'N',
      custodian: this.patient.managingOrganization,
      event: this.buildEvent(),
      section: (
        [
          [LOINC_ALLERGIES_SECTION, () => this.createAllergiesSection()],
          [LOINC_IMMUNIZATIONS_SECTION, () => this.createImmunizationsSection()],
          [LOINC_MEDICATIONS_SECTION, () => this.createMedicationsSection()],
          [LOINC_PROBLEMS_SECTION, () => this.createProblemListSection()],
          [LOINC_RESULTS_SECTION, () => this.createResultsSection()],
          [LOINC_SOCIAL_HISTORY_SECTION, () => this.createSocialHistorySection()],
          [LOINC_VITAL_SIGNS_SECTION, () => this.createVitalSignsSection()],
          [LOINC_PROCEDURES_SECTION, () => this.createProceduresSection()],
          [LOINC_ENCOUNTERS_SECTION, () => this.createEncountersSection()],
          [LOINC_DEVICES_SECTION, () => this.createDevicesSection()],
          [LOINC_ASSESSMENTS_SECTION, () => this.createAssessmentsSection()],
          [LOINC_PLAN_OF_TREATMENT_SECTION, () => this.createPlanOfTreatmentSection()],
          [LOINC_GOALS_SECTION, () => this.createGoalsSection()],
          [LOINC_HEALTH_CONCERNS_SECTION, () => this.createHealthConcernsSection()],
          [LOINC_FUNCTIONAL_STATUS_SECTION, () => this.createFunctionalStatusSection()],
          [LOINC_NOTES_SECTION, () => this.createNotesSection()],
          [LOINC_REASON_FOR_REFERRAL_SECTION, () => this.createReasonForReferralSection()],
          [LOINC_INSURANCE_SECTION, () => this.createInsuranceSection()],
        ] as [string, () => CompositionSection | undefined][]
      )
        .filter(([code]) => this.isSectionIncluded(code))
        .map(([, build]) => build())
        .filter(Boolean) as CompositionSection[],
    };
    return composition;
  }

  private buildEvent(): CompositionEvent[] | undefined {
    let start: string | undefined = undefined;
    let end: string | undefined = undefined;

    for (const resource of this.everything) {
      if (resource.meta?.lastUpdated) {
        if (!start || resource.meta.lastUpdated < start) {
          start = resource.meta.lastUpdated;
        }
        if (!end || resource.meta.lastUpdated > end) {
          end = resource.meta.lastUpdated;
        }
      }
    }

    if (!start && !end) {
      return undefined;
    }

    return [
      {
        period: {
          start,
          end,
        },
      },
    ];
  }

  private createAllergiesSection(): CompositionSection {
    return createSection(
      LOINC_ALLERGIES_SECTION,
      'Allergies',
      createTable(
        ['Substance', 'Reaction', 'Severity', 'Status'],
        this.allergies.map((a) => [
          formatCodeableConcept(a.code),
          formatCodeableConcept(a.reaction?.[0]?.manifestation?.[0]),
          a.reaction?.[0]?.severity,
          formatCodeableConcept(a.clinicalStatus),
        ])
      ),
      this.allergies
    );
  }

  private createImmunizationsSection(): CompositionSection {
    return createSection(
      LOINC_IMMUNIZATIONS_SECTION,
      'Immunizations',
      createTable(
        ['Vaccine', 'Date', 'Status'],
        this.immunizations.map((i) => [
          formatCodeableConcept(i.vaccineCode),
          formatDate(i.occurrenceDateTime),
          i.status,
        ])
      ),
      this.immunizations
    );
  }

  private createMedicationsSection(): CompositionSection {
    return createSection(
      LOINC_MEDICATIONS_SECTION,
      'Medications',
      createTable(
        ['Medication', 'Directions', 'Start Date', 'End Date'],
        this.medications.map((m) => [
          formatCodeableConcept(m.medicationCodeableConcept),
          m.dosageInstruction?.[0]?.text,
          formatDate(m.dispenseRequest?.validityPeriod?.start),
          formatDate(m.dispenseRequest?.validityPeriod?.end),
        ])
      ),
      this.medications
    );
  }

  private createProblemListSection(): CompositionSection {
    return createSection(
      LOINC_PROBLEMS_SECTION,
      'Problem List',
      createTable(
        ['Problem', 'Start Date', 'Status'],
        this.problemList.map((p) => [
          formatCodeableConcept(p.code),
          formatDate(p.onsetDateTime),
          formatCodeableConcept(p.clinicalStatus),
        ])
      ),
      this.problemList
    );
  }

  private createResultsSection(): CompositionSection {
    return createSection(LOINC_RESULTS_SECTION, 'Results', this.buildResultTable(this.results), this.results);
  }

  private createSocialHistorySection(): CompositionSection {
    return createSection(
      LOINC_SOCIAL_HISTORY_SECTION,
      'Social History',
      this.buildResultTable(this.socialHistory),
      this.socialHistory
    );
  }

  private createVitalSignsSection(): CompositionSection {
    return createSection(
      LOINC_VITAL_SIGNS_SECTION,
      'Vital Signs',
      this.buildResultTable(this.vitalSigns),
      this.vitalSigns
    );
  }

  private createProceduresSection(): CompositionSection {
    return createSection(
      LOINC_PROCEDURES_SECTION,
      'Procedures',
      createTable(
        ['Procedure', 'Date', 'Target Site', 'Status'],
        this.procedures.map((p) => [
          formatCodeableConcept(p.code),
          formatDate(p.performedDateTime),
          formatCodeableConcept(p.bodySite?.[0]),
          p.status,
        ])
      ),
      this.procedures
    );
  }

  private createEncountersSection(): CompositionSection {
    return createSection(
      LOINC_ENCOUNTERS_SECTION,
      'Encounters',
      createTable(
        ['Encounter', 'Date', 'Type', 'Status'],
        this.encounters.map((e) => [
          formatCodeableConcept(e.type?.[0]),
          formatDate(e.period?.start),
          formatCodeableConcept(e.reasonCode?.[0]),
          e.status,
        ])
      ),
      this.encounters
    );
  }

  private createDevicesSection(): CompositionSection {
    return createSection(
      LOINC_DEVICES_SECTION,
      'Devices',
      createTable(
        ['Device', 'Status'],
        this.devices.map((dus) => {
          const device = this.getByReference(dus.device);
          return [formatCodeableConcept(device?.type), dus.status];
        })
      ),
      this.devices
    );
  }

  private createAssessmentsSection(): CompositionSection {
    return createSection(
      LOINC_ASSESSMENTS_SECTION,
      'Assessments',
      createTable(
        ['Summary', 'Date'],
        this.assessments.map((a) => [a.summary, formatDate(a.date)])
      ),
      this.assessments
    );
  }

  private createPlanOfTreatmentSection(): CompositionSection {
    return createSection(
      LOINC_PLAN_OF_TREATMENT_SECTION,
      'Plan of Treatment',
      this.buildPlanTable(this.planOfTreatment),
      this.planOfTreatment
    );
  }

  private createGoalsSection(): CompositionSection | undefined {
    if (this.goals.length === 0) {
      return undefined;
    }

    return createSection(
      LOINC_GOALS_SECTION,
      'Goals',
      createTable(
        ['Goal', 'Date'],
        this.goals.map((g) => [formatCodeableConcept(g.description), formatDate(g.startDate)])
      ),
      this.goals
    );
  }

  private createHealthConcernsSection(): CompositionSection | undefined {
    if (this.healthConcerns.length === 0) {
      return undefined;
    }

    return createSection(
      LOINC_HEALTH_CONCERNS_SECTION,
      'Health Concerns',
      createTable(
        ['Concern', 'Start Date', 'Status'],
        this.healthConcerns.map((p) => [
          formatCodeableConcept(p.code),
          formatDate(p.onsetDateTime),
          formatCodeableConcept(p.clinicalStatus),
        ])
      ),
      this.healthConcerns
    );
  }

  private createFunctionalStatusSection(): CompositionSection | undefined {
    if (this.functionalStatus.length === 0) {
      return undefined;
    }

    return createSection(
      LOINC_FUNCTIONAL_STATUS_SECTION,
      'Functional Status',
      this.buildResultTable(this.functionalStatus),
      this.functionalStatus
    );
  }

  private createNotesSection(): CompositionSection | undefined {
    if (this.notes.length === 0) {
      return undefined;
    }

    return createSection(
      LOINC_NOTES_SECTION,
      'Notes',
      createTable(
        ['Note', 'Date'],
        this.notes.map((n) => [n.summary, formatDate(n.date)])
      ),
      this.notes
    );
  }

  private createReasonForReferralSection(): CompositionSection | undefined {
    if (this.reasonForReferral.length === 0) {
      return undefined;
    }

    return createSection(
      LOINC_REASON_FOR_REFERRAL_SECTION,
      'Reason for Referral',
      this.buildPlanTable(this.reasonForReferral),
      this.reasonForReferral
    );
  }

  private createInsuranceSection(): CompositionSection | undefined {
    if (this.insurance.length === 0) {
      return undefined;
    }

    return createSection(
      LOINC_INSURANCE_SECTION,
      'Insurance',
      createTable(
        ['Coverage', 'Status', 'Type'],
        this.insurance.map((a) => [a.name, a.status, a.type ? formatCodeableConcept(a.type) : undefined])
      ),
      this.insurance
    );
  }

  private buildResultTable(resources: ResultResourceType[]): string {
    const rows: (string | undefined)[][] = [];
    for (const r of resources) {
      this.buildResultRows(rows, r);
    }
    return createTable(['Name', 'Result', 'Date'], rows);
  }

  private buildResultRows(rows: (string | undefined)[][], resource: ResultResourceType): void {
    if (resource.resourceType === 'DiagnosticReport') {
      this.buildDiagnosticReportRow(rows, resource);
    }

    if (resource.resourceType === 'Observation') {
      this.buildObservationRow(rows, resource);
    }
  }

  private buildDiagnosticReportRow(rows: (string | undefined)[][], resource: DiagnosticReport): void {
    rows.push([formatCodeableConcept(resource.code), undefined, formatDate(resource.effectiveDateTime)]);
    for (const result of resource.result ?? EMPTY) {
      const r = this.getByReference(result);
      if (r?.resourceType === 'Observation') {
        this.buildResultRows(rows, r);
      }
    }
  }

  private buildObservationRow(rows: (string | undefined)[][], resource: Observation): void {
    rows.push([
      formatCodeableConcept(resource.code),
      formatObservationValue(resource),
      formatDate(resource.effectiveDateTime),
    ]);

    for (const member of resource.hasMember ?? EMPTY) {
      const m = this.getByReference(member);
      if (m?.resourceType === 'Observation') {
        this.buildResultRows(rows, m);
      }
    }
  }

  private buildPlanTable(resources: PlanResourceType[]): string {
    const rows: (string | undefined)[][] = [];
    for (const r of resources) {
      this.buildPlanRows(rows, r);
    }
    return createTable(['Planned Care', 'Start Date'], rows);
  }

  private buildPlanRows(rows: (string | undefined)[][], resource: PlanResourceType): void {
    if (resource.resourceType === 'CarePlan') {
      rows.push([formatCodeableConcept(resource.category?.[0]), formatDate(resource.period?.start)]);
      for (const activity of resource.activity ?? EMPTY) {
        const a = this.getByReference(activity.reference);
        if (a?.resourceType === 'ServiceRequest') {
          rows.push([formatCodeableConcept(a.code), formatDate(a.authoredOn)]);
        }
      }
    }
    if (resource.resourceType === 'Goal') {
      rows.push([formatCodeableConcept(resource.description), formatDate(resource.target?.[0]?.dueDate)]);
    }
    if (resource.resourceType === 'ServiceRequest') {
      rows.push([formatCodeableConcept(resource.code), formatDate(resource.authoredOn)]);
    }
  }

  private buildBundle(composition: Composition): Bundle {
    let resources: Resource[];
    if (this.sectionFilter) {
      // Collect IDs referenced by kept sections
      const keptIds = new Set<string>();
      for (const section of composition.section ?? []) {
        for (const entry of section.entry ?? []) {
          if (entry.reference) {
            const id = resolveId(entry);
            if (id) {
              keptIds.add(id);
            }
          }
        }
      }
      // Include nested children of kept resources
      for (const id of this.nestedIds) {
        const resource = this.everything.find((r) => r.id === id);
        if (!resource) {
          continue;
        }
        // Check if the parent of this nested resource is in the kept set
        for (const kept of this.everything) {
          if (!keptIds.has(kept.id)) {
            continue;
          }
          if (this.isNestedChild(kept, id)) {
            keptIds.add(id);
          }
        }
      }
      // Always include participants (Practitioners, RelatedPersons)
      for (const p of this.participants) {
        keptIds.add(p.id as string);
      }
      resources = [composition, this.patient, this.author, ...this.everything.filter((r) => keptIds.has(r.id))];
    } else {
      resources = [composition, this.patient, this.author, ...this.everything];
    }

    // See International Patient Summary Implementation Guide
    // Bundle - Minimal Complete IPS - JSON Representation
    // https://build.fhir.org/ig/HL7/fhir-ips/Bundle-bundle-minimal.json.html
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'document',
      timestamp: new Date().toISOString(),
      entry: resources.map((resource) => ({ resource })),
    };

    return bundle;
  }

  /**
   * Checks if a resource has the given ID as a nested child reference.
   */
  private isNestedChild(resource: WithId<Resource>, childId: string): boolean {
    if (resource.resourceType === 'Observation' && (resource as Observation).hasMember) {
      for (const member of (resource as Observation).hasMember ?? []) {
        if (resolveId(member) === childId) {
          return true;
        }
      }
    }
    if (resource.resourceType === 'DiagnosticReport' && (resource as DiagnosticReport).result) {
      for (const result of (resource as DiagnosticReport).result ?? []) {
        if (resolveId(result) === childId) {
          return true;
        }
      }
    }
    if (resource.resourceType === 'CarePlan' && (resource as CarePlan).activity) {
      for (const activity of (resource as CarePlan).activity ?? []) {
        if (activity.reference && resolveId(activity.reference) === childId) {
          return true;
        }
      }
    }
    if (resource.resourceType === 'Encounter' && (resource as Encounter).diagnosis) {
      for (const diagnosis of (resource as Encounter).diagnosis ?? []) {
        if (diagnosis.condition && resolveId(diagnosis.condition) === childId) {
          return true;
        }
      }
    }
    if (resource.resourceType === 'Condition' && (resource as Condition).evidence) {
      for (const evidence of (resource as Condition).evidence ?? []) {
        for (const detail of evidence.detail ?? []) {
          if (resolveId(detail) === childId) {
            return true;
          }
        }
      }
    }
    if (resource.resourceType === 'Account' && (resource as Account).coverage) {
      for (const coverage of (resource as Account).coverage ?? []) {
        if (coverage.coverage && resolveId(coverage.coverage) === childId) {
          return true;
        }
      }
    }
    return false;
  }

  private getByReference<T extends Resource>(ref: Reference<T> | undefined): T | undefined {
    if (!ref?.reference) {
      return undefined;
    }
    return this.everything.find((r) => r.id === resolveId(ref)) as T;
  }
}

function createTable(headings: string[], body: (string | undefined)[][]): string {
  if (body.length === 0) {
    return '';
  }

  const html = ['<table border="1" width="100%"><thead><tr>'];
  for (const h of headings) {
    html.push('<th>');
    html.push(escapeHtml(h));
    html.push('</th>');
  }
  html.push('</tr></thead><tbody>');
  for (const row of body) {
    html.push('<tr>');
    for (const cell of row) {
      html.push('<td>');
      if (cell) {
        html.push(escapeHtml(cell));
      }
      html.push('</td>');
    }
    html.push('</tr>');
  }
  html.push('</tbody></table>');
  return html.join('');
}

function createSection(code: string, title: string, html: string, entry: Resource[]): CompositionSection {
  return {
    title,
    code: { coding: [{ system: LOINC, code }] },
    text: { status: 'generated', div: `<div xmlns="http://www.w3.org/1999/xhtml">${html}</div>` },
    entry: entry.map(createReference),
  };
}
