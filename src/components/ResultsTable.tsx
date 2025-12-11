import { useState, useMemo, useEffect, useRef } from 'react';
import type { DataRow } from '../utils/dataParser';

interface ResultsTableProps {
  data: DataRow[];
  totalCount: number;
}

type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  key: string;
  label: string;
  isDefault: boolean;
}

// Define available columns with their display names
const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { key: 'delivery', label: 'Delivery', isDefault: true },
  { key: 'shipMethod', label: 'Ship Method', isDefault: true },
  { key: 'country', label: 'Country', isDefault: true },
  { key: 'customer', label: 'Customer', isDefault: true },
  { key: 'outboundPendingLines', label: 'Pending Lines', isDefault: true },
  { key: 'nextOutboundStep', label: 'Next Outbound Step', isDefault: false },
  { key: 'Next Outbound Step', label: 'Next Outbound Step (Raw)', isDefault: false },
  { key: 'Order', label: 'Order', isDefault: false },
  { key: 'Line', label: 'Line', isDefault: false },
  { key: 'Status', label: 'Status', isDefault: false },
  { key: 'Expected Completion Date', label: 'Expected Completion Date', isDefault: false },
  { key: 'Item', label: 'Item', isDefault: false },
  { key: 'Item Description', label: 'Item Description', isDefault: false },
  { key: 'Quantity', label: 'Quantity', isDefault: false },
  { key: 'Warehouse', label: 'Warehouse', isDefault: false },
  { key: 'City', label: 'City', isDefault: false },
  { key: 'State', label: 'State', isDefault: false },
];

