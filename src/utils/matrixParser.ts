import { isEUCountry } from './euCountries';

export type MatrixLookup = Map<string, Set<string>>;

/**
 * Parse a logspec matrix file (TSV format) and build a lookup structure
 * Format: LogSpec\tShipMethod\tCountries
 * Countries can be:
 * - Pipe-separated codes: "GB|CH|NO"
 * - Special regions: "Within EU", "Outside of EU"
 * - Empty or with additional text
 */
export function parseMatrix(matrixText: string): MatrixLookup {
  const lookup = new Map<string, Set<string>>();
  const lines = matrixText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split('\t');
    if (parts.length < 3) continue;

    const prefix = parts[0].trim();
    const shipMethod = parts[1].trim();
    const countriesStr = parts[2].trim();

    // Only process lines that start with "LogSpec" or "Logspec"
    if (!prefix.match(/^LogSpec$/i)) continue;

    if (!shipMethod) continue;

    // Parse countries
    const countries = parseCountries(countriesStr);

    // Add to lookup - ship method can have multiple entries, so we merge sets
    if (!lookup.has(shipMethod)) {
      lookup.set(shipMethod, new Set());
    }
    const countrySet = lookup.get(shipMethod)!;
    countries.forEach(country => countrySet.add(country));
  }

  return lookup;
}

/**
 * Parse country string into a set of country codes
 * Handles:
 * - Pipe-separated: "GB|CH|NO"
 * - With pipes: "|GB|CH|NO|"
 * - Special regions: "Within EU", "Outside of EU"
 * - Slash-separated: "BA/MK/RS"
 * - Empty strings
 * - Additional text (extracts country codes)
 */
function parseCountries(countriesStr: string): Set<string> {
  const countries = new Set<string>();

  if (!countriesStr) return countries;

  // Handle special regions
  if (countriesStr.includes('Within EU')) {
    // Add all EU countries
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
      'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
      'SI', 'ES', 'SE', 'CH', 'NO'
    ];
    euCountries.forEach(code => countries.add(code));
  }

  if (countriesStr.includes('Outside of EU')) {
    // This is a special marker - we'll handle it separately in the filter
    countries.add('__OUTSIDE_EU__');
  }

  // Extract country codes from the string
  // Pattern: 2-3 uppercase letters, possibly with spaces/pipes/slashes
  // Skip if we already handled special regions to avoid duplicates
  if (!countriesStr.includes('Within EU') && !countriesStr.includes('Outside of EU')) {
    const countryCodePattern = /\b([A-Z]{2,3})\b/g;
    let match;
    const skipCodes = new Set(['EA', 'XY', 'NC']); // Non-country codes to skip
    while ((match = countryCodePattern.exec(countriesStr)) !== null) {
      const code = match[1];
      // Skip known non-country codes
      if (!skipCodes.has(code)) {
        countries.add(code);
      }
    }
  }

  // Also handle explicit pipe or slash separated lists (if not already handled by special regions)
  if (!countriesStr.includes('Within EU') && !countriesStr.includes('Outside of EU')) {
    const pipeSeparated = countriesStr.split(/[|/]/).map(s => s.trim()).filter(s => s.length === 2 || s.length === 3);
    const skipCodes = new Set(['EA', 'XY', 'NC']);
    pipeSeparated.forEach(code => {
      if (/^[A-Z]{2,3}$/.test(code) && !skipCodes.has(code)) {
        countries.add(code);
      }
    });
  }

  return countries;
}

/**
 * Check if a country matches the matrix entry
 */
export function countryMatches(
  country: string,
  allowedCountries: Set<string>,
  isOutsideEU: boolean = false
): boolean {
  const upperCountry = country.toUpperCase();

  // Check exact match
  if (allowedCountries.has(upperCountry)) {
    return true;
  }

  // Check special markers
  if (allowedCountries.has('__OUTSIDE_EU__') && isOutsideEU) {
    return true;
  }

  // If "Within EU" is in the set, check if country is EU
  // (This is handled by having all EU countries in the set, but we can also check)
  if (isEUCountry(upperCountry)) {
    // Check if any EU country is in the allowed set (indicates "Within EU" was parsed)
    // Actually, we already added all EU countries, so this should be covered
  }

  return false;
}

