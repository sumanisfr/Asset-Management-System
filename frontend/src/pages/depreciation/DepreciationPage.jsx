import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calculator, Search, RefreshCw, Landmark, ArrowRightLeft } from 'lucide-react'
import { depreciationApi } from '../../api/index'
import { formatDate, formatCurrency } from '../../utils/formatters'
import { useToast } from '../../hooks/useToast'
import { useDebounce } from '../../hooks/useDebounce'
import useAuthStore from '../../store/authStore'

export default function DepreciationPage() {
  const { isAdmin } = useAuthStore()
  const qc = useQueryClient()
  const { success, error } = useToast()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const debouncedSearch = useDebounce(search, 400)

  // Fetch Depreciation Records
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['depreciation', { page, search: debouncedSearch }],
    queryFn: () => depreciationApi.getRecords({
      page,
      size: 20,
      search: debouncedSearch || undefined
    }).then(r => r.data.data),
    keepPreviousData: true
  })

  // Calculate All Assets Depreciation mutation
  const calculateAllMutation = useMutation({
    mutationFn: depreciationApi.calculateAll,
    onSuccess: () => {
      success('Depreciation calculated successfully for all eligible assets!')
      qc.invalidateQueries(['depreciation'])
    },
    onError: e => error(e?.response?.data?.message || 'Failed to calculate depreciation')
  })

  // Calculate single Asset Depreciation mutation
  const calculateSingleMutation = useMutation({
    mutationFn: (assetId) => depreciationApi.calculate(assetId),
    onSuccess: () => {
      success('Depreciation calculated for this asset!')
      qc.invalidateQueries(['depreciation'])
    },
    onError: e => error(e?.response?.data?.message || 'Failed to calculate')
  })

  const handleCalculateAll = () => {
    if (window.confirm('Calculate depreciation for the current year for all eligible assets?')) {
      calculateAllMutation.mutate()
    }
  }

  const handleCalculateSingle = (assetId) => {
    calculateSingleMutation.mutate(assetId)
  }

  const records = data?.content || []
  const totalPages = data?.totalPages || 0
  const totalEl = data?.totalElements || 0

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Depreciation Ledger</h1>
          <nav className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            Dashboard &rsaquo; <span style={{ color: 'var(--ams-blue-mid)' }}>Depreciation</span>
          </nav>
        </div>
        {isAdmin && isAdmin() && (
          <button
            onClick={handleCalculateAll}
            disabled={calculateAllMutation.isLoading}
            className="btn-primary btn-sm flex items-center gap-1.5"
          >
            <Calculator size={14} /> Calculate Year Depreciation
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1" style={{ minWidth: '220px' }}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'rgb(var(--text-muted))' }} />
            <input
              type="text"
              placeholder="Search by asset name or financial year..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="search-input"
            />
          </div>
          <button onClick={() => refetch()} className="btn-secondary btn-sm">
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center justify-between"
             style={{ borderColor: 'rgb(var(--border-color))' }}>
          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
            Depreciation Entries
            <span className="ml-2 text-xs font-normal" style={{ color: 'rgb(var(--text-muted))' }}>({totalEl})</span>
          </p>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset ID</th>
                    <th>Asset Name</th>
                    <th>Financial Year</th>
                    <th>Opening Value</th>
                    <th>Depreciation Rate</th>
                    <th>Depreciation Amt</th>
                    <th>Closing Value</th>
                    <th>Method</th>
                    <th>Calculated Date</th>
                    {isAdmin && isAdmin() && <th className="text-center">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12" style={{ color: 'rgb(var(--text-muted))' }}>
                        No depreciation records found.
                      </td>
                    </tr>
                  ) : records.map(row => (
                    <tr key={row.id}>
                      <td><span className="table-asset-tag">#{row.assetId}</span></td>
                      <td>
                        <div className="font-medium text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                          {row.assetName || `Asset #${row.assetId}`}
                        </div>
                      </td>
                      <td className="text-sm font-semibold" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {row.financialYear}
                      </td>
                      <td className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                        {formatCurrency(row.openingValue)}
                      </td>
                      <td className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {(Number(row.depreciationRate || 0) * 100).toFixed(1)}%
                      </td>
                      <td className="text-sm text-red-500 font-medium">
                        -{formatCurrency(row.depreciationAmt)}
                      </td>
                      <td className="text-sm font-semibold" style={{ color: 'var(--ams-blue-mid)' }}>
                        {formatCurrency(row.closingValue)}
                      </td>
                      <td className="text-xs font-semibold" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {row.method?.replace('_', ' ') || 'STRAIGHT LINE'}
                      </td>
                      <td className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                        {formatDate(row.calculatedAt)}
                      </td>
                      {isAdmin && isAdmin() && (
                        <td>
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleCalculateSingle(row.assetId)}
                              className="btn-secondary btn-xs flex items-center gap-1"
                              title="Recalculate"
                            >
                              <RefreshCw size={11} /> Recalculate
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t"
                   style={{ borderColor: 'rgb(var(--border-color))' }}>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="pagination-btn disabled:opacity-40">
                    &lsaquo; Prev
                  </button>
                  <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)} className="pagination-btn disabled:opacity-40">
                    Next &rsaquo;
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
