/*
 * This is a generated file
 * Do not edit manually.
 */

import { Extension } from './Extension';
import { Period } from './Period';

/**
 * An address expressed using postal conventions (as opposed to GPS or
 * other location definition formats).  This data type may be used to
 * convey addresses for use in delivering mail as well as for visiting
 * locations which might not be valid for mail delivery.  There are a
 * variety of postal address formats defined around the world.
 */
export interface Address {

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
   * The purpose of this address.
   */
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';

  /**
   * Distinguishes between physical addresses (those you can visit) and
   * mailing addresses (e.g. PO Boxes and care-of addresses). Most
   * addresses are both.
   */
  type?: 'postal' | 'physical' | 'both';

  /**
   * Specifies the entire address as it should be displayed e.g. on a
   * postal label. This may be provided instead of or as well as the
   * specific parts.
   */
  text?: string;

  /**
   * This component contains the house number, apartment number, street
   * name, street direction,  P.O. Box number, delivery hints, and similar
   * address information.
   */
  line?: string[];

  /**
   * The name of the city, town, suburb, village or other community or
   * delivery center.
   */
  city?: string;

  /**
   * The name of the administrative area (county).
   */
  district?: string;

  /**
   * Sub-unit of a country with limited sovereignty in a federally
   * organized country. A code may be used if codes are in common use (e.g.
   * US 2 letter state codes).
   */
  state?: string;

  /**
   * A postal code designating a region defined by the postal service.
   */
  postalCode?: string;

  /**
   * Country - a nation as commonly understood or generally accepted.
   */
  country?: string;

  /**
   * Time period when address was/is in use.
   */
  period?: Period;
}
