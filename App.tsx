import { Component, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, Bike, Boxes, Check, CheckCircle2,
  ClipboardList, Clock3, FileText, Home, ListChecks, LogOut, MapPin,
  Menu, Minus, Navigation, Package, Phone, Plus, Settings2, ShieldCheck,
  ShoppingBag, Sparkles, Store, Truck, UserRound, WalletCards, X, Zap, MessageCircle, Search, Send, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { JarmalCompanion } from './components/companion/JarmalCompanion';
import { JarmalAIChat } from './components/companion/JarmalAIChat';
import { JarmalHomeDiscovery } from './components/home/JarmalHomeDiscovery';
import { JarmalHomeContent } from './components/home/JarmalHomeContent';

type Role = 'customer' | 'driver' | 'merchant';
type Screen = 'welcome' | 'auth' | 'app';
type AuthMode = 'login' | 'signup';

const CURRENCY = 'ر.ي';

const businessCategories = [
  'بقالة', 'مطعم', 'بوفيه', 'سوبرماركت', 'صيدلية', 'خضار وفواكه', 'حلويات', 'ملابس', 'إلكترونيات'
];

type StoreRow = {
  id: string; name: string; store_type: string; address_description: string | null;
  is_open: boolean; rating: number | null; approval_status?: string;
};
type CategoryRow = { id: string; store_id: string; name: string; sort_order: number };
type VariantRow = { id: string; product_id: string; variant_name: string; price: number; is_available: boolean };
type ProductRow = {
  id: string; store_id: string; name: string; description: string | null; price: number;
  is_available: boolean; category_id: string | null; redemption_points_cost: number | null;
  image_url?: string | null; payment_options?: string[] | null;
};
type OrderRow = {
  id: string; status: string; total_amount: number; delivery_fee: number; created_at: string;
  store_id: string | null; order_type: string; fulfillment_type: string; points_earned: number;
  driver_id?: string | null; delivery_address?: string | null; delivery_latitude?: number | null;
  delivery_longitude?: number | null; payment_status?: string; payment_method?: string | null;
};
type ServiceProviderRow = { id: string; service_type: string; name: string; account_number_length: number | null; region: string | null };
type ServicePackageRow = { id: string; provider_id: string; name: string; face_value: number | null; price: number };
type PaymentMethodRow = {
  id: string; name: string; code: string; account_number: string | null; instructions: string | null;
  checkout_url?: string | null; deep_link?: string | null; verification_mode?: string | null; auto_verify_enabled?: boolean | null;
};
type ClientWalletRow = { balance: number; points: number };
type FullOrderRow = {
  id: string; status: string; total_amount: number; delivery_fee: number; created_at: string;
  store_id: string | null; driver_id: string | null; delivery_address: string | null; notes: string | null;
  courier_distance: number | null; fulfillment_type: string; payment_status: string;
  delivery_latitude?: number | null; delivery_longitude?: number | null;
};
type OrderItemRow = { id: string; order_id: string; product_id: string | null; custom_name: string | null; unit_price: number; quantity: number };
type DriverProfileRow = {
  is_available: boolean; vehicle_type: string | null; vehicle_plate_number: string | null;
  rating: number | null; verification_status?: string | null;
};
type MyStoreRow = {
  id: string; name: string; is_open: boolean; rating: number | null; commission_rate: number | null;
  approval_status?: string | null;
};
type MerchantProductRow = { id: string; store_id: string; name: string; description: string | null; price: number; image_url: string | null; is_available: boolean };
type CartLine = {
  key: string; product_id?: string; variant_id?: string; custom_name?: string; custom_price?: number;
  name: string; price: number; quantity: number; payment_options?: string[] | null;
};
type StoreMemberContext = { store_id: string; member_role: 'owner' | 'manager' | 'orders_employee' | 'warehouse_employee' };
type StoreTeamMemberRow = {
  id: string; user_id: string; member_role: StoreMemberContext['member_role']; is_active: boolean;
  profile?: { full_name: string | null; phone_number: string | null } | null;
};
type StoreInvitationRow = { id: string; phone_number: string; member_role: Exclude<StoreMemberContext['member_role'], 'owner'>; status: string; expires_at: string; created_at: string };
type StoreAuditRow = { id: string; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown> | null; created_at: string };
type InvoiceRow = {
  id: string; invoice_number: string; customer_id: string; order_id: string | null; store_id: string | null;
  issued_at: string; billing_month: string | null; subtotal: number; delivery_fee: number; total_amount: number;
  payment_method: string | null; payment_reference: string | null; payment_status: string; items: unknown;
};
type InventoryRow = {
  id: string; store_id: string; product_id: string; variant_id: string | null; quantity_on_hand: number;
  quantity_reserved: number; reorder_level: number; updated_at?: string;
};
type InventoryMovementRow = {
  id: string; inventory_id: string; product_id: string; variant_id: string | null; movement_type: string;
  quantity: number; quantity_before: number; quantity_after: number; reason: string | null; created_at: string;
};


const statusLabels: Record<string, string> = {
  pending: 'بانتظار موافقة المتجر',
  accepted: 'تم القبول',
  rejected: 'تم الرفض',
  preparing: 'جاري التحضير',
  ready_for_pickup: 'جاهز للاستلام',
  picked_up: 'استلمه المندوب',
  on_the_way: 'في الطريق إليك',
  delivered: 'تم التسليم',
  cancelled: 'ملغي'
};

function Logo({ dark = false, size = 'sm' }: { dark?: boolean; size?: 'sm' | 'lg' }) {
  return (
    <img
      src="/jarmal-logo-full.svg"
      alt="جَرْمَل"
      className={`${size === 'lg' ? 'h-40 w-40 sm:h-52 sm:w-52' : 'h-16 w-16'} object-contain drop-shadow-[0_10px_30px_rgba(244,255,0,.16)]`}
    />
  );
}

function Pill({
  children,
  dark = false
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
        dark ? 'bg-black/10 text-black' : 'bg-[#e3fe00] text-black'
      }`}
    >
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">{label}</label>

      <div className="relative">
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">
          {icon}
        </span>

        <input
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          placeholder={placeholder}
          dir="rtl"
          className="w-full rounded-xl border border-[#dfe4db] bg-white px-11 py-3.5 text-[#171a16] caret-[#171a16] outline-none transition placeholder:text-[#8b9289] focus:border-[#dfff00]" style={{ color: "#171a16", backgroundColor: "#ffffff" }}
        />
      </div>
    </div>
  );
}

function PhoneField({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold">
        رقم الهاتف اليمني
      </label>

      <div className="flex gap-2" dir="ltr">
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-[#e3fe00]">
          <span>+967</span>
        </div>

        <input
          required
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/\D/g, '').slice(0, 9))
          }
          placeholder="7xx xxx xxx"
          className="w-full rounded-xl border border-[#dfe4db] bg-white px-4 py-3.5 text-[#171a16] caret-[#171a16] outline-none placeholder:text-[#8b9289] focus:border-[#dfff00]" style={{ color: "#171a16", backgroundColor: "#ffffff" }}
        />
      </div>

      <p className="mt-1 text-[11px] text-white/30">
        مثال: 711 234 567
      </p>
    </div>
  );
}

function Welcome({
  onSelect
}: {
  onSelect: (role: Role) => void;
}) {
  const roles = [
    {
      role: 'customer' as const,
      icon: ShoppingBag,
      title: 'عميل',
      desc: 'اطلب احتياجاتك من متاجر حيك'
    },
    {
      role: 'driver' as const,
      icon: Bike,
      title: 'مندوب توصيل',
      desc: 'كن جزءاً من فريق جَرْمَل'
    },
    {
      role: 'merchant' as const,
      icon: Store,
      title: 'تاجر / صاحب متجر',
      desc: 'وصّل منتجاتك لعملائك'
    }
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f6f3] px-5 py-7 text-[#171a16]">
      <div className="absolute -left-28 top-28 h-80 w-80 rounded-full bg-[#dfff00]/20 blur-[120px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between">
        <Logo />

        <div className="flex items-center gap-2 text-xs text-[#6b7169]">
          <ShieldCheck size={15} className="text-[#171a16]" />
          توصيل موثوق داخل اليمن
        </div>
      </header>

      <section className="relative mx-auto flex min-h-[calc(100vh-92px)] max-w-6xl flex-col justify-center py-10">
        <div className="max-w-3xl animate-slide-up">
          <Pill>أسرع من توقعك</Pill>

          <h1 className="mt-6 text-5xl font-black leading-[1.12] tracking-[-.05em] sm:text-[#171a16] sm:text-7xl">
            طلبك عند بابك،
            <br />
            <span className="text-[#171a16]">بسرعة جَرْمَل.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-[#6b7169]">
            كل ما تحتاجه من متاجر حيك، في مكان واحد. اختر حسابك وابدأ رحلتك معنا.
          </p>
        </div>

        <div className="mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
          {roles.map(({ role, icon: Icon, title, desc }, index) => (
            <button
              key={role}
              onClick={() => onSelect(role)}
              className="group rounded-2xl border border-[#e5e8e2] bg-white shadow-[0_10px_30px_rgba(23,26,22,.05)] p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:border-[#dfff00] hover:bg-[#dfff00] hover:text-[#171a16] animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-10 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#dfff00] text-black transition-colors group-hover:bg-black group-hover:text-[#171a16]">
                  <Icon size={24} />
                </div>

                <ArrowLeft
                  className="text-[#9aa097] group-hover:text-black"
                  size={20}
                />
              </div>

              <h2 className="text-2xl font-black">{title}</h2>

              <p className="mt-2 text-sm text-[#6b7169] group-hover:text-[#171a16]/75">
                {desc}
              </p>

              <p className="mt-5 text-xs font-bold text-[#171a16] group-hover:text-black">
                ابدأ الآن
              </p>
            </button>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-6 text-xs text-[#6b7169]">
          <span className="flex items-center gap-2">
            <Zap size={15} className="text-[#171a16]" />
            توصيل سريع
          </span>

          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#171a16]" />
            متاجر موثوقة
          </span>

          <span className="flex items-center gap-2">
            <Navigation size={15} className="text-[#171a16]" />
            تحديد موقع التسليم
          </span>

        </div>
      </section>
    </main>
  );
}

function Auth({
  role,
  onBack,
  onSuccess
}: {
  role: Role;
  onBack: () => void;
  onSuccess: (session: Session, role: Role) => void;
}) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [inviteMode, setInviteMode] = useState(false);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    otp: '',
    accessCode: '',
    nationalId: '',
    licenseNumber: '',
    vehicleType: '',
    vehiclePlate: '',
    storeName: '',
    category: 'بقالة'
  });

  const update = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const totalSteps =
    role === 'merchant'
      ? 3
      : role === 'driver'
        ? 3
        : 2;

  const stepLabels =
    role === 'merchant'
      ? ['البيانات الأساسية', 'تأكيد الهاتف', 'بيانات المتجر']
      : role === 'driver'
        ? ['البيانات الأساسية', 'تأكيد الهاتف', 'كود المندوب']
        : ['البيانات الأساسية', 'تأكيد الهاتف'];

  const prev = () => {
    setError('');
    setStep((current) => Math.max(current - 1, 1));
  };

  const sendOtp = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('اكتب اسمك أولاً');
      return;
    }
    if (form.phone.length !== 9) {
      setError('أدخل رقم هاتف يمني صحيح مكون من 9 أرقام');
      return;
    }

    setBusy(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+967${form.phone}`,
        options: {
          data: {
            full_name: form.name.trim(),
            phone_number: `+967${form.phone}`,
            role
          }
        }
      });
      if (otpError) throw otpError;
      setOtpSent(true);
      setOtpVerified(false);
      setStep(2);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إرسال رمز التحقق');
    } finally {
      setBusy(false);
    }
  };

  const resolveUiRole = async (userId: string, fallbackRole: Role): Promise<Role> => {
    const { data: membership } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    return membership ? 'merchant' : fallbackRole;
  };

  const sendInviteOtp = async () => {
    setError('');
    if (form.phone.length !== 9) {
      setError('أدخل رقم هاتف يمني صحيح مكوناً من 9 أرقام');
      return;
    }

    setBusy(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+967${form.phone}`
      });
      if (otpError) throw otpError;
      setOtpSent(true);
      setOtpVerified(false);
      setStep(2);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إرسال رمز التحقق');
    } finally {
      setBusy(false);
    }
  };

  const verifyPhoneOtp = async () => {
    setError('');
    if (form.otp.length !== 6) {
      setError('أدخل رمز التحقق المكون من 6 أرقام');
      return;
    }

    setBusy(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+967${form.phone}`,
        token: form.otp,
        type: 'sms'
      });
      if (verifyError) throw verifyError;
      if (!data.session) throw new Error('تم التحقق لكن لم يتم إنشاء جلسة الحساب');

      setOtpVerified(true);

      if (inviteMode) {
        setStep(3);
        return;
      }

      if (mode === 'login') {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name, phone_number')
          .eq('id', data.session.user.id)
          .maybeSingle();
        if (profileError) throw profileError;

        const savedRole = profile?.role as Role | undefined;
        if (!savedRole) throw new Error('لم يتم العثور على ملف الحساب بعد التحقق');

        const resolvedRole = await resolveUiRole(data.session.user.id, savedRole);
        onSuccess(data.session, resolvedRole);
        return;
      }

      if (role === 'customer') {
        await finishSignup(data.session);
      } else {
        setStep(3);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'رمز التحقق غير صحيح أو انتهت صلاحيته');
    } finally {
      setBusy(false);
    }
  };

  const acceptInvitation = async () => {
    setError('');
    if (!otpVerified) {
      setError('يجب تأكيد رقم الهاتف أولاً');
      return;
    }
    if (form.accessCode.trim().length < 6) {
      setError('أدخل رمز الدعوة');
      return;
    }

    setBusy(true);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        'accept_store_member_invitation',
        { p_invitation_code: form.accessCode.trim() }
      );
      if (rpcError) throw rpcError;

      const result = data as { success?: boolean; member_role?: string } | null;
      if (!result?.success) throw new Error('تعذر قبول الدعوة');

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('انتهت جلسة الدخول');
      onSuccess(sessionData.session, 'merchant');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر قبول دعوة المتجر');
    } finally {
      setBusy(false);
    }
  };

  const requestLoginOtp = async () => {
    setError('');
    if (form.phone.length !== 9) {
      setError('أدخل رقم الهاتف المكون من 9 أرقام');
      return;
    }
    setBusy(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: `+967${form.phone}`
      });
      if (otpError) throw otpError;
      setOtpSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إرسال رمز التحقق');
    } finally {
      setBusy(false);
    }
  };

  const finishSignup = async (session?: Session) => {
    setError('');
    setBusy(true);

    try {
      if (!otpVerified && !session) {
        throw new Error('يجب تأكيد رقم الهاتف أولاً');
      }

      const activeSession = session || (await supabase.auth.getSession()).data.session;
      if (!activeSession) throw new Error('انتهت جلسة التحقق، أعد إرسال الرمز');

      if (role === 'driver') {
        if (!form.accessCode.trim()) throw new Error('أدخل كود المندوب');
        if (!form.nationalId.trim()) throw new Error('أدخل رقم الهوية');
        if (!form.licenseNumber.trim()) throw new Error('أدخل رقم رخصة القيادة');
        if (!form.vehicleType.trim()) throw new Error('أدخل نوع المركبة');
        if (!form.vehiclePlate.trim()) throw new Error('أدخل رقم لوحة المركبة');
      }

      if (role === 'merchant') {
        if (!form.storeName.trim()) throw new Error('أدخل اسم المتجر');
        if (!form.category.trim()) throw new Error('اختر نوع النشاط التجاري');
      }

      const { data: registeredRole, error: registerError } = await supabase.rpc(
        'register_user_profile',
        {
          p_role: role,
          p_full_name: form.name.trim(),
          p_phone: `+967${form.phone}`,
          p_national_id: role === 'driver' ? form.nationalId.trim() : null,
          p_email: null,
          p_store_name: role === 'merchant' ? form.storeName.trim() : null,
          p_store_category: role === 'merchant' ? form.category : null,
          p_access_code: role === 'driver' ? form.accessCode.trim().toUpperCase() : null
        }
      );

      if (registerError) throw registerError;

      if (role === 'driver') {
        const { error: driverProfileError } = await supabase
          .from('driver_profiles')
          .update({
            identity_card_number: form.nationalId.trim(),
            license_number: form.licenseNumber.trim(),
            vehicle_type: form.vehicleType.trim(),
            vehicle_plate_number: form.vehiclePlate.trim(),
            is_available: false
          })
          .eq('id', activeSession.user.id);
        if (driverProfileError) throw driverProfileError;
      }

      const resolvedRole = registeredRole as Role;
      onSuccess(activeSession, resolvedRole);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إنشاء الحساب');
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.phone.length !== 9) {
      setError('أدخل رقم الهاتف المكون من 9 أرقام');
      return;
    }
    if (!form.otp) {
      await requestLoginOtp();
      return;
    }

    setBusy(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+967${form.phone}`,
        token: form.otp,
        type: 'sms'
      });
      if (verifyError) throw verifyError;
      if (!data.session) throw new Error('تعذر إنشاء جلسة الدخول');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, phone_number')
        .eq('id', data.session.user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      const savedRole = profile?.role as Role | undefined;
      if (!savedRole) throw new Error('لم يتم العثور على حساب بهذا الرقم');

      const resolvedRole = await resolveUiRole(data.session.user.id, savedRole);
      onSuccess(data.session, resolvedRole);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'رمز التحقق غير صحيح أو انتهت صلاحيته');
    } finally {
      setBusy(false);
    }
  };

  const roleTitle =
    role === 'customer'
      ? 'حساب العميل'
      : role === 'driver'
        ? 'حساب المندوب'
        : 'حساب التاجر';

  return (
    <main className="jarmal-app min-h-screen px-5 py-7">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/55 hover:text-white"
        >
          <ArrowRight size={18} />
          العودة
        </button>

        <Logo />
      </header>

      <div className="mx-auto max-w-2xl py-10">
        <div className="mb-8 text-center">
          <Pill>{roleTitle}</Pill>

          <h1 className="mt-4 text-4xl font-black">
            {mode === 'signup'
              ? 'أنشئ حسابك'
              : 'سجّل دخولك'}
          </h1>

          {mode === 'signup' && (
            <p className="mt-3 text-sm text-white/40">
              تسجيل سريع وسهل باستخدام رقم الهاتف
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:p-9">
          {mode === 'signup' && (
            <div
              className="mb-8 grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${totalSteps}, 1fr)`
              }}
            >
              {stepLabels.map((label, index) => (
                <div key={label} className="text-center">
                  <div
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition-all ${
                      index + 1 <= step
                        ? 'bg-[#e3fe00] text-black'
                        : 'bg-white/10 text-white/30'
                    }`}
                  >
                    {index + 1 < step ? (
                      <Check size={15} />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <p
                    className={`mt-2 hidden text-[10px] sm:block ${
                      index + 1 === step
                        ? 'text-[#e3fe00]'
                        : 'text-white/30'
                    }`}
                  >
                    {label}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4 flex rounded-xl bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setInviteMode(false);
                    setStep(1);
                    setError('');
                    setOtpVerified(false);
                    setOtpSent(false);
                  }}
                  className={`flex-1 rounded-lg py-3 text-sm font-bold ${mode === 'signup' && !inviteMode ? 'bg-[#e3fe00] text-black' : 'text-white/40'}`}
                >
                  حساب جديد
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setInviteMode(false);
                    setStep(1);
                    setError('');
                    setOtpVerified(false);
                    setOtpSent(false);
                  }}
                  className={`flex-1 rounded-lg py-3 text-sm font-bold ${mode === 'login' && !inviteMode ? 'bg-[#e3fe00] text-black' : 'text-white/40'}`}
                >
                  لدي حساب
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setInviteMode(true);
                  setMode('signup');
                  setStep(1);
                  setError('');
                  setOtpVerified(false);
                  setOtpSent(false);
                  update('otp', '');
                  update('accessCode', '');
                }}
                className="mb-7 w-full rounded-xl border border-[#e3fe00]/30 py-3 text-sm font-bold text-[#e3fe00] hover:bg-[#e3fe00]/5"
              >
                لدي دعوة من متجر
              </button>

          {mode === 'login' && (
            <form onSubmit={submitLogin} className="space-y-4">
              <div className="mb-3 text-center">
                <h2 className="text-xl font-black">
                  تسجيل الدخول
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  أدخل رقم هاتفك ورمز التحقق
                </p>
              </div>

              <PhoneField
                value={form.phone}
                onChange={(value) => update('phone', value)}
              />

              <button
                type="button"
                onClick={() => void requestLoginOtp()}
                disabled={busy || form.phone.length !== 9}
                className="w-full rounded-xl border border-[#e3fe00]/30 py-3 text-sm font-bold text-[#e3fe00] disabled:opacity-50"
              >
                {busy ? 'جارٍ إرسال الرمز...' : otpSent ? 'إعادة إرسال رمز التحقق' : 'إرسال رمز التحقق'}
              </button>

              <Field
                label="رمز التحقق"
                value={form.otp}
                onChange={(value) =>
                  update(
                    'otp',
                    value.replace(/\D/g, '').slice(0, 6)
                  )
                }
                placeholder="123456"
                icon={<ShieldCheck size={17} />}
              />

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                disabled={busy || form.phone.length !== 9 || form.otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50"
              >
                {busy ? 'جارٍ الدخول...' : 'دخول إلى حسابي'}
                <ArrowLeft size={18} />
              </button>
            </form>
          )}

          {mode === 'signup' && step === 1 && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendOtp();
              }}
              className="space-y-4"
            >
              <div className="mb-2 text-center">
                <h2 className="text-xl font-black">
                  البيانات الأساسية
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  أدخل اسمك ورقم هاتفك للبدء
                </p>
              </div>

              <Field
                label="الاسم"
                value={form.name}
                onChange={(value) => update('name', value)}
                placeholder="اكتب اسمك"
                icon={<UserRound size={17} />}
              />

              <PhoneField
                value={form.phone}
                onChange={(value) => update('phone', value)}
              />

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!form.name.trim() || form.phone.length !== 9}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50"
              >
                تأكيد رقم الهاتف
                <ArrowLeft size={18} />
              </button>
            </form>
          )}

          {mode === 'signup' && step === 2 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#e3fe00]/20 bg-[#e3fe00]/5 p-5 text-center">
                <ShieldCheck
                  className="mx-auto text-[#e3fe00]"
                  size={32}
                />

                <h2 className="mt-4 text-xl font-black">
                  تأكيد رقم الهاتف
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/45">
                  {otpSent
                    ? `تم إرسال رمز التحقق إلى +967 ${form.phone}`
                    : `أدخل رمز التحقق إلى +967 ${form.phone}`}
                </p>
              </div>

              <Field
                label="رمز التحقق OTP"
                value={form.otp}
                onChange={(value) =>
                  update(
                    'otp',
                    value.replace(/\D/g, '').slice(0, 6)
                  )
                }
                placeholder="123456"
                icon={<ShieldCheck size={17} />}
              />

              <button
                type="button"
                onClick={() => {
                  setOtpSent(true);
                  setError('');
                }}
                className="mx-auto block text-xs text-[#e3fe00] hover:underline"
              >
                إعادة إرسال الرمز
              </button>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prev}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-4 text-sm font-bold text-white/60 hover:border-white/30"
                >
                  <ArrowRight size={18} />
                  السابق
                </button>

                <button
                  type="button"
                  onClick={verifyPhoneOtp}
                  disabled={form.otp.length !== 6}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50"
                >
                  تأكيد واستمرار
                  <ArrowLeft size={18} />
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' &&
            step === 3 &&
            role === 'driver' && (
              <div className="space-y-4">
                <div className="mb-2 text-center">
                  <h2 className="text-xl font-black">بيانات المندوب</h2>
                  <p className="mt-1 text-sm text-white/40">هذه البيانات ستراجعها إدارة جَرْمَل قبل تفعيلك للعمل.</p>
                </div>

                <Field label="رقم الهوية" value={form.nationalId} onChange={(value) => update('nationalId', value)} placeholder="رقم البطاقة الشخصية" icon={<ShieldCheck size={17} />} />
                <Field label="رقم رخصة القيادة" value={form.licenseNumber} onChange={(value) => update('licenseNumber', value)} placeholder="رقم الرخصة" icon={<ClipboardList size={17} />} />
                <Field label="نوع المركبة" value={form.vehicleType} onChange={(value) => update('vehicleType', value)} placeholder="مثال: دراجة نارية / سيارة" icon={<Truck size={17} />} />
                <Field label="رقم لوحة المركبة" value={form.vehiclePlate} onChange={(value) => update('vehiclePlate', value)} placeholder="رقم اللوحة" icon={<Bike size={17} />} />

                <div>
                  <label className="mb-2 block text-sm font-bold">كود المندوب</label>
                  <input required value={form.accessCode} onChange={(e) => update('accessCode', e.target.value.toUpperCase())} placeholder="مثال: JARMAL-101" className="w-full rounded-xl border border-[#e3fe00]/40 bg-black px-4 py-3.5 text-left font-bold tracking-widest text-[#e3fe00] outline-none placeholder:text-white/20 focus:border-[#e3fe00]" />
                  <p className="mt-2 text-xs text-white/35">الكود يجب أن يكون صادرًا من الإدارة.</p>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={prev}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-4 text-sm font-bold text-white/60 hover:border-white/30"
                  >
                    <ArrowRight size={18} />
                    السابق
                  </button>

                  <button
                    type="button"
                    disabled={busy || !form.accessCode.trim() || !form.nationalId.trim() || !form.licenseNumber.trim() || !form.vehicleType.trim() || !form.vehiclePlate.trim()}
                    onClick={() => void finishSignup()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50"
                  >
                    {busy
                      ? 'جارٍ إنشاء الحساب...'
                      : 'إنشاء الحساب'}
                    <ArrowLeft size={18} />
                  </button>
                </div>
              </div>
            )}

          {mode === 'signup' &&
            step === 3 &&
            role === 'merchant' && (
              <div className="space-y-4">
                <div className="mb-2 text-center">
                  <h2 className="text-xl font-black">
                    بيانات المتجر
                  </h2>

                  <p className="mt-1 text-sm text-white/40">
                    بقيت خطوة واحدة فقط
                  </p>
                </div>

                <Field
                  label="اسم المتجر"
                  value={form.storeName}
                  onChange={(value) =>
                    update('storeName', value)
                  }
                  placeholder="مثال: تموينات النخبة"
                  icon={<Store size={17} />}
                />

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    نوع النشاط التجاري
                  </label>

                  <select
                    value={form.category}
                    onChange={(e) =>
                      update('category', e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none focus:border-[#e3fe00]"
                  >
                    {businessCategories.map((category) => (
                      <option key={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={prev}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-4 text-sm font-bold text-white/60 hover:border-white/30"
                  >
                    <ArrowRight size={18} />
                    السابق
                  </button>

                  <button
                    type="button"
                    disabled={busy || !form.storeName.trim()}
                    onClick={() => void finishSignup()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50"
                  >
                    {busy
                      ? 'جارٍ إنشاء الحساب...'
                      : 'إنشاء الحساب ودخول التطبيق'}
                    <ArrowLeft size={18} />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}

function Topbar({
  role,
  onLogout,
  onSettings,
  onNotifications,
  title
}: {
  role: Role;
  onLogout: () => void;
  onSettings?: () => void;
  onNotifications?: () => void;
  title: string;
}) {
  return (
    <header className="jarmal-topbar sticky top-0 z-20 border-b px-4 py-3 sm:px-5 sm:py-3.5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Logo />
          <span className="hidden h-5 w-px bg-white/20 sm:block" />
          <div className="hidden sm:block">
            <span className="text-sm font-black">{title}</span>
            <span className="mt-0.5 block text-[10px] font-medium text-white/35">منصة جَرْمَل</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {onNotifications && <button type="button" onClick={onNotifications} aria-label="الإشعارات" title="الإشعارات" className="relative rounded-xl p-2 text-white/60 hover:bg-black/5"><Bell size={19} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#e3fe00]" /></button>}
          {onSettings && <button type="button" onClick={onSettings} aria-label="الإعدادات" title="الإعدادات" className="rounded-xl p-2 text-white/70 hover:bg-black/5 hover:text-black"><Settings2 size={19} /></button>}
          <div className="hidden items-center gap-2 text-sm font-bold sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3fe00] text-black"><UserRound size={17} /></div>
            <span>{role === 'customer' ? 'أهلاً بك' : role === 'driver' ? 'مندوب جَرْمَل' : 'متجرك'}</span>
          </div>
          <button onClick={onLogout} aria-label="تسجيل الخروج" title="تسجيل الخروج" className="rounded-xl p-2 text-white/40 hover:text-red-400"><LogOut size={18} /></button>
        </div>
      </div>
    </header>
  );
}

function StoreTeamView({ storeId }: { storeId: string }) {
  const [members, setMembers] = useState<StoreTeamMemberRow[]>([]);
  const [invitations, setInvitations] = useState<StoreInvitationRow[]>([]);
  const [phone, setPhone] = useState('');
  const [memberRole, setMemberRole] = useState<Exclude<StoreMemberContext['member_role'], 'owner'>>('orders_employee');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const roleLabel: Record<string, string> = {
    manager: 'مدير المتجر',
    orders_employee: 'موظف الطلبات',
    warehouse_employee: 'موظف المخزون'
  };

  const loadTeam = async () => {
    const { data: memberRows } = await supabase
      .from('store_members')
      .select('id, user_id, member_role, is_active')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true });

    const rows = (memberRows as StoreTeamMemberRow[] | null) || [];
    if (rows.length) {
      const ids = rows.map((row) => row.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number')
        .in('id', ids);
      const byId = new Map((profiles || []).map((profile: { id: string; full_name: string | null; phone_number: string | null }) => [profile.id, profile]));
      rows.forEach((row) => { row.profile = byId.get(row.user_id) || null; });
    }
    setMembers(rows);

    const { data: inviteRows } = await supabase
      .from('store_member_invitations')
      .select('id, phone_number, member_role, status, expires_at, created_at')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setInvitations((inviteRows as StoreInvitationRow[] | null) || []);
  };

  useEffect(() => { void loadTeam(); }, [storeId]);

  const createInvitation = async () => {
    setError('');
    setInviteCode('');
    const normalizedPhone = phone.replace(/\\D/g, '');
    if (normalizedPhone.length !== 9) {
      setError('أدخل رقم هاتف يمني مكوناً من 9 أرقام');
      return;
    }

    setBusy(true);
    const { data, error: rpcError } = await supabase.rpc('create_store_member_invitation', {
      p_store_id: storeId,
      p_phone_number: `+967${normalizedPhone}`,
      p_member_role: memberRole
    });
    setBusy(false);

    if (rpcError) {
      setError(rpcError.message || 'تعذر إنشاء الدعوة');
      return;
    }

    setInviteCode(String(data || ''));
    setPhone('');
    void loadTeam();
  };

  const toggleMember = async (member: StoreTeamMemberRow) => {
    setError('');
    const { error: rpcError } = await supabase.rpc('set_store_member_active', {
      p_member_id: member.id,
      p_is_active: !member.is_active
    });
    if (rpcError) setError(rpcError.message || 'تعذر تحديث الموظف');
    else void loadTeam();
  };

  return (
    <section className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/40">إدارة الصلاحيات</p>
          <h2 className="mt-1 text-2xl font-black">فريق المتجر</h2>
        </div>
        <span className="rounded-full bg-[#e3fe00]/10 px-3 py-2 text-xs font-bold text-[#e3fe00]">المالك فقط</span>
      </div>

      <div className="mt-7 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
        <h3 className="font-black">دعوة موظف</h3>
        <p className="mt-1 text-xs text-white/40">سيظهر لك رمز دعوة لمرة واحدة. أعطه للموظف عبر قناة موثوقة.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\\D/g, '').slice(0, 9))}
            placeholder="7xx xxx xxx"
            dir="ltr"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-[#e3fe00]"
          />
          <select
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value as typeof memberRole)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-[#e3fe00]"
          >
            <option value="orders_employee">موظف الطلبات</option>
            <option value="warehouse_employee">موظف المخزون</option>
            <option value="manager">مدير المتجر</option>
          </select>
          <button disabled={busy} onClick={() => void createInvitation()} className="rounded-xl bg-[#e3fe00] px-5 py-3 font-black text-black disabled:opacity-50">
            {busy ? 'جارٍ...' : 'إنشاء الدعوة'}
          </button>
        </div>
        {error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        {inviteCode && (
          <div className="mt-4 rounded-xl border border-[#e3fe00]/30 bg-[#e3fe00]/5 p-4">
            <p className="text-xs text-white/50">رمز الدعوة — اعرضه للموظف مرة واحدة:</p>
            <p className="mt-2 text-2xl font-black tracking-[.18em] text-[#e3fe00]" dir="ltr">{inviteCode}</p>
            <p className="mt-2 text-xs text-white/35">تنتهي الدعوة تلقائياً بعد 7 أيام، والرمز غير مخزن كنص في قاعدة البيانات.</p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
        <h3 className="font-black">أعضاء الفريق</h3>
        <div className="mt-4 space-y-3">
          {members.filter((member) => member.member_role !== 'owner').map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/30 p-4">
              <div>
                <p className="font-bold">{member.profile?.full_name || 'موظف'}</p>
                <p className="mt-1 text-xs text-white/40" dir="ltr">{member.profile?.phone_number || '—'} • {roleLabel[member.member_role]}</p>
              </div>
              <button onClick={() => void toggleMember(member)} className={`rounded-lg px-3 py-2 text-xs font-bold ${member.is_active ? 'bg-[#e3fe00]/10 text-[#e3fe00]' : 'bg-white/10 text-white/40'}`}>
                {member.is_active ? 'نشط — تعطيل' : 'معطل — تفعيل'}
              </button>
            </div>
          ))}
          {members.filter((member) => member.member_role !== 'owner').length === 0 && <p className="text-sm text-white/40">لا يوجد موظفون مرتبطون بالمتجر بعد.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
        <h3 className="font-black">الدعوات المعلقة</h3>
        <div className="mt-4 space-y-3">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/30 p-4">
              <div>
                <p className="font-bold" dir="ltr">{invitation.phone_number}</p>
                <p className="mt-1 text-xs text-white/40">{roleLabel[invitation.member_role]} • تنتهي {new Date(invitation.expires_at).toLocaleDateString('ar-YE')}</p>
              </div>
              <span className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/40">معلقة</span>
            </div>
          ))}
          {invitations.length === 0 && <p className="text-sm text-white/40">لا توجد دعوات معلقة.</p>}
        </div>
      </div>
    </section>
  );
}

function StoreAuditLogView({ storeId }: { storeId: string }) {
  const [logs, setLogs] = useState<StoreAuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const actionLabel: Record<string, string> = {
    staff_invitation_created: 'إنشاء دعوة موظف',
    staff_invitation_accepted: 'قبول دعوة موظف',
    staff_member_deactivated: 'تعطيل موظف',
    staff_member_reactivated: 'إعادة تفعيل موظف'
  };

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('store_audit_logs')
      .select('id, action, entity_type, entity_id, metadata, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs((data as StoreAuditRow[] | null) || []);
    setLoading(false);
  };

  useEffect(() => { void loadLogs(); }, [storeId]);

  return (
    <section className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-white/40">الأمان والشفافية</p>
          <h2 className="mt-1 text-2xl font-black">سجل نشاط المتجر</h2>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/60 hover:border-[#e3fe00]/30 hover:text-[#e3fe00]"
        >
          تحديث السجل
        </button>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">
        {loading ? (
          <div className="p-8 text-center text-sm text-white/40">جارٍ تحميل السجل...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-white/40">لا توجد عمليات مسجلة حتى الآن.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((log) => {
              const metadata = log.metadata || {};
              const actorName = typeof metadata.actor_name === 'string' ? metadata.actor_name : 'حساب المستخدم';
              const phone = typeof metadata.phone_number === 'string' ? metadata.phone_number : '';
              const memberRole = typeof metadata.member_role === 'string' ? metadata.member_role : '';
              return (
                <div key={log.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{actionLabel[log.action] || log.action}</p>
                      <p className="mt-1 text-xs text-white/45">بواسطة: {actorName}</p>
                    </div>
                    <time className="text-xs text-white/35" dir="ltr">
                      {new Date(log.created_at).toLocaleString('ar-YE')}
                    </time>
                  </div>
                  {(phone || memberRole) && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {phone && <span className="rounded-lg bg-white/5 px-3 py-2 text-white/45" dir="ltr">{phone}</span>}
                      {memberRole && <span className="rounded-lg bg-[#e3fe00]/10 px-3 py-2 text-[#e3fe00]">{memberRole === 'manager' ? 'مدير المتجر' : memberRole === 'orders_employee' ? 'موظف الطلبات' : 'موظف المخزون'}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsView({ role, phone }: { role: 'customer' | 'driver' | 'merchant'; phone?: string | null }) {
  const roleLabel = role === 'customer' ? 'العميل' : role === 'driver' ? 'المندوب' : 'التاجر';
  const [notifications, setNotifications] = useState(true);
  return (
    <section className="space-y-6">
      <div><p className="text-sm text-white/40">تخصيص تجربتك في جَرْمَل</p><h1 className="mt-1 text-3xl font-black">الإعدادات</h1></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="jarmal-card rounded-2xl border p-5">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e3fe00]/15 text-[#6f7e00]"><UserRound size={20}/></div><div><p className="font-black">الحساب</p><p className="text-xs text-white/40">نوع الحساب: {roleLabel}</p></div></div>
          <div className="mt-5 rounded-xl bg-[#f4f6f1] p-4"><p className="text-xs text-white/40">رقم الهاتف</p><p className="mt-1 font-bold" dir="ltr">{phone || 'غير متوفر'}</p></div>
        </div>
        <div className="jarmal-card rounded-2xl border p-5">
          <p className="font-black">التفضيلات</p>
          <div className="mt-4 flex items-center justify-between border-t border-[#e5e8e2] py-4"><div><p className="font-bold">إشعارات الطلبات</p><p className="mt-1 text-xs text-white/40">تنبيهات حالة الطلب والتحديثات المهمة</p></div>
            <button type="button" aria-label="تفعيل إشعارات الطلبات" onClick={() => setNotifications(v => !v)} className={`relative h-7 w-12 rounded-full ${notifications ? 'bg-[#dfff00]' : 'bg-[#dfe4db]'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${notifications ? 'right-1' : 'left-1'}`} /></button>
          </div>
          <div className="flex items-center justify-between border-t border-[#e5e8e2] py-4"><div><p className="font-bold">اللغة</p><p className="mt-1 text-xs text-white/40">لغة واجهة جَرْمَل</p></div><span className="rounded-lg bg-[#f4f6f1] px-3 py-2 text-xs font-bold">العربية</span></div>
        </div>
      </div>
      <div className="rounded-2xl border border-[#dfe4db] bg-white p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-[#7e8f00]" size={20}/><div><p className="font-black">الخصوصية والأمان</p><p className="mt-1 text-sm text-[#70776f]">تسجيل الدخول يعتمد على رقم الهاتف ورمز تحقق SMS، ولا نعرض بيانات حساسة داخل الواجهة.</p></div></div></div>
    </section>
  );
}

function SideNav({
  role,
  active,
  onActive,
  merchantCanManageTeam = false,
  merchantCanManageInventory = false
}: {
  role: Role;
  active: string;
  onActive: (value: string) => void;
  merchantCanManageTeam?: boolean;
  merchantCanManageInventory?: boolean;
}) {
  const [showMore, setShowMore] = useState(false);
  const items: [string, string, React.ElementType][] =
    role === 'customer'
      ? [
          ['home', 'الرئيسية', Home],
          ['orders', 'طلباتي', ClipboardList],
          ['invoices', 'فواتيري', FileText],
          ['notifications', 'الإشعارات', Bell],
          ['services', 'الخدمات', Zap],
          ['wallet', 'محفظتي', WalletCards],
          ['map', 'تتبع الطلب', Navigation],
          ['profile', 'حسابي', UserRound],
          ['settings', 'الإعدادات', Settings2]
        ]
      : role === 'driver'
        ? [
            ['available', 'الطلبات الجاهزة للاستلام', Navigation],
            ['active', 'الطلب الحالي', Truck],
          ['notifications', 'الإشعارات', Bell],
            ['history', 'سجل التوصيلات', ClipboardList],
            ['wallet', 'محفظتي', WalletCards],
            ['settings', 'الإعدادات', Settings2]
          ]
        : [
            ['dashboard', 'نظرة عامة', BarChart3],
            ['incoming', 'الطلبات الواردة', ClipboardList],
            ['notifications', 'الإشعارات', Bell],
            ['products', 'إدارة المنتجات', ShoppingBag],
            ...(merchantCanManageInventory ? [['inventory', 'المخزون', Boxes] as [string, string, React.ElementType]] : []),
            ['wallet', 'محفظتي', WalletCards],
            ['settings', 'إعدادات المتجر', Settings2],
            ...(merchantCanManageTeam ? [['team', 'فريق المتجر', UserRound] as [string, string, React.ElementType]] : [])
          ];
  const mobilePrimaryIds = role === 'customer' ? ['home', 'services', 'wallet', 'profile'] : role === 'driver' ? ['available', 'active', 'history', 'wallet'] : ['dashboard', 'incoming', 'products', 'wallet'];

  return (
    <>
      <aside className="jarmal-sidenav hidden w-60 shrink-0 border-l p-4 lg:block">
        <div className="jarmal-nav-heading mb-4 px-3">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/30">جَرْمَل</p>
          <p className="mt-1 text-xs font-bold text-white/45">القائمة الرئيسية</p>
        </div>

        <nav className="space-y-1">
          {items.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => onActive(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                active === id
                  ? 'bg-[#e3fe00] text-black'
                  : 'text-white/45 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>


      {showMore && <button aria-label="إغلاق القائمة الإضافية" className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setShowMore(false)} />}
      {showMore && (
        <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-40 rounded-2xl border border-[#e5e8e2] bg-white p-2 shadow-2xl lg:hidden">
          {items.filter(([id]) => !mobilePrimaryIds.includes(id) && id !== 'settings').map(([id, label, Icon]) => (
            <button key={id} onClick={() => { onActive(id); setShowMore(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${active === id ? 'bg-[#e3fe00] text-black' : 'text-[#596159] hover:bg-[#f4f6f1]'}`}>
              <Icon size={18} />{label}
            </button>
          ))}
        </div>
      )}
      <nav className="jarmal-bottom-nav fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {items.filter(([id]) => mobilePrimaryIds.includes(id)).map(([id, label, Icon]) => (
          <button key={id} onClick={() => { onActive(id); setShowMore(false); }} className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold ${active === id ? 'text-[#e3fe00]' : 'text-white/50'}`}>
            <Icon size={19} /><span className="max-w-full truncate px-1">{label}</span>
          </button>
        ))}
        {items.some(([id]) => !mobilePrimaryIds.includes(id) && id !== 'settings') && (
          <button onClick={() => setShowMore(value => !value)} aria-expanded={showMore} className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold ${showMore ? 'text-[#e3fe00]' : 'text-white/50'}`}>
            <Menu size={19} /><span>المزيد</span>
          </button>
        )}
      </nav>
    </>
  );
}

