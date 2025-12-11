/**
 * EU member countries and associated countries
 * Used for matching "Within EU" and "Outside of EU" regions in the logspec matrix
 */
export const EU_COUNTRIES = new Set([
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
  'CH', // Switzerland (not EU but often grouped)
  'NO', // Norway (not EU but often grouped)
]);

/**
 * Check if a country code is in the EU
 */
export function isEUCountry(countryCode: string): boolean {
  return EU_COUNTRIES.has(countryCode.toUpperCase());
}

