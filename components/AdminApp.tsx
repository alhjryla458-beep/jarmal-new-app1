import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, BarChart3, Check, ClipboardList, Landmark, Lock,
  Package, ShieldCheck, Truck, UserRound, Users, WalletCards, X, Zap, Settings2, Save, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

const CURRENCY = 'ر.ي';

type AdminTab = 'stats' | 'wallets' | 'payment_receipts' | 'merchant_withdrawals' | 'driver_cash_settlements' | 'driver_withdrawals' | 'payment_settings' | 'driver_earning_settings' | 'merchant_stores' | 'users' | 'orders';

type ProfileRow = {
  id: string;
  role: string;
  full_name: string | null;
  phone_number: string | null;
  is_active: boolean;
};

type DriverProfileRow = {
  id: string;
  identity_card_number: string | null;
  license_number: string | null;
  vehicle_type: string | null;
  vehicle_plate_number: string | null;
  is_available: boolean | null;
  rating: number | null;
  verification_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verification_note: string | null;
  verified_at: string | null;
};

type TxRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  payment_method: string | null;
  reference_number: string | null;
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

type DriverEarningSettings = { id: boolean; calculation_mode: 'fixed' | 'percentage' | 'hybrid'; fixed_amount: number; percentage: number; minimum_amount: number; maximum_amount: number | null; is_active: boolean; updated_at: string };

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

type DriverCashSettlementRow = {
  id: string;
  driver_id: string;
  amount: number;
  status: string;
  note: string | null;
  requested_at: string;
  processed_at: string | null;
};