function MapCard({
  latitude,
  longitude,
  address,
  driverLatitude,
  driverLongitude
}: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  driverLatitude?: number | null;
  driverLongitude?: number | null;
}) {
  const hasDestination = Number.isFinite(latitude) && Number.isFinite(longitude);
  const hasDriver = Number.isFinite(driverLatitude) && Number.isFinite(driverLongitude);
  const mapsUrl = hasDestination
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : 'https://www.google.com/maps';

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#e1e5de] bg-[#fafbf9] px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black text-[#171a16]">
            <MapPin size={16} className="text-[#7a8a00]" />
            {hasDestination ? 'موقع التسليم الحقيقي' : 'موقع التسليم غير محدد'}
          </p>
          {address && <p className="mt-1 truncate text-xs text-[#747b72]">{address}</p>}
          {hasDriver && <p className="mt-1 text-[11px] font-bold text-[#687500]">موقع المندوب متاح ويتحدث تلقائيًا.</p>}
          {!hasDriver && <p className="mt-1 text-[11px] text-[#747b72]">موقع المندوب غير متاح حاليًا.</p>}
        </div>
        {hasDestination && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-xl bg-[#e3fe00] px-3 py-2 text-xs font-black text-black"
          >
            فتح في الخرائط
          </a>
        )}
      </div>
      {hasDestination ? (
        <LocationMap
          latitude={Number(latitude)}
          longitude={Number(longitude)}
          driverLatitude={hasDriver ? Number(driverLatitude) : null}
          driverLongitude={hasDriver ? Number(driverLongitude) : null}
          interactive={false}
          title="موقع التسليم"
        />
      ) : (
        <div className="flex h-64 items-center justify-center bg-[#f5f6f3] px-5 text-center text-sm text-[#747b72]">
          لا توجد إحداثيات حقيقية محفوظة لهذا الطلب.
        </div>
      )}
    </div>
  );
}
function NotificationsView({ onOpenOrder }: { onOpenOrder?: () => void }) {
  type NotificationRow = {
    id: string;
    type: string;
    title: string;
    body: string | null;
    order_id: string | null;
    is_read: boolean;
    created_at: string;
  };

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      return;
    }

    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, order_id, is_read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setItems(data as NotificationRow[]);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const markRead = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    setItems(current => current.map(item => item.id === id ? { ...item, is_read: true } : item));
  };

  const markAllRead = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    }
    await load();
    setBusy(false);
  };

  const unread = items.filter(item => !item.is_read).length;

  return (
    <section className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[#747b72]">آخر تنبيهات وتحديثات حسابك</p>
          <h1 className="mt-1 text-3xl font-black">الإشعارات</h1>
        </div>
        {unread > 0 && (
          <button disabled={busy} onClick={markAllRead} className="rounded-xl border border-[#e1e5de] bg-white px-4 py-2.5 text-xs font-black text-[#596159] disabled:opacity-50">
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => {
              if (!item.is_read) void markRead(item.id);
              if (item.order_id) onOpenOrder?.();
            }}
            className={`w-full rounded-2xl border p-4 text-right transition ${item.is_read ? 'border-[#e7eae5] bg-white' : 'border-[#e3fe00]/50 bg-[#e3fe00]/10'}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e3fe00] text-black">
                <Bell size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black">{item.title}</h3>
                  {!item.is_read && <span className="rounded-full bg-[#e3fe00] px-2 py-1 text-[10px] font-black text-black">جديد</span>}
                </div>
                {item.body && <p className="mt-1 text-sm leading-6 text-[#697068]">{item.body}</p>}
                <p className="mt-2 text-[11px] text-[#8a9088]">{new Date(item.created_at).toLocaleString('ar-YE')}</p>
              </div>
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#dfe4db] bg-white py-16 text-center">
            <Bell className="mx-auto text-[#a0a69e]" size={30} />
            <p className="mt-3 font-black">لا توجد إشعارات حالياً</p>
            <p className="mt-1 text-sm text-[#858c84]">ستظهر هنا تحديثات الطلبات والحساب.</p>
          </div>
        )}
      </div>
    </section>
  );
}


type AssistantMessage = {
  id: string;
  from: 'assistant' | 'user';
  text: string;
};

function JarmalAssistant({
  active,
  orders,
  onNavigate
}: {
  active: string;
  orders: OrderRow[];
  onNavigate: (screen: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ProductRow[]>([]);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      from: 'assistant',
      text: 'هلا بك 👋 أنا رفيق جَرْمَل. أقدر أبحث لك عن منتج أو أساعدك في معرفة حالة طلبك.'
    }
  ]);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    window.addEventListener('jarmal-open-assistant', openAssistant);
    return () => window.removeEventListener('jarmal-open-assistant', openAssistant);
  }, []);

  const pageHint =
    active === 'orders'
      ? 'خلني أشوف طلباتك الحالية.'
      : active === 'services'
        ? 'أقدر أساعدك في الوصول إلى الخدمات.'
        : active === 'wallet'
          ? 'أقدر أشرح لك خيارات المحفظة والدفع.'
          : active === 'notifications'
            ? 'خلني أساعدك في متابعة التنبيهات.'
            : 'ماذا تريد أن تطلب اليوم؟';

  const suggestions =
    active === 'orders'
      ? ['أين طلبي؟', 'عرض طلباتي', 'أحتاج مساعدة']
      : active === 'services'
        ? ['عرض الخدمات', 'أحتاج مساعدة']
        : active === 'wallet'
          ? ['عرض المحفظة', 'طرق الدفع', 'أحتاج مساعدة']
          : ['ابحث عن منتج', 'أين طلبي؟', 'عرض المتاجر', 'أحتاج مساعدة'];

  const pushMessage = (from: AssistantMessage['from'], text: string) => {
    setMessages((current) => [
      ...current.slice(-7),
      { id: `${Date.now()}-${from}`, from, text }
    ]);
  };

  const askAi = async (value: string) => {
    const history = messages
      .slice(-8)
      .map((item) => ({
        role: item.from,
        text: item.text
      }));

    const { data, error } = await supabase.functions.invoke('jarmal-ai', {
      body: {
        message: value,
        role: 'customer',
        page: active,
        context: {
          activeOrders: orders.slice(0, 5).map((order) => ({
            status: order.status,
            total_amount: order.total_amount,
            payment_status: order.payment_status,
            payment_method: order.payment_method
          }))
        },
        history
      }
    });

    if (error) throw error;

    if (data?.reply) {
      pushMessage('assistant', data.reply);
      return;
    }

    pushMessage(
      'assistant',
      'أقدر أساعدك في وظائف جَرْمَل الحالية، لكن المحادثة الذكية العامة غير مفعلة على الخادم حتى الآن.'
    );
  };

  const handleCommand = async (raw: string) => {
    const value = raw.trim();
    if (!value || busy) return;

    setInput('');
    setResults([]);
    pushMessage('user', value);
    setBusy(true);

    try {
      const normalized = value.toLowerCase();

      if (
        normalized.includes('أين طلبي') ||
        normalized.includes('اين طلبي') ||
        normalized.includes('حالة طلب') ||
        normalized.includes('طلبات')
      ) {
        const activeOrder = orders.find(
          (order) => !['delivered', 'cancelled'].includes(order.status)
        );

        if (!activeOrder) {
          pushMessage('assistant', 'لا يوجد لديك طلب نشط حاليًا. أقدر أساعدك في اختيار متجر أو منتج.');
          return;
        }

        pushMessage(
          'assistant',
          `طلبك الحالي حالته: ${statusLabels[activeOrder.status] || activeOrder.status}. إجمالي الطلب ${Number(activeOrder.total_amount || 0).toLocaleString('ar-YE')} ${CURRENCY}.`
        );
        onNavigate('orders');
        return;
      }

      if (
        normalized.includes('متجر') ||
        normalized.includes('مطعم') ||
        normalized.includes('صيدلية')
      ) {
        pushMessage('assistant', 'أكيد. فتحت لك قائمة المتاجر، واختر المتجر الذي يناسبك.');
        onNavigate('home');
        return;
      }

      if (normalized.includes('محفظ') || normalized.includes('دفع')) {
        pushMessage('assistant', 'فتحت لك المحفظة. ستظهر لك طرق الدفع المتاحة فعليًا في جَرْمَل.');
        onNavigate('wallet');
        return;
      }

      if (normalized.includes('خدمات') || normalized.includes('خدمة')) {
        pushMessage('assistant', 'هذه صفحة الخدمات المتاحة في جَرْمَل.');
        onNavigate('services');
        return;
      }

      const searchTerm = value
        .replace(/ابحث عن|ابحث لي عن|أريد|اريد|من فضلك|لو سمحت|منتج|شيء/gi, '')
        .trim();

      if (searchTerm.length >= 2 && (
        normalized.includes('ابحث') ||
        normalized.includes('منتج') ||
        normalized.includes('اشتر') ||
        normalized.includes('أريد')
      )) {
        const { data, error } = await supabase
          .from('products')
          .select('id, store_id, name, description, price, is_available, category_id, redemption_points_cost')
          .eq('is_available', true)
          .ilike('name', `%${searchTerm}%`)
          .limit(6);

        if (error) throw error;

        const found = (data || []) as ProductRow[];
        setResults(found);

        if (found.length > 0) {
          pushMessage('assistant', `وجدت لك ${found.length} نتيجة حقيقية مطابقة لـ «${searchTerm}».`);
        } else {
          pushMessage('assistant', `لم أجد «${searchTerm}» ضمن المنتجات المتاحة حاليًا. يمكنك استخدام «اطلب منتج غير موجود» من صفحة المتجر.`);
        }
        return;
      }

      await askAi(value);
    } catch (error) {
      pushMessage(
        'assistant',
        error instanceof Error
          ? 'تعذر الوصول إلى رفيق جَرْمَل الذكي الآن. أستطيع الاستمرار في مساعدتك بالوظائف المتاحة داخل التطبيق.'
          : 'حدث خطأ غير متوقع.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {open && (
        <div className="jarmal-assistant-overlay" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {open && (
        <section
          className="jarmal-assistant-panel"
          dir="rtl"
          role="dialog"
          aria-label="رفيق جَرْمَل"
        >
          <div className="jarmal-assistant-head">
            <div className="jarmal-assistant-avatar" aria-hidden="true">
              <Sparkles size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2>رفيق جَرْمَل</h2>
                <span>متاح</span>
              </div>
              <p>{pageHint}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="jarmal-assistant-close"
              aria-label="إغلاق المساعد"
            >
              <X size={19} />
            </button>
          </div>

          <div className="jarmal-assistant-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`jarmal-assistant-message ${message.from === 'user' ? 'is-user' : 'is-assistant'}`}
              >
                {message.text}
              </div>
            ))}

            {results.length > 0 && (
              <div className="jarmal-assistant-results">
                {results.map((product) => (
                  <div key={product.id} className="jarmal-assistant-result">
                    <div>
                      <strong>{product.name}</strong>
                      <small>{product.description || 'منتج متاح في جَرْمَل'}</small>
                    </div>
                    <b>{Number(product.price || 0).toLocaleString('ar-YE')} {CURRENCY}</b>
                  </div>
                ))}
              </div>
            )}

            {busy && (
              <div className="jarmal-assistant-typing">
                <span />
                <span />
                <span />
                أبحث لك...
              </div>
            )}
          </div>

          <div className="jarmal-assistant-suggestions">
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => void handleCommand(suggestion)}>
                {suggestion}
                <ChevronLeft size={14} />
              </button>
            ))}
          </div>

          <form
            className="jarmal-assistant-input"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCommand(input);
            }}
          >
            <Search size={18} />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="اكتب ما تحتاجه..."
              aria-label="اكتب ما تحتاجه"
            />
            <button type="submit" disabled={!input.trim() || busy} aria-label="إرسال">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        className={`jarmal-assistant-launcher ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="فتح رفيق جَرْمَل"
      >
        <span className="jarmal-assistant-launcher-icon">
          <Sparkles size={21} />
        </span>
        <span className="jarmal-assistant-launcher-copy">
          <strong>رفيق جَرْمَل</strong>
          <small>كيف أساعدك؟</small>
        </span>
      </button>
    </>
  );
}

function CustomerApp({ onLogout, companionTarget }: { onLogout: () => void; companionTarget?: string | null }) {
  const [active, setActive] = useState('home');
  const [storeCategory, setStoreCategory] = useState<string>('الكل');
  const [storesReal, setStoresReal] = useState<StoreRow[]>([]);
  const [productsReal, setProductsReal] = useState<ProductRow[]>([]);
  const [popularProducts, setPopularProducts] = useState<ProductRow[]>([]);
  const [categoriesReal, setCategoriesReal] = useState<CategoryRow[]>([]);
  const [variantsReal, setVariantsReal] = useState<VariantRow[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartStoreId, setCartStoreId] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [ordersReal, setOrdersReal] = useState<OrderRow[]>([]);
  const [wallet, setWallet] = useState<ClientWalletRow>({ balance: 0, points: 0 });
  const [providers, setProviders] = useState<ServiceProviderRow[]>([]);
  const [packages, setPackages] = useState<ServicePackageRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [invoicesReal, setInvoicesReal] = useState<InvoiceRow[]>([]);
  const [profileReal, setProfileReal] = useState<{ full_name: string | null; phone_number: string | null }>({ full_name: null, phone_number: null });
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (companionTarget) setActive(companionTarget);
  }, [companionTarget]);

  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    supabase.from('profiles').select('full_name, phone_number').eq('id', user.id).maybeSingle().then(({ data }) => { if (data) setProfileReal(data); });
    supabase.from('stores').select('id, name, store_type, address_description, is_open, rating').eq('approval_status', 'approved').then(({ data }) => { if (data) setStoresReal(data as StoreRow[]); });
    supabase.from('products').select('id, store_id, name, description, price, image_url, is_available, category_id, redemption_points_cost, payment_options').then(({ data }) => { if (data) setProductsReal(data as ProductRow[]); });
    supabase.rpc('get_customer_home_popular_products', { p_limit: 6 }).then(({ data }) => { if (data) setPopularProducts(data as ProductRow[]); });
    supabase.from('product_categories').select('id, store_id, name, sort_order').then(({ data }) => { if (data) setCategoriesReal(data as CategoryRow[]); });
    supabase.from('product_variants').select('id, product_id, variant_name, price, is_available').then(({ data }) => { if (data) setVariantsReal(data as VariantRow[]); });
    supabase.from('favorites').select('product_id').eq('customer_id', user.id).then(({ data }) => { if (data) setFavorites(data.map((f: any) => f.product_id)); });
    supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, delivery_latitude, delivery_longitude, order_type, fulfillment_type, points_earned, payment_status, payment_method').eq('customer_id', user.id).order('created_at', { ascending: false }).then(({ data }) => { if (data) setOrdersReal(data as OrderRow[]); });
    supabase.from('client_wallets').select('balance, points').eq('user_id', user.id).maybeSingle().then(({ data }) => { if (data) setWallet(data as ClientWalletRow); });
    supabase.from('customer_invoices').select('id, invoice_number, customer_id, order_id, store_id, issued_at, billing_month, subtotal, delivery_fee, total_amount, payment_method, payment_reference, payment_status, items').eq('customer_id', user.id).order('issued_at', { ascending: false }).limit(200).then(({ data }) => { if (data) setInvoicesReal(data as InvoiceRow[]); });
    supabase.from('service_providers').select('id, service_type, name, account_number_length, region').eq('is_active', true).then(({ data }) => { if (data) setProviders(data as ServiceProviderRow[]); });
    supabase.from('service_packages').select('id, provider_id, name, face_value, price').eq('is_active', true).then(({ data }) => { if (data) setPackages(data as ServicePackageRow[]); });
    supabase.from('payment_methods').select('id, name, code, account_number, instructions, checkout_url, deep_link, verification_mode, auto_verify_enabled').eq('is_active', true).then(({ data }) => { if (data) setPaymentMethods(data as PaymentMethodRow[]); });
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    let stopped = false;
    const refreshOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || stopped) return;
      const { data } = await supabase
        .from('orders')
        .select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, delivery_latitude, delivery_longitude, order_type, fulfillment_type, points_earned, payment_status, payment_method')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      if (!stopped && data) setOrdersReal(data as OrderRow[]);
    };
    const timer = window.setInterval(() => { void refreshOrders(); }, 30000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, []);

  const activeTrackingOrder = ordersReal.find((order) => !['delivered', 'cancelled'].includes(order.status));

  useEffect(() => {
    let stopped = false;
    const refreshDriverLocation = async () => {
      if (!activeTrackingOrder?.id || !activeTrackingOrder.driver_id) {
        setDriverLocation(null);
        return;
      }
      const { data, error: locationError } = await supabase.rpc('get_customer_order_driver_location', {
        p_order_id: activeTrackingOrder.id
      });
      if (stopped) return;
      if (locationError) {
        setDriverLocation(null);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.driver_latitude != null && row?.driver_longitude != null) {
        setDriverLocation({ latitude: Number(row.driver_latitude), longitude: Number(row.driver_longitude) });
      } else {
        setDriverLocation(null);
      }
    };

    void refreshDriverLocation();
    const timer = window.setInterval(() => { void refreshDriverLocation(); }, 15000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [activeTrackingOrder?.id, activeTrackingOrder?.driver_id, activeTrackingOrder?.status]);

  const toggleFavorite = async (productId: string) => {
    await supabase.rpc('toggle_favorite', { p_product_id: productId });
    const { data } = await supabase.from('favorites').select('product_id').eq('customer_id', userId);
    if (data) setFavorites(data.map((f: any) => f.product_id));
  };

  const addToCart = (storeId: string, line: Omit<CartLine, 'key' | 'quantity'>) => {
    setCart((current) => {
      const base = cartStoreId && cartStoreId !== storeId ? [] : current;
      const key = line.variant_id || line.product_id || `custom:${line.custom_name}:${line.price}`;
      const found = base.find((c) => c.key === key);
      return found ? base.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c)) : [...base, { ...line, key, quantity: 1 }];
    });
    setCartStoreId(storeId);
  };

  const reorderToCart = async (order: OrderRow) => {
    const { data, error } = await supabase.rpc('get_reorder_items', { p_order_id: order.id });
    if (error) {
      window.alert(error.message || 'تعذر إعادة الطلب');
      return;
    }

    const items = Array.isArray(data) ? data as Array<{
      product_id: string | null;
      variant_id: string | null;
      custom_name: string | null;
      custom_price: number | null;
      quantity: number;
    }> : [];

    if (items.length === 0) {
      window.alert('لا توجد عناصر قابلة لإعادة الطلب.');
      return;
    }

    if (cart.length > 0 && cartStoreId && cartStoreId !== order.store_id) {
      const confirmed = window.confirm('السلة الحالية من متجر آخر. هل تريد استبدالها بعناصر هذا الطلب؟');
      if (!confirmed) return;
    }

    const lines: CartLine[] = [];
    let skipped = 0;

    for (const item of items) {
      const quantity = Math.max(1, Number(item.quantity) || 1);

      if (item.product_id === null) {
        if (!item.custom_name || item.custom_price === null) {
          skipped += 1;
          continue;
        }
        const key = `custom:${item.custom_name}:${item.custom_price}`;
        lines.push({
          key,
          custom_name: item.custom_name,
          custom_price: Number(item.custom_price),
          name: item.custom_name,
          price: Number(item.custom_price),
          payment_options: 'electronic_only',
          quantity
        });
        continue;
      }

      const product = productsReal.find(
        (candidate) => candidate.id === item.product_id &&
          candidate.store_id === order.store_id &&
          candidate.is_available
      );
      if (!product) {
        skipped += 1;
        continue;
      }

      if (item.variant_id) {
        const variant = variantsReal.find(
          (candidate) => candidate.id === item.variant_id &&
            candidate.product_id === product.id &&
            candidate.is_available
        );
        if (!variant) {
          skipped += 1;
          continue;
        }
        lines.push({
          key: variant.id,
          product_id: product.id,
          variant_id: variant.id,
          name: `${product.name} - ${variant.variant_name}`,
          price: variant.price,
          payment_options: product.payment_options || 'both',
          quantity
        });
      } else {
        lines.push({
          key: product.id,
          product_id: product.id,
          name: product.name,
          price: product.price,
          payment_options: product.payment_options || 'both',
          quantity
        });
      }
    }

    if (lines.length === 0) {
      window.alert('لم تعد منتجات هذا الطلب متاحة حاليًا لإعادة الطلب.');
      return;
    }

    setCart((current) => {
      const base = cartStoreId === order.store_id ? current : [];
      const merged = [...base];
      for (const line of lines) {
        const found = merged.find((existing) => existing.key === line.key);
        if (found) found.quantity += line.quantity;
        else merged.push(line);
      }
      return merged;
    });
    setCartStoreId(order.store_id);
    setShowCart(true);
    if (skipped > 0) {
      window.alert(`تمت إعادة ${lines.length} عنصرًا. تم تجاهل ${skipped} عنصر غير متاح حاليًا.`);
    }
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return (
    <div className="jarmal-app min-h-screen">
      <Topbar role="customer" title="مساحة العميل" onLogout={onLogout} onSettings={() => setActive('settings')} onNotifications={() => setActive('notifications')} />
      <div className="mx-auto flex max-w-7xl">
        <SideNav role="customer" active={active} onActive={setActive} />
        <main className="jarmal-page min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:pb-8">
          <JarmalCompanion
            context={{
              role: 'customer',
              page: active,
              section: selectedStore ? 'store' : active,
              hasActiveOrder: ordersReal.some((order) => !['delivered', 'cancelled'].includes(order.status)),
              enabled: true,
            }}
            bridgeToAssistant
            onOpen={() => window.dispatchEvent(new Event('jarmal-open-assistant'))}
          />
          {active === 'home' && !selectedStore && (
            <>
              <div className="jarmal-hero rounded-[26px] p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Pill dark>مرحباً بك في جَرْمَل</Pill>
                    <h1 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">طلباتك وخدماتك<br /><span className="text-[#f4ff00]">أقرب إليك.</span></h1>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/65">ابحث عن منتج، متجر، أو خدمة. وجَرْمَل يتولى الباقي.</p>
                  </div>
                  <div className="jarmal-hero-mark hidden sm:flex"><ShoppingBag size={25} /></div>
                </div>
                <button className="jarmal-home-search mt-6 w-full" onClick={() => {
                  window.dispatchEvent(new Event('jarmal-open-assistant'));
                }}>
                  <Search size={18} />
                  <span>ابحث عن منتج أو متجر...</span>
                  <ChevronLeft size={17} />
                </button>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {['البقالات', 'المطاعم', 'المقاهي', 'الصيدليات'].map((label) => (
                    <button key={label} onClick={() => setStoreCategory(label === 'البقالات' ? 'بقالة' : label === 'المطاعم' ? 'مطعم' : label === 'المقاهي' ? 'قهوة' : 'صيدلية')} className="jarmal-quick-chip">
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <JarmalHomeContent
                onNavigate={setActive}
                onOpenAssistant={() => window.dispatchEvent(new Event('jarmal-open-assistant'))}
                onOpenStore={(storeId) => {
                  const store = storesReal.find((item) => item.id === storeId);
                  if (store) setSelectedStore(store);
                }}
              />
              <JarmalHomeDiscovery
                providersCount={providers.length}
                packagesCount={packages.length}
                products={productsReal}
                popularProducts={popularProducts}
                stores={storesReal}
                onNavigate={setActive}
                onStoreCategory={setStoreCategory}
                onOpenStore={(storeId) => {
                  const store = storesReal.find((item) => item.id === storeId);
                  if (store) setSelectedStore(store);
                }}
              />
              <section className="mt-10">
                <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-black">متاجر جَرْمَل</h2><p className="mt-1 text-sm text-black/45">اختر المتجر ثم تصفح المنتجات والخدمات</p></div></div>
                <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-[#e3e7e0] bg-[#f7f9f5] p-2 pb-2">
                  <button onClick={() => setStoreCategory('الكل')} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${storeCategory === 'الكل' ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/55'}`}>الكل</button>
                  {Array.from(new Set(storesReal.map((s) => s.store_type))).map((type) => (
                    <button key={type} onClick={() => setStoreCategory(type)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${storeCategory === type ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/55'}`}>{type}</button>
                  ))}
                </div>
                <div className="jarmal-store-grid mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {storesReal.filter((s) => storeCategory === 'الكل' || s.store_type === storeCategory).map((store) => {
                    const type = store.store_type || 'متجر';
                    const StoreIcon = type.includes('مطعم') ? ShoppingBag : type.includes('صيد') ? ShieldCheck : type.includes('حلويات') ? Sparkles : type.includes('قهوة') || type.includes('بوفيه') ? Sparkles : Store;
                    return (
                      <button
                        key={store.id}
                        disabled={!store.is_open}
                        onClick={() => setSelectedStore(store)}
                        className="jarmal-store-card group overflow-hidden text-right disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="jarmal-store-card-top">
                          <div className="jarmal-store-icon"><StoreIcon size={24} strokeWidth={1.8} /></div>
                          <div className={`jarmal-store-status ${store.is_open ? 'is-open' : ''}`}>
                            <span className="jarmal-store-status-dot" />
                            {store.is_open ? 'مفتوح الآن' : 'مغلق'}
                          </div>
                        </div>
                        <div className="p-4 pt-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-[15px] font-black text-white">{store.name}</h3>
                              <p className="mt-1 truncate text-xs text-[#8fa2b8]">{store.address_description || 'متجر معتمد في جَرْمَل'}</p>
                            </div>
                            <span className="jarmal-store-type">{type}</span>
                          </div>
                          <div className="mt-4 flex items-center gap-3 text-[11px] text-[#9aacbf]">
                            <span className="jarmal-rating">★ {store.rating ?? '—'}</span>
                            <span className="h-1 w-1 rounded-full bg-[#526b86]" />
                            <span>متجر معتمد</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {storesReal.length === 0 && (
                    <div className="jarmal-empty-card sm:col-span-2 xl:col-span-3">
                      <Store size={22} />
                      <span>لا توجد متاجر متاحة حالياً</span>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
          {active === 'home' && selectedStore && (
            <StoreView
              store={selectedStore}
              products={productsReal.filter((p) => p.store_id === selectedStore.id)}
              categories={categoriesReal.filter((c) => c.store_id === selectedStore.id)}
              variants={variantsReal}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onBack={() => setSelectedStore(null)}
              onAdd={(line) => addToCart(selectedStore.id, line)}
            />
          )}
          {active === 'orders' && <Orders orders={ordersReal} onRefresh={loadAll} onReorder={reorderToCart} />}
          {active === 'invoices' && <CustomerInvoicesView invoices={invoicesReal} />}
          {active === 'notifications' && <NotificationsView onOpenOrder={() => setActive('orders')} />}
          {active === 'services' && <ServicesView providers={providers} packages={packages} paymentMethods={paymentMethods} onRefresh={loadAll} />}
          {active === 'wallet' && <ClientWalletView wallet={wallet} paymentMethods={paymentMethods} onRefresh={loadAll} />}
          {active === 'map' && (() => {
            const activeOrder = ordersReal.find((order) => !['delivered', 'cancelled'].includes(order.status));
            return (
              <div>
                <h2 className="mb-2 text-xl font-black">تتبع الطلب</h2>
                <p className="mb-5 text-sm text-white/45">يعرض جَرْمَل حالة الطلب وموقع التسليم الحقيقي المتاح في بياناته.</p>
                {activeOrder ? (
                  <MapCard
                    latitude={activeOrder.delivery_latitude}
                    longitude={activeOrder.delivery_longitude}
                    address={activeOrder.delivery_address}
                    driverLatitude={driverLocation?.latitude ?? null}
                    driverLongitude={driverLocation?.longitude ?? null}
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/[.02] py-20 text-center text-sm text-white/45">
                    لا يوجد طلب نشط للتتبع حاليًا.
                  </div>
                )}
              </div>
            );
          })()}
          {active === 'settings' && <SettingsView role="customer" phone={profileReal.phone_number} />}
          {active === 'profile' && (
            <div className="mx-auto max-w-md space-y-4">
              <h2 className="text-2xl font-black">حسابي</h2>
              <div className="jarmal-card rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-sm text-white/40">الاسم</p><p className="mt-1 font-bold">{profileReal.full_name || '—'}</p></div>
              <div className="jarmal-card rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-sm text-white/40">رقم الهاتف</p><p className="mt-1 font-bold" dir="ltr">{profileReal.phone_number || '—'}</p></div>
              <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-4 font-black text-red-300 hover:bg-red-500/20"><LogOut size={18} />تسجيل الخروج</button>
            </div>
          )}
        </main>
      </div>
      {cart.length > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#e3fe00] px-6 py-4 font-black text-black shadow-2xl lg:bottom-6">
          <ShoppingBag size={18} />عرض السلة ({cart.reduce((n, c) => n + c.quantity, 0)})<span className="mr-2">{Number(cartTotal || 0).toLocaleString('ar-YE')} {CURRENCY}</span>
        </button>
      )}
      {showCart && cartStoreId && (
        <Cart cart={cart} setCart={setCart} total={cartTotal} storeId={cartStoreId} paymentMethods={paymentMethods} onClose={() => setShowCart(false)} onOrdered={() => { setCart([]); setCartStoreId(null); setShowCart(false); setActive('orders'); loadAll(); }} />
      )}
          </div>
  );
}

function StoreView({ store, products, categories, variants, favorites, onToggleFavorite, onBack, onAdd }: {
  store: StoreRow; products: ProductRow[]; categories: CategoryRow[]; variants: VariantRow[]; favorites: string[];
  onToggleFavorite: (id: string) => void; onBack: () => void;
  onAdd: (line: Omit<CartLine, 'key' | 'quantity'>) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const shown = activeCategory === 'all' ? products : products.filter((p) => p.category_id === activeCategory);

  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-[#697068] hover:bg-[#f4f6f1]"><ArrowRight size={16} />رجوع للمتاجر</button>
      <div className="jarmal-storefront-head"><div className="jarmal-storefront-head-inner"><div className="jarmal-storefront-avatar"><Store size={30} /></div><div className="jarmal-storefront-meta"><h2>{store.name}</h2><p>{store.address_description || 'متجر متاح للطلب عبر جَرْمَل'}</p><div className="jarmal-storefront-badges"><span className="open">{store.is_open ? 'مفتوح الآن' : 'مغلق الآن'}</span><span>{store.store_type || 'متجر'}</span></div></div></div></div>
      {categories.length > 0 && (
        <div className="jarmal-store-category-rail no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setActiveCategory('all')} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${activeCategory === 'all' ? 'bg-[#e3fe00] text-black' : 'bg-[#f4f6f1] text-[#596159]'}`}>الكل</button>
          {categories.map((c) => (<button key={c.id} onClick={() => setActiveCategory(c.id)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${activeCategory === c.id ? 'bg-[#e3fe00] text-black' : 'bg-[#f4f6f1] text-[#596159]'}`}>{c.name}</button>))}
        </div>
      )}
      <div className="jarmal-store-product-grid mt-5 grid grid-cols-2 gap-3 sm:gap-4">
        {shown.filter((p) => p.is_available).map((product) => {
          const productVariants = variants.filter((v) => v.product_id === product.id && v.is_available);
          const isFav = favorites.includes(product.id);
          return (
            <div key={product.id} className="jarmal-product-card rounded-2xl border border-[#e1e5de] bg-white p-4 shadow-[0_8px_24px_rgba(23,26,22,.045)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(23,26,22,.07)]">
              <div className="flex items-start gap-3">
                <div className="jarmal-product-art flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f1f5df] text-[#738100]">
                  {product.image_url ? <img src={product.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ShoppingBag size={24} strokeWidth={1.7} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black text-[#171a16]">{product.name}</p>
                    <button aria-label="إضافة للمفضلة" onClick={() => onToggleFavorite(product.id)} className={isFav ? 'rounded-xl bg-[#f1f5df] p-2 text-[#718000]' : 'rounded-xl bg-[#f4f6f1] p-2 text-[#a0a69e]'}><Sparkles size={18} /></button>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#747b72]">{product.description || 'منتج من متجر جَرْمَل'}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                <span className="rounded-full bg-[#f4f6f1] px-2.5 py-1 text-[#687500]">متوفر</span>
                <span className="rounded-full bg-[#f4f6f1] px-2.5 py-1 text-[#747b72]">{product.payment_options === 'cash_only' ? 'دفع عند الاستلام' : product.payment_options === 'electronic_only' ? 'دفع إلكتروني' : 'طرق دفع متعددة'}</span>
              </div>
              {productVariants.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {productVariants.map((v) => (
                    <button key={v.id} onClick={() => onAdd({ product_id: product.id, variant_id: v.id, name: `${product.name} - ${v.variant_name}`, price: v.price, payment_options: product.payment_options || 'both' })} className="rounded-xl border border-[#e2e6df] bg-[#f8faf7] px-3 py-2 text-xs font-bold text-[#596159] hover:border-[#b8c400] hover:bg-[#f1f5df]">
                      {v.variant_name} • {Number(v.price || 0).toLocaleString('ar-YE')} {CURRENCY}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-black text-[#687500]">{Number(product.price || 0).toLocaleString('ar-YE')} {CURRENCY}</span>
                  <button onClick={() => onAdd({ product_id: product.id, name: product.name, price: product.price, payment_options: product.payment_options || 'both' })} className="rounded-xl bg-[#e3fe00] px-4 py-2 text-sm font-black text-black hover:bg-white">إضافة</button>
                </div>
              )}
            </div>
          );
        })}
        {shown.length === 0 && <p className="text-sm text-[#747b72]">لا توجد منتجات في هذا القسم</p>}
      </div>
      <div className="jarmal-store-custom-request mt-8 rounded-2xl p-4">
        {!showCustom ? (
          <button onClick={() => setShowCustom(true)} className="text-sm font-bold text-[#e3fe00]">+ طلب منتج غير موجود بالقائمة</button>
        ) : (
          <div className="space-y-3">
            <Field label="اسم المنتج" value={customName} onChange={setCustomName} placeholder="مثال: كيلو تفاح أحمر" />
            <Field label="السعر التقديري" value={customPrice} onChange={(v) => setCustomPrice(v.replace(/\D/g, ''))} placeholder="مثال: 2000" />
            <button disabled={!customName.trim() || !customPrice} onClick={() => { onAdd({ custom_name: customName.trim(), custom_price: Number(customPrice), name: customName.trim(), price: Number(customPrice), payment_options: 'electronic_only' }); setShowCustom(false); setCustomName(''); setCustomPrice(''); }} className="w-full rounded-xl bg-[#e3fe00] py-3 font-black text-black disabled:opacity-40">إضافة للسلة</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LocationMap({
  latitude,
  longitude,
  driverLatitude = null,
  driverLongitude = null,
  onChange,
  interactive = true,
  title = 'موقع التسليم'
}: {
  latitude: number | null;
  longitude: number | null;
  driverLatitude?: number | null;
  driverLongitude?: number | null;
  onChange?: (latitude: number, longitude: number) => void;
  interactive?: boolean;
  title?: string;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadLeaflet = async () => {
      if (document.getElementById('jarmal-leaflet-css') === null) {
        const link = document.createElement('link');
        link.id = 'jarmal-leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!(window as any).L) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.getElementById('jarmal-leaflet-js');
          if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('تعذر تحميل الخريطة')), { once: true });
            return;
          }
          const script = document.createElement('script');
          script.id = 'jarmal-leaflet-js';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('تعذر تحميل الخريطة'));
          document.body.appendChild(script);
        });
      }
      if (cancelled || !mapRef.current || !(window as any).L) return;
      const L = (window as any).L;
      const center: [number, number] = latitude !== null && longitude !== null ? [latitude, longitude] : [0, 0];
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(center, latitude !== null && longitude !== null ? 16 : 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
      mapInstanceRef.current = map;
      if (latitude !== null && longitude !== null) {
        markerRef.current = L.marker([latitude, longitude]).addTo(map).bindTooltip(title, { permanent: false });
      }
      if (driverLatitude !== null && driverLongitude !== null) {
        driverMarkerRef.current = L.circleMarker([driverLatitude, driverLongitude], {
          radius: 8,
          weight: 3,
          fillOpacity: 0.85
        }).addTo(map).bindTooltip('موقع المندوب', { permanent: false });
      }
      if (interactive && onChange) {
        map.on('click', (event: any) => {
          const lat = Number(event.latlng.lat.toFixed(7));
          const lng = Number(event.latlng.lng.toFixed(7));
          if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
          else markerRef.current = L.marker([lat, lng]).addTo(map);
          onChange(lat, lng);
        });
      }
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 50);
    };
    void loadLeaflet().catch((error) => {
      if (!cancelled) setMapError(error instanceof Error ? error.message : 'تعذر تحميل الخريطة');
    });
    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      driverMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const L = (window as any).L;
    if (driverLatitude === null || driverLongitude === null) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
      return;
    }
    if (driverMarkerRef.current) driverMarkerRef.current.setLatLng([driverLatitude, driverLongitude]);
    else {
      driverMarkerRef.current = L.circleMarker([driverLatitude, driverLongitude], {
        radius: 8,
        weight: 3,
        fillOpacity: 0.85
      }).addTo(mapInstanceRef.current).bindTooltip('موقع المندوب', { permanent: false });
    }
  }, [driverLatitude, driverLongitude, mapReady]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || latitude === null || longitude === null) return;
    const map = mapInstanceRef.current;
    if (markerRef.current) markerRef.current.setLatLng([latitude, longitude]);
    else markerRef.current = (window as any).L.marker([latitude, longitude]).addTo(map);
    map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
  }, [latitude, longitude, mapReady]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMapError('المتصفح لا يدعم تحديد الموقع الحالي');
      return;
    }
    setMapError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange?.(Number(position.coords.latitude.toFixed(7)), Number(position.coords.longitude.toFixed(7)));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMapError('تعذر تحديد موقعك الحالي. يمكنك الضغط على الخريطة لتحديد الموقع يدويًا.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#e1e5de] bg-[#f5f6f3]">
      <div className="flex items-center justify-between gap-3 border-b border-[#e1e5de] bg-white px-4 py-3">
        <div>
          <p className="text-sm font-black">{title}</p>
          <p className="mt-1 text-[11px] text-[#747b72]">
            {interactive ? 'اضغط على الخريطة لتحديد نقطة التسليم' : 'موقع العميل المحدد للطلب'}
          </p>
        </div>
        {interactive && (
          <button type="button" onClick={useCurrentLocation} disabled={locating} className="shrink-0 rounded-xl bg-[#e3fe00] px-3 py-2 text-xs font-black text-black disabled:opacity-50">
            {locating ? 'جارٍ تحديد الموقع...' : 'موقعي الحالي'}
          </button>
        )}
      </div>
      <div className="relative">
        <div ref={mapRef} className="h-64 w-full" />
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f6f3]/95 p-5 text-center">
            <div className="max-w-sm">
              <p className="text-sm font-black text-[#171a16]">{mapError}</p>
              {interactive && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 rounded-xl bg-[#e3fe00] px-4 py-2 text-xs font-black text-black"
                >
                  إعادة تحميل الخريطة
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {latitude !== null && longitude !== null && (
        <div className="border-t border-[#e1e5de] bg-white px-4 py-2 text-[11px] text-[#747b72]" dir="ltr">
          {latitude.toFixed(7)}, {longitude.toFixed(7)}
        </div>
      )}
    </div>
  );
}

function Cart({ cart, setCart, total, storeId, paymentMethods, onClose, onOrdered }: {
  cart: CartLine[]; setCart: React.Dispatch<React.SetStateAction<CartLine[]>>; total: number; storeId: string;
  paymentMethods: PaymentMethodRow[];
  onClose: () => void; onOrdered: () => void;
}) {
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null);
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentCode, setPaymentCode] = useState('cash');
  const cashAllowed = cart.every((item) => (item.payment_options || 'both') !== 'electronic_only');
  const electronicAllowed = cart.every((item) => (item.payment_options || 'both') !== 'cash_only');
  useEffect(() => {
    if (paymentCode === 'cash' && !cashAllowed) setPaymentCode(paymentMethods.find((m) => m.code !== 'cash')?.code || '');
    if (paymentCode !== 'cash' && !electronicAllowed) setPaymentCode(cashAllowed ? 'cash' : '');
  }, [cashAllowed, electronicAllowed, paymentCode, paymentMethods]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // The server calculates the authoritative delivery fee from branch pricing and location.
  const deliveryFee = 0;

  const confirmOrder = async () => {
    setError(''); setBusy(true);
    try {
      if (fulfillment === 'delivery' && !address.trim()) throw new Error('أدخل وصف موقع التوصيل');
      if (fulfillment === 'delivery' && (deliveryLatitude === null || deliveryLongitude === null)) throw new Error('حدد موقعك على الخريطة أو اضغط «موقعي الحالي»');

      const items = cart.map((c) =>
        c.custom_name
          ? { custom_name: c.custom_name, custom_price: c.custom_price, quantity: c.quantity }
          : { product_id: c.product_id, ...(c.variant_id ? { variant_id: c.variant_id } : {}), quantity: c.quantity }
      );

      const selectedMethod = paymentMethods.find((m) => m.code === paymentCode);
      if (paymentCode !== 'cash' && !selectedMethod) throw new Error('اختر وسيلة دفع إلكترونية صحيحة');

      const rpcName = paymentCode === 'cash' ? 'create_cash_order' : 'create_electronic_order';
      const rpcParams = paymentCode === 'cash'
        ? {
            p_store_id: storeId, p_items: items, p_delivery_fee: deliveryFee,
            p_delivery_address: fulfillment === 'delivery' ? address.trim() : null,
            p_delivery_latitude: fulfillment === 'delivery' ? deliveryLatitude : null,
            p_delivery_longitude: fulfillment === 'delivery' ? deliveryLongitude : null,
            p_fulfillment_type: fulfillment, p_notes: notes.trim() || null
          }
        : {
            p_store_id: storeId, p_items: items, p_delivery_fee: deliveryFee,
            p_delivery_address: fulfillment === 'delivery' ? address.trim() : null,
            p_delivery_latitude: fulfillment === 'delivery' ? deliveryLatitude : null,
            p_delivery_longitude: fulfillment === 'delivery' ? deliveryLongitude : null,
            p_fulfillment_type: fulfillment, p_notes: notes.trim() || null,
            p_payment_method_code: paymentCode,
            p_reference_number: referenceNumber.trim() || null
          };

      const { data: createdOrder, error: rpcError } = await supabase.rpc(rpcName, rpcParams);
      if (rpcError) throw rpcError;

      if (paymentCode !== 'cash') {
        const orderId = (createdOrder as { order_id?: string } | null)?.order_id;
        if (!orderId) throw new Error('تم إنشاء الطلب لكن تعذر الحصول على رقم الدفع');

        const rawUrl = selectedMethod?.deep_link || selectedMethod?.checkout_url || '';
        const paymentUrl = rawUrl
          .replaceAll('{order_id}', encodeURIComponent(orderId))
          .replaceAll('{amount}', encodeURIComponent(String(Number((createdOrder as { total_amount?: number } | null)?.total_amount ?? total))))
          .replaceAll('{currency}', encodeURIComponent(CURRENCY));

        if (paymentUrl) {
          window.open(paymentUrl, '_blank', 'noopener,noreferrer');
        }

        // Electronic payments currently use manual verification in the database.
        // The order and pending receipt already exist; do not block the customer for an
        // artificial polling window. The order will appear in Orders as pending verification.
        onOrdered();
        return;
      }

      onOrdered();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إتمام الطلب');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#e1e5de] bg-white p-5 shadow-[0_24px_70px_rgba(23,26,22,.16)] sm:rounded-3xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-[#7a8178]">مراجعة الطلب</p><h3 className="mt-1 text-xl font-black text-[#171a16]">سلة الطلبات</h3></div><button onClick={onClose} className="rounded-xl bg-[#f4f6f1] p-2 text-[#687067]" aria-label="إغلاق السلة"><X size={20} /></button></div>
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4e8e1] bg-[#fafbf9] p-3.5">
              <div><p className="font-bold">{item.name}</p><p className="text-xs text-white/40">{Number(item.price || 0).toLocaleString('ar-YE')} {CURRENCY} × {item.quantity}</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCart((c) => c.map((x) => x.key === item.key ? { ...x, quantity: x.quantity - 1 } : x).filter((x) => x.quantity > 0))} className="h-7 w-7 rounded-lg bg-white/10 font-black">−</button>
                <span className="w-5 text-center font-bold">{item.quantity}</span>
                <button onClick={() => setCart((c) => c.map((x) => x.key === item.key ? { ...x, quantity: x.quantity + 1 } : x))} className="h-7 w-7 rounded-lg bg-white/10 font-black">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={() => setFulfillment('delivery')} className={`flex-1 rounded-xl py-3 text-sm font-bold ${fulfillment === 'delivery' ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/50'}`}>توصيل للمنزل</button>
          <button onClick={() => setFulfillment('pickup')} className={`flex-1 rounded-xl py-3 text-sm font-bold ${fulfillment === 'pickup' ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/50'}`}>استلام بنفسك</button>
        </div>
        {fulfillment === 'delivery' && <>
          <Field label="وصف موقع التوصيل" value={address} onChange={setAddress} placeholder="الحي، الشارع، أقرب معلم" />
          <LocationMap latitude={deliveryLatitude} longitude={deliveryLongitude} onChange={(lat, lng) => { setDeliveryLatitude(lat); setDeliveryLongitude(lng); }} />
        </>}
        <div className="mt-4">
          <label className="mb-2 block text-sm font-black text-[#171a16]">طريقة الدفع</label>
          {!cashAllowed && electronicAllowed && <p className="mb-2 rounded-lg bg-[#fff7e6] px-3 py-2 text-xs font-bold text-[#8a6500]">بعض المنتجات في السلة تتطلب الدفع الإلكتروني.</p>}
          {cashAllowed && !electronicAllowed && <p className="mb-2 rounded-lg bg-[#f1f5df] px-3 py-2 text-xs font-bold text-[#687500]">هذه السلة تسمح بالدفع عند الاستلام فقط.</p>}
          {!cashAllowed && !electronicAllowed && <p className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-600">المنتجات في السلة لا تشترك في طريقة دفع واحدة. عدّل السلة.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {cashAllowed && <button type="button" onClick={() => { setPaymentCode('cash'); setReferenceNumber(''); }} className={paymentCode === 'cash' ? 'rounded-xl border border-[#e3fe00] bg-[#f1f5df] px-4 py-3 text-right text-sm font-bold text-[#171a16]' : 'rounded-xl border border-[#e1e5de] bg-white px-4 py-3 text-right text-sm font-bold text-[#747b72]'}>الدفع عند الاستلام</button>}
            {electronicAllowed && paymentMethods.filter((m) => m.code !== 'cash').map((method) => (
              <button type="button" key={method.id} onClick={() => setPaymentCode(method.code)} className={paymentCode === method.code ? 'rounded-xl border border-[#e3fe00] bg-[#f1f5df] px-4 py-3 text-right text-sm font-bold text-[#171a16]' : 'rounded-xl border border-[#e1e5de] bg-white px-4 py-3 text-right text-sm font-bold text-[#747b72]'}>{method.name}</button>
            ))}
          </div>
        </div>
        {paymentCode !== 'cash' && (() => {
          const method = paymentMethods.find((m) => m.code === paymentCode);
          if (!method) return null;
          return <div className="mt-3 rounded-2xl border border-[#e1e5de] bg-[#f8faf7] p-4">
            <p className="text-sm font-black text-[#171a16]">تحويل المبلغ إلى حساب جَرْمَل</p>
            {method.account_number && <p className="mt-2 text-lg font-black tracking-wide text-[#687500]" dir="ltr">{method.account_number}</p>}
            {method.instructions && <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-[#747b72]">{method.instructions}</p>}
            <p className="mt-3 text-[11px] font-bold text-[#8a9189]">بعد التحويل، أدخل رقم العملية/المرجع ثم أرسل الطلب. ستظهر العملية بحالة قيد المراجعة حتى يتم التحقق منها.</p>
            <div className="mt-3"><Field label="رقم العملية (فقط عند الحاجة)" value={referenceNumber} onChange={setReferenceNumber} placeholder="رقم العملية / المرجع" /></div>
          </div>;
        })()}
        <div className="mt-3"><Field label="ملاحظات (اختياري)" value={notes} onChange={setNotes} placeholder="مثال: اتصل بي عند الوصول" /></div>
        {error && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between text-sm"><span className="text-[#747b72]">قيمة المنتجات</span><span className="font-bold">{total.toLocaleString('ar-YE')} {CURRENCY}</span></div>
          <p className="mt-2 text-[11px] leading-5 text-[#8a9189]">رسوم التوصيل تُحسب آليًا حسب إعدادات جَرْمَل وموقع التوصيل، ويظهر المبلغ النهائي بعد إنشاء الطلب.</p>
        </div>
        <button disabled={busy || cart.length === 0 || (!cashAllowed && !electronicAllowed) || !paymentCode} onClick={confirmOrder} className="mt-2 w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50">{busy ? 'جارٍ إرسال الطلب...' : (paymentCode === 'cash' ? 'تأكيد الطلب' : 'إرسال الطلب')}</button>
      </div>
    </div>
  );
}

function CustomerInvoicesView({ invoices }: { invoices: InvoiceRow[] }) {
  const grouped = invoices.reduce<Record<string, InvoiceRow[]>>((acc, invoice) => {
    const key = invoice.billing_month || invoice.issued_at.slice(0, 7);
    (acc[key] ||= []).push(invoice);
    return acc;
  }, {});

  const monthLabel = (value: string) => {
    const date = new Date((value.length === 7 ? value + '-01' : value) + 'T00:00:00Z');
    return date.toLocaleDateString('ar-YE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  return (
    <section className="max-w-4xl">
      <div className="flex items-end justify-between gap-3">
        <div><p className="text-sm text-[#747b72]">فواتيرك المحفوظة تلقائيًا</p><h1 className="mt-1 text-3xl font-black">فواتيري</h1></div>
        <span className="rounded-xl bg-[#f1f5df] px-3 py-2 text-xs font-black text-[#687500]">{invoices.length} فاتورة</span>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-[#dfe4db] bg-white py-20 text-center">
          <FileText className="mx-auto text-[#9aa097]" size={32}/>
          <p className="mt-3 font-black">لا توجد فواتير بعد</p>
          <p className="mt-1 text-sm text-[#858c84]">تظهر الفاتورة تلقائيًا بعد تأكيد الدفع.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([month, rows]) => (
            <div key={month} className="rounded-3xl border border-[#e1e5de] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-xs text-[#8a9189]">كشف الشهر</p><h2 className="text-xl font-black">{monthLabel(month)}</h2></div>
                <span className="text-xs font-bold text-[#747b72]">{rows.length} طلب</span>
              </div>
              <div className="mt-4 space-y-3">
                {rows.map((invoice) => (
                  <details key={invoice.id} className="rounded-2xl border border-[#edf0eb] bg-[#fafbf9] p-4">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><p className="text-xs font-bold text-[#8a9189]">{invoice.invoice_number}</p><p className="mt-1 font-black">{Number(invoice.total_amount || 0).toLocaleString('ar-YE')} {CURRENCY}</p></div>
                        <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700">مدفوعة</span>
                      </div>
                    </summary>
                    <div className="mt-4 border-t border-[#e7eae5] pt-4">
                      <div className="grid gap-2 text-xs text-[#697068] sm:grid-cols-2">
                        <p>التاريخ: {new Date(invoice.issued_at).toLocaleString('ar-YE')}</p>
                        <p>طريقة الدفع: {invoice.payment_method || '—'}</p>
                        {invoice.payment_reference && <p className="sm:col-span-2">مرجع الدفع: {invoice.payment_reference}</p>}
                      </div>
                      <div className="mt-4 space-y-2">
                        {(invoice.items || []).map((item, index) => (
                          <div key={item.id || index} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3">
                            <span className="text-sm font-bold">{item.name || 'منتج'} × {item.quantity || 0}</span>
                            <span className="text-sm font-black">{Number(item.line_total || 0).toLocaleString('ar-YE')} {CURRENCY}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-2 border-t border-[#e7eae5] pt-4 text-sm">
                        <div className="flex justify-between"><span className="text-[#7b827a]">قيمة المنتجات</span><b>{Number(invoice.subtotal || 0).toLocaleString('ar-YE')} {CURRENCY}</b></div>
                        <div className="flex justify-between"><span className="text-[#7b827a]">التوصيل</span><b>{Number(invoice.delivery_fee || 0).toLocaleString('ar-YE')} {CURRENCY}</b></div>
                        <div className="flex justify-between text-base"><span className="font-black">الإجمالي</span><b>{Number(invoice.total_amount || 0).toLocaleString('ar-YE')} {CURRENCY}</b></div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Orders({ orders, onRefresh, onReorder }: { orders: OrderRow[]; onRefresh: () => void; onReorder: (order: OrderRow) => void | Promise<void> }) {
  const [ratingFor, setRatingFor] = useState<string | null>(null);
  const [driverRating, setDriverRating] = useState(5);
  const [merchantRating, setMerchantRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submitRating = async () => {
    if (!ratingFor) return;
    setBusy(true);
    await supabase.rpc('submit_order_rating', { p_order_id: ratingFor, p_driver_rating: driverRating, p_merchant_rating: merchantRating, p_driver_comment: comment || null, p_merchant_comment: comment || null });
    setBusy(false); setRatingFor(null); setComment('');
  };

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm('هل تريد إلغاء هذا الطلب؟')) return;
    setBusy(true);
    const { error } = await supabase.rpc('cancel_customer_order', {
      p_order_id: orderId,
      p_reason: 'إلغاء الطلب من العميل'
    });
    setBusy(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    onRefresh();
  };

  if (orders.length === 0) {
    return (<div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#dfe4db] bg-white py-24 text-center shadow-[0_8px_24px_rgba(23,26,22,.035)]"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f1f5df]"><ClipboardList size={30} className="text-[#7b8900]" /></div><p className="mt-4 font-black text-[#30362f]">لا توجد طلبات حتى الآن</p><p className="mt-1 text-xs text-[#8a9189]">عندما تنشئ طلبًا سيظهر هنا مع حالته وتفاصيله.</p></div>);
  }

  return (
    <div>
      <h2 className="mb-5 text-2xl font-black">طلباتي</h2>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-[#e1e5de] bg-white p-5 shadow-[0_8px_24px_rgba(23,26,22,.045)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#8a9189]">طلب #{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="mt-1 text-xl font-black text-[#171a16]">{Number(order.total_amount || 0).toLocaleString('ar-YE')} {CURRENCY}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#f1f5df] px-3 py-1.5 text-xs font-black text-[#667400]">{statusLabels[order.status] || order.status}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e8ebe5] bg-[#fafbf9] px-3 py-2.5">
                <p className="text-[10px] font-bold text-[#9aa097]">حالة الدفع</p>
                <p className="mt-1 text-xs font-black text-[#596159]">{order.payment_status === 'paid' ? 'مدفوع' : order.payment_status === 'pending' ? 'بانتظار التحقق' : order.payment_status || 'غير محدد'}</p>
              </div>
              <div className="rounded-xl border border-[#e8ebe5] bg-[#fafbf9] px-3 py-2.5">
                <p className="text-[10px] font-bold text-[#9aa097]">رسوم التوصيل</p>
                <p className="mt-1 text-xs font-black text-[#596159]">{Number(order.delivery_fee || 0).toLocaleString('ar-YE')} {CURRENCY}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-[#f7f8f5] px-3 py-2.5">
                <p className="text-[10px] font-bold text-[#9aa097]">التاريخ</p>
                <p className="mt-1 text-xs font-bold text-[#596159]">{new Date(order.created_at).toLocaleString('ar-YE')}</p>
              </div>
              <div className="rounded-xl bg-[#f7f8f5] px-3 py-2.5">
                <p className="text-[10px] font-bold text-[#9aa097]">طريقة الاستلام</p>
                <p className="mt-1 text-xs font-bold text-[#596159]">{order.fulfillment_type === 'pickup' ? 'استلام من المتجر' : 'توصيل إلى العنوان'}</p>
              </div>
            </div>
            {order.fulfillment_type !== 'pickup' && order.delivery_address && (
              <div className="mt-2 rounded-xl border border-[#e8ebe5] bg-white px-3 py-2.5">
                <p className="text-[10px] font-bold text-[#9aa097]">عنوان التوصيل</p>
                <p className="mt-1 text-xs font-bold leading-5 text-[#596159]">{order.delivery_address}</p>
              </div>
            )}
            {['pending', 'accepted', 'preparing', 'ready_for_pickup'].includes(order.status) && order.payment_status === 'pending' && (
              <button
                disabled={busy}
                onClick={() => cancelOrder(order.id)}
                className="mt-3 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:border-red-400 disabled:opacity-50"
              >
                إلغاء الطلب
              </button>
            )}
            {order.status === 'delivered' && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => setRatingFor(order.id)} className="rounded-lg border border-[#e1e5de] px-3 py-2 text-xs font-bold text-[#596159] hover:border-[#e3fe00]">قيّم الطلب</button>
                <button onClick={() => void onReorder(order)} className="rounded-lg border border-[#e1e5de] px-3 py-2 text-xs font-bold text-[#596159] hover:border-[#e3fe00]">إعادة الطلب</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {ratingFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-5 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">تقييم الطلب</h2><button onClick={() => setRatingFor(null)}><X size={20} className="text-[#8a9189]" /></button></div>
            <div className="mt-5 space-y-4">
              <div><p className="mb-2 text-sm font-bold">تقييم المندوب</p><div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => (<button key={n} onClick={() => setDriverRating(n)} className={n <= driverRating ? 'text-[#667400]' : 'text-white/20'}>★</button>))}</div></div>
              <div><p className="mb-2 text-sm font-bold">تقييم المتجر</p><div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => (<button key={n} onClick={() => setMerchantRating(n)} className={n <= merchantRating ? 'text-[#667400]' : 'text-white/20'}>★</button>))}</div></div>
              <Field label="تعليق (اختياري)" value={comment} onChange={setComment} placeholder="اكتب رأيك" />
              <button disabled={busy} onClick={submitRating} className="w-full rounded-xl bg-[#e3fe00] py-3 font-black text-black">{busy ? 'جارٍ الإرسال...' : 'إرسال التقييم'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServicesView({ providers, packages, paymentMethods, onRefresh }: { providers: ServiceProviderRow[]; packages: ServicePackageRow[]; paymentMethods: PaymentMethodRow[]; onRefresh: () => void }) {
  const [tab, setTab] = useState<'mobile_recharge' | 'bill_payment'>('mobile_recharge');
  const [providerId, setProviderId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [methodCode, setMethodCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const providerList = providers.filter((p) => p.service_type === tab || (tab === 'bill_payment' && p.service_type !== 'mobile_recharge'));
  const providerPackages = packages.filter((p) => p.provider_id === providerId);
  const selectedProvider = providers.find((p) => p.id === providerId);
  const electronicMethods = safePaymentMethods.filter((m) => m.code !== 'cash');

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('create_service_order', {
        p_order_type: tab, p_provider_id: providerId, p_package_id: packageId || null,
        p_amount: packageId ? null : Number(amount), p_account_number: accountNumber.trim(), p_service_fee: 100,
        p_payment_method_code: methodCode
      });
      if (rpcError) throw rpcError;
      setDone(true); onRefresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'تعذر إرسال الطلب'); }
    finally { setBusy(false); }
  };

  if (done) return (<div className="flex flex-col items-center py-20 text-center"><CheckCircle2 size={44} className="text-[#e3fe00]" /><p className="mt-4 font-bold">تم إرسال طلبك بنجاح، سيتم تنفيذه قريباً</p><button onClick={() => { setDone(false); setProviderId(''); setPackageId(''); setAmount(''); setAccountNumber(''); }} className="mt-6 rounded-xl bg-[#e3fe00] px-6 py-3 font-black text-black">طلب جديد</button></div>);

  return (
    <div>
      <h2 className="mb-5 text-2xl font-black">الخدمات</h2>
      <div className="flex gap-2">
        <button onClick={() => { setTab('mobile_recharge'); setProviderId(''); setPackageId(''); }} className={`flex-1 rounded-xl py-3 text-sm font-bold ${tab === 'mobile_recharge' ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/50'}`}>تعبئة رصيد</button>
        <button onClick={() => { setTab('bill_payment'); setProviderId(''); setPackageId(''); }} className={`flex-1 rounded-xl py-3 text-sm font-bold ${tab === 'bill_payment' ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/50'}`}>سداد فواتير</button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {providerList.map((p) => (<button key={p.id} onClick={() => { setProviderId(p.id); setPackageId(''); }} className={`rounded-xl border p-4 text-sm font-bold ${providerId === p.id ? 'border-[#e3fe00] bg-[#e3fe00]/10 text-[#e3fe00]' : 'border-white/10 text-white/60'}`}>{p.name}{p.region ? ` - ${p.region}` : ''}</button>))}
      </div>
      {providerId && (
        <div className="mt-6 space-y-4">
          {providerPackages.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {providerPackages.map((pkg) => (<button key={pkg.id} onClick={() => setPackageId(pkg.id)} className={`rounded-xl border p-3 text-xs font-bold ${packageId === pkg.id ? 'border-[#e3fe00] bg-[#e3fe00]/10 text-[#e3fe00]' : 'border-white/10 text-white/60'}`}>{pkg.name}<br />{Number(pkg.price || 0).toLocaleString('ar-YE')} {CURRENCY}</button>))}
            </div>
          )}
          {!packageId && <Field label="المبلغ" value={amount} onChange={(v) => setAmount(v.replace(/\D/g, ''))} placeholder="أدخل المبلغ" />}
          <Field label={`رقم الحساب${selectedProvider?.account_number_length ? ` (${selectedProvider.account_number_length} أرقام)` : ''}`} value={accountNumber} onChange={(v) => setAccountNumber(v.replace(/\D/g, ''))} placeholder="رقم الهاتف / رقم المشترك" />
          <div><label className="mb-2 block text-sm font-bold">طريقة الدفع</label>
            <select value={methodCode} onChange={(e) => setMethodCode(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none focus:border-[#e3fe00]">
              <option value="">اختر طريقة الدفع الإلكتروني</option>
              {electronicMethods.map((m) => (<option key={m.id} value={m.code}>{m.name}</option>))}
            </select>
          </div>
          {methodCode && paymentMethods.find((m) => m.code === methodCode)?.instructions && <p className="text-xs text-white/40">{paymentMethods.find((m) => m.code === methodCode)?.instructions}</p>}
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
          <button disabled={busy || !accountNumber || !methodCode || (!packageId && !amount)} onClick={submit} className="w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black disabled:opacity-40">{busy ? 'جارٍ الإرسال...' : 'تأكيد الطلب'}</button>
        </div>
      )}
    </div>
  );
}

function ClientWalletView({ wallet, paymentMethods, onRefresh }: { wallet: ClientWalletRow | null; paymentMethods: PaymentMethodRow[] | null; onRefresh: () => void }) {
  const safeWallet = wallet && typeof wallet === 'object' ? wallet : { balance: 0, points: 0 };
  const safePaymentMethods = Array.isArray(paymentMethods) ? paymentMethods : [];
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState('');
  const [methodCode, setMethodCode] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const electronicMethods = safePaymentMethods.filter((m) => m.code !== 'cash');

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('request_wallet_topup', { p_amount: Number(amount), p_payment_method_code: methodCode, p_reference_number: reference.trim() || null, p_idempotency_key: crypto.randomUUID() });
      if (rpcError) throw rpcError;
      setShow(false); setAmount(''); setReference(''); onRefresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'تعذر إرسال طلب الشحن'); }
    finally { setBusy(false); }
  };

  return (
    <section>
      <h1 className="text-3xl font-black">محفظتي</h1>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="jarmal-balance-card rounded-3xl bg-[#e3fe00] p-7 text-black">
          <span className="text-sm font-bold text-black/60">الرصيد المتاح</span>
          <p className="mt-4 text-4xl font-black">{Number(safeWallet.balance || 0).toLocaleString('ar-YE')} <span className="text-lg">{CURRENCY}</span></p>
          <button onClick={() => setShow(true)} className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-black text-white">شحن المحفظة</button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-7">
          <span className="text-sm font-bold text-white/50">نقاطك</span>
          <p className="mt-4 text-4xl font-black text-[#e3fe00]">{Number(safeWallet.points || 0).toLocaleString('ar-YE')}</p>
          <p className="mt-2 text-xs text-white/40">تُستبدل بخصومات على منتجات مختارة</p>
        </div>
      </div>
      {show && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-5 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">شحن المحفظة</h2><button onClick={() => setShow(false)}><X size={20} className="text-white/40" /></button></div>
            <div className="mt-6 space-y-4">
              <Field label="المبلغ" value={amount} onChange={(v) => setAmount(v.replace(/\D/g, ''))} placeholder="مثال: 10000" />
              <div><label className="mb-2 block text-sm font-bold">طريقة الدفع</label>
                <select value={methodCode} onChange={(e) => setMethodCode(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none focus:border-[#e3fe00]">
                  <option value="">اختر</option>
                  {electronicMethods.map((m) => (<option key={m.id} value={m.code}>{m.name}</option>))}
                </select>
              </div>
              {safePaymentMethods.find((m) => m.code === methodCode)?.instructions && <p className="text-xs text-white/40">{safePaymentMethods.find((m) => m.code === methodCode)?.instructions}</p>}
              {methodCode && !safePaymentMethods.find((m) => m.code === methodCode)?.auto_verify_enabled && <Field label="رقم مرجع التحويل" value={reference} onChange={setReference} placeholder="رقم العملية / إثبات التحويل" />}
              {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
              <button disabled={busy || !amount || !methodCode} onClick={submit} className="w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black disabled:opacity-50">{busy ? 'جارٍ الإرسال...' : 'إرسال طلب الشحن'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DriverApp({ onLogout, companionTarget }: { onLogout: () => void; companionTarget?: string | null }) {
  const [active, setActive] = useState('available');
  useEffect(() => {
    if (companionTarget) setActive(companionTarget);
  }, [companionTarget]);
  const [profile, setProfile] = useState<DriverProfileRow | null>(null);
  const [wallet, setWallet] = useState<{ balance: number; reserved_balance: number }>({ balance: 0, reserved_balance: 0 });
  const [driverPaymentMethods, setDriverPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [driverWithdrawals, setDriverWithdrawals] = useState<any[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('');
  const [withdrawalAccount, setWithdrawalAccount] = useState('');
  const [withdrawalNote, setWithdrawalNote] = useState('');
  const [withdrawalBusy, setWithdrawalBusy] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupMethod, setTopupMethod] = useState('');
  const [topupReference, setTopupReference] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupError, setTopupError] = useState('');
  const [driverWalletTransactions, setDriverWalletTransactions] = useState<any[]>([]);
  const [available, setAvailable] = useState<FullOrderRow[]>([]);
  const [activeOrder, setActiveOrder] = useState<FullOrderRow | null>(null);
  const [history, setHistory] = useState<FullOrderRow[]>([]);
  const [driverSettlements, setDriverSettlements] = useState<any[]>([]);
  const [driverCashOutstanding, setDriverCashOutstanding] = useState(0);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [settlementBusy, setSettlementBusy] = useState(false);
  const [settlementError, setSettlementError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadAll = () => {
    supabase.from('driver_profiles').select('is_available, vehicle_type, vehicle_plate_number, rating, verification_status').eq('id', userId).maybeSingle().then(({ data }) => { if (data) setProfile(data as DriverProfileRow); });
    supabase.from('driver_wallets').select('balance, reserved_balance').eq('user_id', userId).maybeSingle().then(({ data }) => { if (data) setWallet(data as { balance: number; reserved_balance: number }); });
    supabase.from('payment_methods').select('id, name, code, account_number, instructions, checkout_url, deep_link, verification_mode, auto_verify_enabled').eq('is_active', true).neq('code', 'cash').then(({ data }) => {
      if (data) {
        const methods = data as PaymentMethodRow[];
        setDriverPaymentMethods(methods);
        setWithdrawalMethod((current) => current || methods[0]?.code || '');
      }
    });
    supabase.from('driver_withdrawal_requests').select('id, amount, payment_method_code, account_number, status, note, admin_note, created_at, processed_at').eq('driver_id', userId).order('created_at', { ascending: false }).limit(30).then(({ data }) => {
      if (data) setDriverWithdrawals(data || []);
    });
    supabase.from('wallet_transactions').select('id, transaction_type, amount, payment_method, transaction_status').eq('user_id', userId).in('transaction_type', ['topup', 'withdrawal', 'earning']).order('id', { ascending: false }).limit(50).then(({ data }) => {
      if (data) setDriverWalletTransactions(data || []);
    });
    Promise.all([
      supabase.from('driver_cash_collections').select('amount, settled_amount, status').eq('driver_id', userId).eq('status', 'open'),
      supabase.from('driver_cash_settlements').select('amount, status').eq('driver_id', userId).eq('status', 'pending')
    ]).then(([collectionsRes, settlementsRes]) => {
      const open = (collectionsRes.data || []).reduce((sum, row) => sum + Number(row.amount || 0) - Number(row.settled_amount || 0), 0);
      const pending = (settlementsRes.data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
      setDriverCashOutstanding(Math.max(0, open - pending));
    });
    supabase.from('driver_cash_settlements').select('id, amount, status, note, requested_at, processed_at').eq('driver_id', userId).order('requested_at', { ascending: false }).limit(30).then(({ data }) => { if (data) setDriverSettlements(data || []); });
    supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, delivery_latitude, delivery_longitude, notes, courier_distance, fulfillment_type, payment_status').eq('status', 'ready_for_pickup').is('driver_id', null).then(({ data }) => { if (data) setAvailable(data as FullOrderRow[]); });
    supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, delivery_latitude, delivery_longitude, notes, courier_distance, fulfillment_type, payment_status, payment_method').eq('driver_id', userId).not('status', 'in', '(delivered,cancelled,pending)').order('created_at', { ascending: false }).limit(1).then(({ data }) => {
      setActiveOrder(((data as FullOrderRow[] | null) || [])[0] || null);
    });
    supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, delivery_latitude, delivery_longitude, notes, courier_distance, fulfillment_type, payment_status').eq('status', 'delivered').eq('driver_id', userId).order('created_at', { ascending: false }).then(({ data }) => { if (data) setHistory(data as FullOrderRow[]); });
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!profile || profile.verification_status !== 'approved' || (!profile.is_available && !activeOrder)) return;
    let stopped = false;

    const sendLocation = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (stopped) return;
          const { error: locationError } = await supabase.rpc('update_driver_location', {
            p_latitude: Number(position.coords.latitude.toFixed(7)),
            p_longitude: Number(position.coords.longitude.toFixed(7))
          });
          if (locationError && !stopped) setError('تعذر تحديث موقعك الآن.');
        },
        () => {
          if (!stopped && activeOrder) setError('تعذر قراءة موقع المندوب من الجهاز.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    };

    sendLocation();
    const timer = window.setInterval(sendLocation, 20000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [profile?.is_available, profile?.verification_status, activeOrder?.id, activeOrder?.status]);

  const toggleAvailability = async () => {
    if (profile?.verification_status !== 'approved') {
      setError('لا يمكنك تفعيل حالة "متاح" حتى تعتمد الإدارة حسابك');
      return;
    }
    const next = !profile?.is_available;
    await supabase.from('driver_profiles').update({ is_available: next }).eq('id', (await supabase.auth.getUser()).data.user?.id || '');
    loadAll();
  };

  const acceptOrder = async (orderId: string) => {
    setBusy(true); setError('');
    try {
      const { error: rpcError } = await supabase.rpc('driver_accept_order', { p_order_id: orderId });
      if (rpcError) throw rpcError;
      loadAll();
      setActive('active');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'تعذر قبول الطلب'); }
    finally { setBusy(false); }
  };

  const nextStatus = (status: string) => {
    if (status === 'picked_up') return 'on_the_way';
    if (status === 'on_the_way') return 'delivered';
    return null;
  };

  const advance = async (orderId: string, status: string) => {
    const target = nextStatus(status);
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      const { error: statusError } = await supabase.rpc('driver_update_order_status', {
        p_order_id: orderId,
        p_status: target
      });
      if (statusError) throw statusError;
      await loadAll();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر تحديث حالة الطلب. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCash = async (orderId: string) => {
    setBusy(true);
    setError('');
    try {
      const { error: paymentError } = await supabase.rpc('confirm_cash_collected', {
        p_order_id: orderId
      });
      if (paymentError) throw paymentError;
      await loadAll();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر تأكيد استلام الدفع. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const requestCashSettlement = async () => {
    const amount = Number(settlementAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSettlementError('أدخل مبلغ تسوية صحيح');
      return;
    }
    if (amount > driverCashOutstanding) {
      setSettlementError('المبلغ أكبر من النقد المستحق المتاح للتسوية');
      return;
    }
    setSettlementBusy(true);
    setSettlementError('');
    try {
      const { error: rpcError } = await supabase.rpc('request_driver_cash_settlement', {
        p_amount: amount,
        p_note: settlementNote.trim() || null,
      });
      if (rpcError) throw rpcError;
      setSettlementAmount('');
      setSettlementNote('');
      loadAll();
    } catch (caught) {
      setSettlementError(caught instanceof Error ? caught.message : 'تعذر إرسال طلب التسوية');
    } finally {
      setSettlementBusy(false);
    }
  };  const requestDriverWithdrawal = async () => {
    const amount = Number(withdrawalAmount);
    const availableBalance = Math.max(0, Number(wallet.balance || 0) - Number(wallet.reserved_balance || 0));
    if (!Number.isFinite(amount) || amount <= 0) { setWithdrawalError('أدخل مبلغ سحب صحيح'); return; }
    if (amount > availableBalance) { setWithdrawalError('المبلغ أكبر من الرصيد المتاح للسحب'); return; }
    if (!withdrawalMethod || !withdrawalAccount.trim()) { setWithdrawalError('اختر طريقة السحب وأدخل رقم الحساب'); return; }
    setWithdrawalBusy(true); setWithdrawalError('');
    try {
      const { error: rpcError } = await supabase.rpc('request_driver_wallet_withdrawal', {
        p_amount: amount, p_payment_method_code: withdrawalMethod, p_account_number: withdrawalAccount.trim(), p_note: withdrawalNote.trim() || null,
      });
      if (rpcError) throw rpcError;
      setWithdrawalAmount(''); setWithdrawalAccount(''); setWithdrawalNote(''); loadAll();
    } catch (caught) {
      setWithdrawalError(caught instanceof Error ? caught.message : 'تعذر إرسال طلب السحب');
    } finally { setWithdrawalBusy(false); }
  };  const requestDriverTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setTopupError('أدخل مبلغ شحن صحيح'); return; }
    if (!topupMethod) { setTopupError('اختر طريقة الشحن'); return; }
    setTopupBusy(true); setTopupError('');
    try {
      const { error: rpcError } = await supabase.rpc('request_driver_wallet_topup', {
        p_amount: amount, p_payment_method_code: topupMethod, p_reference_number: topupReference.trim() || null,
      });
      if (rpcError) throw rpcError;
      setTopupAmount(''); setTopupReference(''); loadAll();
    } catch (caught) {
      setTopupError(caught instanceof Error ? caught.message : 'تعذر إرسال طلب الشحن');
    } finally { setTopupBusy(false); }
  };

  return (
    <div className="jarmal-app min-h-screen">
      <Topbar role="driver" title="مساحة المندوب" onLogout={onLogout} onSettings={() => setActive('settings')} onNotifications={() => setActive('notifications')} />
      <div className="mx-auto flex max-w-7xl">
        <SideNav role="driver" active={active} onActive={setActive} />
        <main className="jarmal-page min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:pb-8">
          {active === 'available' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">الطلبات الجاهزة للاستلام</h2>
                  {profile?.verification_status !== 'approved' && (
                    <p className="mt-2 text-sm text-orange-600">حالة الحساب: {profile?.verification_status === 'pending' ? 'بانتظار اعتماد الإدارة' : profile?.verification_status === 'rejected' ? 'تم رفض الاعتماد' : 'تم إيقاف الاعتماد'}</p>
                  )}
                </div>
                <button onClick={toggleAvailability} disabled={profile?.verification_status !== 'approved'} className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${profile?.is_available ? 'bg-[#e3fe00] text-black' : 'bg-white/10 text-[#667067]'}`}>
                  <span className={`h-3 w-3 rounded-full ${profile?.is_available ? 'bg-black' : 'bg-white/30'}`} />
                  {profile?.is_available ? 'متصل الآن' : 'غير متصل'}
                </button>
              </div>
              {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
              <div className="mt-7 space-y-3">
                {available.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-[#e1e5de] bg-white p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-black">{Number(order.total_amount || 0).toLocaleString('ar-YE')} {CURRENCY}</span>
                      <span className="text-xs text-[#747b72]">{order.courier_distance ? `${order.courier_distance} كم` : ''}</span>
                    </div>
                    <p className="mt-2 text-xs text-[#747b72]">{order.fulfillment_type === 'pickup' ? 'استلام من المتجر فقط' : order.delivery_address}</p>
                    <button disabled={busy || profile?.verification_status !== 'approved' || profile?.is_available !== true} onClick={() => acceptOrder(order.id)} className="mt-4 w-full rounded-xl bg-[#e3fe00] py-3 font-black text-black hover:bg-white disabled:opacity-50">قبول الطلب</button>
                  </div>
                ))}
                {available.length === 0 && <p className="text-sm text-[#747b72]">لا توجد طلبات جاهزة للاستلام حالياً</p>}
              </div>
            </div>
          )}

          {active === 'active' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">الطلب الحالي</h2>
              {activeOrder ? (
                <>
                  <LocationMap latitude={activeOrder.delivery_latitude} longitude={activeOrder.delivery_longitude} interactive={false} title="موقع العميل" />
                  <div className="mt-6 rounded-2xl border border-[#e1e5de] bg-white p-5">
                    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                    <div className="flex items-center justify-between">
                      <span className="font-black">{Number(activeOrder.total_amount || 0).toLocaleString('ar-YE')} {CURRENCY}</span>
                      <span className="rounded-lg bg-[#e3fe00]/10 px-3 py-1 text-xs font-black text-[#687500]">{statusLabels[activeOrder.status] || activeOrder.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#667067]">{activeOrder.delivery_address || 'لا يوجد وصف نصي للموقع'}</p>
                    <div className="mt-5 flex gap-3">
                      {nextStatus(activeOrder.status) && (
                        <button disabled={busy} onClick={() => advance(activeOrder.id, activeOrder.status)} className="flex-1 rounded-xl bg-[#e3fe00] py-3 font-black text-black disabled:opacity-50">
                          {activeOrder.status === 'picked_up' ? 'بدء التوصيل' : 'تم التسليم'}
                        </button>
                      )}
                      {(activeOrder.payment_status !== 'paid' && (activeOrder as FullOrderRow & { payment_method?: string | null }).payment_method === 'cash') && (
                        <button disabled={busy} onClick={() => confirmCash(activeOrder.id)} className="flex-1 rounded-xl border border-[#e3fe00]/40 py-3 font-black text-[#687500] disabled:opacity-50">تأكيد استلام الدفع</button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#747b72]">لا يوجد طلب نشط حالياً</p>
              )}
            </div>
          )}

          {active === 'notifications' && <NotificationsView />}

          {active === 'settings' && <SettingsView role="driver" />}

          {active === 'history' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">سجل التوصيلات</h2>
              <div className="space-y-3">
                {history.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-[#e1e5de] bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{Number(order.total_amount || 0).toLocaleString('ar-YE')} {CURRENCY}</span>
                      <span className="text-xs text-[#747b72]">{new Date(order.created_at).toLocaleDateString('ar-YE')}</span>
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-sm text-[#747b72]">لا يوجد سجل توصيلات بعد</p>}
              </div>
            </div>
          )}

          {active === 'wallet' && isOwner && (
            <section>
              <p className="text-sm text-[#747b72]">أموالك بين يديك</p>
              <h1 className="mt-1 text-3xl font-black">محفظتي</h1>
              <div className="mt-7 rounded-3xl bg-[#e3fe00] p-7 text-black">
                <span className="text-sm font-bold text-black/60">الرصيد الإجمالي</span>
                <p className="mt-6 text-4xl font-black">{Number(wallet.balance || 0).toLocaleString('ar-YE')} <span className="text-lg">{CURRENCY}</span></p>
                <p className="mt-2 text-sm font-bold text-black/60">المحجوز لطلبات السحب: {Number(wallet.reserved_balance || 0).toLocaleString('ar-YE')} {CURRENCY}</p>
                <p className="mt-1 text-xs text-black/55">المتاح للسحب: {Math.max(0, Number(wallet.balance || 0) - Number(wallet.reserved_balance || 0)).toLocaleString('ar-YE')} {CURRENCY}</p>
              </div>
              {profile && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="jarmal-card rounded-2xl border border-[#e1e5de] bg-white p-5"><p className="text-xs text-[#747b72]">التقييم</p><p className="mt-2 text-xl font-black text-[#687500]">★ {profile.rating ?? '—'}</p></div>
                  <div className="jarmal-card rounded-2xl border border-[#e1e5de] bg-white p-5"><p className="text-xs text-[#747b72]">المركبة</p><p className="mt-2 text-sm font-bold">{profile.vehicle_type || '—'} • {profile.vehicle_plate_number || '—'}</p></div>
                </div>
              )}

              <div className="mt-8 rounded-2xl border border-[#e1e5de] bg-white p-5">
                <p className="text-xs text-[#747b72]">إضافة رصيد للمحفظة</p>
                <h2 className="mt-1 text-xl font-black">شحن المحفظة</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <input value={topupAmount} onChange={(e) => setTopupAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="مبلغ الشحن" dir="ltr" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3 text-sm font-bold outline-none focus:border-[#b7c800]" />
                  <select value={topupMethod} onChange={(e) => setTopupMethod(e.target.value)} className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3 text-sm font-bold outline-none">
                    <option value="">طريقة الشحن</option>
                    {driverPaymentMethods.map((method) => <option key={method.code} value={method.code}>{method.name}</option>)}
                  </select>
                  <input value={topupReference} onChange={(e) => setTopupReference(e.target.value)} placeholder="رقم العملية/المرجع (اختياري)" dir="ltr" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3 text-sm outline-none focus:border-[#b7c800]" />
                </div>
                <button onClick={requestDriverTopup} disabled={topupBusy} className="mt-3 w-full rounded-xl bg-[#e3fe00] py-3 text-sm font-black text-black disabled:opacity-50">{topupBusy ? 'جارٍ الإرسال...' : 'إرسال طلب الشحن'}</button>
                {topupError && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-xs font-bold text-red-600">{topupError}</p>}
                <p className="mt-3 text-xs text-[#747b72]">سيبقى الطلب قيد المراجعة حتى تؤكده الإدارة.</p>
              </div>

              <div className="mt-8 rounded-2xl border border-[#e1e5de] bg-white p-5">
                <p className="text-xs text-[#747b72]">حركات المحفظة</p>
                <h2 className="mt-1 text-xl font-black">السجل المالي</h2>
                <div className="mt-5 space-y-2">
                  {driverWalletTransactions.map((tx) => {
                    const type = tx.transaction_type === 'topup' ? 'شحن' : tx.transaction_type === 'earning' ? 'أرباح' : tx.transaction_type === 'withdrawal' ? 'سحب' : tx.transaction_type;
                    const status = tx.transaction_status === 'completed' ? 'مكتملة' : tx.transaction_status === 'rejected' ? 'مرفوضة' : 'قيد المراجعة';
                    return <div key={tx.id} className="flex items-center justify-between rounded-xl border border-[#edf0eb] bg-[#fafbf9] px-4 py-3">
                      <div><p className="text-sm font-black">{type}</p><p className="mt-1 text-xs text-[#747b72]">{tx.payment_method || '—'} • {status}</p></div>
                      <p className="font-black">{Number(tx.amount || 0).toLocaleString('ar-YE')} {CURRENCY}</p>
                    </div>;
                  })}
                  {driverWalletTransactions.length === 0 && <p className="py-4 text-center text-sm text-[#747b72]">لا توجد حركات مالية حتى الآن</p>}
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-[#e1e5de] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#747b72]">سحب رصيد المحفظة</p>
                    <h2 className="mt-1 text-xl font-black">طلب سحب</h2>
                  </div>
                  <span className="rounded-lg bg-[#e3fe00]/20 px-3 py-2 text-xs font-black text-[#596159]">المتاح للسحب: {Math.max(0, Number(wallet.balance || 0) - Number(wallet.reserved_balance || 0)).toLocaleString('ar-YE')} {CURRENCY}</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <input value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="مبلغ السحب" dir="ltr" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3 text-sm font-bold outline-none focus:border-[#b7c800]" />
                  <select value={withdrawalMethod} onChange={(e) => setWithdrawalMethod(e.target.value)} className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3 text-sm font-bold outline-none">
                    <option value="">طريقة السحب</option>
                    {driverPaymentMethods.map((method) => <option key={method.code} value={method.code}>{method.name}</option>)}
                  </select>
                  <input value={withdrawalAccount} onChange={(e) => setWithdrawalAccount(e.target.value)} placeholder="رقم الحساب/المحفظة" dir="ltr" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3 text-sm font-bold outline-none focus:border-[#b7c800]" />
                  <input value={withdrawalNote} onChange={(e) => setWithdrawalNote(e.target.value)} placeholder="ملاحظة اختيارية" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3 text-sm outline-none focus:border-[#b7c800]" />
                </div>
                <button onClick={requestDriverWithdrawal} disabled={withdrawalBusy || Math.max(0, Number(wallet.balance || 0) - Number(wallet.reserved_balance || 0)) <= 0} className="mt-3 w-full rounded-xl bg-[#e3fe00] py-3 text-sm font-black text-black disabled:opacity-50">{withdrawalBusy ? 'جارٍ الإرسال...' : 'إرسال طلب السحب'}</button>
                {withdrawalError && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-xs font-bold text-red-600">{withdrawalError}</p>}
              </div>

              <div className="mt-8 rounded-2xl border border-[#e1e5de] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-xs text-[#747b72]">سجل سحوبات المحفظة</p><h2 className="mt-1 text-xl font-black">سحوباتي السابقة</h2></div>
                  <span className="rounded-lg bg-[#f4f6f1] px-3 py-2 text-xs font-bold text-[#747b72]">{driverWithdrawals.length} طلب</span>
                </div>
                <div className="mt-5 space-y-3">
                  {driverWithdrawals.map((item) => {
                    const statusText = item.status === 'approved' ? 'تمت الموافقة' : item.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
                    const statusClass = item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-700' : item.status === 'rejected' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-700';
                    return <div key={item.id} className="rounded-xl border border-[#edf0eb] bg-[#fafbf9] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-lg font-black">{Number(item.amount || 0).toLocaleString('ar-YE')} {CURRENCY}</p><span className={`rounded-lg px-3 py-1 text-xs font-black ${statusClass}`}>{statusText}</span></div>
                      <p className="mt-2 text-xs text-[#747b72]">{item.payment_method_code} • {item.account_number}</p>
                      <p className="mt-1 text-xs text-[#747b72]">تاريخ الطلب: {item.created_at ? new Date(item.created_at).toLocaleString('ar-YE') : '—'}</p>
                      {item.admin_note && <p className="mt-2 rounded-lg bg-white p-3 text-xs text-[#596159]">ملاحظة الإدارة: {item.admin_note}</p>}
                    </div>;
                  })}
                  {driverWithdrawals.length === 0 && <p className="py-4 text-center text-sm text-[#747b72]">لا توجد سحوبات سابقة حتى الآن</p>}
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-[#e1e5de] bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#747b72]">النقد المحصل من الطلبات عند الاستلام</p>
                    <h2 className="mt-1 text-xl font-black">طلب تسوية نقدية</h2>
                  </div>
                  <span className="rounded-lg bg-[#e3fe00]/20 px-3 py-2 text-xs font-black text-[#596159]">المتاح للتسوية: {driverCashOutstanding.toLocaleString('ar-YE')} {CURRENCY}</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input value={settlementAmount} onChange={(e) => setSettlementAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="مبلغ التسوية" dir="ltr" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3 text-sm font-bold outline-none focus:border-[#b7c800]" />
                  <input value={settlementNote} onChange={(e) => setSettlementNote(e.target.value)} placeholder="ملاحظة اختيارية" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3 text-sm outline-none focus:border-[#b7c800]" />
                  <button onClick={requestCashSettlement} disabled={settlementBusy || driverCashOutstanding <= 0} className="rounded-xl bg-[#e3fe00] px-5 py-3 text-sm font-black text-black disabled:opacity-50">{settlementBusy ? 'جارٍ الإرسال...' : 'إرسال طلب التسوية'}</button>
                </div>
                {settlementError && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-xs font-bold text-red-600">{settlementError}</p>}
              </div>

              <div className="mt-8 rounded-2xl border border-[#e1e5de] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#747b72]">طلبات تسوية النقد المحصل</p>
                    <h2 className="mt-1 text-xl font-black">تسوياتي السابقة</h2>
                  </div>
                  <span className="rounded-lg bg-[#f4f6f1] px-3 py-2 text-xs font-bold text-[#747b72]">{driverSettlements.length} طلب</span>
                </div>

                <div className="mt-5 space-y-3">
                  {driverSettlements.map((settlement) => {
                    const statusText =
                      settlement.status === 'confirmed' ? 'تم التأكيد' :
                      settlement.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';
                    const statusClass =
                      settlement.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-700' :
                      settlement.status === 'rejected' ? 'bg-red-500/10 text-red-600' :
                      'bg-amber-500/10 text-amber-700';
                    return (
                      <div key={settlement.id} className="rounded-xl border border-[#edf0eb] bg-[#fafbf9] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-lg font-black">{Number(settlement.amount || 0).toLocaleString('ar-YE')} {CURRENCY}</p>
                          <span className={`rounded-lg px-3 py-1 text-xs font-black ${statusClass}`}>{statusText}</span>
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-[#747b72] sm:grid-cols-2">
                          <p>تاريخ الطلب: {settlement.requested_at ? new Date(settlement.requested_at).toLocaleString('ar-YE') : '—'}</p>
                          <p>تاريخ المعالجة: {settlement.processed_at ? new Date(settlement.processed_at).toLocaleString('ar-YE') : 'لم تتم المعالجة بعد'}</p>
                        </div>
                        {settlement.note && <p className="mt-3 rounded-lg bg-white p-3 text-xs text-[#596159]">ملاحظة: {settlement.note}</p>}
                      </div>
                    );
                  })}
                  {driverSettlements.length === 0 && (
                    <p className="py-4 text-center text-sm text-[#747b72]">لا توجد تسويات سابقة حتى الآن</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function MerchantApp({ onLogout, companionTarget }: { onLogout: () => void; companionTarget?: string | null }) {
  const [active, setActive] = useState('dashboard');
  useEffect(() => {
    if (companionTarget) setActive(companionTarget);
  }, [companionTarget]);
  const [store, setStore] = useState<MyStoreRow | null>(null);
  const [incoming, setIncoming] = useState<FullOrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItemRow[]>>({});
  const [myProducts, setMyProducts] = useState<MerchantProductRow[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; reserved_balance: number }>({ balance: 0, reserved_balance: 0 });
  const [merchantPaymentMethods, setMerchantPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newPaymentOptions, setNewPaymentOptions] = useState<'cash_only' | 'electronic_only' | 'both'>('both');
  const [addError, setAddError] = useState('');
  const [memberContext, setMemberContext] = useState<StoreMemberContext | null>(null);
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovementRow[]>([]);
  const [inventoryQty, setInventoryQty] = useState('1');
  const [inventoryReason, setInventoryReason] = useState('');
  const [inventoryError, setInventoryError] = useState('');

  const isOwner = !memberContext || memberContext.member_role === 'owner';
  const canManageOrders = isOwner || memberContext?.member_role === 'manager' || memberContext?.member_role === 'orders_employee';
  const canManageInventory = isOwner || memberContext?.member_role === 'manager' || memberContext?.member_role === 'warehouse_employee';
  const canManageProducts = isOwner || memberContext?.member_role === 'manager';

  const loadAll = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    // Resolve the store explicitly. Owners come from stores.merchant_id;
    // staff come from store_members. Never use maybeSingle() on public stores.
    const { data: membership } = await supabase
      .from('store_members')
      .select('store_id, member_role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const resolvedMemberContext = membership
      ? (membership as StoreMemberContext)
      : null;
    setMemberContext(resolvedMemberContext);

    const storeBaseQuery = supabase
      .from('stores')
      .select('id, name, is_open, rating, commission_rate, approval_status');

    const { data } = resolvedMemberContext
      ? await storeBaseQuery.eq('id', resolvedMemberContext.store_id).maybeSingle()
      : await storeBaseQuery.eq('merchant_id', userId).maybeSingle();

    if (data) {
      const row = data as MyStoreRow;
      setStore(row);
      supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, delivery_latitude, delivery_longitude, notes, courier_distance, fulfillment_type, payment_status').eq('store_id', row.id).in('status', ['pending', 'accepted', 'preparing']).order('created_at', { ascending: false }).then(async ({ data: orders }) => {
          const list = (orders as FullOrderRow[]) || [];
          setIncoming(list);
          if (list.length > 0) {
            const { data: items } = await supabase.from('order_items').select('id, order_id, product_id, custom_name, unit_price, quantity').in('order_id', list.map((o) => o.id));
            const grouped: Record<string, OrderItemRow[]> = {};
            (items as OrderItemRow[] | null)?.forEach((item) => { grouped[item.order_id] = [...(grouped[item.order_id] || []), item]; });
            setOrderItems(grouped);
          }
        });
        supabase.from('products').select('id, store_id, name, description, price, image_url, is_available, payment_options').eq('store_id', row.id).then(({ data: prods }) => { if (prods) setMyProducts(prods as MerchantProductRow[]); });
        supabase.from('product_inventory').select('id, store_id, product_id, variant_id, quantity_on_hand, quantity_reserved, reorder_level, unit_label, updated_at').eq('store_id', row.id).then(({ data: inventory }) => { if (inventory) setInventoryRows(inventory as InventoryRow[]); });
        supabase.from('inventory_movements').select('id, product_id, movement_type, quantity, quantity_before, quantity_after, reason, created_at').eq('store_id', row.id).order('created_at', { ascending: false }).limit(50).then(({ data: movements }) => { if (movements) setInventoryMovements(movements as InventoryMovementRow[]); });
    }
    supabase.from('merchant_wallets').select('balance, reserved_balance').eq('merchant_id', userId).maybeSingle().then(({ data }) => { if (data) setWallet(data as { balance: number; reserved_balance: number }); });
    supabase.from('merchant_withdrawal_requests').select('id, amount, payment_method_code, account_number, status, note, created_at, admin_note').eq('merchant_id', userId).order('created_at', { ascending: false }).limit(10).then(({ data }) => { if (data) setWithdrawals(data || []); });
    supabase.from('payment_methods').select('id, name, code, account_number, instructions, checkout_url, deep_link, verification_mode, auto_verify_enabled').eq('is_active', true).neq('code', 'cash').then(({ data }) => {
      if (data) {
        const methods = data as PaymentMethodRow[];
        setMerchantPaymentMethods(methods);
        setWithdrawMethod((current) => current || methods[0]?.code || '');
      }
    });
  };

  useEffect(() => { loadAll(); }, []);

  const toggleOpen = async () => {
    if (!store || !isOwner || store.approval_status !== 'approved') return;
    await supabase.from('stores').update({ is_open: !store.is_open }).eq('id', store.id);
    loadAll();
  };

  const respond = async (orderId: string, accept: boolean) => {
    if (!canManageOrders) return;
    setBusy(true);
    await supabase.rpc('merchant_respond_to_order', { p_order_id: orderId, p_accept: accept, p_reject_reason: accept ? null : 'غير متوفر حالياً' });
    setBusy(false);
    loadAll();
  };

  const advance = async (orderId: string, currentStatus: string) => {
    if (!canManageOrders && !canManageInventory) return;
    const nextStatus = currentStatus === 'accepted' ? 'preparing' : currentStatus === 'preparing' ? 'ready_for_pickup' : null;
    if (!nextStatus) return;
    setBusy(true);
    const { error: rpcError } = await supabase.rpc('merchant_update_order_status', { p_order_id: orderId, p_status: nextStatus });
    setBusy(false);
    if (rpcError) {
      setOrderError(rpcError.message || 'تعذر تحديث حالة الطلب');
      return;
    }
    loadAll();
  };

  const addProduct = async () => {
    if (!store || !canManageProducts) return;
    setAddError('');
    if (!newName.trim() || !newPrice) { setAddError('أدخل اسم المنتج والسعر'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('merchant_create_product', {
      p_store_id: store.id,
      p_name: newName.trim(),
      p_description: newDesc.trim() || null,
      p_price: Number(newPrice),
      p_image_url: newImage.trim() || null,
      p_payment_options: newPaymentOptions
    });
    setBusy(false);
    if (error) { setAddError('تعذر إضافة المنتج'); return; }
    setShowAdd(false); setNewName(''); setNewDesc(''); setNewPrice(''); setNewImage(''); setNewPaymentOptions('both');
    loadAll();
  };

  const toggleProductAvailable = async (productId: string, current: boolean) => {
    if (!canManageProducts) return;
    await supabase.rpc('merchant_set_product_available', {
      p_product_id: productId,
      p_is_available: !current
    });
    loadAll();
  };
  const requestWithdrawal = async () => {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setWithdrawError('أدخل مبلغاً صحيحاً'); return; }
    if (!withdrawMethod) { setWithdrawError('اختر وسيلة السحب'); return; }
    if (!withdrawAccount.trim()) { setWithdrawError('أدخل رقم المحفظة أو الحساب'); return; }
    if (amount > Math.max(0, Number(wallet.balance || 0) - Number(wallet.reserved_balance || 0))) { setWithdrawError('المبلغ أكبر من الرصيد المتاح'); return; }
    setWithdrawError('');
    setBusy(true);
    const { error } = await supabase.rpc('request_merchant_withdrawal', {
      p_amount: amount,
      p_payment_method_code: withdrawMethod,
      p_account_number: withdrawAccount.trim(),
      p_note: withdrawNote.trim() || null
    });
    setBusy(false);
    if (error) { setWithdrawError(error.message || 'تعذر إرسال طلب السحب'); return; }
    setWithdrawAmount(''); setWithdrawAccount(''); setWithdrawNote('');
    loadAll();
  };

  const adjustInventory = async (productId: string, direction: 'in' | 'out') => {
    if (!store || !canManageInventory) return;
    const qty = Number(inventoryQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setInventoryError('أدخل كمية صحيحة أكبر من صفر');
      return;
    }
    setInventoryError('');
    setBusy(true);
    const { error } = await supabase.rpc('adjust_product_inventory', {
      p_store_id: store.id,
      p_product_id: productId,
      p_variant_id: null,
      p_quantity: qty,
      p_movement_type: direction === 'in' ? 'purchase_in' : 'adjustment_out',
      p_reason: inventoryReason.trim() || (direction === 'in' ? 'إضافة مخزون' : 'خصم من المخزون'),
      p_unit_label: 'قطعة',
      p_reorder_level: 0
    });
    setBusy(false);
    if (error) {
      setInventoryError(error.message || 'تعذر تحديث المخزون');
      return;
    }
    setInventoryReason('');
    loadAll();
  };

  return (
    <div className="jarmal-app min-h-screen">
      <Topbar role="merchant" title="مساحة التاجر" onLogout={onLogout} onSettings={() => setActive('settings')} onNotifications={() => setActive('notifications')} />
      <div className="mx-auto flex max-w-7xl">
        <SideNav role="merchant" active={active} onActive={setActive} merchantCanManageTeam={isOwner} merchantCanManageInventory={canManageInventory} />
        <main className="jarmal-page min-w-0 flex-1 p-5 pb-24 sm:p-8 lg:pb-8">
          {active === 'dashboard' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">نظرة عامة</h2>
                  {memberContext && (
                    <p className="mt-1 text-xs text-[#747b72]">
                      {memberContext.member_role === 'manager' ? 'مدير المتجر' : memberContext.member_role === 'orders_employee' ? 'موظف الطلبات' : 'موظف المخزون'}
                    </p>
                  )}
                </div>
                {store && isOwner && (
                  <button onClick={toggleOpen} className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-black ${store.is_open ? 'bg-[#e3fe00] text-black' : 'bg-white/10 text-[#697068]'}`}>
                    <span className={`h-3 w-3 rounded-full ${store.is_open ? 'bg-black' : 'bg-white/30'}`} />
                    المتجر {store.is_open ? 'مفتوح' : 'مغلق'}
                  </button>
                )}
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="jarmal-card rounded-2xl border border-[#e1e5de] bg-white p-5"><p className="text-xs text-[#747b72]">طلبات قيد الانتظار</p><p className="mt-2 text-3xl font-black text-[#687500]">{incoming.length}</p></div>
                <div className="jarmal-card rounded-2xl border border-[#e1e5de] bg-white p-5"><p className="text-xs text-[#747b72]">نسبة عمولة جَرْمَل</p><p className="mt-2 text-3xl font-black text-[#687500]">{store?.commission_rate ? `${(store.commission_rate * 100).toFixed(0)}%` : '—'}</p></div>
                <div className="jarmal-card rounded-2xl border border-[#e1e5de] bg-white p-5"><p className="text-xs text-[#747b72]">تقييم المتجر</p><p className="mt-2 text-3xl font-black text-[#687500]">★ {store?.rating ?? '—'}</p></div>
              </div>
            </div>
          )}

          {active === 'incoming' && canManageOrders && (
            <div>
              <h2 className="mb-5 text-2xl font-black">الطلبات الواردة</h2>
              {orderError && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{orderError}</div>}
              <div className="space-y-4">
                {incoming.map((order) => {
                  const items = orderItems[order.id] || [];
                  const commission = store?.commission_rate ? order.total_amount * store.commission_rate : 0;
                  return (
                    <div key={order.id} className="rounded-2xl border border-[#e1e5de] bg-white p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-black">{Number(order.total_amount || 0).toLocaleString('ar-YE')} {CURRENCY}</span>
                        <span className="rounded-lg bg-[#e3fe00]/10 px-3 py-1 text-xs font-black text-[#687500]">{statusLabels[order.status] || order.status}</span>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-[#667067]">
                        {items.map((item) => (<p key={item.id}>{item.custom_name || 'منتج'} × {item.quantity}</p>))}
                      </div>
                      <p className="mt-2 text-xs text-[#7f867d]">عمولة جَرْمَل التقديرية: {commission.toLocaleString('ar-YE')} {CURRENCY}</p>
                      {order.status === 'pending' && (
                        <div className="mt-4 flex gap-2">
                          <button disabled={busy} onClick={() => respond(order.id, true)} className="flex-1 rounded-xl bg-[#e3fe00] py-3 text-sm font-black text-black disabled:opacity-50">قبول</button>
                          <button disabled={busy} onClick={() => respond(order.id, false)} className="flex-1 rounded-xl border border-red-500/40 py-3 text-sm font-black text-red-300 disabled:opacity-50">رفض</button>
                        </div>
                      )}
                      {(order.status === 'accepted' || order.status === 'preparing') && (
                        <button disabled={busy} onClick={() => advance(order.id, order.status)} className="mt-4 w-full rounded-xl border border-[#e3fe00]/40 py-3 text-sm font-black text-[#687500] disabled:opacity-50">
                          {order.status === 'accepted' ? 'بدء التحضير' : 'جاهز للاستلام'}
                        </button>
                      )}
                    </div>
                  );
                })}
                {incoming.length === 0 && <p className="text-sm text-[#747b72]">لا توجد طلبات واردة حالياً</p>}
              </div>
            </div>
          )}

          {active === 'inventory' && canManageInventory && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="text-sm text-[#747b72]">إدارة الكميات وحركة المخزون</p><h2 className="mt-1 text-2xl font-black">المخزون</h2></div>
                <div className="flex flex-wrap gap-2">
                  <input value={inventoryQty} onChange={(e) => setInventoryQty(e.target.value)} inputMode="decimal" className="w-24 rounded-xl border border-[#e1e5de] bg-white px-3 py-3 text-center text-sm outline-none focus:border-[#e3fe00]" placeholder="الكمية" />
                  <input value={inventoryReason} onChange={(e) => setInventoryReason(e.target.value)} className="w-48 rounded-xl border border-[#e1e5de] bg-white px-3 py-3 text-sm outline-none focus:border-[#e3fe00]" placeholder="سبب الحركة (اختياري)" />
                </div>
              </div>
              {inventoryError && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{inventoryError}</p>}
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {myProducts.map((product) => {
                  const inv = inventoryRows.find((row) => row.product_id === product.id && row.variant_id === null);
                  const available = (inv?.quantity_on_hand ?? 0) - (inv?.quantity_reserved ?? 0);
                  const low = available <= (inv?.reorder_level ?? 0) && available > 0;
                  return (
                    <div key={product.id} className="rounded-2xl border border-[#e1e5de] bg-white p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0"><h3 className="truncate font-black">{product.name}</h3><p className="mt-1 text-xs text-[#747b72]">{Number(product.price || 0).toLocaleString('ar-YE')} {CURRENCY}</p></div>
                        <div className="text-left"><p className="text-2xl font-black text-[#687500]">{Number(available || 0).toLocaleString('ar-YE')}</p><p className="text-[11px] text-[#7f867d]">{inv?.unit_label || 'قطعة'} متاحة</p></div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-[#f4f6f1] p-3"><p className="text-[#7f867d]">الموجود</p><p className="mt-1 font-bold">{Number(inv?.quantity_on_hand ?? 0).toLocaleString('ar-YE')}</p></div>
                        <div className="rounded-xl bg-[#f4f6f1] p-3"><p className="text-[#7f867d]">محجوز</p><p className="mt-1 font-bold">{Number(inv?.quantity_reserved ?? 0).toLocaleString('ar-YE')}</p></div>
                        <div className="rounded-xl bg-[#f4f6f1] p-3"><p className="text-[#7f867d]">إعادة الطلب</p><p className="mt-1 font-bold">{Number(inv?.reorder_level ?? 0).toLocaleString('ar-YE')}</p></div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button disabled={busy} onClick={() => adjustInventory(product.id, 'in')} className="flex-1 rounded-xl bg-[#e3fe00] py-3 text-sm font-black text-black disabled:opacity-50">+ إضافة</button>
                        <button disabled={busy || available <= 0} onClick={() => adjustInventory(product.id, 'out')} className="flex-1 rounded-xl border border-[#e1e5de] py-3 text-sm font-black text-[#596159] disabled:opacity-30">− خصم</button>
                      </div>
                    </div>
                  );
                })}
                {myProducts.length === 0 && <p className="text-sm text-[#747b72]">لا توجد منتجات لإدارة مخزونها.</p>}
              </div>

              <div className="mt-8 rounded-2xl border border-[#e1e5de] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#747b72]">آخر 50 حركة</p>
                    <h3 className="mt-1 text-xl font-black">سجل حركة المخزون</h3>
                  </div>
                  <span className="rounded-lg bg-[#f4f6f1] px-3 py-2 text-xs text-[#747b72]">{inventoryMovements.length} حركة</span>
                </div>

                <div className="mt-5 space-y-2">
                  {inventoryMovements.map((movement) => {
                    const product = myProducts.find((item) => item.id === movement.product_id);
                    const isIn = ['purchase_in', 'reservation_release'].includes(movement.movement_type);
                    const isReservation = movement.movement_type === 'reservation';
                    const label =
                      movement.movement_type === 'purchase_in' ? 'إضافة شراء' :
                      movement.movement_type === 'adjustment_out' ? 'خصم يدوي' :
                      movement.movement_type === 'reservation' ? 'حجز طلب' :
                      movement.movement_type === 'reservation_release' ? 'تحرير حجز' :
                      movement.movement_type === 'sale_out' ? 'صرف بيع' :
                      movement.movement_type;
                    return (
                      <div key={movement.id} className="grid gap-2 rounded-xl border border-[#edf0eb] bg-[#fafbf9] p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{product?.name || 'منتج'}</p>
                          <p className="mt-1 text-xs text-[#7f867d]">{label}{movement.reason ? ' • ' + movement.reason : ''}</p>
                        </div>
                        <div className={isIn ? 'text-[#687500]' : isReservation ? 'text-amber-300' : 'text-red-300'}>
                          {isIn ? '+' : isReservation ? 'حجز ' : '−'}{Math.abs(Number(movement.quantity || 0)).toLocaleString('ar-YE')}
                        </div>
                        <div className="text-left text-[11px] text-[#7f867d]">
                          <div>{Number(movement.quantity_before || 0).toLocaleString('ar-YE')} ← {Number(movement.quantity_after || 0).toLocaleString('ar-YE')}</div>
                          <div className="mt-1">{new Date(movement.created_at).toLocaleString('ar-YE')}</div>
                        </div>
                      </div>
                    );
                  })}
                  {inventoryMovements.length === 0 && <p className="py-5 text-sm text-[#747b72]">لا توجد حركات مخزون بعد.</p>}
                </div>
              </div>
            </div>
          )}

          {active === 'products' && canManageProducts && (
            <div>
              <div className="flex items-end justify-between">
                <div><p className="text-sm text-[#747b72]">أضف منتجاتك وتحكم في توفرها</p><h2 className="mt-1 text-2xl font-black">إدارة المنتجات</h2></div>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-[#e3fe00] px-4 py-3 text-sm font-black text-black"><Plus size={17} />إضافة منتج</button>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {myProducts.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-[#e1e5de] bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f4f6f1]">
                        {product.image_url ? <img src={product.image_url} className="h-full w-full object-cover" /> : <ShoppingBag size={22} className="text-[#687500]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold">{product.name}</h3>
                        <p className="mt-1 text-xs text-[#747b72]">{Number(product.price || 0).toLocaleString('ar-YE')} {CURRENCY}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleProductAvailable(product.id, product.is_available)} className={`mt-4 w-full rounded-lg py-2 text-xs font-bold ${product.is_available ? 'bg-[#e3fe00]/10 text-[#687500]' : 'bg-white/10 text-[#747b72]'}`}>{product.is_available ? 'متوفر — اضغط للإخفاء' : 'غير متوفر — اضغط للإظهار'}</button>
                  </div>
                ))}
                {myProducts.length === 0 && <p className="text-sm text-[#747b72]">لا توجد منتجات بعد</p>}
              </div>
              {showAdd && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-5 backdrop-blur">
                  <div className="w-full max-w-md rounded-3xl border border-[#e1e5de] bg-white p-6">
                    <div className="flex items-center justify-between"><h2 className="text-xl font-black">إضافة منتج جديد</h2><button onClick={() => setShowAdd(false)}><X size={20} className="text-[#747b72]" /></button></div>
                    <div className="mt-6 space-y-4">
                      <Field label="اسم المنتج" value={newName} onChange={setNewName} placeholder="مثال: وجبة اليوم" icon={<ShoppingBag size={17} />} />
                      <Field label="وصف المنتج" value={newDesc} onChange={setNewDesc} placeholder="اكتب وصفاً مختصراً" icon={<FileText size={17} />} />
                      <Field label="السعر" value={newPrice} onChange={(v) => setNewPrice(v.replace(/\D/g, ''))} placeholder="مثال: 2500" />
                      <Field label="رابط صورة المنتج (اختياري)" value={newImage} onChange={setNewImage} placeholder="https://..." />
                      <div>
                        <label className="mb-2 block text-sm font-bold">طريقة الدفع لهذا المنتج</label>
                        <select value={newPaymentOptions} onChange={(e) => setNewPaymentOptions(e.target.value as 'cash_only' | 'electronic_only' | 'both')} className="w-full rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-4 py-3.5 font-bold outline-none focus:border-[#e3fe00]">
                          <option value="both">الدفع عند الاستلام + الدفع الإلكتروني</option>
                          <option value="cash_only">الدفع عند الاستلام فقط</option>
                          <option value="electronic_only">الدفع الإلكتروني فقط</option>
                        </select>
                        <p className="mt-2 text-xs text-[#747b72]">هذا الخيار يحدد طرق الدفع المسموح بها لهذا المنتج عند إتمام الطلب.</p>
                      </div>
                      {addError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{addError}</div>}
                      <button disabled={busy} onClick={addProduct} className="w-full rounded-xl bg-[#e3fe00] py-3.5 font-black text-black disabled:opacity-50">حفظ المنتج</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'wallet' && (
            <section className="max-w-3xl">
              <p className="text-sm text-[#747b72]">الرصيد وطلبات التحويل إلى محفظتك المحلية</p>
              <h1 className="mt-1 text-3xl font-black">محفظتي</h1>
              <div className="mt-7 rounded-3xl bg-[#e3fe00] p-7 text-black">
                <span className="text-sm font-bold text-black/60">الرصيد المتاح</span>
                <p className="mt-6 text-4xl font-black">{Number(wallet.balance || 0).toLocaleString('ar-YE')} <span className="text-lg">{CURRENCY}</span></p>
              </div>
              <div className="mt-5 rounded-2xl border border-[#e1e5de] bg-white p-5">
                <h2 className="text-xl font-black">طلب سحب</h2>
                <p className="mt-1 text-xs text-[#747b72]">سيتم إرسال الطلب للمراجعة قبل التحويل الفعلي. الرصيد لا يُخصم عند إنشاء الطلب.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value.replace(/[^0-9.]/g,''))} inputMode="decimal" placeholder="المبلغ" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-3 py-3 outline-none focus:border-[#e3fe00]" />
                  <select value={withdrawMethod} onChange={e=>setWithdrawMethod(e.target.value)} className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-3 py-3 outline-none focus:border-[#e3fe00]">
                    <option value="">وسيلة السحب</option>
                    {merchantPaymentMethods.map((method) => (
                      <option key={method.id} value={method.code}>{method.name}</option>
                    ))}
                  </select>
                  <input value={withdrawAccount} onChange={e=>setWithdrawAccount(e.target.value)} inputMode="tel" placeholder="رقم المحفظة / الحساب" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-3 py-3 outline-none focus:border-[#e3fe00]" />
                  <input value={withdrawNote} onChange={e=>setWithdrawNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="rounded-xl border border-[#e1e5de] bg-[#fafbf9] px-3 py-3 outline-none focus:border-[#e3fe00]" />
                </div>
                {withdrawError && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{withdrawError}</p>}
                <button disabled={busy || (Number(wallet.balance || 0) - Number(wallet.reserved_balance || 0)) <= 0} onClick={requestWithdrawal} className="mt-4 w-full rounded-xl bg-[#171a16] py-3.5 font-black text-white disabled:opacity-40">إرسال طلب السحب</button>
              </div>
              <div className="mt-5 rounded-2xl border border-[#e1e5de] bg-white p-5">
                <h2 className="text-xl font-black">آخر طلبات السحب</h2>
                <div className="mt-4 space-y-2">
                  {withdrawals.map(w=><div key={w.id} className="flex items-center justify-between rounded-xl bg-[#f4f6f1] p-3"><div><p className="font-bold">{Number(w.amount).toLocaleString('ar-YE')} {CURRENCY}</p><p className="text-xs text-[#747b72]">{w.payment_method_code} • {new Date(w.created_at).toLocaleString('ar-YE')}</p></div><span className="rounded-lg bg-white px-3 py-1 text-xs font-bold">{w.status === 'pending' ? 'قيد المراجعة' : w.status === 'approved' ? 'مقبول' : w.status === 'paid' ? 'تم التحويل' : w.status === 'rejected' ? 'مرفوض' : 'ملغى'}</span></div>)}
                  {withdrawals.length === 0 && <p className="text-sm text-[#747b72]">لا توجد طلبات سحب بعد.</p>}
                </div>
              </div>
            </section>
          )}

          {active === 'team' && store && isOwner && (
            <>
              <StoreTeamView storeId={store.id} />
              <div className="mt-8"><StoreAuditLogView storeId={store.id} /></div>
            </>
          )}

          {active === 'notifications' && <NotificationsView />}

          {active === 'settings' && store && isOwner && (
            <div className="max-w-md space-y-4">
              <h2 className="text-2xl font-black">إعدادات المتجر</h2>
              <div className="jarmal-card rounded-2xl border border-[#e1e5de] bg-white p-5">
                <p className="text-sm text-[#747b72]">اسم المتجر</p>
                <p className="mt-1 font-bold">{store.name}</p>
              </div>
              <div className="w-full rounded-xl border border-[#e1e5de] bg-white p-4">
                <p className="text-sm text-[#747b72]">حالة اعتماد المتجر</p>
                <p className="mt-1 font-black">{store.approval_status === 'pending' ? 'قيد مراجعة الإدارة' : store.approval_status === 'approved' ? 'معتمد' : store.approval_status === 'rejected' ? 'مرفوض' : 'موقوف'}</p>
              </div>
              <button disabled={store.approval_status !== 'approved'} onClick={toggleOpen} className={`w-full rounded-xl py-4 font-black ${store.is_open ? 'bg-[#e3fe00] text-black' : 'bg-white/10 text-[#697068]'} disabled:cursor-not-allowed disabled:opacity-40`}>{store.approval_status !== 'approved' ? 'لا يمكن فتح المتجر قبل الاعتماد' : store.is_open ? 'إغلاق المتجر مؤقتاً' : 'فتح المتجر'}</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [role, setRole] = useState<Role>('customer');
  const [session, setSession] = useState<Session | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1500);

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .maybeSingle();

      if (error || !profile?.role) {
        await supabase.auth.signOut();
        return;
      }

      if (profile.role === 'admin') {
        await supabase.auth.signOut();
        return;
      }

      const resolvedRole: Role =
        profile.role === 'driver' || profile.role === 'merchant'
          ? profile.role
          : 'customer';

      setSession(data.session);
      setRole(resolvedRole);
      setScreen('app');
    });

    return () => window.clearTimeout(timer);
  }, []);

  const [driverCompanionTarget, setDriverCompanionTarget] = useState<string | null>(null);
  const [merchantCompanionTarget, setMerchantCompanionTarget] = useState<string | null>(null);
  const [customerCompanionTarget, setCustomerCompanionTarget] = useState<string | null>(null);

  if (showSplash) {
    return (
      <main className="jarmal-app flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="relative flex flex-col items-center">
          <div className="absolute h-64 w-64 rounded-full bg-[#e3fe00]/30 blur-[90px]" />
          <Logo size="lg" />
          <p className="mt-5 text-sm font-bold tracking-[.08em] text-white/55">
            جَرْمَل — توصيل أسهل
          </p>
          <div className="mt-6 h-1 w-20 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#e3fe00]" />
          </div>
        </div>
      </main>
    );
  }

  const handleLogout = () => {
    void supabase.auth.signOut();
    setSession(null);
    setScreen('welcome');
  };

  if (screen === 'app') {
    if (role === 'driver') {
      return (
        <>
          <DriverApp onLogout={handleLogout} companionTarget={driverCompanionTarget} />
          <JarmalAIChat role="driver" page="driver-workspace" onNavigate={setDriverCompanionTarget} />
        </>
      );
    }

    if (role === 'merchant') {
      return (
        <>
          <MerchantApp onLogout={handleLogout} companionTarget={merchantCompanionTarget} />
          <JarmalAIChat role="merchant" page="merchant-workspace" onNavigate={setMerchantCompanionTarget} />
        </>
      );
    }

    return (
      <>
        <CustomerApp onLogout={handleLogout} companionTarget={customerCompanionTarget} />
        <JarmalAIChat role="customer" page="customer-workspace" onNavigate={setCustomerCompanionTarget} />
      </>
    );
  }

  if (screen === 'auth') {
    return (
      <Auth
        role={role}
        onBack={() => setScreen('welcome')}
        onSuccess={(newSession, resolvedRole) => {
          setSession(newSession);

          setRole(resolvedRole === 'driver' || resolvedRole === 'merchant' ? resolvedRole : 'customer');
          setScreen('app');
        }}
      />
    );
  }

  return (
    <Welcome
      onSelect={(selectedRole) => {
        setRole(selectedRole);
        setScreen('auth');
      }}
    />
  );
}

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[JARMAL] واجهة التطبيق تعثرت أثناء العرض:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f6f3] px-5 py-10 text-[#171a16]">
          <section className="w-full max-w-md rounded-3xl border border-[#e5e8e2] bg-white p-7 text-center shadow-lg">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dfff00] text-[#171a16]">
              <ShieldCheck size={28} />
            </div>
            <h1 className="mt-5 text-2xl font-black">تعذر عرض واجهة جَرْمَل</h1>
            <p className="mt-3 text-sm leading-7 text-[#6b7169]">حدث خطأ أثناء فتح الصفحة. لم نحذف حسابك أو طلباتك. أعد تحميل التطبيق، وإذا استمرت المشكلة فسيظهر هذا التنبيه بدل الشاشة البيضاء.</p>
            <button onClick={() => window.location.reload()} className="mt-6 w-full rounded-xl bg-[#dfff00] px-4 py-3.5 font-black text-[#171a16]">إعادة تحميل التطبيق</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}