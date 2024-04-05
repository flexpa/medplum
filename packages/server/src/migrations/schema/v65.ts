/*
 * Generated by @medplum/generator
 * Do not edit manually.
 */

import { PoolClient } from 'pg';

const resourceTypes = [
  'AccessPolicy',
  'Account',
  'ActivityDefinition',
  'AdverseEvent',
  'Agent',
  'AllergyIntolerance',
  'Appointment',
  'AppointmentResponse',
  'AsyncJob',
  'AuditEvent',
  'Basic',
  'Binary',
  'BiologicallyDerivedProduct',
  'BodyStructure',
  'Bot',
  'BulkDataExport',
  'Bundle',
  'CapabilityStatement',
  'CarePlan',
  'CareTeam',
  'CatalogEntry',
  'ChargeItem',
  'ChargeItemDefinition',
  'Claim',
  'ClaimResponse',
  'ClientApplication',
  'ClinicalImpression',
  'CodeSystem',
  'Communication',
  'CommunicationRequest',
  'CompartmentDefinition',
  'Composition',
  'ConceptMap',
  'Condition',
  'Consent',
  'Contract',
  'Coverage',
  'CoverageEligibilityRequest',
  'CoverageEligibilityResponse',
  'DetectedIssue',
  'Device',
  'DeviceDefinition',
  'DeviceMetric',
  'DeviceRequest',
  'DeviceUseStatement',
  'DiagnosticReport',
  'DocumentManifest',
  'DocumentReference',
  'DomainConfiguration',
  'EffectEvidenceSynthesis',
  'Encounter',
  'Endpoint',
  'EnrollmentRequest',
  'EnrollmentResponse',
  'EpisodeOfCare',
  'EventDefinition',
  'Evidence',
  'EvidenceVariable',
  'ExampleScenario',
  'ExplanationOfBenefit',
  'FamilyMemberHistory',
  'Flag',
  'Goal',
  'GraphDefinition',
  'Group',
  'GuidanceResponse',
  'HealthcareService',
  'ImagingStudy',
  'Immunization',
  'ImmunizationEvaluation',
  'ImmunizationRecommendation',
  'ImplementationGuide',
  'InsurancePlan',
  'Invoice',
  'JsonWebKey',
  'Library',
  'Linkage',
  'List',
  'Location',
  'Login',
  'Measure',
  'MeasureReport',
  'Media',
  'Medication',
  'MedicationAdministration',
  'MedicationDispense',
  'MedicationKnowledge',
  'MedicationRequest',
  'MedicationStatement',
  'MedicinalProduct',
  'MedicinalProductAuthorization',
  'MedicinalProductContraindication',
  'MedicinalProductIndication',
  'MedicinalProductIngredient',
  'MedicinalProductInteraction',
  'MedicinalProductManufactured',
  'MedicinalProductPackaged',
  'MedicinalProductPharmaceutical',
  'MedicinalProductUndesirableEffect',
  'MessageDefinition',
  'MessageHeader',
  'MolecularSequence',
  'NamingSystem',
  'NutritionOrder',
  'Observation',
  'ObservationDefinition',
  'OperationDefinition',
  'OperationOutcome',
  'Organization',
  'OrganizationAffiliation',
  'Parameters',
  'PasswordChangeRequest',
  'Patient',
  'PaymentNotice',
  'PaymentReconciliation',
  'Person',
  'PlanDefinition',
  'Practitioner',
  'PractitionerRole',
  'Procedure',
  'Project',
  'ProjectMembership',
  'Provenance',
  'Questionnaire',
  'QuestionnaireResponse',
  'RelatedPerson',
  'RequestGroup',
  'ResearchDefinition',
  'ResearchElementDefinition',
  'ResearchStudy',
  'ResearchSubject',
  'RiskAssessment',
  'RiskEvidenceSynthesis',
  'Schedule',
  'SearchParameter',
  'ServiceRequest',
  'Slot',
  'SmartAppLaunch',
  'Specimen',
  'SpecimenDefinition',
  'StructureDefinition',
  'StructureMap',
  'Subscription',
  'SubscriptionStatus',
  'Substance',
  'SubstanceNucleicAcid',
  'SubstancePolymer',
  'SubstanceProtein',
  'SubstanceReferenceInformation',
  'SubstanceSourceMaterial',
  'SubstanceSpecification',
  'SupplyDelivery',
  'SupplyRequest',
  'Task',
  'TerminologyCapabilities',
  'TestReport',
  'TestScript',
  'User',
  'UserConfiguration',
  'ValueSet',
  'VerificationResult',
  'VisionPrescription',
];

export async function run(client: PoolClient): Promise<void> {
  await client.query('ALTER TABLE "Address" DROP CONSTRAINT IF EXISTS "Address_pkey"');
  await client.query('ALTER TABLE "Address" ALTER COLUMN "id" DROP NOT NULL');
  await client.query('ALTER TABLE "Address" ALTER COLUMN "index" DROP NOT NULL');
  await client.query('ALTER TABLE "Address" ALTER COLUMN "content" DROP NOT NULL');

  await client.query('ALTER TABLE "HumanName" DROP CONSTRAINT IF EXISTS "HumanName_pkey"');
  await client.query('ALTER TABLE "HumanName" ALTER COLUMN "id" DROP NOT NULL');
  await client.query('ALTER TABLE "HumanName" ALTER COLUMN "index" DROP NOT NULL');
  await client.query('ALTER TABLE "HumanName" ALTER COLUMN "content" DROP NOT NULL');

  await client.query('ALTER TABLE "ValueSetElement" DROP CONSTRAINT IF EXISTS "ValueSetElement_pkey"');
  await client.query('ALTER TABLE "ValueSetElement" ALTER COLUMN "id" DROP NOT NULL');

  await client.query('ALTER TABLE "Agent" ALTER COLUMN "projectId" DROP NOT NULL');

  for (const resourceType of resourceTypes) {
    await client.query(`ALTER TABLE "${resourceType}_Token" ALTER COLUMN "index" DROP NOT NULL`);
  }
}