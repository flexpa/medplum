/*
 * This is a generated file
 * Do not edit manually.
 */

import { Annotation } from './Annotation';
import { CarePlan } from './CarePlan';
import { CareTeam } from './CareTeam';
import { ClaimResponse } from './ClaimResponse';
import { CodeableConcept } from './CodeableConcept';
import { Condition } from './Condition';
import { Coverage } from './Coverage';
import { Device } from './Device';
import { DiagnosticReport } from './DiagnosticReport';
import { DocumentReference } from './DocumentReference';
import { Encounter } from './Encounter';
import { Extension } from './Extension';
import { Group } from './Group';
import { HealthcareService } from './HealthcareService';
import { Identifier } from './Identifier';
import { Location } from './Location';
import { MedicationRequest } from './MedicationRequest';
import { Meta } from './Meta';
import { Narrative } from './Narrative';
import { Observation } from './Observation';
import { Organization } from './Organization';
import { Patient } from './Patient';
import { Period } from './Period';
import { Practitioner } from './Practitioner';
import { PractitionerRole } from './PractitionerRole';
import { Provenance } from './Provenance';
import { Quantity } from './Quantity';
import { Range } from './Range';
import { Ratio } from './Ratio';
import { Reference } from './Reference';
import { RelatedPerson } from './RelatedPerson';
import { Resource } from './Resource';
import { Specimen } from './Specimen';
import { Timing } from './Timing';

/**
 * A record of a request for service such as diagnostic investigations,
 * treatments, or operations to be performed.
 */
export interface ServiceRequest {

  /**
   * This is a ServiceRequest resource
   */
  readonly resourceType: 'ServiceRequest';

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
   * Identifiers assigned to this order instance by the orderer and/or the
   * receiver and/or order fulfiller.
   */
  identifier?: Identifier[];

  /**
   * The URL pointing to a FHIR-defined protocol, guideline, orderset or
   * other definition that is adhered to in whole or in part by this
   * ServiceRequest.
   */
  instantiatesCanonical?: string[];

  /**
   * The URL pointing to an externally maintained protocol, guideline,
   * orderset or other definition that is adhered to in whole or in part by
   * this ServiceRequest.
   */
  instantiatesUri?: string[];

  /**
   * Plan/proposal/order fulfilled by this request.
   */
  basedOn?: Reference<CarePlan | ServiceRequest | MedicationRequest>[];

  /**
   * The request takes the place of the referenced completed or terminated
   * request(s).
   */
  replaces?: Reference<ServiceRequest>[];

  /**
   * A shared identifier common to all service requests that were
   * authorized more or less simultaneously by a single author,
   * representing the composite or group identifier.
   */
  requisition?: Identifier;

  /**
   * The status of the order.
   */
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';

  /**
   * Whether the request is a proposal, plan, an original order or a reflex
   * order.
   */
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';

  /**
   * A code that classifies the service for searching, sorting and display
   * purposes (e.g. &quot;Surgical Procedure&quot;).
   */
  category?: CodeableConcept[];

  /**
   * Indicates how quickly the ServiceRequest should be addressed with
   * respect to other requests.
   */
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';

  /**
   * Set this to true if the record is saying that the service/procedure
   * should NOT be performed.
   */
  doNotPerform?: boolean;

  /**
   * A code that identifies a particular service (i.e., procedure,
   * diagnostic investigation, or panel of investigations) that have been
   * requested.
   */
  code?: CodeableConcept;

  /**
   * Additional details and instructions about the how the services are to
   * be delivered.   For example, and order for a urinary catheter may have
   * an order detail for an external or indwelling catheter, or an order
   * for a bandage may require additional instructions specifying how the
   * bandage should be applied.
   */
  orderDetail?: CodeableConcept[];

  /**
   * An amount of service being requested which can be a quantity ( for
   * example $1,500 home modification), a ratio ( for example, 20 half day
   * visits per month), or a range (2.0 to 1.8 Gy per fraction).
   */
  quantityQuantity?: Quantity;

  /**
   * An amount of service being requested which can be a quantity ( for
   * example $1,500 home modification), a ratio ( for example, 20 half day
   * visits per month), or a range (2.0 to 1.8 Gy per fraction).
   */
  quantityRatio?: Ratio;

  /**
   * An amount of service being requested which can be a quantity ( for
   * example $1,500 home modification), a ratio ( for example, 20 half day
   * visits per month), or a range (2.0 to 1.8 Gy per fraction).
   */
  quantityRange?: Range;

