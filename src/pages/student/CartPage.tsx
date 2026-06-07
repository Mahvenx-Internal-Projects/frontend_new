import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, CreditCard, Tag, ArrowRight, CheckCircle2, Lock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, paymentsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useOrgStore } from '../../store/orgStore';

declare global { interface Window { Razorpay: any; } }

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CartPage() {
  const { user } = useAuthStore();
  const { org }  = useOrgStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);

  const currency = org?.currency || 'INR';
  const symbol   = currency === 'INR' ? '₹' : '$';
  const p = org?.primaryColor || '#f97316';

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => cartApi.get(user!.id).then(r => r.data),
    enabled: !!user?.id,
  });

  const removeMut = useMutation({
    mutationFn: (courseId: number) => cartApi.remove(user!.id, courseId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cart'] }); toast.success('Removed'); },
  });

  const items: any[] = cartItems as any[];
  const subtotal = items.reduce((s: number, i: any) => s + i.price, 0);

  const handleCheckout = async () => {
    if (!items.length) return;
    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { toast.error('Could not load payment gateway'); setPaying(false); return; }

      const { data: orderData } = await paymentsApi.createOrder({
        userId: user!.id,
        courseIds: items.map((i: any) => i.courseId),
      });

      const options = {
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        org?.name || 'LMS Portal',
        description: `${items.length} Course${items.length > 1 ? 's' : ''} Purchase`,
        image:       org?.logoUrl || '',
        order_id:    orderData.razorpayOrderId,
        prefill: {
          name:    orderData.userName,
          email:   orderData.userEmail,
          contact: orderData.userPhone,
        },
        theme: { color: p },
        modal: {
          ondismiss: () => { setPaying(false); toast('Payment cancelled', { icon: 'ℹ️' }); }
        },
        handler: async (response: any) => {
          try {
            const { data } = await paymentsApi.verifyPayment({
              orderId:            orderData.orderId,
              razorpayOrderId:    response.razorpay_order_id,
              razorpayPaymentId:  response.razorpay_payment_id,
              razorpaySignature:  response.razorpay_signature,
            });
            qc.invalidateQueries({ queryKey: ['cart'] });
            qc.invalidateQueries({ queryKey: ['my-enrollments'] });
            toast.success(`Payment successful! Enrolled in ${data.enrolledCourses?.length ?? items.length} course(s) 🎉`);
            navigate('/dashboard/my-courses');
          } catch {
            toast.error('Payment verification failed. Contact support.');
          } finally { setPaying(false); }
        },
      };

      new window.Razorpay(options).open();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Checkout failed');
      setPaying(false);
    }
  };

  if (isLoading) return (
    <div className="max-w-5xl animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl" />)}</div>
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl space-y-6" style={{ fontFamily: `'${org?.themeFont || 'Poppins'}', sans-serif` }}>
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${p}, ${org?.secondaryColor || '#ea580c'})` }}>
            <ShoppingCart className="w-5 h-5" />
          </div>
          My Cart
        </h1>
        <p className="text-sm text-gray-500 mt-1">{items.length} course{items.length !== 1 ? 's' : ''} in your cart</p>
      </div>

      {items.length === 0 ? (
        <div className="card p-20 text-center rounded-3xl border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="font-bold text-gray-600 text-xl">Your cart is empty</h3>
          <p className="text-gray-400 text-sm mt-2 mb-6">Find courses you love and add them here</p>
          <button className="btn-primary mx-auto" onClick={() => navigate('/dashboard/catalog')}>
            Browse Courses →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item: any) => (
              <div key={item.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-24 h-18 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center"
                  style={{ minHeight: 72 }}>
                  {item.thumbnailUrl
                    ? <img src={item.thumbnailUrl} alt={item.courseTitle} className="w-full h-full object-cover" />
                    : <span className="text-3xl">📚</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{item.courseTitle}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500">Full lifetime access</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500">Certificate on completion</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="font-black text-xl" style={{ color: p }}>
                    {symbol}{Number(item.price).toLocaleString('en-IN')}
                  </span>
                  <button onClick={() => removeMut.mutate(item.courseId)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-4 space-y-5">
              <h2 className="font-black text-gray-900 text-lg">Order Summary</h2>

              {/* Course breakdown */}
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate flex-1 mr-2">{item.courseTitle}</span>
                    <span className="font-semibold text-gray-900 flex-shrink-0">
                      {symbol}{Number(item.price).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal ({items.length} courses)</span>
                  <span>{symbol}{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-black text-gray-900 text-lg">
                  <span>Total</span>
                  <span style={{ color: p }}>{symbol}{subtotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Pay button */}
              <button
                onClick={handleCheckout}
                disabled={paying || items.length === 0}
                className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${p}, ${org?.secondaryColor || '#ea580c'})` }}>
                <CreditCard className="w-5 h-5" />
                {paying ? 'Processing…' : `Pay ${symbol}${subtotal.toLocaleString('en-IN')}`}
              </button>

              {/* Security note */}
              <div className="flex items-start gap-2 text-xs text-gray-400">
                <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Secure payment via Razorpay. Your data is encrypted.</span>
              </div>

              {/* Payment methods */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accepted payments</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {['🏦 UPI', '💳 Cards', '🌐 NetBanking', '📱 Wallets', '🔄 EMI', '💰 More'].map(m => (
                    <div key={m} className="bg-gray-50 rounded-lg px-2 py-1.5 text-center text-xs text-gray-600 font-medium">{m}</div>
                  ))}
                </div>
              </div>

              {/* What you get */}
              <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                <p className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> What you get
                </p>
                {['Instant enrollment on payment', 'Receipt sent to email', 'Certificate after completion', 'Lifetime access'].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-xs text-orange-700 mb-0.5">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
