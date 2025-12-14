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
  const entriesWithEmptyCountries = new Map<string, number>(); // Track ship methods with empty entries

  // First pass: parse all entries
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

    // Track if this entry has empty countries
    if (countries.size === 0 && countriesStr.trim() === '') {
      entriesWithEmptyCountries.set(shipMethod, (entriesWithEmptyCountries.get(shipMethod) || 0) + 1);
    }

    // Add to lookup - ship method can have multiple entries, so we merge sets
    if (!lookup.has(shipMethod)) {
      lookup.set(shipMethod, new Set());
    }
    const countrySet = lookup.get(shipMethod)!;
    countries.forEach(country => countrySet.add(country));
  }

  // Second pass: handle empty country entries by inferring from similar ship methods
  // Only merge if the ship method has NO non-empty entries (only empty entries)
  for (const [shipMethod] of entriesWithEmptyCountries.entries()) {
    const countrySet = lookup.get(shipMethod);
    if (!countrySet) continue;
    
    // Only merge from similar methods if this ship method has NO countries at all
    // If it has at least one country (like TW for GEODIS_AIR_STD_D2A), don't merge
    // This prevents incorrectly adding countries that shouldn't be included
    if (countrySet.size === 0) {
      // Try to find similar ship methods and merge their countries
      // This handles cases where a ship method has only empty entries
      const similarMethods = findSimilarShipMethods(shipMethod, lookup);
      similarMethods.forEach(similarMethod => {
        const similarCountries = lookup.get(similarMethod);
        if (similarCountries && similarCountries.size > 0) {
          // Merge countries from similar methods
          similarCountries.forEach(country => countrySet.add(country));
        }
      });
    }
  }

  return lookup;
}

/**
 * Find similar ship methods by removing common suffixes/prefixes
 * e.g., GEODIS_AIR_STD_D2A matches GEODIS_AIR_UD_STD_D2A, GEODIS_AIRHAZ_STD_D2A
 * Also matches methods with same base prefix (e.g., EXPEDITORS_GROUND_*)
 */
function findSimilarShipMethods(shipMethod: string, lookup: MatrixLookup): string[] {
  const similar: string[] = [];
  
  // Create base pattern by removing common variations
  // GEODIS_AIR_STD_D2A -> GEODIS_AIR_STD_D2A
  // GEODIS_AIR_UD_STD_D2A -> GEODIS_AIR_STD_D2A (remove _UD)
  // GEODIS_AIRHAZ_STD_D2A -> GEODIS_AIR_STD_D2A (replace AIRHAZ with AIR)
  const basePattern = shipMethod
    .replace(/_LICENSE/g, '')
    .replace(/_UD/g, '')
    .replace(/AIRHAZ/g, 'AIR')
    .replace(/_HAZ/g, '')
    .replace(/_DEF/g, '')
    .toLowerCase();

  // Also get the base prefix (e.g., "EXPEDITORS_GROUND" from "EXPEDITORS_GROUND_SPECIAL")
  const parts = shipMethod.split('_');
  const basePrefix = parts.length > 2 ? parts.slice(0, -1).join('_').toLowerCase() : '';

  for (const [method, countries] of lookup.entries()) {
    if (method === shipMethod || countries.size === 0) continue;
    
    const methodBase = method
      .replace(/_LICENSE/g, '')
      .replace(/_UD/g, '')
      .replace(/AIRHAZ/g, 'AIR')
      .replace(/_HAZ/g, '')
      .replace(/_DEF/g, '')
      .toLowerCase();
    
    // If the base patterns match, they're similar
    if (methodBase === basePattern) {
      similar.push(method);
    }
    // Also check if they share the same base prefix (e.g., EXPEDITORS_GROUND_*)
    else if (basePrefix && method.toLowerCase().startsWith(basePrefix + '_')) {
      // Only include if the similar method has significantly more countries (likely includes "Within EU")
      // This helps cases like EXPEDITORS_GROUND_SPECIAL (GB|IE) matching EXPEDITORS_GROUND_WHITEGLOVE (many EU countries)
      if (countries.size >= 5) {
        similar.push(method);
      }
    }
  }

  return similar;
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
  // Always extract country codes, even if special regions are present (to handle mixed entries)
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

  // Also handle explicit pipe or slash separated lists
  const pipeSeparated = countriesStr.split(/[|/]/).map(s => s.trim()).filter(s => s.length === 2 || s.length === 3);
  const skipCodes2 = new Set(['EA', 'XY', 'NC']);
  pipeSeparated.forEach(code => {
    if (/^[A-Z]{2,3}$/.test(code) && !skipCodes2.has(code)) {
      countries.add(code);
    }
  });

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

