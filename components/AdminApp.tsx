import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, BarChart3, Check, ClipboardList, Landmark, Lock,
  Package, ShieldCheck, Truck, UserRound, Users, WalletCards, X, Zap, Settings2, Save, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

const CURRENCY = 'ر.ي';

type AdminTab = 'stats' | 'wallets' | 'payment_receipts' | 'merchant_withdrawals' | 'payment_settings' | 'users' | 'orders';

type ProfileRow = {
  id: string;
  role: string;
  full_name: string | null;
  phone_number: string | null;
  is_active: boolean;
};

type TxRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  payment_method: string | null;
  transaction_status: string;
};

type PaymentReceiptRow = {
  id: string;
  user_id: string;
  order_id: string | null;
  payment_method_code: string | null;
  amount: number;
  reference_number: string | null;
  status: string;
  created_at: string;
};

type PaymentMethodRow = {
  id: string;
  name: string;
  code: string | null;
  account_number: string | null;
  instructions: string | null;
  is_active: boolean;
};

type MerchantWithdrawalRow = {
  id: string;
  merchant_id: string;
  amount: number;
  payment_method_code: string;
  account_number: string;
  status: string;
  note: string | null;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
};

type OrderRow = {
  id: string;
  customer_id: string;
  store_id: string;
  driver_id: string | null;
  status: string;
  total_amount: number;
  delivery_fee: number;
  custom_delivery_fee: number | null;
  courier_distance: number | null;
  created_at: string;
};

type Stats = {
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  totalTransactions: number;
  pendingTransactions: number;
  totalUsers: number;
  totalDrivers: number;
  totalMerchants: number;
  totalTransactionVolume: number;
};

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
      <div className="flex justify-between text-sm text-white/45">
        <span>{label}</span>
        <Icon size={18} className={accent ? 'text-[#e3fe00]' : 'text-white/30'} />
      </div>
      <p className="mt-5 text-3xl font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400',
    completed: 'bg-[#e3fe00]/10 text-[#e3fe00]',
    rejected: 'bg-red-500/10 text-red-400',
    accepted: 'bg-blue-500/10 text-blue-400',
    at_store: 'bg-purple-500/10 text-purple-400',
    picked_up: 'bg-indigo-500/10 text-indigo-400',
    en_route: 'bg-cyan-500/10 text-cyan-400',
    delivered: 'bg-[#e3fe00]/10 text-[#e3fe00]',
    cancelled: 'bg-red-500/10 text-red-400',
  };

  return <span className={`rounded-full px-3 py-1 text-[10px] font-black ${map[status] || 'bg-white/10 text-white/50'}`}>{status}</span>;
}

