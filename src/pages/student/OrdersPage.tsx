import { useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle2, Clock, XCircle, Package } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useOrgStore } from '../../store/orgStore';
import clsx from 'clsx';

const statusIcon: Record<string, React.ReactNode> = {
  Paid:    <CheckCircle2 className="w-4 h-4 text-green-500" />,
  Pending: <Clock className="w-4 h-4 text-amber-500" />,
  Failed:  <XCircle className="w-4 h-4 text-red-500" />,
};
const statusBadge: Record<string, string> = {
  Paid: 'bg-green-100 text-green-700', Pending: 'bg-amber-100 text-amber-700', Failed: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const { user } = useAuthStore();
  const { org } = useOrgStore();
  const currency = org?.currency || 'INR';
  const symbol = currency === 'INR' ? '₹' : '$';

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => api.get(`/orders/user/${user?.id}`).then(r => r.data),
    enabled: !!user?.id,
  });

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6" style={{ color: 'var(--org-primary)' }} /> My Orders
        </h1>
        <p className="text-sm text-gray-500 mt-1">Your purchase history</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}</div>
      ) : (orders as any[]).length === 0 ? (
        <div className="card p-16 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">No orders yet</p>
          <p className="text-gray-400 text-sm mt-1">Your purchases will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(orders as any[]).map((order: any) => (
            <div key={order.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1', statusBadge[order.status])}>
                    {statusIcon[order.status]} {order.status}
                  </span>
                  <span className="font-bold text-lg" style={{ color: 'var(--org-primary)' }}>
                    {symbol}{Number(order.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                {(order.items as any[]).map((item: any) => (
                  <div key={item.courseId} className="flex justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <span>{item.courseTitle}</span>
                    <span className="font-medium">{symbol}{Number(item.price).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              {order.razorpayPaymentId && (
                <p className="text-xs text-gray-400 mt-2 font-mono">Payment ID: {order.razorpayPaymentId}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
