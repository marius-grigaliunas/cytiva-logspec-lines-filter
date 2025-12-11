import type { DataRow } from './dataParser';
import { countryMatches } from './matrixParser';
import type { MatrixLookup } from './matrixParser';
import { isCountryOutsideEU } from './dataParser';

/**
 * Filter data rows to only include logspec lines
 * A line is logspec if:
 * 1. Its Ship Method exists in the matrix
 * 2. Its Country matches one of the allowed countries/regions for that ship method
 */
export function filterLogspecLines(
  rows: DataRow[],
  matrix: MatrixLookup
): DataRow[] {
  return rows.filter(row => {
    const shipMethod = row.shipMethod?.trim();
    const country = row.country?.trim();

    if (!shipMethod || !country) {
      return false;
    }

    // Check if ship method exists in matrix
    const allowedCountries = matrix.get(shipMethod);
    if (!allowedCountries || allowedCountries.size === 0) {
      return false;
    }

    // Check if country matches
    const isOutsideEU = isCountryOutsideEU(country);
    return countryMatches(country, allowedCountries, isOutsideEU);
  });
}

