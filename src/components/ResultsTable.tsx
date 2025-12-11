import type { DataRow } from '../utils/dataParser';

interface ResultsTableProps {
  data: DataRow[];
  totalCount: number;
}

export function ResultsTable({ data, totalCount }: ResultsTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No logspec lines found
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">Results</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Found <span className="font-bold text-blue-600 dark:text-blue-400">{data.length}</span> logspec line{data.length !== 1 ? 's' : ''} out of <span className="font-semibold">{totalCount}</span> total
          </p>
        </div>
        <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium text-sm">
          ✓ Filtered
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse bg-white dark:bg-gray-800">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Delivery
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Ship Method
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Pending Lines
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row, index) => (
              <tr 
                key={index}
                className="transition-colors hover:bg-blue-50 dark:hover:bg-gray-700/50 even:bg-gray-50/50 dark:even:bg-gray-900/30"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                  {row.delivery}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {row.shipMethod}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    {row.country}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {row.customer || <span className="text-gray-400 dark:text-gray-500 italic">-</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    parseInt(row.outboundPendingLines || '0') > 0 
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {row.outboundPendingLines || '0'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

