import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IndianRupee, TrendingUp, TrendingDown, CreditCard, RefreshCw,
  CheckCircle2, XCircle, Clock, Search, Filter, Download, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useOrgStore } from '../../store/orgStore';
import Modal from '../../components/shared/Modal';
import clsx from 'clsx';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  Success:       { label: 'Success',        className: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  Failed:        { label: 'Failed',         className: 'bg-red-100 text-red-700',      icon: <XCircle className="w-3.5 h-3.5" /> },
  Initiated:     { label: 'Initiated',      className: 'bg-gray-100 text-gray-600',    icon: <Clock className="w-3.5 h-3.5" /> },
  Pending:       { label: 'Pending',        className: 'bg-amber-100 text-amber-700',  icon: <Clock className="w-3.5 h-3.5" /> },
  Refunded:      { label: 'Refunded',       className: 'bg-purple-100 text-purple-700', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  PartialRefund: { label: 'Part. Refunded', className: 'bg-blue-100 text-blue-700',    icon: <RefreshCw className="w-3.5 h-3.5" /> },
};

const METHOD_EMOJI: Record<string, string> = {
  UPI: '📱', Card: '💳', NetBanking: '🏦', Wallet: '👛', EMI: '🔄', Unknown: '❓'
};

export default function PaymentTransactionsPage() {
  const { user } = useAuthStore();
  const { org }  = useOrgStore();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [detailModal, setDetailModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState('');

  const currency = org?.currency || 'INR';
  const symbol   = currency === 'INR' ? '₹' : '$';
  const p = org?.primaryColor || '#f97316';

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', statusFilter, from, to, page],
    queryFn: () => paymentsApi.getTransactions({
      status: statusFilter || undefined,
      from: from || undefined,
      to: to || undefined,
      page, size: 20,
    }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const refundMut = useMutation({
    mutationFn: () => paymentsApi.refund({
      transactionId: selected!.id,
      amount: refundAmount ? parseFloat(refundAmount) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Refund processed successfully');
      setRefundModal(false);
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Refund failed'),
  });

  const summary = (data as any)?.summary;
  const transactions: any[] = (data as any)?.items ?? [];

  return (
    <div className="space-y-6" style={{ fontFamily: `'${org?.themeFont || 'Poppins'}', sans-serif` }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ background: `linear-gradient(135deg, ${p}, ${org?.secondaryColor || '#ea580c'})` }}>
              <CreditCard className="w-5 h-5" />
            </div>
            Payment Transactions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Complete audit log of all payments, refunds and transactions</p>
        </div>
      </div>

      {/* Revenue summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: summary.totalRevenue, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', fmt: true },
            { label: 'Total Refunds', value: summary.totalRefunds, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', fmt: true },
            { label: 'Net Revenue', value: summary.netRevenue, icon: IndianRupee, color: 'text-brand-600', bg: 'bg-brand-50', fmt: true },
            { label: 'Success Rate', value: data?.totalCount > 0 ? Math.round((summary.successCount / data.totalCount) * 100) : 0, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50', fmt: false, suffix: '%' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {card.fmt ? `${symbol}${Number(card.value).toLocaleString('en-IN')}` : `${card.value}${card.suffix ?? ''}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by email, transaction ID…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>From</span>
          <input type="date" className="input w-36" value={from} onChange={e => setFrom(e.target.value)} />
          <span>to</span>
          <input type="date" className="input w-36" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead><tr>
              <th>Transaction</th><th>User</th><th>Amount</th><th>Method</th>
              <th>Courses</th><th>Status</th><th>Date</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={8}><div className="h-12 bg-gray-50 animate-pulse rounded m-1" /></td></tr>
              )) : transactions.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No transactions found</p>
                </td></tr>
              ) : transactions.map(t => {
                const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.Initiated;
                return (
                  <tr key={t.id}>
                    <td>
                      <div>
                        <p className="font-mono text-xs font-semibold text-gray-900">{t.transactionRef}</p>
                        {t.razorpayPaymentId && <p className="font-mono text-xs text-gray-400">{t.razorpayPaymentId}</p>}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{t.user?.firstName} {t.user?.lastName}</p>
                        <p className="text-xs text-gray-400">{t.user?.email}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-black text-base" style={{ color: p }}>{symbol}{Number(t.amount).toLocaleString('en-IN')}</p>
                        {t.refundAmount && <p className="text-xs text-red-500">-{symbol}{Number(t.refundAmount).toLocaleString('en-IN')} refund</p>}
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <span>{METHOD_EMOJI[t.method] ?? '❓'}</span>
                        {t.method}
                      </span>
                    </td>
                    <td>
                      <div className="max-w-32">
                        {(t.order?.courses ?? []).map((c: string) => (
                          <p key={c} className="text-xs text-gray-500 truncate">{c}</p>
                        ))}
                        {!t.order && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td>
                      <span className={clsx('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full', sc.className)}>
                        {sc.icon} {sc.label}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="text-xs text-gray-700">{new Date(t.initiatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className="text-xs text-gray-400">{new Date(t.initiatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                          onClick={() => { setSelected(t); setDetailModal(true); }} title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        {t.status === 'Success' && (
                          <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                            onClick={() => { setSelected(t); setRefundAmount(String(t.amount)); setRefundModal(true); }}
                            title="Process refund">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {((data as any)?.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {(data as any)?.totalPages} · {(data as any)?.totalCount} transactions
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn-secondary text-xs" disabled={page >= ((data as any)?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="Transaction Details" size="lg">
        {selected && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Transaction ID', selected.transactionRef],
                ['Razorpay Order ID', selected.razorpayOrderId ?? '—'],
                ['Razorpay Payment ID', selected.razorpayPaymentId ?? '—'],
                ['Amount', `${symbol}${Number(selected.amount).toLocaleString('en-IN')}`],
                ['Currency', selected.currency],
                ['Status', selected.status],
                ['Method', `${METHOD_EMOJI[selected.method] ?? ''} ${selected.method}`],
                ['Initiated', new Date(selected.initiatedAt).toLocaleString('en-IN')],
                ['Completed', selected.completedAt ? new Date(selected.completedAt).toLocaleString('en-IN') : '—'],
                ['IP Address', selected.ipAddress ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{k}</p>
                  <p className="text-sm font-semibold text-gray-900 break-all">{v}</p>
                </div>
              ))}
            </div>
            {selected.order?.courses?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Courses Purchased</p>
                <div className="space-y-1">
                  {selected.order.courses.map((c: string) => (
                    <div key={c} className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-3 py-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> {c}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selected.failureReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-600 font-semibold uppercase mb-1">Failure Reason</p>
                <p className="text-sm text-red-700">{selected.failureReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Refund Modal */}
      <Modal open={refundModal} onClose={() => setRefundModal(false)} title="Process Refund" size="sm">
        {selected && (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800">⚠️ Refund Confirmation</p>
              <p className="text-xs text-amber-700 mt-1">
                Refunding payment for <strong>{selected.user?.firstName} {selected.user?.lastName}</strong>
              </p>
            </div>
            <div>
              <label className="label">Refund Amount ({symbol})</label>
              <input className="input font-mono" type="number" step="0.01" max={selected.amount}
                value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Max: {symbol}{Number(selected.amount).toLocaleString('en-IN')} · Leave as-is for full refund</p>
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setRefundModal(false)}>Cancel</button>
              <button className="btn-danger flex-1 justify-center" onClick={() => refundMut.mutate()}
                disabled={refundMut.isPending}>
                {refundMut.isPending ? 'Processing…' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
