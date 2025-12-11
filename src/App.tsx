import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsTable } from './components/ResultsTable';
import { parseExcelFile } from './utils/dataParser';
import type { DataRow } from './utils/dataParser';
import { parseMatrix } from './utils/matrixParser';
import type { MatrixLookup } from './utils/matrixParser';
import { filterLogspecLines } from './utils/filter';
import defaultMatrix from './data/defaultMatrix.txt?raw';
import './App.css';

function App() {
  const [matrix, setMatrix] = useState<MatrixLookup>(new Map());
  const [allRows, setAllRows] = useState<DataRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matrixLoaded, setMatrixLoaded] = useState(false);

  // Load default matrix on mount
  useEffect(() => {
    try {
      const parsedMatrix = parseMatrix(defaultMatrix);
      setMatrix(parsedMatrix);
      setMatrixLoaded(true);
    } catch (err) {
      setError('Failed to load default matrix');
      console.error(err);
    }
  }, []);

  // Filter rows whenever matrix or allRows change
  useEffect(() => {
    if (matrix.size > 0 && allRows.length > 0) {
      const filtered = filterLogspecLines(allRows, matrix);
      setFilteredRows(filtered);
    } else {
      setFilteredRows([]);
    }
  }, [matrix, allRows]);

  const handleDataFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await parseExcelFile(file);
      setAllRows(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
      setAllRows([]);
      setFilteredRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMatrixFileSelect = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const text = await file.text();
      const parsedMatrix = parseMatrix(text);
      setMatrix(parsedMatrix);
      setMatrixLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse matrix file');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaultMatrix = () => {
    try {
      const parsedMatrix = parseMatrix(defaultMatrix);
      setMatrix(parsedMatrix);
      setMatrixLoaded(true);
      setError(null);
    } catch (err) {
      setError('Failed to load default matrix');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <header className="text-center mb-12 overflow-visible">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent leading-[1.3] py-2">
          Logspec Lines Filter
        </h1>
      </header>

      <main className="flex flex-col gap-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-6 py-4 rounded-lg shadow-md flex items-center justify-between">
            <span className="font-medium">{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="ml-4 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="flex flex-col gap-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-bold">1</span>
              Upload Data File
            </h2>
            <FileUpload
              onFileSelect={handleDataFileSelect}
              accept=".xlsx,.xls"
              label="Upload Excel Data File"
            />
            {loading && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="italic">Processing file...</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 bg-indigo-500 text-white rounded-full text-sm font-bold">2</span>
              Matrix Configuration
            </h2>
            {matrixLoaded && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex justify-between items-center flex-wrap gap-3 shadow-sm">
                <p className="text-gray-800 dark:text-gray-200 font-medium">
                  ✓ Matrix loaded: <span className="text-blue-600 dark:text-blue-400 font-bold">{matrix.size}</span> ship method{matrix.size !== 1 ? 's' : ''} configured
                </p>
                <button 
                  onClick={resetToDefaultMatrix} 
                  className="px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm font-medium"
                >
                  Reset to Default
                </button>
              </div>
            )}
            <FileUpload
              onFileSelect={handleMatrixFileSelect}
              accept=".txt"
              label="Upload Custom Matrix (Optional)"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
              Leave empty to use default matrix. Upload a custom matrix file to override.
            </p>
          </div>
        </section>

        {filteredRows.length > 0 && (
          <section className="mt-4">
            <ResultsTable data={filteredRows} totalCount={allRows.length} />
          </section>
        )}

        {allRows.length > 0 && filteredRows.length === 0 && !loading && (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No logspec lines found</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Make sure your data file contains the required columns: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Delivery</span>, <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Ship Method</span>, <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Country</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
