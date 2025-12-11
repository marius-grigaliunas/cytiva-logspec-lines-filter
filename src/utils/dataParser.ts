import * as XLSX from 'xlsx';
import { isEUCountry } from './euCountries';

export interface DataRow {
  delivery: string;
  shipMethod: string;
  country: string;
  customer: string;
  outboundPendingLines: string;
  [key: string]: string; // Allow access to other columns by name
}

/**
 * Parse an Excel file and extract relevant columns
 */
export function parseExcelFile(file: File): Promise<DataRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: false
        }) as string[][];

        if (jsonData.length === 0) {
          reject(new Error('File is empty'));
          return;
        }

        // First row is headers
        const headers = jsonData[0];
        const rows = jsonData.slice(1);

        // Find column indices
        const deliveryIdx = findColumnIndex(headers, ['Delivery', 'Delivery Number']);
        const shipMethodIdx = findColumnIndex(headers, ['Ship Method']);
        const countryIdx = findColumnIndex(headers, ['Country']);
        const customerIdx = findColumnIndex(headers, ['Customer']);
        const outboundPendingIdx = findColumnIndex(headers, ['Outbound Pending Lines', 'Outbound Pending']);

        if (deliveryIdx === -1 || shipMethodIdx === -1 || countryIdx === -1) {
          reject(new Error('Required columns not found. Expected: Delivery, Ship Method, Country'));
          return;
        }

        // Map rows to structured data
        const parsedRows: DataRow[] = rows
          .filter(row => row && row.length > 0) // Skip empty rows
          .map((row, index) => {
            const dataRow: DataRow = {
              delivery: getCellValue(row, deliveryIdx),
              shipMethod: getCellValue(row, shipMethodIdx),
              country: getCellValue(row, countryIdx),
              customer: getCellValue(row, customerIdx) || '',
              outboundPendingLines: getCellValue(row, outboundPendingIdx) || '0',
            };

            // Also store all columns by header name for potential future use
            headers.forEach((header, idx) => {
              if (header) {
                dataRow[header] = getCellValue(row, idx);
              }
            });

            return dataRow;
          });

        resolve(parsedRows);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Find column index by matching header names (case-insensitive)
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const lowerHeaders = headers.map(h => (h || '').toLowerCase().trim());
  
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase().trim();
    const index = lowerHeaders.indexOf(lowerName);
    if (index !== -1) {
      return index;
    }
  }

  return -1;
}

/**
 * Get cell value safely
 */
function getCellValue(row: string[], index: number): string {
  if (index < 0 || index >= row.length) {
    return '';
  }
  const value = row[index];
  return value ? String(value).trim() : '';
}

/**
 * Check if a country is outside EU
 */
export function isCountryOutsideEU(country: string): boolean {
  return !isEUCountry(country);
}