export default function AdminApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceiptRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [merchantWithdrawals, setMerchantWithdrawals] = useState<MerchantWithdrawalRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, { account_number: string; instructions: string; is_active: boolean }>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const [ordersRes, txRes, profilesRes] = await Promise.all([
      supabase.from('orders').select('status'),
      supabase.from('wallet_transactions').select('amount, transaction_status, transaction_type'),
      supabase.from('profiles').select('role'),
    ]);

    const allOrders = ordersRes.data || [];
    const allTx = txRes.data || [];
    const allProfiles = profilesRes.data || [];

    setStats({
      totalOrders: allOrders.length,
      activeOrders: allOrders.filter((o: { status: string }) => !['delivered', 'cancelled'].includes(o.status)).length,
      deliveredOrders: allOrders.filter((o: { status: string }) => o.status === 'delivered').length,
      totalTransactions: allTx.length,
      pendingTransactions: allTx.filter((t: { transaction_status: string }) => t.transaction_status === 'pending').length,
      totalUsers: allProfiles.filter((p: { role: string }) => p.role === 'customer').length,
      totalDrivers: allProfiles.filter((p: { role: string }) => p.role === 'driver').length,
      totalMerchants: allProfiles.filter((p: { role: string }) => p.role === 'merchant').length,
      totalTransactionVolume: allTx.filter((t: { transaction_status: string }) => t.transaction_status === 'completed').reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0),
    });
  }, []);

  const loadTransactions = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, transaction_type, amount, payment_method, transaction_status')
      .order('id', { ascending: false })
      .limit(100);

    if (err) { setError('تعذر تحميل العمليات'); return; }
    setTransactions((data || []) as TxRow[]);
  }, []);

  const loadProfiles = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone_number, is_active')
      .order('created_at', { ascending: false });

    if (err) { setError('تعذر تحميل المستخدمين'); return; }
    setProfiles((data || []) as ProfileRow[]);
  }, []);

  const loadPaymentReceipts = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('payment_receipts')
      .select('id, user_id, order_id, payment_method_code, amount, reference_number, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) { setError('تعذر تحميل إيصالات الدفع'); return; }
    setPaymentReceipts((data || []) as PaymentReceiptRow[]);
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('payment_methods')
      .select('id, name, code, account_number, instructions, is_active')
      .order('name');
    if (err) { setError('تعذر تحميل إعدادات الدفع'); return; }
    const rows = (data || []) as PaymentMethodRow[];
    setPaymentMethods(rows);
    setPaymentDrafts(Object.fromEntries(rows.map((m) => [
      m.id,
      { account_number: m.account_number || '', instructions: m.instructions || '', is_active: Boolean(m.is_active) }
    ])));
  }, []);

  const handlePaymentMethodSave = async (methodId: string) => {
    const draft = paymentDrafts[methodId];
    if (!draft) return;
    setActionLoading('payment-method-' + methodId);
    setError('');
    try {
      const { data, error: err } = await supabase.rpc('admin_update_payment_method', {
        p_payment_method_id: methodId,
        p_account_number: draft.account_number,
        p_instructions: draft.instructions,
        p_is_active: draft.is_active,
      });
      if (err) throw err;
      setPaymentMethods((prev) => prev.map((m) => m.id === methodId ? data as PaymentMethodRow : m));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر حفظ إعدادات طريقة الدفع');
    } finally {
      setActionLoading(null);
    }
  };

  const loadMerchantWithdrawals = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('merchant_withdrawal_requests')
      .select('id, merchant_id, amount, payment_method_code, account_number, status, note, admin_note, created_at, processed_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) { setError('تعذر تحميل طلبات سحب التجار'); return; }
    setMerchantWithdrawals((data || []) as MerchantWithdrawalRow[]);
  }, []);

  const loadOrders = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('orders')
      .select('id, customer_id, store_id, driver_id, status, total_amount, delivery_fee, custom_delivery_fee, courier_distance, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (err) { setError('تعذر تحميل الطلبات'); return; }
    setOrders((data || []) as OrderRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        await Promise.all([loadStats(), loadTransactions(), loadPaymentReceipts(), loadProfiles(), loadMerchantWithdrawals(), loadPaymentMethods(), loadOrders()]);
      } catch {
        setError('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadStats, loadTransactions, loadProfiles, loadMerchantWithdrawals, loadPaymentMethods, loadOrders]);

  const handleTxAction = async (txId: string, action: 'confirm' | 'reject') => {
    setActionLoading(txId + action);
    setError('');
    try {
      const { error: err } = await supabase.rpc('admin_confirm_wallet_transaction', {
        p_transaction_id: txId,
        p_action: action,
      });
      if (err) throw err;
      await Promise.all([loadTransactions(), loadStats()]);
    } catch {
      setError(action === 'confirm' ? 'تعذر تأكيد العملية' : 'تعذر رفض العملية');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePaymentReceipt = async (receiptId: string, action: 'confirm' | 'reject') => {
    setActionLoading(receiptId + action);
    setError('');
    try {
      const { error: err } = await supabase.rpc('admin_process_order_payment_receipt', {
        p_receipt_id: receiptId,
        p_action: action,
        p_note: action === 'reject' ? 'تم رفض إثبات الدفع من الإدارة' : null,
      });
      if (err) throw err;
      await loadPaymentReceipts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر معالجة إيصال الدفع');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMerchantWithdrawal = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(requestId + action);
    setError('');
    try {
      const { error: err } = await supabase.rpc('admin_process_merchant_withdrawal', {
        p_request_id: requestId,
        p_action: action,
        p_admin_note: action === 'reject' ? 'تم رفض الطلب من الإدارة' : null,
      });
      if (err) throw err;
      await loadMerchantWithdrawals();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر معالجة طلب السحب');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserActive = async (userId: string, currentActive: boolean) => {
    setActionLoading(userId);
    setError('');
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ is_active: !currentActive })
        .eq('id', userId);

      if (err) throw err;
      setProfiles((prev) => prev.map((p) => p.id === userId ? { ...p, is_active: !currentActive } : p));
    } catch {
      setError('تعذر تحديث حالة الحساب');
    } finally {
      setActionLoading(null);
    }
  };

  const navItems: [AdminTab, string, React.ElementType][] = [
    ['stats', 'الإحصائيات', BarChart3],
    ['wallets', 'عمليات المحافظ', WalletCards],
    ['payment_receipts', 'إيصالات الدفع', WalletCards],
    ['merchant_withdrawals', 'سحوبات التجار', WalletCards],
    ['payment_settings', 'إعدادات الدفع', Settings2],
    ['users', 'إدارة الحسابات', Users],
    ['orders', 'متابعة الطلبات', ClipboardList],
  ];

  if (loading) {
    return (
      <div className="jarmal-admin flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-white/40">جارٍ تحميل لوحة الإدارة...</div>
      </div>
    );
  }

  return (
    <div className="jarmal-admin min-h-screen">
      <header className="sticky top-0 z-20 border-b px-5 py-3.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3fe00] text-black">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black">لوحة تحكم الإدارة</h1>
              <p className="text-xs text-white/40">جَرْمَل • مساحة الإدارة</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 text-sm font-bold sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3fe00] text-black">
                <UserRound size={17} />
              </div>
              <span>مدير النظام</span>
            </div>
            <button onClick={onLogout} className="rounded-xl p-2 text-white/40 hover:text-red-400">
              <Lock size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-l p-4 lg:block">
          <p className="mb-5 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/25">أقسام الإدارة</p>
          <nav className="space-y-1">
            {navItems.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => { setTab(id); setError(''); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  tab === id ? 'bg-[#e3fe00] text-black' : 'text-white/45 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {label}
                {id === 'wallets' && stats && stats.pendingTransactions > 0 && (
                  <span className="mr-auto rounded-full bg-[#e3fe00] px-2 py-0.5 text-[10px] text-black">{stats.pendingTransactions}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-5 sm:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          {tab === 'stats' && stats && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">نظرة عامة على المنصة</p>
                <h2 className="mt-1 text-3xl font-black">الإحصائيات العامة</h2>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="إجمالي الطلبات" value={stats.totalOrders.toLocaleString('ar-YE')} icon={Package} accent />
                <StatCard label="طلبات نشطة" value={stats.activeOrders.toLocaleString('ar-YE')} icon={Truck} />
                <StatCard label="طلبات مكتملة" value={stats.deliveredOrders.toLocaleString('ar-YE')} icon={Check} />
                <StatCard label="إجمالي العمليات" value={stats.totalTransactions.toLocaleString('ar-YE')} icon={Landmark} accent />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="العملاء" value={stats.totalUsers.toLocaleString('ar-YE')} icon={Users} />
                <StatCard label="المندوبون" value={stats.totalDrivers.toLocaleString('ar-YE')} icon={Truck} />
                <StatCard label="التجار" value={stats.totalMerchants.toLocaleString('ar-YE')} icon={ShieldCheck} />
                <StatCard label="حجم العمليات" value={`${stats.totalTransactionVolume.toLocaleString('ar-YE')} ${CURRENCY}`} icon={WalletCards} accent />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e3fe00]/20 bg-[#e3fe00]/5 p-5">
                  <div className="flex items-center gap-3">
                    <Zap size={20} className="text-[#e3fe00]" />
                    <p className="font-bold">عمليات بانتظار المراجعة</p>
                  </div>
                  <p className="mt-4 text-4xl font-black text-[#e3fe00]">{stats.pendingTransactions}</p>
                  <button onClick={() => setTab('wallets')} className="mt-4 text-sm font-bold text-[#e3fe00] hover:underline">
                    مراجعة العمليات <ArrowLeft className="mr-1 inline" size={14} />
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                  <div className="flex items-center gap-3">
                    <ClipboardList size={20} className="text-white/40" />
                    <p className="font-bold">آخر الطلبات</p>
                  </div>
                  <p className="mt-4 text-4xl font-black">{orders.length}</p>
                  <button onClick={() => setTab('orders')} className="mt-4 text-sm font-bold text-white/50 hover:text-white">
                    متابعة الطلبات <ArrowLeft className="mr-1 inline" size={14} />
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'wallets' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">تأكيد عمليات الشحن والسحب</p>
                <h2 className="mt-1 text-3xl font-black">عمليات المحافظ</h2>
              </div>

              {transactions.length === 0 ? (
                <div className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16">
                  <WalletCards size={42} className="text-white/20" />
                  <h3 className="mt-4 font-bold">لا توجد عمليات حالياً</h3>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-white/[.02] p-4">
                      <div className="flex min-w-[120px] items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tx.transaction_type === 'deposit' ? 'bg-[#e3fe00]/10 text-[#e3fe00]' : 'bg-blue-500/10 text-blue-400'}`}>
                          {tx.transaction_type === 'deposit' ? <ArrowLeft size={17} /> : <ArrowLeft size={17} className="rotate-180" />}
                        </div>
                        <p className="text-sm font-bold">{tx.transaction_type === 'deposit' ? 'شحن' : 'سحب'}</p>
                      </div>

                      <div className="min-w-[140px] flex-1">
                        <p className="text-sm font-bold">{Number(tx.amount).toLocaleString('ar-YE')} {CURRENCY}</p>
                        <p className="mt-1 text-xs text-white/35">{tx.payment_method || '—'}</p>
                      </div>

                      <StatusBadge status={tx.transaction_status} />

                      {tx.transaction_status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTxAction(tx.id, 'confirm')}
                            disabled={actionLoading === tx.id + 'confirm'}
                            className="flex items-center gap-1 rounded-lg bg-[#e3fe00] px-3 py-2 text-xs font-black text-black disabled:opacity-50"
                          >
                            <Check size={14} /> تأكيد
                          </button>
                          <button
                            onClick={() => handleTxAction(tx.id, 'reject')}
                            disabled={actionLoading === tx.id + 'reject'}
                            className="flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <X size={14} /> رفض
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'payment_receipts' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">مراجعة إثباتات التحويل الإلكتروني المرتبطة بالطلبات</p>
                <h2 className="mt-1 text-3xl font-black">إيصالات الدفع</h2>
              </div>
              {paymentReceipts.length === 0 ? (
                <div className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16">
                  <WalletCards size={42} className="text-white/20" />
                  <h3 className="mt-4 font-bold">لا توجد إيصالات دفع</h3>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {paymentReceipts.map((receipt) => (
                    <div key={receipt.id} className="rounded-2xl border border-white/5 bg-white/[.02] p-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="min-w-[180px] flex-1">
                          <p className="text-sm font-black">{Number(receipt.amount).toLocaleString('ar-YE')} {CURRENCY}</p>
                          <p className="mt-1 text-xs text-white/35">الطلب: {receipt.order_id ? '#' + receipt.order_id.slice(0, 8) : 'غير مرتبط'}</p>
                          <p className="mt-1 text-xs text-white/35">طريقة الدفع: {receipt.payment_method_code || '—'} • المرجع: {receipt.reference_number || '—'}</p>
                          <p className="mt-1 text-xs text-white/30">{new Date(receipt.created_at).toLocaleString('ar-YE')}</p>
                        </div>
                        <StatusBadge status={receipt.status} />
                        {receipt.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handlePaymentReceipt(receipt.id, 'confirm')} disabled={actionLoading === receipt.id + 'confirm'} className="rounded-lg bg-[#e3fe00] px-3 py-2 text-xs font-black text-black disabled:opacity-50"><Check size={14} className="mr-1 inline" />تأكيد الدفع</button>
                            <button onClick={() => handlePaymentReceipt(receipt.id, 'reject')} disabled={actionLoading === receipt.id + 'reject'} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 disabled:opacity-50"><X size={14} className="mr-1 inline" />رفض</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'payment_settings' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">إدارة أرقام التحويل وتعليمات الدفع الإلكتروني</p>
                <h2 className="mt-1 text-3xl font-black">إعدادات الدفع</h2>
              </div>
              <div className="mt-7 space-y-4">
                {paymentMethods.filter((m) => m.code !== 'cash').map((method) => {
                  const draft = paymentDrafts[method.id];
                  if (!draft) return null;
                  return (
                    <div key={method.id} className="rounded-2xl border border-white/5 bg-white/[.02] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black">{method.name}</h3>
                          <p className="mt-1 text-xs text-white/35" dir="ltr">{method.code || '—'}</p>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={draft.is_active}
                            onChange={(e) => setPaymentDrafts((prev) => ({ ...prev, [method.id]: { ...prev[method.id], is_active: e.target.checked } }))}
                            className="h-4 w-4 accent-[#e3fe00]"
                          />
                          {draft.is_active ? 'مفعّلة' : 'معطّلة'}
                        </label>
                      </div>
                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-bold text-white/50">رقم الحساب / المحفظة</span>
                          <input
                            value={draft.account_number}
                            onChange={(e) => setPaymentDrafts((prev) => ({ ...prev, [method.id]: { ...prev[method.id], account_number: e.target.value } }))}
                            placeholder="أدخل الرقم الحقيقي للحساب"
                            dir="ltr"
                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-[#e3fe00]/50"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-white/50">تعليمات التحويل</span>
                          <textarea
                            value={draft.instructions}
                            onChange={(e) => setPaymentDrafts((prev) => ({ ...prev, [method.id]: { ...prev[method.id], instructions: e.target.value } }))}
                            placeholder="اكتب تعليمات التحويل التي ستظهر للعميل"
                            rows={3}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-[#e3fe00]/50"
                          />
                        </label>
                      </div>
                      <button
                        onClick={() => handlePaymentMethodSave(method.id)}
                        disabled={actionLoading === 'payment-method-' + method.id}
                        className="mt-4 flex items-center gap-2 rounded-xl bg-[#e3fe00] px-4 py-3 text-sm font-black text-black disabled:opacity-50"
                      >
                        <Save size={16} /> حفظ الإعدادات
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'merchant_withdrawals' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">طلبات تحويل رصيد التجار إلى المحافظ والحسابات المحلية</p>
                <h2 className="mt-1 text-3xl font-black">سحوبات التجار</h2>
              </div>
              {merchantWithdrawals.length === 0 ? (
                <div className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16">
                  <WalletCards size={42} className="text-white/20" />
                  <h3 className="mt-4 font-bold">لا توجد طلبات سحب</h3>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {merchantWithdrawals.map((w) => (
                    <div key={w.id} className="rounded-2xl border border-white/5 bg-white/[.02] p-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="min-w-[140px] flex-1">
                          <p className="text-sm font-black">{Number(w.amount).toLocaleString('ar-YE')} {CURRENCY}</p>
                          <p className="mt-1 text-xs text-white/35">التاجر: {w.merchant_id.slice(0, 8)} • {w.payment_method_code} • {w.account_number}</p>
                          <p className="mt-1 text-xs text-white/30">{new Date(w.created_at).toLocaleString('ar-YE')}</p>
                        </div>
                        <StatusBadge status={w.status} />
                        {w.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => handleMerchantWithdrawal(w.id, 'approve')} disabled={actionLoading === w.id + 'approve'} className="rounded-lg bg-[#e3fe00] px-3 py-2 text-xs font-black text-black disabled:opacity-50"><Check size={14} className="mr-1 inline" />تأكيد التحويل</button>
                            <button onClick={() => handleMerchantWithdrawal(w.id, 'reject')} disabled={actionLoading === w.id + 'reject'} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 disabled:opacity-50"><X size={14} className="mr-1 inline" />رفض</button>
                          </div>
                        )}
                      </div>
                      {w.note && <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-white/45">ملاحظة التاجر: {w.note}</p>}
                      {w.admin_note && <p className="mt-2 rounded-lg bg-white/5 p-3 text-xs text-white/45">ملاحظة الإدارة: {w.admin_note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'users' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">تفعيل أو تجميد حسابات المندوبين والتجار</p>
                <h2 className="mt-1 text-3xl font-black">إدارة الحسابات</h2>
              </div>

              {profiles.length === 0 ? (
                <div className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16">
                  <Users size={42} className="text-white/20" />
                  <h3 className="mt-4 font-bold">لا يوجد مستخدمون</h3>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {profiles.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-white/[.02] p-4">
                      <div className="flex min-w-[130px] items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${p.role === 'driver' ? 'bg-blue-500/10 text-blue-400' : p.role === 'merchant' ? 'bg-purple-500/10 text-purple-400' : 'bg-[#e3fe00]/10 text-[#e3fe00]'}`}>
                          <UserRound size={17} />
                        </div>
                        <div>
                          <p className="text-xs text-white/35">{p.role === 'customer' ? 'عميل' : p.role === 'driver' ? 'مندوب' : p.role === 'merchant' ? 'تاجر' : 'مدير'}</p>
                          <p className="text-sm font-bold">{p.full_name || 'بدون اسم'}</p>
                        </div>
                      </div>

                      <div className="min-w-[160px] flex-1">
                        <p className="text-sm text-white/55" dir="ltr">{p.phone_number || '—'}</p>
                      </div>

                      <span className={`rounded-full px-3 py-1 text-[10px] font-black ${p.is_active ? 'bg-[#e3fe00]/10 text-[#e3fe00]' : 'bg-red-500/10 text-red-400'}`}>
                        {p.is_active ? 'نشط' : 'مجمّد'}
                      </span>

                      {p.role !== 'admin' && (
                        <button
                          onClick={() => toggleUserActive(p.id, p.is_active)}
                          disabled={actionLoading === p.id}
                          className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${
                            p.is_active
                              ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                              : 'border border-[#e3fe00]/30 text-[#e3fe00] hover:bg-[#e3fe00]/10'
                          }`}
                        >
                          {p.is_active ? 'تجميد الحساب' : 'تفعيل الحساب'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'orders' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">متابعة الطلبات المباشرة وحالات التوصيل</p>
                <h2 className="mt-1 text-3xl font-black">متابعة الطلبات</h2>
              </div>

              {orders.length === 0 ? (
                <div className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16">
                  <Package size={42} className="text-white/20" />
                  <h3 className="mt-4 font-bold">لا توجد طلبات</h3>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {orders.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-white/[.02] p-4">
                      <div className="flex min-w-[120px] items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e3fe00]/10 text-[#e3fe00]">
                          <Package size={17} />
                        </div>
                        <p className="text-sm font-bold">#{o.id.slice(0, 8)}</p>
                      </div>

                      <div className="min-w-[160px] flex-1">
                        <p className="text-sm text-white/55">
                          الإجمالي: {Number(o.total_amount).toLocaleString('ar-YE')} {CURRENCY}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          توصيل: {Number(o.custom_delivery_fee || o.delivery_fee).toLocaleString('ar-YE')} {CURRENCY}
                          {o.courier_distance ? ` • ${o.courier_distance} كم` : ''}
                        </p>
                      </div>

                      <StatusBadge status={o.status} />
                      <span className="text-xs text-white/30">{new Date(o.created_at).toLocaleDateString('ar-YE')}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