  /**
   * On whom or what the service is to be performed. This is usually a
   * human patient, but can also be requested on animals, groups of humans
   * or animals, devices such as dialysis machines, or even locations
   * (typically for environmental scans).
   */
  subject: Reference<Patient | Group | Location | Device>;

  /**
   * An encounter that provides additional information about the healthcare
   * context in which this request is made.
   */
  encounter?: Reference<Encounter>;

  /**
   * The date/time at which the requested service should occur.
   */
  occurrenceDateTime?: string;

  /**
   * The date/time at which the requested service should occur.
   */
  occurrencePeriod?: Period;

  /**
   * The date/time at which the requested service should occur.
   */
  occurrenceTiming?: Timing;

  /**
   * If a CodeableConcept is present, it indicates the pre-condition for
   * performing the service.  For example &quot;pain&quot;, &quot;on flare-up&quot;, etc.
   */
  asNeededBoolean?: boolean;

  /**
   * If a CodeableConcept is present, it indicates the pre-condition for
   * performing the service.  For example &quot;pain&quot;, &quot;on flare-up&quot;, etc.
   */
  asNeededCodeableConcept?: CodeableConcept;

  /**
   * When the request transitioned to being actionable.
   */
  authoredOn?: string;

  /**
   * The individual who initiated the request and has responsibility for
   * its activation.
   */
  requester?: Reference<Practitioner | PractitionerRole | Organization | Patient | RelatedPerson | Device>;

  /**
   * Desired type of performer for doing the requested service.
   */
  performerType?: CodeableConcept;

  /**
   * The desired performer for doing the requested service.  For example,
   * the surgeon, dermatopathologist, endoscopist, etc.
   */
  performer?: Reference<Practitioner | PractitionerRole | Organization | CareTeam | HealthcareService | Patient | Device | RelatedPerson>[];

  /**
   * The preferred location(s) where the procedure should actually happen
   * in coded or free text form. E.g. at home or nursing day care center.
   */
  locationCode?: CodeableConcept[];

  /**
   * A reference to the the preferred location(s) where the procedure
   * should actually happen. E.g. at home or nursing day care center.
   */
  locationReference?: Reference<Location>[];

  /**
   * An explanation or justification for why this service is being
   * requested in coded or textual form.   This is often for billing
   * purposes.  May relate to the resources referred to in
   * `supportingInfo`.
   */
  reasonCode?: CodeableConcept[];

  /**
   * Indicates another resource that provides a justification for why this
   * service is being requested.   May relate to the resources referred to
   * in `supportingInfo`.
   */
  reasonReference?: Reference<Condition | Observation | DiagnosticReport | DocumentReference>[];

  /**
   * Insurance plans, coverage extensions, pre-authorizations and/or
   * pre-determinations that may be needed for delivering the requested
   * service.
   */
  insurance?: Reference<Coverage | ClaimResponse>[];

  /**
   * Additional clinical information about the patient or specimen that may
   * influence the services or their interpretations.     This information
   * includes diagnosis, clinical findings and other observations.  In
   * laboratory ordering these are typically referred to as &quot;ask at order
   * entry questions (AOEs)&quot;.  This includes observations explicitly
   * requested by the producer (filler) to provide context or supporting
   * information needed to complete the order. For example,  reporting the
   * amount of inspired oxygen for blood gas measurements.
   */
  supportingInfo?: Reference<Resource>[];

  /**
   * One or more specimens that the laboratory procedure will use.
   */
  specimen?: Reference<Specimen>[];

  /**
   * Anatomic location where the procedure should be performed. This is the
   * target site.
   */
  bodySite?: CodeableConcept[];

  /**
   * Any other notes and comments made about the service request. For
   * example, internal billing notes.
   */
  note?: Annotation[];

  /**
   * Instructions in terms that are understood by the patient or consumer.
   */
  patientInstruction?: string;

  /**
   * Key events in the history of the request.
   */
  relevantHistory?: Reference<Provenance>[];
}

/**
 * An amount of service being requested which can be a quantity ( for
 * example $1,500 home modification), a ratio ( for example, 20 half day
 * visits per month), or a range (2.0 to 1.8 Gy per fraction).
 */
export type ServiceRequestQuantity = Quantity | Range | Ratio;

/**
 * The date/time at which the requested service should occur.
 */
export type ServiceRequestOccurrence = Period | string | Timing;

/**
 * If a CodeableConcept is present, it indicates the pre-condition for
 * performing the service.  For example &quot;pain&quot;, &quot;on flare-up&quot;, etc.
 */
export type ServiceRequestAsNeeded = boolean | CodeableConcept;