type DriverWithdrawalRow = {
  id: string;
  driver_id: string;
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

type StoreRow = {
  id: string;
  merchant_id: string;
  name: string;
  phone: string | null;
  store_type: string | null;
  branch_id: string | null;
  is_open: boolean;
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
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
  const labels: Record<string, string> = {
    pending: 'قيد الانتظار', completed: 'مكتملة', rejected: 'مرفوضة', accepted: 'مقبولة', preparing: 'جارٍ التجهيز', ready_for_pickup: 'جاهز للاستلام', on_the_way: 'في الطريق',
    at_store: 'في المتجر', picked_up: 'تم الاستلام', en_route: 'في الطريق',
    delivered: 'تم التسليم', cancelled: 'ملغاة', approved: 'معتمد', suspended: 'موقوف',
  };
  const map: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400', completed: 'bg-[#e3fe00]/10 text-[#e3fe00]',
    rejected: 'bg-red-500/10 text-red-400', accepted: 'bg-blue-500/10 text-blue-400', preparing: 'bg-purple-500/10 text-purple-400', ready_for_pickup: 'bg-indigo-500/10 text-indigo-400', on_the_way: 'bg-cyan-500/10 text-cyan-400',
    at_store: 'bg-purple-500/10 text-purple-400', picked_up: 'bg-indigo-500/10 text-indigo-400',
    en_route: 'bg-cyan-500/10 text-cyan-400', delivered: 'bg-[#e3fe00]/10 text-[#e3fe00]',
    cancelled: 'bg-red-500/10 text-red-400', approved: 'bg-[#e3fe00]/10 text-[#e3fe00]',
    suspended: 'bg-orange-500/10 text-orange-400',
  };
  return <span className={`rounded-full px-3 py-1 text-[10px] font-black ${map[status] || 'bg-white/10 text-white/50'}`}>{labels[status] || status}</span>;
}

export default function AdminApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>('stats');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'active' | 'pending' | 'accepted' | 'preparing' | 'ready_for_pickup' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceiptRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [driverProfiles, setDriverProfiles] = useState<DriverProfileRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [merchantWithdrawals, setMerchantWithdrawals] = useState<MerchantWithdrawalRow[]>([]);
  const [driverCashSettlements, setDriverCashSettlements] = useState<DriverCashSettlementRow[]>([]);
  const [driverWithdrawals, setDriverWithdrawals] = useState<DriverWithdrawalRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [driverEarningSettings, setDriverEarningSettings] = useState<DriverEarningSettings | null>(null);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, { account_number: string; instructions: string; is_active: boolean }>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [storeStatusFilter, setStoreStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('all');
  const [storeSearch, setStoreSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'customer' | 'merchant' | 'driver' | 'admin'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userSearch, setUserSearch] = useState('');

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
      .select('id, user_id, transaction_type, amount, payment_method, reference_number, transaction_status')
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

  const loadDriverProfiles = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('driver_profiles')
      .select('id, identity_card_number, license_number, vehicle_type, vehicle_plate_number, is_available, rating, verification_status, verification_note, verified_at')
      .order('created_at', { ascending: false });
    if (err) { setError('تعذر تحميل ملفات المندوبين'); return; }
    setDriverProfiles((data || []) as DriverProfileRow[]);
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

  const loadDriverEarningSettings = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('driver_earning_settings')
      .select('id, calculation_mode, fixed_amount, percentage, minimum_amount, maximum_amount, is_active, updated_at')
      .eq('id', true)
      .maybeSingle();
    if (err) { setError('تعذر تحميل إعدادات أجور المندوبين'); return; }
    setDriverEarningSettings(data as DriverEarningSettings | null);
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

  const handleDriverEarningSettingsSave = async () => {
    if (!driverEarningSettings) return;
    setActionLoading('driver-earning-settings');
    setError('');
    try {
      const { error: err } = await supabase
        .from('driver_earning_settings')
        .update({
          calculation_mode: driverEarningSettings.calculation_mode,
          fixed_amount: Number(driverEarningSettings.fixed_amount) || 0,
          percentage: Number(driverEarningSettings.percentage) || 0,
          minimum_amount: Number(driverEarningSettings.minimum_amount) || 0,
          maximum_amount: driverEarningSettings.maximum_amount === null || driverEarningSettings.maximum_amount === '' ? null : Number(driverEarningSettings.maximum_amount),
          is_active: Boolean(driverEarningSettings.is_active),
        })
        .eq('id', true);
      if (err) throw err;
      await loadDriverEarningSettings();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر حفظ إعدادات أجور المندوبين');
    } finally {
      setActionLoading(null);
    }
  };

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

  const loadDriverCashSettlements = useCallback(async () => {    const { data, error: err } = await supabase
      .from('driver_cash_settlements')
      .select('id, driver_id, amount, status, note, requested_at, processed_at')
      .order('requested_at', { ascending: false })
      .limit(100);
    if (err) { setError('تعذر تحميل تسويات المندوبين'); return; }
    setDriverCashSettlements((data || []) as DriverCashSettlementRow[]);
  }, []);

  const loadMerchantWithdrawals = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('merchant_withdrawal_requests')
      .select('id, merchant_id, amount, payment_method_code, account_number, status, note, admin_note, created_at, processed_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) { setError('تعذر تحميل طلبات سحب التجار'); return; }
    setMerchantWithdrawals((data || []) as MerchantWithdrawalRow[]);
  }, []);

  const loadDriverWithdrawals = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('driver_withdrawal_requests')
      .select('id, driver_id, amount, payment_method_code, account_number, status, note, admin_note, created_at, processed_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (err) { setError('تعذر تحميل سحوبات المندوبين'); return; }
    setDriverWithdrawals((data || []) as DriverWithdrawalRow[]);
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

  const loadStores = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('stores')
      .select('id, merchant_id, name, phone, store_type, branch_id, is_open, approval_status, admin_note, created_at, reviewed_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (err) { setError('تعذر تحميل المتاجر'); return; }
    setStores((data || []) as StoreRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        await Promise.all([loadStats(), loadTransactions(), loadPaymentReceipts(), loadProfiles(), loadDriverProfiles(), loadMerchantWithdrawals(), loadDriverCashSettlements(), loadDriverWithdrawals(), loadPaymentMethods(), loadDriverEarningSettings(), loadOrders(), loadStores()]);
      } catch {
        setError('حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadStats, loadTransactions, loadProfiles, loadMerchantWithdrawals, loadDriverCashSettlements, loadDriverWithdrawals, loadPaymentMethods, loadDriverEarningSettings, loadOrders, loadStores]);

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

  const handleDriverCashSettlement = async (settlementId: string, action: 'confirm' | 'reject') => {
    setActionLoading(settlementId + action);    setError('');
    try {
      const { error: err } = await supabase.rpc('admin_process_driver_cash_settlement', {
        p_settlement_id: settlementId,
        p_action: action,
        p_note: action === 'reject' ? 'تم رفض التسوية من الإدارة' : null,
      });
      if (err) throw err;
      await loadDriverCashSettlements();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر معالجة تسوية المندوب');
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
  };  const handleDriverWithdrawal = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(requestId + action);
    setError('');
    try {
      const { error: err } = await supabase.rpc('admin_process_driver_wallet_withdrawal', {
        p_request_id: requestId,
        p_action: action,
        p_admin_note: action === 'reject' ? 'تم رفض طلب السحب من الإدارة' : null,
      });
      if (err) throw err;
      await loadDriverWithdrawals();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر معالجة سحب المندوب');
    } finally { setActionLoading(null); }
  };



  const handleStoreReview = async (storeId: string, status: 'approved' | 'rejected' | 'suspended') => {
    setActionLoading(storeId + status);
    setError('');
    const note = window.prompt(status === 'approved' ? 'ملاحظة اعتماد المتجر (اختياري)' : 'سبب المراجعة (اختياري)') || null;
    try {
      const { data, error: err } = await supabase.rpc('admin_review_store', {
        p_store_id: storeId,
        p_status: status,
        p_note: note,
      });
      if (err) throw err;
      if (data) setStores((prev) => prev.map((s) => s.id === storeId ? { ...s, ...(data as StoreRow) } : s));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر تحديث حالة المتجر');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDriverReview = async (driverId: string, status: 'approved' | 'rejected' | 'suspended') => {
    setActionLoading(driverId + status);
    setError('');
    const note = window.prompt(status === 'approved' ? 'ملاحظة اعتماد المندوب (اختياري)' : 'سبب المراجعة (اختياري)') || null;
    try {
      const { data, error: err } = await supabase.rpc('admin_review_driver', {
        p_driver_id: driverId,
        p_status: status,
        p_note: note,
      });
      if (err) throw err;
      if (data) setDriverProfiles((prev) => prev.map((d) => d.id === driverId ? { ...d, ...(data as DriverProfileRow) } : d));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر تحديث اعتماد المندوب');
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

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter === 'all') return true;
    if (orderStatusFilter === 'active') return !['delivered', 'cancelled'].includes(o.status);
    return o.status === orderStatusFilter;
  });

  const orderCounts = {
    all: orders.length,
    active: orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length,
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready_for_pickup: orders.filter((o) => o.status === 'ready_for_pickup').length,
    picked_up: orders.filter((o) => o.status === 'picked_up').length,
    on_the_way: orders.filter((o) => o.status === 'on_the_way').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const filteredStores = stores.filter((store) => {
    const matchesStatus = storeStatusFilter === 'all' || store.approval_status === storeStatusFilter;
    const q = storeSearch.trim().toLowerCase();
    const matchesSearch = !q || [store.name, store.phone, store.merchant_id].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const filteredProfiles = profiles.filter((p) => {
    const matchesRole = userRoleFilter === 'all' || p.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'all' || (userStatusFilter === 'active' ? p.is_active : !p.is_active);
    const q = userSearch.trim().toLowerCase();
    const matchesSearch = !q || [p.full_name, p.phone_number, p.id].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    return matchesRole && matchesStatus && matchesSearch;
  });

  const navGroups: { title: string; items: [AdminTab, string, React.ElementType][] }[] = [
    { title: 'نظرة عامة', items: [['stats', 'لوحة المعلومات', BarChart3], ['orders', 'متابعة الطلبات', ClipboardList]] },
    { title: 'التشغيل', items: [['merchant_stores', 'إدارة المتاجر', Landmark], ['users', 'إدارة الحسابات', Users]] },
    { title: 'المالية', items: [['wallets', 'عمليات المحافظ', WalletCards], ['payment_receipts', 'إيصالات الدفع', WalletCards], ['merchant_withdrawals', 'سحوبات التجار', WalletCards], ['driver_cash_settlements', 'تسويات المندوبين', Truck], ['driver_withdrawals', 'سحوبات المندوبين', WalletCards]] },
    { title: 'الإعدادات', items: [['payment_settings', 'إعدادات الدفع', Settings2], ['driver_earning_settings', 'أجور المندوبين', Settings2]] },
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
          <nav className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 px-3 text-[10px] font-bold text-white/25">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map(([id, label, Icon]) => (
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
                </div>
              </div>
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

              <div className="mt-6">
                <div className="mb-4 flex items-center gap-3">
                  <Zap size={18} className="text-[#e3fe00]" />
                  <div>
                    <h3 className="font-black">مركز التشغيل</h3>
                    <p className="text-xs text-white/35">الأعمال التي تحتاج انتباه الإدارة الآن</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: 'طلبات نشطة', count: stats.activeOrders, tab: 'orders' as AdminTab, icon: Truck, urgent: stats.activeOrders > 0 },
                    { label: 'متاجر بانتظار الاعتماد', count: stores.filter((s) => s.approval_status === 'pending').length, tab: 'merchant_stores' as AdminTab, icon: Landmark, urgent: stores.some((s) => s.approval_status === 'pending') },
                    { label: 'إيصالات دفع معلقة', count: paymentReceipts.filter((r) => r.status === 'pending').length, tab: 'payment_receipts' as AdminTab, icon: WalletCards, urgent: paymentReceipts.some((r) => r.status === 'pending') },
                    { label: 'سحوبات التجار المعلقة', count: merchantWithdrawals.filter((w) => w.status === 'pending').length, tab: 'merchant_withdrawals' as AdminTab, icon: WalletCards, urgent: merchantWithdrawals.some((w) => w.status === 'pending') },
                    { label: 'تسويات المندوبين المعلقة', count: driverCashSettlements.filter((s) => s.status === 'pending').length, tab: 'driver_cash_settlements' as AdminTab, icon: Truck, urgent: driverCashSettlements.some((s) => s.status === 'pending') },
                    { label: 'سحوبات المندوبين المعلقة', count: driverWithdrawals.filter((w) => w.status === 'pending').length, tab: 'driver_withdrawals' as AdminTab, icon: WalletCards, urgent: driverWithdrawals.some((w) => w.status === 'pending') },
                  ].map(({ label, count, tab: targetTab, icon: Icon, urgent }) => (
                    <button
                      key={label}
                      onClick={() => setTab(targetTab)}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0d0d0d] p-4 text-right transition hover:border-[#e3fe00]/30 hover:bg-white/[.03]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${urgent ? 'bg-[#e3fe00]/10 text-[#e3fe00]' : 'bg-white/5 text-white/30'}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{label}</p>
                          <p className="mt-1 text-xs text-white/35">{urgent ? 'يحتاج متابعة' : 'لا توجد معلّقات'}</p>
                        </div>
                      </div>
                      <span className={`text-2xl font-black ${urgent ? 'text-[#e3fe00]' : 'text-white/35'}`}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black">ملخص سريع</p>
                    <p className="mt-1 text-xs text-white/35">آخر البيانات المحمّلة من لوحة الإدارة</p>
                  </div>
                  <button onClick={() => setTab('orders')} className="text-sm font-bold text-white/50 hover:text-white">
                    فتح الطلبات <ArrowLeft className="mr-1 inline" size={14} />
                  </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/[.03] p-4">
                    <p className="text-xs text-white/35">طلبات اليوم</p>
                    <p className="mt-2 text-2xl font-black">{orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).length}</p>
                  </div>
                  <div className="rounded-xl bg-white/[.03] p-4">
                    <p className="text-xs text-white/35">طلبات ملغاة</p>
                    <p className="mt-2 text-2xl font-black">{orders.filter((o) => o.status === 'cancelled').length}</p>
                  </div>
                  <div className="rounded-xl bg-white/[.03] p-4">
                    <p className="text-xs text-white/35">متاجر مفتوحة</p>
                    <p className="mt-2 text-2xl font-black">{stores.filter((s) => s.is_open && s.approval_status === 'approved').length}</p>
                  </div>
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
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tx.transaction_type === 'topup' || tx.transaction_type === 'deposit' ? 'bg-[#e3fe00]/10 text-[#e3fe00]' : 'bg-blue-500/10 text-blue-400'}`}>
                          {tx.transaction_type === 'deposit' ? <ArrowLeft size={17} /> : <ArrowLeft size={17} className="rotate-180" />}
                        </div>
                        <p className="text-sm font-bold">{tx.transaction_type === 'topup' || tx.transaction_type === 'deposit' ? 'شحن' : tx.transaction_type === 'earning' ? 'أرباح' : 'سحب'}</p>
                      </div>

                      <div className="min-w-[140px] flex-1">
                        <p className="text-sm font-bold">{Number(tx.amount).toLocaleString('ar-YE')} {CURRENCY}</p>
                        <p className="mt-1 text-xs text-white/35">{tx.payment_method || '—'}{tx.reference_number ? ' • المرجع: ' + tx.reference_number : ''}</p>
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

          {tab === 'driver_cash_settlements' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">استلام النقد المحصل عند الدفع والاستلام من المندوبين</p>
                <h2 className="mt-1 text-3xl font-black">تسويات المندوبين</h2>
              </div>
              {driverCashSettlements.length === 0 ? (
                <div className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16">
                  <Truck size={42} className="text-white/20" />
                  <h3 className="mt-4 font-bold">لا توجد طلبات تسوية</h3>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {driverCashSettlements.map((s) => {
                    const driver = profiles.find((p) => p.id === s.driver_id);
                    const statusText = s.status === 'confirmed' ? 'تم التأكيد' : s.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
                    return (
                      <div key={s.id} className="rounded-2xl border border-white/5 bg-white/[.02] p-4">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="min-w-[190px] flex-1">
                            <p className="text-sm font-black">{driver?.full_name || 'مندوب غير مسمى'}</p>
                            <p className="mt-1 text-xs text-white/35" dir="ltr">{driver?.phone_number || s.driver_id.slice(0, 8)}</p>
                            <p className="mt-2 text-lg font-black">{Number(s.amount).toLocaleString('ar-YE')} {CURRENCY}</p>
                            <p className="mt-1 text-xs text-white/30">الطلب: {new Date(s.requested_at).toLocaleString('ar-YE')}{s.processed_at ? ' • المعالجة: ' + new Date(s.processed_at).toLocaleString('ar-YE') : ''}</p>
                          </div>
                          <span className={'rounded-full px-3 py-1 text-[10px] font-black ' + (s.status === 'confirmed' ? 'bg-[#e3fe00]/10 text-[#e3fe00]' : s.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400')}>{statusText}</span>
                          {s.status === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleDriverCashSettlement(s.id, 'confirm')} disabled={actionLoading === s.id + 'confirm'} className="rounded-lg bg-[#e3fe00] px-3 py-2 text-xs font-black text-black disabled:opacity-50"><Check size={14} className="mr-1 inline" />تأكيد الاستلام</button>
                              <button onClick={() => handleDriverCashSettlement(s.id, 'reject')} disabled={actionLoading === s.id + 'reject'} className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 disabled:opacity-50"><X size={14} className="mr-1 inline" />رفض</button>
                            </div>
                          )}
                        </div>
                        {s.note && <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-white/45">ملاحظة المندوب: {s.note}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'driver_withdrawals' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">طلبات سحب رصيد محافظ المندوبين</p>
                <h2 className="mt-1 text-3xl font-black">سحوبات المندوبين</h2>
              </div>
              <div className="mt-7 space-y-3">
                {driverWithdrawals.map((item) => {
                  const profile = profiles.find((p) => p.id === item.driver_id);
                  const statusText = item.status === 'approved' ? 'تمت الموافقة' : item.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
                  return (
                    <div key={item.id} className="rounded-2xl border border-white/5 bg-white/[.02] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-black">{profile?.full_name || 'مندوب'}</p>
                          <p className="mt-1 text-xs text-white/40">{profile?.phone_number || item.driver_id.slice(0, 8)}</p>
                          <p className="mt-3 text-2xl font-black text-[#e3fe00]">{Number(item.amount || 0).toLocaleString('ar-YE')} {CURRENCY}</p>
                        </div>
                        <span className="rounded-lg bg-white/5 px-3 py-2 text-xs font-black">{statusText}</span>
                      </div>
                      <div className="mt-4 grid gap-2 text-xs text-white/45 sm:grid-cols-2">
                        <p>طريقة السحب: {item.payment_method_code}</p>
                        <p>الحساب: {item.account_number}</p>
                        <p>تاريخ الطلب: {item.created_at ? new Date(item.created_at).toLocaleString('ar-YE') : '—'}</p>
                        <p>المعالجة: {item.processed_at ? new Date(item.processed_at).toLocaleString('ar-YE') : 'لم تتم بعد'}</p>
                      </div>
                      {item.note && <p className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-white/55">ملاحظة المندوب: {item.note}</p>}
                      {item.admin_note && <p className="mt-2 rounded-lg bg-white/5 p-3 text-xs text-white/55">ملاحظة الإدارة: {item.admin_note}</p>}
                      {item.status === 'pending' && (
                        <div className="mt-4 flex gap-2">
                          <button disabled={actionLoading === item.id + 'approve'} onClick={() => handleDriverWithdrawal(item.id, 'approve')} className="flex-1 rounded-xl bg-[#e3fe00] px-4 py-3 text-sm font-black text-black disabled:opacity-50">تأكيد السحب</button>
                          <button disabled={actionLoading === item.id + 'reject'} onClick={() => handleDriverWithdrawal(item.id, 'reject')} className="flex-1 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-black text-red-400 disabled:opacity-50">رفض</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {driverWithdrawals.length === 0 && <p className="py-8 text-center text-sm text-white/40">لا توجد طلبات سحب حتى الآن</p>}
              </div>
            </>
          )}

          {tab === 'driver_earning_settings' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">تحديد طريقة احتساب أجرة المندوب عن التوصيل</p>
                <h2 className="mt-1 text-3xl font-black">إعدادات أجور المندوبين</h2>
              </div>
              {!driverEarningSettings ? (
                <div className="mt-7 rounded-2xl border border-white/10 bg-white/[.02] p-6 text-sm text-white/50">لا توجد إعدادات أجور محفوظة.</div>
              ) : (
                <div className="mt-7 max-w-3xl rounded-2xl border border-white/5 bg-white/[.02] p-5">
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-300">
                    النظام حاليًا {driverEarningSettings.is_active ? 'مفعّل' : 'غير مفعّل'}. لا تفعّله إلا بعد اعتماد سياسة الأجور المالية.
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">                    <label className="block">
                      <span className="text-xs font-bold text-white/50">طريقة الاحتساب</span>
                      <select value={driverEarningSettings.calculation_mode} onChange={(e) => setDriverEarningSettings({...driverEarningSettings, calculation_mode: e.target.value as DriverEarningSettings['calculation_mode']})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                        <option value="percentage">نسبة من رسوم التوصيل</option>
                        <option value="fixed">مبلغ ثابت</option>
                        <option value="hybrid">ثابت + نسبة</option>
                      </select>
                    </label>
                    <label className="flex items-end gap-3 rounded-xl border border-white/10 p-3">
                      <input type="checkbox" checked={driverEarningSettings.is_active} onChange={(e) => setDriverEarningSettings({...driverEarningSettings, is_active: e.target.checked})} className="h-5 w-5 accent-[#e3fe00]" />
                      <span className="text-sm font-bold">تفعيل احتساب أجور المندوبين</span>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-white/50">المبلغ الثابت ({CURRENCY})</span>
                      <input type="number" min="0" value={driverEarningSettings.fixed_amount} onChange={(e) => setDriverEarningSettings({...driverEarningSettings, fixed_amount: Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-white/50">النسبة %</span>
                      <input type="number" min="0" max="100" step="0.01" value={driverEarningSettings.percentage} onChange={(e) => setDriverEarningSettings({...driverEarningSettings, percentage: Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-white/50">الحد الأدنى ({CURRENCY})</span>
                      <input type="number" min="0" value={driverEarningSettings.minimum_amount} onChange={(e) => setDriverEarningSettings({...driverEarningSettings, minimum_amount: Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-white/50">الحد الأقصى ({CURRENCY})</span>
                      <input type="number" min="0" value={driverEarningSettings.maximum_amount ?? ''} onChange={(e) => setDriverEarningSettings({...driverEarningSettings, maximum_amount: e.target.value === '' ? null : Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm" placeholder="بدون حد أقصى" />
                    </label>
                  </div>
                  <button onClick={handleDriverEarningSettingsSave} disabled={actionLoading === 'driver-earning-settings'} className="mt-5 flex items-center gap-2 rounded-xl bg-[#e3fe00] px-5 py-3 text-sm font-black text-black disabled:opacity-50">
                    <Save size={16} /> حفظ إعدادات الأجور
                  </button>
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
              </div>            </>
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

          {tab === 'merchant_stores' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">مراجعة واعتماد المتاجر المسجلة في جَرْمَل</p>
                <h2 className="mt-1 text-3xl font-black">إدارة المتاجر والتجار</h2>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
                <input
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="ابحث باسم المتجر أو الهاتف أو معرف التاجر"
                  className="w-full rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm outline-none focus:border-[#e3fe00]/40"
                />
                <div className="flex flex-wrap gap-2">
                  {([
                    ['all', 'الكل'], ['pending', 'بانتظار الاعتماد'], ['approved', 'معتمدة'], ['rejected', 'مرفوضة'], ['suspended', 'موقوفة'],
                  ] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setStoreStatusFilter(key)} className={"rounded-xl border px-3 py-2 text-xs font-bold " + (storeStatusFilter === key ? 'border-[#e3fe00]/40 bg-[#e3fe00]/10 text-[#e3fe00]' : 'border-white/5 bg-white/[.02] text-white/50')}>
                      {label} <span className="mr-1 opacity-70">({stores.filter((s) => key === 'all' ? true : s.approval_status === key).length})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {filteredStores.map((store) => (
                  <div key={store.id} className="rounded-2xl border border-white/5 bg-white/[.02] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-[220px] flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                            <Landmark size={19} />
                          </div>
                          <div>
                            <h3 className="font-black">{store.name || 'بدون اسم'}</h3>
                            <p className="mt-1 text-xs text-white/35">التاجر: {store.merchant_id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2 text-xs text-white/45 sm:grid-cols-2">
                          <p>الهاتف: <span dir="ltr">{store.phone || '—'}</span></p>
                          <p>النشاط: {store.store_type || '—'}</p>
                          <p>الفرع: {store.branch_id ? store.branch_id.slice(0, 8) : 'غير محدد'}</p>
                          <p>تاريخ التسجيل: {new Date(store.created_at).toLocaleString('ar-YE')}</p>
                        </div>
                      </div>

                      <StatusBadge status={store.approval_status} />
                    </div>

                    {store.admin_note && (
                      <p className="mt-4 rounded-xl bg-white/5 p-3 text-xs text-white/50">ملاحظة الإدارة: {store.admin_note}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {store.approval_status === 'pending' && (
                        <>
                          <button onClick={() => handleStoreReview(store.id, 'approved')} disabled={!!actionLoading} className="rounded-xl bg-[#e3fe00] px-4 py-2.5 text-xs font-black text-black disabled:opacity-50">
                            <Check size={14} className="mr-1 inline" /> اعتماد المتجر
                          </button>
                          <button onClick={() => handleStoreReview(store.id, 'rejected')} disabled={!!actionLoading} className="rounded-xl border border-red-500/30 px-4 py-2.5 text-xs font-black text-red-400 disabled:opacity-50">
                            <X size={14} className="mr-1 inline" /> رفض
                          </button>
                        </>
                      )}
                      {store.approval_status === 'approved' && (
                        <button onClick={() => handleStoreReview(store.id, 'suspended')} disabled={!!actionLoading} className="rounded-xl border border-orange-500/30 px-4 py-2.5 text-xs font-black text-orange-400 disabled:opacity-50">
                          إيقاف المتجر
                        </button>
                      )}
                      {(store.approval_status === 'rejected' || store.approval_status === 'suspended') && (
                        <button onClick={() => handleStoreReview(store.id, 'approved')} disabled={!!actionLoading} className="rounded-xl bg-[#e3fe00] px-4 py-2.5 text-xs font-black text-black disabled:opacity-50">
                          إعادة اعتماد
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredStores.length === 0 && (
                  <div className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16">
                    <Landmark size={42} className="text-white/20" />
                    <h3 className="mt-4 font-bold">لا توجد متاجر</h3>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'users' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">تفعيل أو تجميد حسابات المندوبين والتجار</p>
                <h2 className="mt-1 text-3xl font-black">إدارة الحسابات</h2>
              </div>

              <div className="mt-6 space-y-3">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو الهاتف أو معرف الحساب"
                    className="w-full rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm outline-none focus:border-[#e3fe00]/40"
                  />
                  <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)} className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm">
                    <option value="all">كل الأدوار</option>
                    <option value="customer">العملاء</option>
                    <option value="merchant">التجار</option>
                    <option value="driver">المندوبون</option>
                    <option value="admin">المديرون</option>
                  </select>
                  <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value as typeof userStatusFilter)} className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm">
                    <option value="all">كل الحالات</option>
                    <option value="active">نشطة</option>
                    <option value="inactive">مجمّدة</option>
                  </select>
                </div>

                {filteredProfiles.length === 0 ? (
                  <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16">
                    <Users size={42} className="text-white/20" />
                    <h3 className="mt-4 font-bold">لا توجد حسابات مطابقة</h3>
                  </div>
                ) : (
                  <div className="space-y-3">
                  {filteredProfiles.map((p) => (
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

                      {p.role === 'driver' && (() => {
                        const d = driverProfiles.find((row) => row.id === p.id);
                        if (!d) return <span className="text-[11px] text-white/30">ملف المندوب غير مكتمل</span>;
                        return (
                          <div className="w-full rounded-xl border border-blue-500/10 bg-blue-500/[.03] p-3">
                            <div className="grid gap-2 text-[11px] text-white/50 sm:grid-cols-2 lg:grid-cols-4">
                              <span>الهوية: <b className="text-white/80">{d.identity_card_number || '—'}</b></span>
                              <span>الرخصة: <b className="text-white/80">{d.license_number || '—'}</b></span>
                              <span>المركبة: <b className="text-white/80">{d.vehicle_type || '—'}</b></span>
                              <span>اللوحة: <b className="text-white/80">{d.vehicle_plate_number || '—'}</b></span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <StatusBadge status={d.verification_status} />
                              <span className="text-[11px] text-white/35">{d.is_available ? 'متاح الآن' : 'غير متاح'}{d.rating != null ? ' • التقييم ' + Number(d.rating).toFixed(1) : ''}</span>
                              {d.verification_note && <span className="text-[11px] text-white/35">ملاحظة: {d.verification_note}</span>}
                              {d.verification_status === 'pending' && (
                                <>
                                  <button onClick={() => handleDriverReview(p.id, 'approved')} disabled={!!actionLoading} className="mr-auto rounded-lg bg-[#e3fe00] px-3 py-2 text-[11px] font-black text-black disabled:opacity-50">اعتماد المندوب</button>
                                  <button onClick={() => handleDriverReview(p.id, 'rejected')} disabled={!!actionLoading} className="rounded-lg border border-red-500/30 px-3 py-2 text-[11px] font-bold text-red-400 disabled:opacity-50">رفض</button>
                                </>
                              )}
                              {d.verification_status === 'approved' && (
                                <button onClick={() => handleDriverReview(p.id, 'suspended')} disabled={!!actionLoading} className="mr-auto rounded-lg border border-orange-500/30 px-3 py-2 text-[11px] font-bold text-orange-400 disabled:opacity-50">إيقاف اعتماد المندوب</button>
                              )}
                              {(d.verification_status === 'rejected' || d.verification_status === 'suspended') && (
                                <button onClick={() => handleDriverReview(p.id, 'approved')} disabled={!!actionLoading} className="mr-auto rounded-lg bg-[#e3fe00] px-3 py-2 text-[11px] font-black text-black disabled:opacity-50">إعادة اعتماد</button>
                              )}
                            </div>
                          </div>
                        );
                      })()}

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
              </div>
                )}
              </div>
            </>
          )}

          {tab === 'orders' && (
            <>
              <div className="mb-2">
                <p className="text-sm text-white/40">مركز متابعة الطلبات والتوصيل في الوقت الفعلي</p>
                <h2 className="mt-1 text-3xl font-black">متابعة الطلبات</h2>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {([
                  ['all', 'الكل'], ['active', 'نشطة'], ['pending', 'جديدة'], ['preparing', 'تجهيز'],
                  ['ready_for_pickup', 'جاهزة'], ['picked_up', 'مستلمة'], ['on_the_way', 'في الطريق'], ['delivered', 'مكتملة'], ['cancelled', 'ملغاة'],
                ] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setOrderStatusFilter(key)} className={"rounded-xl border px-3 py-3 text-right transition " + (orderStatusFilter === key ? 'border-[#e3fe00]/40 bg-[#e3fe00]/10' : 'border-white/5 bg-white/[.02] hover:bg-white/[.04]')}>
                    <span className="block text-[10px] font-bold text-white/40">{label}</span>
                    <span className={"mt-1 block text-lg font-black " + (orderStatusFilter === key ? 'text-[#e3fe00]' : 'text-white')}>{orderCounts[key]}</span>
                  </button>
                ))}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="mt-7 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16">
                  <Package size={42} className="text-white/20" />
                  <h3 className="mt-4 font-bold">{orders.length === 0 ? 'لا توجد طلبات' : 'لا توجد طلبات بهذه الحالة'}</h3>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {filteredOrders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-white/5 bg-white/[.02] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-[150px] items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e3fe00]/10 text-[#e3fe00]"><Package size={18} /></div>
                          <div>
                            <p className="text-sm font-black">#{o.id.slice(0, 8)}</p>
                            <p className="mt-1 text-[11px] text-white/30">{new Date(o.created_at).toLocaleString('ar-YE')}</p>
                          </div>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>

                      <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl bg-white/[.03] p-3"><p className="text-[10px] font-bold text-white/30">العميل</p><p className="mt-1 font-bold" dir="ltr">{o.customer_id.slice(0, 8)}…</p></div>
                        <div className="rounded-xl bg-white/[.03] p-3"><p className="text-[10px] font-bold text-white/30">المتجر</p><p className="mt-1 font-bold" dir="ltr">{o.store_id.slice(0, 8)}…</p></div>
                        <div className="rounded-xl bg-white/[.03] p-3"><p className="text-[10px] font-bold text-white/30">المندوب</p><p className="mt-1 font-bold">{o.driver_id ? <span dir="ltr">{o.driver_id.slice(0, 8)}…</span> : 'لم يُعيّن بعد'}</p></div>
                        <div className="rounded-xl bg-white/[.03] p-3"><p className="text-[10px] font-bold text-white/30">المسافة</p><p className="mt-1 font-bold">{o.courier_distance != null ? Number(o.courier_distance).toLocaleString('ar-YE') + ' كم' : 'غير محددة'}</p></div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/5 pt-3 text-xs">
                        <span className="text-white/45">قيمة الطلب: <b className="text-white">{Number(o.total_amount).toLocaleString('ar-YE')} {CURRENCY}</b></span>
                        <span className="text-white/45">التوصيل: <b className="text-white">{Number(o.custom_delivery_fee ?? o.delivery_fee).toLocaleString('ar-YE')} {CURRENCY}</b></span>
                      </div>
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