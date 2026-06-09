import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ShieldAlert, ShieldCheck, RefreshCw, Calendar, Tag, AlertTriangle } from 'lucide-react'
import { warrantyApi } from '../../api/index'
import { formatDate } from '../../utils/formatters'
import { useDebounce } from '../../hooks/useDebounce'

const DAYS_OPTIONS = [
  { label: 'All Warranties', value: '' },
  { label: 'Expiring in 30 Days', value: '30' },
  { label: 'Expiring in 90 Days', value: '90' },
  { label: 'Expiring in 180 Days', value: '180' }
]

function warrantyStatus(expiryDate) {
  if (!expiryDate) return { label: 'No Warranty', badge: 'badge-gray', active: false }
  const exp = new Date(expiryDate)
  const now = new Date()
  if (exp < now) {
    return { label: 'Expired', badge: 'badge-danger', active: false }
  }
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
  if (diffDays <= 30) {
    return { label: `Expiring Soon (${diffDays}d)`, badge: 'badge-warning', active: true }
  }
  return { label: 'Active', badge: 'badge-success', active: true }
}

export default function WarrantyPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [daysFilter, setDaysFilter] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  // Fetch Warranties
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['warranties', { page, search: debouncedSearch, days: daysFilter }],
    queryFn: () => {
      if (daysFilter) {
        return warrantyApi.getExpiring(daysFilter, {
          page,
          size: 20,
          search: debouncedSearch || undefined
        }).then(r => r.data.data)
      }
      return warrantyApi.getAll({
        page,
        size: 20,
        search: debouncedSearch || undefined
      }).then(r => r.data.data)
    },
    keepPreviousData: true
  })

  const records = data?.content || []
  const totalPages = data?.totalPages || 0
  const totalEl = data?.totalElements || 0

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Warranty Tracker</h1>
          <nav className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            Dashboard &rsaquo; <span style={{ color: 'var(--ams-blue-mid)' }}>Warranty</span>
          </nav>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1" style={{ minWidth: '220px' }}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'rgb(var(--text-muted))' }} />
            <input
              type="text"
              placeholder="Search by asset name or provider..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="search-input"
            />
          </div>
          <select
            value={daysFilter}
            onChange={e => { setDaysFilter(e.target.value); setPage(0) }}
            className="input text-sm h-[38px]"
            style={{ width: 'auto', minWidth: '170px' }}
          >
            {DAYS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button onClick={() => refetch()} className="btn-secondary btn-sm">
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Warranty Table Card */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center justify-between"
             style={{ borderColor: 'rgb(var(--border-color))' }}>
          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
            Warranty Records
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
                    <th>Provider</th>
                    <th>Type</th>
                    <th>Contract Number</th>
                    <th>Start Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12" style={{ color: 'rgb(var(--text-muted))' }}>
                        No warranty records found.
                      </td>
                    </tr>
                  ) : records.map(row => {
                    const status = warrantyStatus(row.expiryDate)
                    return (
                      <tr key={row.id}>
                        <td><span className="table-asset-tag">#{row.assetId}</span></td>
                        <td>
                          <div className="font-medium text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                            {row.assetName || `Asset #${row.assetId}`}
                          </div>
                        </td>
                        <td className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {row.providerName || '—'}
                        </td>
                        <td className="text-sm font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {row.warrantyType || 'MANUFACTURER'}
                        </td>
                        <td className="text-sm font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                          {row.contractNumber || '—'}
                        </td>
                        <td className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {formatDate(row.startDate) || '—'}
                        </td>
                        <td className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {formatDate(row.expiryDate) || '—'}
                        </td>
                        <td>
                          <span className={`badge ${status.badge}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
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
