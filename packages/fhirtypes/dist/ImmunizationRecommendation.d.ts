/*
 * This is a generated file
 * Do not edit manually.
 */

import { CodeableConcept } from './CodeableConcept';
import { Extension } from './Extension';
import { Identifier } from './Identifier';
import { Immunization } from './Immunization';
import { ImmunizationEvaluation } from './ImmunizationEvaluation';
import { Meta } from './Meta';
import { Narrative } from './Narrative';
import { Organization } from './Organization';
import { Patient } from './Patient';
import { Reference } from './Reference';
import { Resource } from './Resource';

/**
 * A patient's point-in-time set of recommendations (i.e. forecasting)
 * according to a published schedule with optional supporting
 * justification.
 */
export interface ImmunizationRecommendation {

  /**
   * This is a ImmunizationRecommendation resource
   */
  readonly resourceType: 'ImmunizationRecommendation';

  /**
   * The logical id of the resource, as used in the URL for the resource.
   * Once assigned, this value never changes.
   */
  id?: string;

  /**
   * The metadata about the resource. This is content that is maintained by
   * the infrastructure. Changes to the content might not always be
   * associated with version changes to the resource.
   */
  meta?: Meta;

  /**
   * A reference to a set of rules that were followed when the resource was
   * constructed, and which must be understood when processing the content.
   * Often, this is a reference to an implementation guide that defines the
   * special rules along with other profiles etc.
   */
  implicitRules?: string;

  /**
   * The base language in which the resource is written.
   */
  language?: string;

  /**
   * A human-readable narrative that contains a summary of the resource and
   * can be used to represent the content of the resource to a human. The
   * narrative need not encode all the structured data, but is required to
   * contain sufficient detail to make it &quot;clinically safe&quot; for a human to
   * just read the narrative. Resource definitions may define what content
   * should be represented in the narrative to ensure clinical safety.
   */
  text?: Narrative;

  /**
   * These resources do not have an independent existence apart from the
   * resource that contains them - they cannot be identified independently,
   * and nor can they have their own independent transaction scope.
   */
  contained?: Resource[];

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the resource. To make the use of extensions
   * safe and manageable, there is a strict set of governance  applied to
   * the definition and use of extensions. Though any implementer can
   * define an extension, there is a set of requirements that SHALL be met
   * as part of the definition of the extension.
   */
  extension?: Extension[];

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the resource and that modifies the
   * understanding of the element that contains it and/or the understanding
   * of the containing element's descendants. Usually modifier elements
   * provide negation or qualification. To make the use of extensions safe
   * and manageable, there is a strict set of governance applied to the
   * definition and use of extensions. Though any implementer is allowed to
   * define an extension, there is a set of requirements that SHALL be met
   * as part of the definition of the extension. Applications processing a
   * resource are required to check for modifier extensions.
   *
   * Modifier extensions SHALL NOT change the meaning of any elements on
   * Resource or DomainResource (including cannot change the meaning of
   * modifierExtension itself).
   */
  modifierExtension?: Extension[];

  /**
   * A unique identifier assigned to this particular recommendation record.
   */
  identifier?: Identifier[];

  /**
   * The patient the recommendation(s) are for.
   */
  patient: Reference<Patient>;

  /**
   * The date the immunization recommendation(s) were created.
   */
  date: string;

  /**
   * Indicates the authority who published the protocol (e.g. ACIP).
   */
  authority?: Reference<Organization>;

  /**
   * Vaccine administration recommendations.
   */
  recommendation: ImmunizationRecommendationRecommendation[];
}

/**
 * Vaccine administration recommendations.
 */
export interface ImmunizationRecommendationRecommendation {

  /**
   * Unique id for the element within a resource (for internal references).
   * This may be any string value that does not contain spaces.
   */
  id?: string;

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the element. To make the use of extensions
   * safe and manageable, there is a strict set of governance  applied to
   * the definition and use of extensions. Though any implementer can
   * define an extension, there is a set of requirements that SHALL be met
   * as part of the definition of the extension.
   */
  extension?: Extension[];

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the element and that modifies the
   * understanding of the element in which it is contained and/or the
   * understanding of the containing element's descendants. Usually
   * modifier elements provide negation or qualification. To make the use
   * of extensions safe and manageable, there is a strict set of governance
   * applied to the definition and use of extensions. Though any
   * implementer can define an extension, there is a set of requirements
   * that SHALL be met as part of the definition of the extension.
   * Applications processing a resource are required to check for modifier
   * extensions.
   *
   * Modifier extensions SHALL NOT change the meaning of any elements on
   * Resource or DomainResource (including cannot change the meaning of
   * modifierExtension itself).
   */
  modifierExtension?: Extension[];

