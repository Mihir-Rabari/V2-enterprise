'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TableColumn } from '../types';
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Package, Search } from 'lucide-react';

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: TableColumn<T>[];
  onAdd?: () => void;
  addButtonLabel?: string;
  showBreadcrumbs?: boolean;
  breadcrumbsPath?: string[];
  // Pagination
  currentPage?: number;
  totalPages?: number;
  totalEntries?: number;
  onPageChange?: (page: number) => void;
  limit?: number;
  // Bulk operations
  bulkActions?: { label: string; onClick: (selectedIds: (string | number)[]) => void; variant?: 'danger' | 'default' }[];
  onRowClick?: (row: T) => void;
  // Server-side search: when provided, client-side filtering is disabled and this callback fires on search changes (debounced 400ms)
  onSearch?: (query: string) => void;
}

const DataTable = <T extends { id: number | string;[key: string]: any }>({
  title,
  data,
  columns,
  onAdd,
  addButtonLabel,
  showBreadcrumbs = true,
  breadcrumbsPath = [],
  currentPage = 1,
  totalPages = 1,
  totalEntries = 0,
  onPageChange,
  limit = 10,
  bulkActions = [],
  onRowClick,
  onSearch,
}: DataTableProps<T>) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced server-side search
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (onSearch) {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        onSearch(q);
      }, 400);
    }
  };

  // Filter data client-side based on search query (only when no server-side search)
  const filteredData = useMemo(() => {
    if (onSearch) return data; // Server handles filtering
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(row => {
      // Search through all string/number fields of the row
      return Object.values(row).some(val => {
        if (typeof val === 'string') return val.toLowerCase().includes(q);
        if (typeof val === 'number') return val.toString().includes(q);
        if (val && typeof val === 'object') {
          // Nested objects like user: { name, email }
          return Object.values(val).some(nestedVal =>
            typeof nestedVal === 'string' && nestedVal.toLowerCase().includes(q)
          );
        }
        return false;
      });
    });
  }, [data, searchQuery, onSearch]);

  const displayData = filteredData;

  const toggleSelectAll = () => {
    if (selectedIds.length === displayData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayData.map(r => r.id));
    }
  };

  const toggleSelectRow = (id: string | number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const hasBulkActions = bulkActions.length > 0;

  return (
    <div className="w-full">
      {showBreadcrumbs && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100">
          <p className="text-sm text-gray-600">
            Home <span className="mx-2 text-gray-400">&gt;</span>
            {breadcrumbsPath.map((crumb, idx) => (
              <span key={idx}>
                {idx > 0 && <span className="mx-2 text-gray-400">&gt;</span>}
                <span className={idx === breadcrumbsPath.length - 1 ? "text-slate-800 font-medium" : ""}>{crumb}</span>
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">{title}</h2>
          <div className="flex items-center gap-3">
            {hasBulkActions && selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedIds.length} selected</span>
                {bulkActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => { action.onClick(selectedIds); setSelectedIds([]); }}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${action.variant === 'danger'
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            {onAdd && addButtonLabel && (
              <button
                onClick={onAdd}
                className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded text-[11px] sm:text-sm font-bold transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {addButtonLabel}
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-center text-[11px] sm:text-sm text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">
              <span className="mr-2">Show</span>
              <select className="border border-gray-200 rounded-lg px-2 py-1 mx-1 focus:outline-none focus:border-luxury-gold bg-white text-luxury-black">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              <span className="ml-2">entries</span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="text"
                className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-luxury-gold w-full bg-gray-50 text-luxury-black font-medium text-sm"
                placeholder="Search by name, ID, email..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar-horizontal pb-2">
            <table className="w-full text-left text-sm text-gray-600 min-w-[600px] sm:min-w-full">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <tr>
                  {hasBulkActions && (
                    <th className="px-3 sm:px-4 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === displayData.length && displayData.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-3 sm:px-4 py-4 w-16">Sr.</th>
                  {columns.map((col, idx) => (
                    <th key={idx} className={`px-3 sm:px-4 py-4 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {col.header}
                    </th>
                  ))}
                  <th className="px-3 sm:px-4 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayData.map((row, idx) => (
                  <tr
                    key={(row as any)._id || row.id || idx}
                    onClick={(e) => {
                      // Don't trigger row click if clicking on buttons, inputs, links, etc.
                      const target = e.target as HTMLElement;
                      if (onRowClick && !target.closest('button, input, select, a, textarea')) {
                        onRowClick(row);
                      }
                    }}
                    className={`
                      hover:bg-gray-50/80 transition-all duration-200 group relative
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${selectedIds.includes(row.id) ? 'bg-luxury-gold/5' : ''}
                    `}
                  >
                    {hasBulkActions && (
                      <td className="px-3 sm:px-4 py-4 align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectRow(row.id);
                          }}
                          className="rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-3 sm:px-4 py-4 align-middle">
                      <div className="flex items-center font-bold text-gray-300 group-hover:text-luxury-gold transition-colors">
                        {idx + 1}
                      </div>
                    </td>
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`px-3 sm:px-4 py-4 align-middle text-luxury-black font-medium ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                        {typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor] as React.ReactNode)}
                      </td>
                    ))}
                    <td className="px-3 sm:px-4 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="text-gray-300 hover:text-luxury-black hover:bg-gray-100 p-2 rounded-xl transition-all"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {displayData.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 2 + (hasBulkActions ? 1 : 0)} className="px-4 py-20">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                          <Package className="text-gray-200" size={32} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-1">
                          {searchQuery ? 'No results found' : 'No collections found'}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest max-w-[200px]">
                          {searchQuery ? 'Try a different search term.' : 'This registry is currently empty. New entries will appear here once created.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 text-[10px] font-bold uppercase tracking-widest text-gray-400 gap-4">
            <div className="text-center sm:text-left">
              Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, searchQuery.trim() ? filteredData.length : (totalEntries || data.length))} of {searchQuery.trim() ? filteredData.length : (totalEntries || data.length)} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 border border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-30 text-gray-400 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  if (totalPages > 5 && p > 1 && p < totalPages && Math.abs(p - currentPage) > 1) {
                    if (p === 2 || p === totalPages - 1) return <span key={p}>...</span>;
                    return null;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => onPageChange?.(p)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${currentPage === p ? 'bg-luxury-black text-white shadow-lg' : 'hover:bg-gray-50 text-gray-400 border border-gray-100'}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 border border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-30 text-gray-400 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DataTable;
