/*
 * This is a generated file
 * Do not edit manually.
 */

import { CodeableConcept } from './CodeableConcept';
import { DeviceDefinition } from './DeviceDefinition';
import { Duration } from './Duration';
import { Extension } from './Extension';
import { Identifier } from './Identifier';
import { MedicinalProductIngredient } from './MedicinalProductIngredient';
import { Meta } from './Meta';
import { Narrative } from './Narrative';
import { Quantity } from './Quantity';
import { Ratio } from './Ratio';
import { Reference } from './Reference';
import { Resource } from './Resource';

/**
 * A pharmaceutical product described in terms of its composition and
 * dose form.
 */
export interface MedicinalProductPharmaceutical {

  /**
   * This is a MedicinalProductPharmaceutical resource
   */
  readonly resourceType: 'MedicinalProductPharmaceutical';

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
   * An identifier for the pharmaceutical medicinal product.
   */
  identifier?: Identifier[];

  /**
   * The administrable dose form, after necessary reconstitution.
   */
  administrableDoseForm: CodeableConcept;

  /**
   * Todo.
   */
  unitOfPresentation?: CodeableConcept;

  /**
   * Ingredient.
   */
  ingredient?: Reference<MedicinalProductIngredient>[];

  /**
   * Accompanying device.
   */
  device?: Reference<DeviceDefinition>[];

  /**
   * Characteristics e.g. a products onset of action.
   */
  characteristics?: MedicinalProductPharmaceuticalCharacteristics[];

  /**
   * The path by which the pharmaceutical product is taken into or makes
   * contact with the body.
   */
  routeOfAdministration: MedicinalProductPharmaceuticalRouteOfAdministration[];
}

/**
 * Characteristics e.g. a products onset of action.
 */
export interface MedicinalProductPharmaceuticalCharacteristics {

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
   * A coded characteristic.
   */
  code: CodeableConcept;

  /**
   * The status of characteristic e.g. assigned or pending.
   */
  status?: CodeableConcept;
}

/**
 * The path by which the pharmaceutical product is taken into or makes
 * contact with the body.
 */
export interface MedicinalProductPharmaceuticalRouteOfAdministration {

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
   * Coded expression for the route.
   */
  code: CodeableConcept;

  /**
   * The first dose (dose quantity) administered in humans can be
   * specified, for a product under investigation, using a numerical value
   * and its unit of measurement.
   */
  firstDose?: Quantity;

  /**
   * The maximum single dose that can be administered as per the protocol
   * of a clinical trial can be specified using a numerical value and its
   * unit of measurement.
   */
  maxSingleDose?: Quantity;

  /**
   * The maximum dose per day (maximum dose quantity to be administered in
   * any one 24-h period) that can be administered as per the protocol
   * referenced in the clinical trial authorisation.
   */
  maxDosePerDay?: Quantity;

  /**
   * The maximum dose per treatment period that can be administered as per
   * the protocol referenced in the clinical trial authorisation.
   */
  maxDosePerTreatmentPeriod?: Ratio;

  /**
   * The maximum treatment period during which an Investigational Medicinal
   * Product can be administered as per the protocol referenced in the
   * clinical trial authorisation.
   */
  maxTreatmentPeriod?: Duration;

  /**
   * A species for which this route applies.
   */
  targetSpecies?: MedicinalProductPharmaceuticalRouteOfAdministrationTargetSpecies[];
}

/**
 * A species for which this route applies.
 */
export interface MedicinalProductPharmaceuticalRouteOfAdministrationTargetSpecies {

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
   * Coded expression for the species.
   */
  code: CodeableConcept;

  /**
   * A species specific time during which consumption of animal product is
   * not appropriate.
   */
  withdrawalPeriod?: MedicinalProductPharmaceuticalRouteOfAdministrationTargetSpeciesWithdrawalPeriod[];
}

/**
 * A species specific time during which consumption of animal product is
 * not appropriate.
 */
export interface MedicinalProductPharmaceuticalRouteOfAdministrationTargetSpeciesWithdrawalPeriod {

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
   * Coded expression for the type of tissue for which the withdrawal
   * period applues, e.g. meat, milk.
   */
  tissue: CodeableConcept;

  /**
   * A value for the time.
   */
  value: Quantity;

  /**
   * Extra information about the withdrawal period.
   */
  supportingInformation?: string;
}