  /**
   * Vaccine(s) or vaccine group that pertain to the recommendation.
   */
  vaccineCode?: CodeableConcept[];

  /**
   * The targeted disease for the recommendation.
   */
  targetDisease?: CodeableConcept;

  /**
   * Vaccine(s) which should not be used to fulfill the recommendation.
   */
  contraindicatedVaccineCode?: CodeableConcept[];

  /**
   * Indicates the patient status with respect to the path to immunity for
   * the target disease.
   */
  forecastStatus: CodeableConcept;

  /**
   * The reason for the assigned forecast status.
   */
  forecastReason?: CodeableConcept[];

  /**
   * Vaccine date recommendations.  For example, earliest date to
   * administer, latest date to administer, etc.
   */
  dateCriterion?: ImmunizationRecommendationRecommendationDateCriterion[];

  /**
   * Contains the description about the protocol under which the vaccine
   * was administered.
   */
  description?: string;

  /**
   * One possible path to achieve presumed immunity against a disease -
   * within the context of an authority.
   */
  series?: string;

  /**
   * Nominal position of the recommended dose in a series (e.g. dose 2 is
   * the next recommended dose).
   */
  doseNumberPositiveInt?: number;

  /**
   * Nominal position of the recommended dose in a series (e.g. dose 2 is
   * the next recommended dose).
   */
  doseNumberString?: string;

  /**
   * The recommended number of doses to achieve immunity.
   */
  seriesDosesPositiveInt?: number;

  /**
   * The recommended number of doses to achieve immunity.
   */
  seriesDosesString?: string;

  /**
   * Immunization event history and/or evaluation that supports the status
   * and recommendation.
   */
  supportingImmunization?: Reference<Immunization | ImmunizationEvaluation>[];

  /**
   * Patient Information that supports the status and recommendation.  This
   * includes patient observations, adverse reactions and
   * allergy/intolerance information.
   */
  supportingPatientInformation?: Reference<Resource>[];
}

/**
 * Nominal position of the recommended dose in a series (e.g. dose 2 is
 * the next recommended dose).
 */
export type ImmunizationRecommendationRecommendationDoseNumber = number | string;

/**
 * The recommended number of doses to achieve immunity.
 */
export type ImmunizationRecommendationRecommendationSeriesDoses = number | string;

/**
 * Vaccine date recommendations.  For example, earliest date to
 * administer, latest date to administer, etc.
 */
export interface ImmunizationRecommendationRecommendationDateCriterion {

  /**
   * Unique id for the element within a resource (for internal references).
   * This may be any string value that does not contain spaces.
   */
  id?: string;

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the element. To make the use of extensions
   * safe and manageable, there is a strict set of governance  applied to
   * the definition and use of extensions. Though any implementer can
   * define an extension, there is a set of requirements that SHALL be met
   * as part of the definition of the extension.
   */
  extension?: Extension[];

  /**
   * May be used to represent additional information that is not part of
   * the basic definition of the element and that modifies the
   * understanding of the element in which it is contained and/or the
   * understanding of the containing element's descendants. Usually
   * modifier elements provide negation or qualification. To make the use
   * of extensions safe and manageable, there is a strict set of governance
   * applied to the definition and use of extensions. Though any
   * implementer can define an extension, there is a set of requirements
   * that SHALL be met as part of the definition of the extension.
   * Applications processing a resource are required to check for modifier
   * extensions.
   *
   * Modifier extensions SHALL NOT change the meaning of any elements on
   * Resource or DomainResource (including cannot change the meaning of
   * modifierExtension itself).
   */
  modifierExtension?: Extension[];

  /**
   * Date classification of recommendation.  For example, earliest date to
   * give, latest date to give, etc.
   */
  code: CodeableConcept;

  /**
   * The date whose meaning is specified by dateCriterion.code.
   */
  value: string;
}