export function ResultsTable({ data, totalCount }: ResultsTableProps) {
  // Get all unique column keys from the data
  const availableKeys = useMemo(() => {
    if (data.length === 0) return [];
    const keys = new Set<string>();
    Object.keys(data[0]).forEach(key => keys.add(key));
    return Array.from(keys).sort();
  }, [data]);

  // Get all columns from the data, with nice labels from predefined list
  const dataColumns = useMemo(() => {
    const columnMap = new Map<string, string>();
    const seenNormalized = new Set<string>();
    
    // Helper to normalize key for comparison (case-insensitive, spaces removed)
    // This makes "Ship Method" and "shipMethod" both become "shipmethod"
    const normalizeKey = (key: string) => key.toLowerCase().replace(/\s+/g, '').trim();
    
    // Group keys by normalized name and prefer original header format
    const keyGroups = new Map<string, string[]>();
    availableKeys.forEach(key => {
      const normalized = normalizeKey(key);
      if (!keyGroups.has(normalized)) {
        keyGroups.set(normalized, []);
      }
      keyGroups.get(normalized)!.push(key);
    });
    
    // For each group, prefer the key that:
    // 1. Has spaces (original header format)
    // 2. Matches predefined column exactly
    // 3. Otherwise use the first one
    keyGroups.forEach((keys, normalized) => {
      if (seenNormalized.has(normalized)) return;
      
      // Find the best key to use
      let bestKey = keys[0];
      for (const key of keys) {
        // Prefer keys with spaces (original headers)
        if (key.includes(' ')) {
          bestKey = key;
          break;
        }
        // Prefer exact match with predefined
        const exactMatch = AVAILABLE_COLUMNS.find(col => 
          col.key === key || col.label === key
        );
        if (exactMatch) {
          bestKey = key;
          break;
        }
      }
      
      seenNormalized.add(normalized);
      
      // Check if this matches a predefined column
      const predefined = AVAILABLE_COLUMNS.find(col => {
        const colNormalized = normalizeKey(col.key);
        const labelNormalized = normalizeKey(col.label);
        return normalized === colNormalized || normalized === labelNormalized;
      });
      
      if (predefined) {
        columnMap.set(bestKey, predefined.label);
      } else {
        // Create a nice label
        const niceLabel = bestKey
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
        columnMap.set(bestKey, niceLabel);
      }
    });
    
    // Convert to array format for the component and ensure no duplicates by label
    const finalColumns = new Map<string, { key: string; label: string; isDefault: boolean }>();
    const seenLabels = new Set<string>();
    
    Array.from(columnMap.entries()).forEach(([key, label]) => {
      const normalized = normalizeKey(key);
      const labelNormalized = normalizeKey(label);
      
      // Skip if we've already seen this label (avoid duplicates)
      if (seenLabels.has(labelNormalized)) {
        return;
      }
      
      seenLabels.add(labelNormalized);
      
      const predefined = AVAILABLE_COLUMNS.find(col => {
        const colNormalized = normalizeKey(col.key);
        const labelNormalized2 = normalizeKey(col.label);
        return normalized === colNormalized || normalized === labelNormalized2 || labelNormalized === labelNormalized2;
      });
      
      finalColumns.set(key, {
        key,
        label,
        isDefault: predefined?.isDefault || false
      });
    });
    
    return Array.from(finalColumns.values()).sort((a, b) => {
      // Sort: defaults first, then alphabetically
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [availableKeys]);

  // Initialize visible columns with defaults
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());

  // Update visible columns when data changes
  useEffect(() => {
    if (dataColumns.length > 0 && visibleColumns.size === 0) {
      const defaults = new Set<string>();
      dataColumns.forEach(col => {
        if (col.isDefault) {
          defaults.add(col.key);
        }
      });
      // Also add "Next Outbound Step" if it exists in the data
      const nextStepKey = availableKeys.find(k => 
        k === 'Next Outbound Step' || k === 'nextOutboundStep'
      );
      if (nextStepKey) {
        defaults.add(nextStepKey);
      }
      setVisibleColumns(defaults);
    }
  }, [dataColumns, availableKeys, visibleColumns.size]);

  // Update column order when visible columns change
  useEffect(() => {
    const visibleArray = Array.from(visibleColumns).filter(key => 
      availableKeys.includes(key)
    );
    
    if (visibleArray.length === 0) return;
    
    setColumnOrder(prevOrder => {
      // If column order is empty or doesn't match visible columns, initialize/reset it
      if (prevOrder.length === 0 || 
          visibleArray.length !== prevOrder.length ||
          !visibleArray.every(key => prevOrder.includes(key))) {
        // Preserve existing order for columns that are still visible, add new ones at the end
        const preservedOrder = prevOrder.filter(key => visibleArray.includes(key));
        const newColumns = visibleArray.filter(key => !prevOrder.includes(key));
        return [...preservedOrder, ...newColumns];
      }
      return prevOrder;
    });
  }, [visibleColumns, availableKeys]);

  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Column filtering state
  const [columnFilters, setColumnFilters] = useState<Map<string, Set<string>>>(new Map());
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');
  const filterDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Column ordering state for drag-and-drop
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
        setColumnSearchQuery('');
      }
      
      // Close filter dropdowns when clicking outside
      let clickedInsideFilter = false;
      filterDropdownRefs.current.forEach((ref) => {
        if (ref && ref.contains(event.target as Node)) {
          clickedInsideFilter = true;
        }
      });
      
      if (!clickedInsideFilter) {
        setOpenFilterColumn(null);
        setFilterSearchQuery('');
      }
    };

    if (showColumnSelector || openFilterColumn) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector, openFilterColumn]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Get unique values for all columns (memoized)
  const columnUniqueValues = useMemo(() => {
    const valuesMap = new Map<string, string[]>();
    if (data.length === 0) return valuesMap;
    
    availableKeys.forEach(columnKey => {
      const values = new Set<string>();
      data.forEach(row => {
        const value = String(row[columnKey] || '').trim();
        if (value) {
          values.add(value);
        } else {
          // Also track empty values
          values.add('');
        }
      });
      const sortedValues = Array.from(values).sort((a, b) => {
        if (a === '') return 1;
        if (b === '') return -1;
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      });
      valuesMap.set(columnKey, sortedValues);
    });
    
    return valuesMap;
  }, [data, availableKeys]);

  // Helper function to get unique values for a column
  const getUniqueColumnValues = (columnKey: string): string[] => {
    return columnUniqueValues.get(columnKey) || [];
  };

  // Filter handlers
  const toggleFilterValue = (columnKey: string, value: string) => {
    setColumnFilters(prev => {
      const next = new Map(prev);
      const currentFilter = next.get(columnKey) || new Set<string>();
      const newFilter = new Set(currentFilter);
      
      if (newFilter.has(value)) {
        newFilter.delete(value);
      } else {
        newFilter.add(value);
      }
      
      if (newFilter.size === 0) {
        next.delete(columnKey);
      } else {
        next.set(columnKey, newFilter);
      }
      
      return next;
    });
  };

  const clearColumnFilter = (columnKey: string) => {
    setColumnFilters(prev => {
      const next = new Map(prev);
      next.delete(columnKey);
      return next;
    });
  };

  const clearAllFilters = () => {
    setColumnFilters(new Map());
  };

  const isFilterActive = (columnKey: string): boolean => {
    return columnFilters.has(columnKey) && (columnFilters.get(columnKey)?.size || 0) > 0;
  };

  const getActiveFilterCount = (): number => {
    return Array.from(columnFilters.values()).reduce((sum, filter) => sum + filter.size, 0);
  };

  // Drag and drop handlers for column reordering
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    // Prevent dragging if clicking on buttons or other interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || 
        target.tagName === 'INPUT' || 
        target.closest('button') || 
        target.closest('input')) {
      e.preventDefault();
      return;
    }
    
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnKey);
    // Add a slight delay to allow drag image to be set
    setTimeout(() => {
      if (e.dataTransfer) {
        e.dataTransfer.setDragImage(new Image(), 0, 0);
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColumn && draggedColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Clear drag over state - it will be set again if dragging over another column
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    // Reorder columns
    setColumnOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumnKey);
      
      if (draggedIndex === -1 || targetIndex === -1) {
        return prevOrder;
      }
      
      // Remove dragged column from its current position
      newOrder.splice(draggedIndex, 1);
      // Insert at target position
      newOrder.splice(targetIndex, 0, draggedColumn);
      
      return newOrder;
    });
    
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Apply filters first, then sort
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply column filters
    if (columnFilters.size > 0) {
      result = result.filter(row => {
        return Array.from(columnFilters.entries()).every(([columnKey, allowedValues]) => {
          const cellValue = String(row[columnKey] || '').trim();
          // If no filter values selected, show all (shouldn't happen, but safety check)
          if (allowedValues.size === 0) return true;
          // Check if the cell value is in the allowed values
          return allowedValues.has(cellValue);
        });
      });
    }

    // Apply sorting
    if (sortColumn) {
      result = result.sort((a, b) => {
        let aValue: string | number = a[sortColumn] || '';
        let bValue: string | number = b[sortColumn] || '';

        // Handle numeric sorting for pending lines
        if (sortColumn === 'outboundPendingLines' || sortColumn === 'Quantity') {
          aValue = parseInt(String(aValue)) || 0;
          bValue = parseInt(String(bValue)) || 0;
        } else {
          // String sorting (case-insensitive)
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }

        if (aValue < bValue) {
          return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [data, columnFilters, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return (
        <span className="ml-2 text-gray-400 dark:text-gray-500">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    return (
      <span className="ml-2 text-blue-600 dark:text-blue-400">
        {sortDirection === 'asc' ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    );
  };

  const getColumnLabel = (key: string): string => {
    const col = dataColumns.find(c => c.key === key);
    return col ? col.label : key;
  };

  const getCellValue = (row: DataRow, key: string): string => {
    return row[key] || '';
  };

  // Get ordered visible columns array
  const visibleColumnsArray = useMemo(() => {
    const visibleSet = new Set(Array.from(visibleColumns).filter(key => 
      availableKeys.includes(key)
    ));
    
    // Start with columns in the current order that are still visible
    const ordered = columnOrder.filter(key => visibleSet.has(key));
    
    // Add any new visible columns that aren't in the order yet (shouldn't happen often)
    const newColumns = Array.from(visibleSet).filter(key => !columnOrder.includes(key));
    
    return [...ordered, ...newColumns];
  }, [visibleColumns, availableKeys, columnOrder]);

  // Filter columns based on search query
  const filteredColumns = useMemo(() => {
    if (!columnSearchQuery.trim()) {
      return dataColumns;
    }
    const query = columnSearchQuery.toLowerCase();
    return dataColumns.filter(col => 
      col.label.toLowerCase().includes(query) || 
      col.key.toLowerCase().includes(query)
    );
  }, [dataColumns, columnSearchQuery]);

  // Filter column values based on search query
  const getFilteredColumnValues = (columnKey: string): string[] => {
    const values = getUniqueColumnValues(columnKey);
    if (!filterSearchQuery.trim() || openFilterColumn !== columnKey) {
      return values;
    }
    const query = filterSearchQuery.toLowerCase();
    return values.filter(val => val.toLowerCase().includes(query));
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No logspec lines found
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">Results</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-bold text-blue-600 dark:text-blue-400">{filteredAndSortedData.length}</span> of <span className="font-bold">{data.length}</span> logspec line{data.length !== 1 ? 's' : ''} 
            {getActiveFilterCount() > 0 && (
              <span className="ml-1">(<span className="font-semibold text-orange-600 dark:text-orange-400">{getActiveFilterCount()}</span> filter{getActiveFilterCount() !== 1 ? 's' : ''} applied)</span>
            )}
            {' '}out of <span className="font-semibold">{totalCount}</span> total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg font-medium text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Columns
              {visibleColumnsArray.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 dark:bg-blue-500 text-white text-xs rounded-full">
                  {visibleColumnsArray.length}
                </span>
              )}
            </button>
          </div>
          {getActiveFilterCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg font-medium text-sm hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters ({getActiveFilterCount()})
            </button>
          )}
          <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium text-sm">
            ✓ Filtered
          </div>
        </div>
      </div>

      {showColumnSelector && (
        <div className="mb-6 relative" ref={dropdownRef}>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Columns to Display</h4>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search columns..."
                  value={columnSearchQuery}
                  onChange={(e) => setColumnSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg 
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {columnSearchQuery && (
                  <button
                    onClick={() => setColumnSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {filteredColumns.length} of {dataColumns.length} columns
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {filteredColumns.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  No columns found matching "{columnSearchQuery}"
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredColumns.map(col => (
                    <label 
                      key={col.key} 
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 bg-white dark:bg-gray-700"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {col.label}
                      </span>
                      {col.isDefault && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          Default
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <button
                onClick={() => {
                  const allKeys = new Set(dataColumns.map(col => col.key));
                  setVisibleColumns(allKeys);
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Select All
              </button>
              <button
                onClick={() => {
                  const defaults = new Set(dataColumns.filter(col => col.isDefault).map(col => col.key));
                  setVisibleColumns(defaults);
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
              >
                Reset to Defaults
              </button>
              <button
                onClick={() => setShowColumnSelector(false)}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full border-collapse bg-white dark:bg-gray-800">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
              {visibleColumnsArray.map(key => {
                const isFilterOpen = openFilterColumn === key;
                const hasFilter = isFilterActive(key);
                const filterValues = columnFilters.get(key) || new Set();
                const uniqueValues = getUniqueColumnValues(key);
                const isDragging = draggedColumn === key;
                const isDragOver = dragOverColumn === key;
                
                return (
                  <th
                    key={key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, key)}
                    onDragOver={(e) => handleDragOver(e, key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, key)}
                    onDragEnd={handleDragEnd}
                    className={`px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider select-none relative transition-all ${
                      isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'
                    } ${
                      isDragOver ? 'border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-inner' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="cursor-move text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                        title="Drag to reorder column"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      <div
                        onClick={() => {
                          if (!draggedColumn) {
                            handleSort(key);
                          }
                        }}
                        className="flex items-center cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1"
                      >
                        {getColumnLabel(key)}
                        <SortIcon column={key} />
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!draggedColumn) {
                              setOpenFilterColumn(isFilterOpen ? null : key);
                              setFilterSearchQuery('');
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                            hasFilter ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                          }`}
                          title="Filter column"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          {hasFilter && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 dark:bg-blue-400 rounded-full border-2 border-white dark:border-gray-800"></span>
                          )}
                        </button>
                        
                        {isFilterOpen && (
                          <div
                            ref={(el) => {
                              if (el) {
                                filterDropdownRefs.current.set(key, el);
                              } else {
                                filterDropdownRefs.current.delete(key);
                              }
                            }}
                            className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  Filter {getColumnLabel(key)}
                                </h4>
                                {hasFilter && (
                                  <button
                                    onClick={() => clearColumnFilter(key)}
                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search values..."
                                  value={filterSearchQuery}
                                  onChange={(e) => setFilterSearchQuery(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full px-3 py-2 pl-9 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                <svg 
                                  className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {filterSearchQuery && (
                                  <button
                                    onClick={() => setFilterSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {getFilteredColumnValues(key).length} of {uniqueValues.length} values
                              </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2">
                              {getFilteredColumnValues(key).length === 0 ? (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                                  No values found
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {getFilteredColumnValues(key).map((value, idx) => (
                                    <label
                                      key={`${key}-${idx}-${value}`}
                                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={filterValues.has(value)}
                                        onChange={() => toggleFilterValue(key, value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2 bg-white dark:bg-gray-700"
                                      />
                                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                        {value || <span className="text-gray-400 dark:text-gray-500 italic">(empty)</span>}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {filterValues.size} selected
                              </div>
                              <button
                                onClick={() => {
                                  const allValues = new Set(getUniqueColumnValues(key));
                                  setColumnFilters(prev => {
                                    const next = new Map(prev);
                                    next.set(key, allValues);
                                    return next;
                                  });
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                              >
                                Select All
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {hasFilter && (
                      <div className="absolute bottom-1 left-6 right-6 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedData.map((row, index) => (
              <tr
                key={index}
                className="transition-colors hover:bg-blue-50 dark:hover:bg-gray-700/50 even:bg-gray-50/50 dark:even:bg-gray-900/30"
              >
                {visibleColumnsArray.map(key => {
                  const value = getCellValue(row, key);
                  const isDelivery = key === 'delivery';
                  const isShipMethod = key === 'shipMethod';
                  const isCountry = key === 'country';
                  const isPendingLines = key === 'outboundPendingLines';
                  
                  return (
                    <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {isDelivery ? (
                        <span className="font-medium text-gray-900 dark:text-gray-200">{value}</span>
                      ) : isShipMethod ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {value}
                        </span>
                      ) : isCountry ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          {value}
                        </span>
                      ) : isPendingLines ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          parseInt(value || '0') > 0
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {value || '0'}
                        </span>
                      ) : (
                        value || <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
