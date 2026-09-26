import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, Bike, Check, CheckCircle2,
  ClipboardList, Clock3, FileText, Home, ListChecks, LogOut, MapPin,
  Menu, Minus, Navigation, Package, Phone, Plus, Settings2, ShieldCheck,
  ShoppingBag, Sparkles, Store, Truck, UserRound, WalletCards, X, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import AdminApp from '@/components/AdminApp';

type Role = 'customer' | 'driver' | 'merchant' | 'admin';
type Screen = 'welcome' | 'auth' | 'app' | 'admin';
type AuthMode = 'login' | 'signup';

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  storeId: string;
};

type CartItem = Product & {
  quantity: number;
};

type StoreItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  time: string;
  color: string;
  isOpen: boolean;
};

const CURRENCY = 'ر.ي';

const TEST_OTP = '123456';
const TEST_PHONE = '711234567';

const paymentChannels = [
  'جيب',
  'ون كاش',
  'الكريمي',
  'البنك اليمني الكويتي',
  'حوالة محلية'
];

const businessCategories = [
  'بقالة',
  'مطعم',
  'بوفيه',
  'سوبرماركت',
  'صيدلية',
  'خضار وفواكه',
  'حلويات',
  'ملابس',
  'إلكترونيات'
];

const categories = [
  { name: 'الكل', icon: ListChecks },
  { name: 'بقالة', icon: Store },
  { name: 'مطاعم', icon: Store },
  { name: 'قهوة', icon: Store },
  { name: 'صيدلية', icon: ShieldCheck },
  { name: 'حلويات', icon: Sparkles }
];

const stores: StoreItem[] = [
  {
    id: 's1',
    name: 'تموينات النخبة',
    category: 'بقالة',
    description: 'كل احتياجات البيت في مكان واحد',
    rating: 4.9,
    time: '15 - 25 د',
    color: '#263700',
    isOpen: true
  },
  {
    id: 's2',
    name: 'مذاق المدينة',
    category: 'مطاعم',
    description: 'وجبات ساخنة بطعم لا يُنسى',
    rating: 4.8,
    time: '25 - 35 د',
    color: '#3e2900',
    isOpen: true
  },
  {
    id: 's3',
    name: 'بُنّ ومزاج',
    category: 'قهوة',
    description: 'قهوة مختصة وحلويات يومية',
    rating: 4.7,
    time: '10 - 20 د',
    color: '#30251c',
    isOpen: false
  },
  {
    id: 's4',
    name: 'صيدلية الحياة',
    category: 'صيدلية',
    description: 'احتياجاتك الصحية تصلك بسرعة',
    rating: 4.9,
    time: '20 - 30 د',
    color: '#172e32',
    isOpen: true
  }
];

const products: Product[] = [
  {
    id: 'p1',
    name: 'سلة الفطور اليومية',
    description: 'خبز طازج، بيض، حليب، جبنة ومربى',
    price: 3400,
    category: 'الأكثر طلباً',
    storeId: 's1'
  },
  {
    id: 'p2',
    name: 'مياه معدنية 6 حبات',
    description: 'مياه نقية بحجم 1.5 لتر',
    price: 1200,
    category: 'مشروبات',
    storeId: 's1'
  },
  {
    id: 'p3',
    name: 'برجر جَرْمَل',
    description: 'لحم مشوي، جبنة شيدر، صوص خاص',
    price: 2900,
    category: 'الأكثر طلباً',
    storeId: 's2'
  },
  {
    id: 'p4',
    name: 'بطاطس بالجبنة',
    description: 'بطاطس مقرمشة مع صوص الجبنة',
    price: 1500,
    category: 'مقبلات',
    storeId: 's2'
  },
  {
    id: 'p5',
    name: 'لاتيه كراميل',
    description: 'إسبريسو، حليب مبخر، كراميل',
    price: 1800,
    category: 'مشروبات',
    storeId: 's3'
  },
  {
    id: 'p6',
    name: 'كوكيز الشوكولاتة',
    description: 'كوكيز مخبوزة طازجة يومياً',
    price: 1400,
    category: 'حلويات',
    storeId: 's3'
  }
];

// ===== أنواع بيانات العميل الحقيقية (تطابق قاعدة البيانات) =====
type StoreRow = {
  id: string;
  name: string;
  store_type: string;
  address_description: string | null;
  is_open: boolean;
  rating: number | null;
};
type CategoryRow = { id: string; store_id: string; name: string; sort_order: number };
type VariantRow = { id: string; product_id: string; variant_name: string; price: number; is_available: boolean };
type ProductRow = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  category_id: string | null;
  redemption_points_cost: number | null;
};
type OrderRow = {
  id: string;
  status: string;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
  store_id: string | null;
  order_type: string;
  fulfillment_type: string;
  points_earned: number;
};
type ServiceProviderRow = {
  id: string;
  service_type: string;
  name: string;
  account_number_length: number | null;
  region: string | null;
};
type ServicePackageRow = { id: string; provider_id: string; name: string; face_value: number | null; price: number };
type PaymentMethodRow = { id: string; name: string; code: string; account_number: string | null; instructions: string | null };
type ClientWalletRow = { balance: number; points: number };
type FullOrderRow = {
  id: string;
  status: string;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
  store_id: string | null;
  driver_id: string | null;
  delivery_address: string | null;
  notes: string | null;
  courier_distance: number | null;
  fulfillment_type: string;
  payment_status: string;
};
type OrderItemRow = { id: string; order_id: string; product_id: string | null; custom_name: string | null; unit_price: number; quantity: number };
type DriverProfileRow = {
  is_available: boolean;
  vehicle_type: string | null;
  vehicle_plate_number: string | null;
  rating: number | null;
};
type MyStoreRow = {
  id: string;
  name: string;
  is_open: boolean;
  rating: number | null;
  commission_rate: number | null;
};
type MerchantProductRow = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
};
type CartLine = {
  key: string;
  product_id?: string;
  variant_id?: string;
  custom_name?: string;
  custom_price?: number;
  name: string;
  price: number;
  quantity: number;
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

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${dark ? 'text-black' : 'text-white'}`}>
      <div className="relative flex h-11 w-11 items-center justify-center rounded-[50%_50%_50%_12px] border-2 border-black bg-[#e3fe00] text-2xl font-black text-black shadow-[0_0_22px_rgba(227,254,0,.22)]">
        <span className="relative -top-0.5">ج</span>
        <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-black" />
      </div>

      <div className="text-2xl font-black tracking-[-.08em]">
        جَرْمَل<span className="text-[#e3fe00]">.</span>
      </div>
    </div>
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
          className="w-full rounded-xl border border-white/10 bg-black px-11 py-3.5 text-white outline-none transition placeholder:text-white/20 focus:border-[#e3fe00]"
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
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none placeholder:text-white/20 focus:border-[#e3fe00]"
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
    <main className="relative min-h-screen overflow-hidden bg-black px-5 py-7 text-white">
      <div className="absolute -left-28 top-28 h-80 w-80 rounded-full bg-[#e3fe00]/10 blur-[120px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between">
        <Logo />

        <div className="flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck size={15} className="text-[#e3fe00]" />
          توصيل موثوق داخل اليمن
        </div>
      </header>

      <section className="relative mx-auto flex min-h-[calc(100vh-92px)] max-w-6xl flex-col justify-center py-10">
        <div className="max-w-3xl animate-slide-up">
          <Pill>أسرع من توقعك</Pill>

          <h1 className="mt-6 text-5xl font-black leading-[1.12] tracking-[-.05em] sm:text-7xl">
            طلبك عند بابك،
            <br />
            <span className="text-[#e3fe00]">بسرعة جَرْمَل.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-white/55">
            كل ما تحتاجه من متاجر حيك، في مكان واحد. اختر حسابك وابدأ رحلتك معنا.
          </p>
        </div>

        <div className="mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
          {roles.map(({ role, icon: Icon, title, desc }, index) => (
            <button
              key={role}
              onClick={() => onSelect(role)}
              className="group rounded-2xl border border-white/10 bg-white/[.04] p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:border-[#e3fe00]/60 hover:bg-[#e3fe00] hover:text-black animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="mb-10 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e3fe00] text-black transition-colors group-hover:bg-black group-hover:text-[#e3fe00]">
                  <Icon size={24} />
                </div>

                <ArrowLeft
                  className="text-white/30 group-hover:text-black"
                  size={20}
                />
              </div>

              <h2 className="text-2xl font-black">{title}</h2>

              <p className="mt-2 text-sm text-white/50 group-hover:text-black/65">
                {desc}
              </p>

              <p className="mt-5 text-xs font-bold text-[#e3fe00] group-hover:text-black">
                ابدأ الآن
              </p>
            </button>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-6 text-xs text-white/35">
          <span className="flex items-center gap-2">
            <Zap size={15} className="text-[#e3fe00]" />
            توصيل سريع
          </span>

          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#e3fe00]" />
            متاجر موثوقة
          </span>

          <span className="flex items-center gap-2">
            <Navigation size={15} className="text-[#e3fe00]" />
            تتبع مباشر
          </span>

          <button
            onClick={() => onSelect('admin')}
            className="flex items-center gap-2 text-white/20 transition hover:text-[#e3fe00]"
          >
            <ShieldCheck size={15} />
            دخول الإدارة
          </button>
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

  const sendOtp = () => {
    setError('');

    if (!form.name.trim()) {
      setError('اكتب اسمك أولاً');
      return;
    }

    if (form.phone.length !== 9) {
      setError('أدخل رقم هاتف يمني صحيح مكون من 9 أرقام');
      return;
    }

    setOtpSent(true);
    setOtpVerified(false);
    setStep(2);
  };

  const verifyTestOtp = () => {
    setError('');

    if (form.otp !== TEST_OTP) {
      setError('رمز التحقق غير صحيح. استخدم الرمز التجريبي: 123456');
      return;
    }

    setOtpVerified(true);

    if (role === 'customer') {
      void finishSignup();
      return;
    }

    setStep(3);
  };

  const createTestSession = async () => {
    const result = await supabase.auth.signInAnonymously();

    if (result.error) {
      throw result.error;
    }

    if (!result.data.session) {
      throw new Error(
        'تعذر إنشاء جلسة الاختبار. يجب تفعيل Anonymous Sign-Ins في Supabase.'
      );
    }

    return result.data.session;
  };

  const finishSignup = async () => {
    setError('');
    setBusy(true);

    try {
      if (!otpVerified && role !== 'admin') {
        throw new Error('يجب تأكيد رقم الهاتف أولاً');
      }

      if (role === 'driver') {
        if (!form.accessCode.trim()) {
          throw new Error('أدخل كود المندوب');
        }

        const normalizedCode = form.accessCode.trim().toUpperCase();

        const { data: code, error: codeError } = await supabase
          .from('driver_access_codes')
          .select('id, code, is_used, assigned_to_phone')
          .eq('code', normalizedCode)
          .eq('is_used', false)
          .maybeSingle();

        if (codeError) {
          throw codeError;
        }

        if (!code) {
          throw new Error('كود المندوب غير صحيح أو تم استخدامه من قبل');
        }
      }

      if (role === 'merchant') {
        if (!form.storeName.trim()) {
          throw new Error('أدخل اسم المتجر');
        }

        if (!form.category.trim()) {
          throw new Error('اختر نوع النشاط التجاري');
        }
      }

      const session = await createTestSession();
      const userId = session.user.id;

      const profilePayload = {
        id: userId,
        full_name: form.name.trim(),
        phone_number: `+967${form.phone}`,
        role,
        is_active: true
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload);

      if (profileError) {
        console.warn('تعذر حفظ profile:', profileError);
      }

      if (role === 'driver') {
        const normalizedCode = form.accessCode.trim().toUpperCase();

        const { error: codeUpdateError } = await supabase
          .from('driver_access_codes')
          .update({
            is_used: true,
            assigned_to_phone: `+967${form.phone}`
          })
          .eq('code', normalizedCode)
          .eq('is_used', false);

        if (codeUpdateError) {
          console.warn('تعذر تحديث كود المندوب:', codeUpdateError);
        }
      }

      if (role === 'merchant') {
        const { error: storeError } = await supabase
          .from('stores')
          .insert({
            merchant_id: userId,
            name: form.storeName.trim(),
            store_type: form.category,
            description: 'متجر جديد على جَرْمَل',
            is_open: true
          });

        if (storeError) {
          console.warn('تعذر إنشاء المتجر:', storeError);
        }
      }

      localStorage.setItem('jarmal_test_role', role);
      localStorage.setItem('jarmal_test_name', form.name.trim());
      localStorage.setItem('jarmal_test_phone', `+967${form.phone}`);

      onSuccess(session, role);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'حدث خطأ، حاول مرة أخرى'
      );
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setBusy(true);

    try {
      if (form.phone.length !== 9) {
        throw new Error('أدخل رقم الهاتف المكون من 9 أرقام');
      }

      if (form.otp !== TEST_OTP) {
        throw new Error('رمز التحقق غير صحيح. استخدم: 123456');
      }

      const session = await createTestSession();

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, phone_number')
        .eq('phone_number', `+967${form.phone}`)
        .maybeSingle();

      const savedRole = profile?.role as Role | undefined;

      if (!savedRole) {
        const localRole = localStorage.getItem(
          'jarmal_test_role'
        ) as Role | null;

        if (!localRole) {
          throw new Error(
            'لم يتم العثور على حساب بهذا الرقم. اختر "حساب جديد" أولاً.'
          );
        }

        localStorage.setItem(
          'jarmal_test_phone',
          `+967${form.phone}`
        );

        onSuccess(session, localRole);
        return;
      }

      localStorage.setItem('jarmal_test_role', savedRole);
      localStorage.setItem(
        'jarmal_test_name',
        profile?.full_name || ''
      );
      localStorage.setItem(
        'jarmal_test_phone',
        profile?.phone_number || `+967${form.phone}`
      );

      onSuccess(session, savedRole);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'حدث خطأ أثناء تسجيل الدخول'
      );
    } finally {
      setBusy(false);
    }
  };

  const roleTitle =
    role === 'customer'
      ? 'حساب العميل'
      : role === 'driver'
        ? 'حساب المندوب'
        : role === 'merchant'
          ? 'حساب التاجر'
          : 'لوحة الإدارة';

  const isAdmin = role === 'admin';

  return (
    <main className="min-h-screen bg-black px-5 py-7 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white"
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

          {!isAdmin && (
            <div className="mb-7 flex rounded-xl bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setStep(1);
                  setError('');
                  setOtpVerified(false);
                  setOtpSent(false);
                }}
                className={`flex-1 rounded-lg py-3 text-sm font-bold ${
                  mode === 'signup'
                    ? 'bg-[#e3fe00] text-black'
                    : 'text-white/40'
                }`}
              >
                حساب جديد
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setStep(1);
                  setError('');
                  setOtpVerified(false);
                  setOtpSent(false);
                }}
                className={`flex-1 rounded-lg py-3 text-sm font-bold ${
                  mode === 'login'
                    ? 'bg-[#e3fe00] text-black'
                    : 'text-white/40'
                }`}
              >
                لدي حساب
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="mb-7 rounded-xl border border-[#e3fe00]/20 bg-[#e3fe00]/5 px-4 py-3 text-center text-sm text-white/60">
              دخول مدير النظام — الصلاحية مطلوبة
            </div>
          )}

          {mode === 'login' && !isAdmin && (
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
                onClick={() => update('phone', TEST_PHONE)}
                className="text-xs font-bold text-[#e3fe00] underline underline-offset-2"
              >
                استخدام الرقم التجريبي ({TEST_PHONE})
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

              <div className="rounded-xl border border-[#e3fe00]/20 bg-[#e3fe00]/5 px-4 py-3 text-center text-xs text-[#e3fe00]">
                رمز الاختبار: <strong>123456</strong>
              </div>

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

          {mode === 'login' && isAdmin && (
            <form onSubmit={submitLogin} className="space-y-4">
              <PhoneField
                value={form.phone}
                onChange={(value) => update('phone', value)}
              />

              <button
                type="button"
                onClick={() => update('phone', TEST_PHONE)}
                className="text-xs font-bold text-[#e3fe00] underline underline-offset-2"
              >
                استخدام الرقم التجريبي ({TEST_PHONE})
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
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black disabled:opacity-50"
              >
                {busy ? 'جارٍ الدخول...' : 'دخول الإدارة'}
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

              <button
                type="button"
                onClick={() => update('phone', TEST_PHONE)}
                className="text-xs font-bold text-[#e3fe00] underline underline-offset-2"
              >
                استخدام الرقم التجريبي ({TEST_PHONE})
              </button>

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
                    ? `تم إرسال رمز التحقق تجريبياً إلى +967 ${form.phone}`
                    : `أدخل رمز التحقق إلى +967 ${form.phone}`}
                </p>
              </div>

              <div className="rounded-xl border border-[#e3fe00]/30 bg-[#e3fe00]/10 px-4 py-4 text-center">
                <p className="text-xs text-white/50">
                  رمز SMS التجريبي
                </p>

                <p className="mt-1 text-2xl font-black tracking-[.3em] text-[#e3fe00]">
                  123456
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
                  onClick={verifyTestOtp}
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
                  <h2 className="text-xl font-black">
                    كود المندوب
                  </h2>

                  <p className="mt-1 text-sm text-white/40">
                    أدخل الكود الذي أصدره لك مدير جَرْمَل
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    كود المندوب
                  </label>

                  <input
                    required
                    value={form.accessCode}
                    onChange={(e) =>
                      update(
                        'accessCode',
                        e.target.value.toUpperCase()
                      )
                    }
                    placeholder="مثال: JARMAL-101"
                    className="w-full rounded-xl border border-[#e3fe00]/40 bg-black px-4 py-3.5 text-left font-bold tracking-widest text-[#e3fe00] outline-none placeholder:text-white/20 focus:border-[#e3fe00]"
                  />

                  <p className="mt-2 text-xs text-white/35">
                    الكود يجب أن يكون صادرًا من الإدارة.
                  </p>
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
                    disabled={busy || !form.accessCode.trim()}
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
  title
}: {
  role: Role;
  onLogout: () => void;
  title: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 px-5 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="rounded-lg p-2 text-white/60 lg:hidden">
            <Menu size={22} />
          </button>

          <Logo />

          <span className="hidden h-5 w-px bg-white/20 sm:block" />

          <span className="hidden text-sm text-white/45 sm:block">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative rounded-xl p-2 text-white/60">
            <Bell size={19} />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#e3fe00]" />
          </button>

          <div className="hidden items-center gap-2 text-sm font-bold sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3fe00] text-black">
              <UserRound size={17} />
            </div>

            <span>
              {role === 'customer'
                ? 'أهلاً بك'
                : role === 'driver'
                  ? 'مندوب جَرْمَل'
                  : 'متجرك'}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="rounded-xl p-2 text-white/40 hover:text-red-400"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

function SideNav({
  role,
  active,
  onActive
}: {
  role: Role;
  active: string;
  onActive: (value: string) => void;
}) {
  const items: [string, string, React.ElementType][] =
    role === 'customer'
      ? [
          ['home', 'الرئيسية', Home],
          ['orders', 'طلباتي', ClipboardList],
          ['services', 'الخدمات', Zap],
          ['wallet', 'محفظتي', WalletCards],
          ['map', 'تتبع الطلب', Navigation],
          ['profile', 'حسابي', UserRound]
        ]
      : role === 'driver'
        ? [
            ['available', 'الطلبات القريبة', Navigation],
            ['active', 'الطلب الحالي', Truck],
            ['history', 'سجل التوصيلات', ClipboardList],
            ['wallet', 'محفظتي', WalletCards]
          ]
        : [
            ['dashboard', 'نظرة عامة', BarChart3],
            ['incoming', 'الطلبات الواردة', ClipboardList],
            ['products', 'إدارة المنتجات', ShoppingBag],
            ['wallet', 'محفظتي', WalletCards],
            ['settings', 'إعدادات المتجر', Settings2]
          ];

  return (
    <aside className="hidden w-60 shrink-0 border-l border-white/10 bg-[#080808] p-4 lg:block">
      <p className="mb-5 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/25">
        القائمة الرئيسية
      </p>

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

            {id === 'incoming' && (
              <span className="mr-auto rounded-full bg-[#e3fe00] px-2 py-0.5 text-[10px] text-black">
                3
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function MapCard({ driver = false }: { driver?: boolean }) {
  return (
    <div className="map-grid relative h-[360px] overflow-hidden rounded-3xl border border-white/10">
      <div className="absolute right-[24%] top-[23%] h-3 w-3 rounded-full bg-[#e3fe00] shadow-[0_0_0_8px_rgba(227,254,0,.15)]" />

      <div className="absolute bottom-[22%] left-[24%] h-3 w-3 rounded-full bg-white shadow-[0_0_0_8px_rgba(255,255,255,.12)]" />

      <div className="absolute left-1/3 top-1/3 h-48 w-48 rounded-full border-2 border-dashed border-[#e3fe00]/50" />

      <div className="absolute right-5 top-5 rounded-xl border border-white/10 bg-black/75 px-3 py-2 text-xs text-white/50">
        <MapPin
          size={14}
          className="ml-1 inline text-[#e3fe00]"
        />
        {driver ? 'المسار الأقصر' : 'تتبع مباشر'}
      </div>

      <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/85 p-4 backdrop-blur">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e3fe00] text-black">
          {driver ? (
            <Navigation size={19} />
          ) : (
            <Bike size={19} />
          )}
        </div>

        <div>
          <p className="font-bold">
            {driver
              ? 'المسار إلى المتجر ثم العميل'
              : 'المندوب في طريقه إليك'}
          </p>

          <p className="text-xs text-white/40">
            {driver
              ? 'افتح المسار في خرائط Google'
              : 'متبقي تقريباً 12 دقيقة'}
          </p>
        </div>

        <button
          onClick={() =>
            window.open(
              'https://www.google.com/maps',
              '_blank',
              'noopener,noreferrer'
            )
          }
          className="mr-auto rounded-lg bg-[#e3fe00] px-3 py-2 text-xs font-black text-black"
        >
          خرائط Google
        </button>
      </div>
    </div>
  );
}

function Wallet({
  role
}: {
  role: 'driver' | 'merchant';
}) {
  const [show, setShow] = useState(false);
  const [channel, setChannel] = useState(paymentChannels[0]);

  return (
    <section>
      <p className="text-sm text-white/40">
        أموالك بين يديك
      </p>

      <h1 className="mt-1 text-3xl font-black">
        محفظتي
      </h1>

      <div className="mt-7 rounded-3xl bg-[#e3fe00] p-7 text-black">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-black/60">
            الرصيد المتاح
          </span>

          <WalletCards size={23} />
        </div>

        <p className="mt-6 text-4xl font-black">
          {role === 'driver' ? '18,450' : '42,780'}
          <span className="text-lg"> {CURRENCY}</span>
        </p>

        <button
          onClick={() => setShow(true)}
          className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-black text-white"
        >
          سحب الأرباح
          <ArrowLeft
            className="mr-2 inline"
            size={16}
          />
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
          <p className="text-xs text-white/40">
            إجمالي الأرباح
          </p>

          <p className="mt-3 text-xl font-black">
            {role === 'driver'
              ? '86,500'
              : '210,300'}{' '}
            {CURRENCY}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
          <p className="text-xs text-white/40">
            عمولات هذا الشهر
          </p>

          <p className="mt-3 text-xl font-black text-[#e3fe00]">
            +12,400 {CURRENCY}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
          <p className="text-xs text-white/40">
            آخر سحب
          </p>

          <p className="mt-3 text-xl font-black">
            15,000 {CURRENCY}
          </p>
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-5 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">
                سحب الأرباح
              </h2>

              <button onClick={() => setShow(false)}>
                <X
                  size={20}
                  className="text-white/40"
                />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <Field
                label="المبلغ"
                value=""
                onChange={() => undefined}
                placeholder={`مثال: 10000 ${CURRENCY}`}
                icon={<WalletCards size={17} />}
              />

              <div>
                <label className="mb-2 block text-sm font-bold">
                  قناة السحب
                </label>

                <select
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none focus:border-[#e3fe00]"
                >
                  {paymentChannels.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <Field
                label={
                  channel === 'حوالة محلية'
                    ? 'اسم المستلم / الوكيل'
                    : 'رقم الحساب أو الهاتف'
                }
                value=""
                onChange={() => undefined}
                placeholder="أدخل البيانات"
                icon={<Phone size={17} />}
              />

              <button
                onClick={() => setShow(false)}
                className="w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black"
              >
                إرسال طلب السحب
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CustomerApp({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState('home');
  const [storeCategory, setStoreCategory] = useState<string>('الكل');
  const [storesReal, setStoresReal] = useState<StoreRow[]>([]);
  const [productsReal, setProductsReal] = useState<ProductRow[]>([]);
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

  const loadAll = () => {
    supabase.from('stores').select('id, name, store_type, address_description, is_open, rating').then(({ data }) => { if (data) setStoresReal(data as StoreRow[]); });
    supabase.from('products').select('id, store_id, name, description, price, is_available, category_id, redemption_points_cost').then(({ data }) => { if (data) setProductsReal(data as ProductRow[]); });
    supabase.from('product_categories').select('id, store_id, name, sort_order').then(({ data }) => { if (data) setCategoriesReal(data as CategoryRow[]); });
    supabase.from('product_variants').select('id, product_id, variant_name, price, is_available').then(({ data }) => { if (data) setVariantsReal(data as VariantRow[]); });
    supabase.from('favorites').select('product_id').then(({ data }) => { if (data) setFavorites(data.map((f: any) => f.product_id)); });
    supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, order_type, fulfillment_type, points_earned').order('created_at', { ascending: false }).then(({ data }) => { if (data) setOrdersReal(data as OrderRow[]); });
    supabase.from('client_wallets').select('balance, points').maybeSingle().then(({ data }) => { if (data) setWallet(data as ClientWalletRow); });
    supabase.from('service_providers').select('id, service_type, name, account_number_length, region').eq('is_active', true).then(({ data }) => { if (data) setProviders(data as ServiceProviderRow[]); });
    supabase.from('service_packages').select('id, provider_id, name, face_value, price').eq('is_active', true).then(({ data }) => { if (data) setPackages(data as ServicePackageRow[]); });
    supabase.from('payment_methods').select('id, name, code, account_number, instructions').eq('is_active', true).then(({ data }) => { if (data) setPaymentMethods(data as PaymentMethodRow[]); });
  };

  useEffect(() => { loadAll(); }, []);

  const toggleFavorite = async (productId: string) => {
    await supabase.rpc('toggle_favorite', { p_product_id: productId });
    const { data } = await supabase.from('favorites').select('product_id');
    if (data) setFavorites(data.map((f: any) => f.product_id));
  };

  const addToCart = (storeId: string, line: Omit<CartLine, 'key' | 'quantity'>) => {
    setCart((current) => {
      const base = cartStoreId && cartStoreId !== storeId ? [] : current;
      const key = line.variant_id || line.product_id || line.custom_name || Math.random().toString();
      const found = base.find((c) => c.key === key);
      return found ? base.map((c) => (c.key === key ? { ...c, quantity: c.quantity + 1 } : c)) : [...base, { ...line, key, quantity: 1 }];
    });
    setCartStoreId(storeId);
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return (
    <div className="min-h-screen bg-black text-white">
      <Topbar role="customer" title="مساحة العميل" onLogout={onLogout} />
      <div className="mx-auto flex max-w-7xl">
        <SideNav role="customer" active={active} onActive={setActive} />
        <main className="min-w-0 flex-1 p-5 sm:p-8">
          {active === 'home' && !selectedStore && (
            <>
              <div className="rounded-3xl bg-[#e3fe00] p-7 text-black sm:p-10">
                <Pill dark>مرحباً بك في جَرْمَل</Pill>
                <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">نقوم بتوصيل طلبكم<br />بكل حماس وفاعلية.</h1>
              </div>
              <section className="mt-10">
                <h2 className="text-2xl font-black">متاجرنا</h2>
                <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">
                  <button onClick={() => setStoreCategory('الكل')} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${storeCategory === 'الكل' ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/55'}`}>الكل</button>
                  {Array.from(new Set(storesReal.map((s) => s.store_type))).map((type) => (
                    <button key={type} onClick={() => setStoreCategory(type)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${storeCategory === type ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/55'}`}>{type}</button>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {storesReal.filter((s) => storeCategory === 'الكل' || s.store_type === storeCategory).map((store) => (
                    <button key={store.id} disabled={!store.is_open} onClick={() => setSelectedStore(store)} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] text-right transition hover:-translate-y-1 hover:border-[#e3fe00]/50 disabled:cursor-not-allowed disabled:opacity-60">
                      <div className="flex h-28 items-center justify-center bg-white/[.03]"><Store size={40} className="text-[#e3fe00]" /></div>
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div><h3 className="font-black">{store.name}</h3><p className="mt-1 text-xs text-white/40">{store.address_description}</p></div>
                          <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${store.is_open ? 'bg-[#e3fe00]/10 text-[#e3fe00]' : 'bg-white/10 text-white/50'}`}>{store.is_open ? 'مفتوح' : 'مغلق'}</span>
                        </div>
                        <div className="mt-4 text-xs text-white/35">★ {store.rating ?? '—'} • {store.store_type}</div>
                      </div>
                    </button>
                  ))}
                  {storesReal.length === 0 && <p className="text-sm text-white/40">لا توجد متاجر حالياً</p>}
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
          {active === 'orders' && <Orders orders={ordersReal} onRefresh={loadAll} />}
          {active === 'services' && <ServicesView providers={providers} packages={packages} onRefresh={loadAll} />}
          {active === 'wallet' && <ClientWalletView wallet={wallet} paymentMethods={paymentMethods} onRefresh={loadAll} />}
          {active === 'map' && (<div><h2 className="mb-5 text-2xl font-black">تتبع الطلب</h2><MapCard /></div>)}
          {active === 'profile' && (
            <div className="mx-auto max-w-md space-y-4">
              <h2 className="text-2xl font-black">حسابي</h2>
              <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-sm text-white/40">الاسم</p><p className="mt-1 font-bold">{localStorage.getItem('jarmal_test_name') || '—'}</p></div>
              <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-sm text-white/40">رقم الهاتف</p><p className="mt-1 font-bold" dir="ltr">{localStorage.getItem('jarmal_test_phone') || '—'}</p></div>
              <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-4 font-black text-red-300 hover:bg-red-500/20"><LogOut size={18} />تسجيل الخروج</button>
            </div>
          )}
        </main>
      </div>
      {cart.length > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#e3fe00] px-6 py-4 font-black text-black shadow-2xl">
          <ShoppingBag size={18} />عرض السلة ({cart.reduce((n, c) => n + c.quantity, 0)})<span className="mr-2">{cartTotal.toLocaleString('ar-YE')} {CURRENCY}</span>
        </button>
      )}
      {showCart && cartStoreId && (
        <Cart cart={cart} setCart={setCart} total={cartTotal} storeId={cartStoreId} onClose={() => setShowCart(false)} onOrdered={() => { setCart([]); setCartStoreId(null); setShowCart(false); setActive('orders'); loadAll(); }} />
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
      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white"><ArrowRight size={16} />رجوع للمتاجر</button>
      <div className="flex h-32 items-center justify-center rounded-3xl bg-white/[.03]"><Store size={48} className="text-[#e3fe00]" /></div>
      <h2 className="mt-5 text-2xl font-black">{store.name}</h2>
      <p className="mt-1 text-sm text-white/40">{store.address_description}</p>
      {categories.length > 0 && (
        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-2">
          <button onClick={() => setActiveCategory('all')} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${activeCategory === 'all' ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/55'}`}>الكل</button>
          {categories.map((c) => (<button key={c.id} onClick={() => setActiveCategory(c.id)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${activeCategory === c.id ? 'bg-[#e3fe00] text-black' : 'bg-white/[.05] text-white/55'}`}>{c.name}</button>))}
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {shown.filter((p) => p.is_available).map((product) => {
          const productVariants = variants.filter((v) => v.product_id === product.id && v.is_available);
          const isFav = favorites.includes(product.id);
          return (
            <div key={product.id} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-bold">{product.name}</p><p className="mt-1 text-xs text-white/40">{product.description}</p></div>
                <button onClick={() => onToggleFavorite(product.id)} className={isFav ? 'text-[#e3fe00]' : 'text-white/25'}><Sparkles size={18} /></button>
              </div>
              {productVariants.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {productVariants.map((v) => (
                    <button key={v.id} onClick={() => onAdd({ product_id: product.id, variant_id: v.id, name: `${product.name} - ${v.variant_name}`, price: v.price })} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/70 hover:border-[#e3fe00]">
                      {v.variant_name} • {v.price.toLocaleString('ar-YE')} {CURRENCY}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-black text-[#e3fe00]">{product.price.toLocaleString('ar-YE')} {CURRENCY}</span>
                  <button onClick={() => onAdd({ product_id: product.id, name: product.name, price: product.price })} className="rounded-xl bg-[#e3fe00] px-4 py-2 text-sm font-black text-black hover:bg-white">إضافة</button>
                </div>
              )}
            </div>
          );
        })}
        {shown.length === 0 && <p className="text-sm text-white/40">لا توجد منتجات في هذا القسم</p>}
      </div>
      <div className="mt-8 rounded-2xl border border-dashed border-white/15 p-4">
        {!showCustom ? (
          <button onClick={() => setShowCustom(true)} className="text-sm font-bold text-[#e3fe00]">+ طلب منتج غير موجود بالقائمة</button>
        ) : (
          <div className="space-y-3">
            <Field label="اسم المنتج" value={customName} onChange={setCustomName} placeholder="مثال: كيلو تفاح أحمر" />
            <Field label="السعر التقديري" value={customPrice} onChange={(v) => setCustomPrice(v.replace(/\D/g, ''))} placeholder="مثال: 2000" />
            <button disabled={!customName.trim() || !customPrice} onClick={() => { onAdd({ custom_name: customName.trim(), custom_price: Number(customPrice), name: customName.trim(), price: Number(customPrice) }); setShowCustom(false); setCustomName(''); setCustomPrice(''); }} className="w-full rounded-xl bg-[#e3fe00] py-3 font-black text-black disabled:opacity-40">إضافة للسلة</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Cart({ cart, setCart, total, storeId, onClose, onOrdered }: {
  cart: CartLine[]; setCart: React.Dispatch<React.SetStateAction<CartLine[]>>; total: number; storeId: string;
  onClose: () => void; onOrdered: () => void;
}) {
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deliveryFee = fulfillment === 'delivery' ? 500 : 0;

  const confirmOrder = async () => {
    setError(''); setBusy(true);
    try {
      if (fulfillment === 'delivery' && !address.trim()) throw new Error('أدخل عنوان التوصيل');
      const items = cart.map((c) => c.custom_name ? { custom_name: c.custom_name, custom_price: c.custom_price, quantity: c.quantity } : { product_id: c.product_id, ...(c.variant_id ? { variant_id: c.variant_id } : {}), quantity: c.quantity });
      const { error: rpcError } = await supabase.rpc('create_cash_order', {
        p_store_id: storeId, p_items: items, p_delivery_fee: deliveryFee,
        p_delivery_address: fulfillment === 'delivery' ? address.trim() : null,
        p_delivery_latitude: null, p_delivery_longitude: null,
        p_fulfillment_type: fulfillment, p_notes: notes.trim() || null
      });
      if (rpcError) throw rpcError;
      onOrdered();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر إتمام الطلب');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-black">سلة الطلبات</h3><button onClick={onClose}><X size={20} className="text-white/50" /></button></div>
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <div><p className="font-bold">{item.name}</p><p className="text-xs text-white/40">{item.price.toLocaleString('ar-YE')} {CURRENCY} × {item.quantity}</p></div>
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
        {fulfillment === 'delivery' && <div className="mt-3"><Field label="عنوان التوصيل" value={address} onChange={setAddress} placeholder="الحي، الشارع، أقرب معلم" /></div>}
        <div className="mt-3"><Field label="ملاحظات (اختياري)" value={notes} onChange={setNotes} placeholder="مثال: بدون بصل" /></div>
        {error && <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-lg font-black"><span>الإجمالي</span><span>{(total + deliveryFee).toLocaleString('ar-YE')} {CURRENCY}</span></div>
        <button disabled={busy || cart.length === 0} onClick={confirmOrder} className="mt-2 w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50">{busy ? 'جارٍ الإرسال...' : 'تأكيد الطلب (دفع نقدي)'}</button>
      </div>
    </div>
  );
}

function Orders({ orders, onRefresh }: { orders: OrderRow[]; onRefresh: () => void }) {
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

  const reorder = async (orderId: string) => {
    await supabase.rpc('get_reorder_items', { p_order_id: orderId });
    onRefresh();
  };

  if (orders.length === 0) {
    return (<div className="flex flex-col items-center justify-center py-24 text-center"><ClipboardList size={40} className="text-white/20" /><p className="mt-4 text-white/40">لا توجد طلبات حتى الآن</p></div>);
  }

  return (
    <div>
      <h2 className="mb-5 text-2xl font-black">طلباتي</h2>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
            <div className="flex items-center justify-between">
              <span className="font-black">{order.total_amount.toLocaleString('ar-YE')} {CURRENCY}</span>
              <span className="rounded-lg bg-[#e3fe00]/10 px-3 py-1 text-xs font-black text-[#e3fe00]">{statusLabels[order.status] || order.status}</span>
            </div>
            <p className="mt-2 text-xs text-white/40">{new Date(order.created_at).toLocaleString('ar-YE')} • {order.fulfillment_type === 'pickup' ? 'استلام بنفسك' : 'توصيل'}</p>
            {order.status === 'delivered' && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => setRatingFor(order.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/60 hover:border-[#e3fe00]">قيّم الطلب</button>
                <button onClick={() => reorder(order.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/60 hover:border-[#e3fe00]">إعادة الطلب</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {ratingFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-5 backdrop-blur">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">تقييم الطلب</h2><button onClick={() => setRatingFor(null)}><X size={20} className="text-white/40" /></button></div>
            <div className="mt-5 space-y-4">
              <div><p className="mb-2 text-sm font-bold">تقييم المندوب</p><div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => (<button key={n} onClick={() => setDriverRating(n)} className={n <= driverRating ? 'text-[#e3fe00]' : 'text-white/20'}>★</button>))}</div></div>
              <div><p className="mb-2 text-sm font-bold">تقييم المتجر</p><div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => (<button key={n} onClick={() => setMerchantRating(n)} className={n <= merchantRating ? 'text-[#e3fe00]' : 'text-white/20'}>★</button>))}</div></div>
              <Field label="تعليق (اختياري)" value={comment} onChange={setComment} placeholder="اكتب رأيك" />
              <button disabled={busy} onClick={submitRating} className="w-full rounded-xl bg-[#e3fe00] py-3 font-black text-black">{busy ? 'جارٍ الإرسال...' : 'إرسال التقييم'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServicesView({ providers, packages, onRefresh }: { providers: ServiceProviderRow[]; packages: ServicePackageRow[]; onRefresh: () => void }) {
  const [tab, setTab] = useState<'mobile_recharge' | 'bill_payment'>('mobile_recharge');
  const [providerId, setProviderId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const providerList = providers.filter((p) => p.service_type === tab || (tab === 'bill_payment' && p.service_type !== 'mobile_recharge'));
  const providerPackages = packages.filter((p) => p.provider_id === providerId);
  const selectedProvider = providers.find((p) => p.id === providerId);

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('create_service_order', {
        p_order_type: tab, p_provider_id: providerId, p_package_id: packageId || null,
        p_amount: packageId ? null : Number(amount), p_account_number: accountNumber.trim(), p_service_fee: 100
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
              {providerPackages.map((pkg) => (<button key={pkg.id} onClick={() => setPackageId(pkg.id)} className={`rounded-xl border p-3 text-xs font-bold ${packageId === pkg.id ? 'border-[#e3fe00] bg-[#e3fe00]/10 text-[#e3fe00]' : 'border-white/10 text-white/60'}`}>{pkg.name}<br />{pkg.price.toLocaleString('ar-YE')} {CURRENCY}</button>))}
            </div>
          )}
          {!packageId && <Field label="المبلغ" value={amount} onChange={(v) => setAmount(v.replace(/\D/g, ''))} placeholder="أدخل المبلغ" />}
          <Field label={`رقم الحساب${selectedProvider?.account_number_length ? ` (${selectedProvider.account_number_length} أرقام)` : ''}`} value={accountNumber} onChange={(v) => setAccountNumber(v.replace(/\D/g, ''))} placeholder="رقم الهاتف / رقم المشترك" />
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
          <button disabled={busy || !accountNumber || (!packageId && !amount)} onClick={submit} className="w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black disabled:opacity-40">{busy ? 'جارٍ الإرسال...' : 'تأكيد الطلب'}</button>
        </div>
      )}
    </div>
  );
}

function ClientWalletView({ wallet, paymentMethods, onRefresh }: { wallet: ClientWalletRow; paymentMethods: PaymentMethodRow[]; onRefresh: () => void }) {
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState('');
  const [methodCode, setMethodCode] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('request_wallet_topup', { p_amount: Number(amount), p_payment_method_code: methodCode, p_reference_number: reference.trim() || null });
      if (rpcError) throw rpcError;
      setShow(false); setAmount(''); setReference(''); onRefresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'تعذر إرسال طلب الشحن'); }
    finally { setBusy(false); }
  };

  return (
    <section>
      <h1 className="text-3xl font-black">محفظتي</h1>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-[#e3fe00] p-7 text-black">
          <span className="text-sm font-bold text-black/60">الرصيد المتاح</span>
          <p className="mt-4 text-4xl font-black">{wallet.balance.toLocaleString('ar-YE')} <span className="text-lg">{CURRENCY}</span></p>
          <button onClick={() => setShow(true)} className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-black text-white">شحن المحفظة</button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-7">
          <span className="text-sm font-bold text-white/50">نقاطك</span>
          <p className="mt-4 text-4xl font-black text-[#e3fe00]">{wallet.points}</p>
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
                  {paymentMethods.map((m) => (<option key={m.id} value={m.code}>{m.name}</option>))}
                </select>
              </div>
              {paymentMethods.find((m) => m.code === methodCode)?.instructions && <p className="text-xs text-white/40">{paymentMethods.find((m) => m.code === methodCode)?.instructions}</p>}
              <Field label="رقم مرجع التحويل" value={reference} onChange={setReference} placeholder="رقم العملية / إثبات التحويل" />
              {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
              <button disabled={busy || !amount || !methodCode} onClick={submit} className="w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black disabled:opacity-50">{busy ? 'جارٍ الإرسال...' : 'إرسال طلب الشحن'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function DriverApp({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState('available');
  const [profile, setProfile] = useState<DriverProfileRow | null>(null);
  const [wallet, setWallet] = useState<{ balance: number }>({ balance: 0 });
  const [available, setAvailable] = useState<FullOrderRow[]>([]);
  const [activeOrder, setActiveOrder] = useState<FullOrderRow | null>(null);
  const [history, setHistory] = useState<FullOrderRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadAll = () => {
    supabase.from('driver_profiles').select('is_available, vehicle_type, vehicle_plate_number, rating').maybeSingle().then(({ data }) => { if (data) setProfile(data as DriverProfileRow); });
    supabase.from('driver_wallets').select('balance').maybeSingle().then(({ data }) => { if (data) setWallet(data as { balance: number }); });
    supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, notes, courier_distance, fulfillment_type, payment_status').eq('status', 'ready_for_pickup').is('driver_id', null).then(({ data }) => { if (data) setAvailable(data as FullOrderRow[]); });
    supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, notes, courier_distance, fulfillment_type, payment_status').not('status', 'in', '(delivered,cancelled,pending)').then(({ data }) => {
      const mine = (data as FullOrderRow[] | null)?.find((o) => o.driver_id) || null;
      setActiveOrder(mine);
    });
    supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, notes, courier_distance, fulfillment_type, payment_status').eq('status', 'delivered').order('created_at', { ascending: false }).then(({ data }) => { if (data) setHistory(data as FullOrderRow[]); });
  };

  useEffect(() => { loadAll(); }, []);

  const toggleAvailability = async () => {
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
    await supabase.rpc('driver_update_order_status', { p_order_id: orderId, p_status: target });
    setBusy(false);
    loadAll();
  };

  const confirmCash = async (orderId: string) => {
    setBusy(true);
    await supabase.rpc('confirm_cash_collected', { p_order_id: orderId });
    setBusy(false);
    loadAll();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Topbar role="driver" title="مساحة المندوب" onLogout={onLogout} />
      <div className="mx-auto flex max-w-7xl">
        <SideNav role="driver" active={active} onActive={setActive} />
        <main className="min-w-0 flex-1 p-5 sm:p-8">
          {active === 'available' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-black">الطلبات القريبة</h2>
                <button onClick={toggleAvailability} className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-black ${profile?.is_available ? 'bg-[#e3fe00] text-black' : 'bg-white/10 text-white/50'}`}>
                  <span className={`h-3 w-3 rounded-full ${profile?.is_available ? 'bg-black' : 'bg-white/30'}`} />
                  {profile?.is_available ? 'متصل الآن' : 'غير متصل'}
                </button>
              </div>
              {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
              <div className="mt-7 space-y-3">
                {available.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-black">{order.total_amount.toLocaleString('ar-YE')} {CURRENCY}</span>
                      <span className="text-xs text-white/40">{order.courier_distance ? `${order.courier_distance} كم` : ''}</span>
                    </div>
                    <p className="mt-2 text-xs text-white/40">{order.fulfillment_type === 'pickup' ? 'استلام من المتجر فقط' : order.delivery_address}</p>
                    <button disabled={busy} onClick={() => acceptOrder(order.id)} className="mt-4 w-full rounded-xl bg-[#e3fe00] py-3 font-black text-black hover:bg-white disabled:opacity-50">قبول الطلب</button>
                  </div>
                ))}
                {available.length === 0 && <p className="text-sm text-white/40">لا توجد طلبات جاهزة للاستلام حالياً</p>}
              </div>
            </div>
          )}

          {active === 'active' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">الطلب الحالي</h2>
              {activeOrder ? (
                <>
                  <MapCard driver />
                  <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-black">{activeOrder.total_amount.toLocaleString('ar-YE')} {CURRENCY}</span>
                      <span className="rounded-lg bg-[#e3fe00]/10 px-3 py-1 text-xs font-black text-[#e3fe00]">{statusLabels[activeOrder.status] || activeOrder.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/50">{activeOrder.delivery_address}</p>
                    <div className="mt-5 flex gap-3">
                      {nextStatus(activeOrder.status) && (
                        <button disabled={busy} onClick={() => advance(activeOrder.id, activeOrder.status)} className="flex-1 rounded-xl bg-[#e3fe00] py-3 font-black text-black disabled:opacity-50">
                          {activeOrder.status === 'picked_up' ? 'بدء التوصيل' : 'تم التسليم'}
                        </button>
                      )}
                      {activeOrder.payment_status !== 'paid' && (
                        <button disabled={busy} onClick={() => confirmCash(activeOrder.id)} className="flex-1 rounded-xl border border-[#e3fe00]/40 py-3 font-black text-[#e3fe00] disabled:opacity-50">تأكيد استلام النقد</button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/40">لا يوجد طلب نشط حالياً</p>
              )}
            </div>
          )}

          {active === 'history' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">سجل التوصيلات</h2>
              <div className="space-y-3">
                {history.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{order.total_amount.toLocaleString('ar-YE')} {CURRENCY}</span>
                      <span className="text-xs text-white/40">{new Date(order.created_at).toLocaleDateString('ar-YE')}</span>
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-sm text-white/40">لا يوجد سجل توصيلات بعد</p>}
              </div>
            </div>
          )}

          {active === 'wallet' && (
            <section>
              <p className="text-sm text-white/40">أموالك بين يديك</p>
              <h1 className="mt-1 text-3xl font-black">محفظتي</h1>
              <div className="mt-7 rounded-3xl bg-[#e3fe00] p-7 text-black">
                <span className="text-sm font-bold text-black/60">الرصيد المتاح</span>
                <p className="mt-6 text-4xl font-black">{wallet.balance.toLocaleString('ar-YE')} <span className="text-lg">{CURRENCY}</span></p>
              </div>
              {profile && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-xs text-white/40">التقييم</p><p className="mt-2 text-xl font-black text-[#e3fe00]">★ {profile.rating ?? '—'}</p></div>
                  <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-xs text-white/40">المركبة</p><p className="mt-2 text-sm font-bold">{profile.vehicle_type || '—'} • {profile.vehicle_plate_number || '—'}</p></div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function MerchantApp({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState('dashboard');
  const [store, setStore] = useState<MyStoreRow | null>(null);
  const [incoming, setIncoming] = useState<FullOrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItemRow[]>>({});
  const [myProducts, setMyProducts] = useState<MerchantProductRow[]>([]);
  const [wallet, setWallet] = useState<{ balance: number }>({ balance: 0 });
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newImage, setNewImage] = useState('');
  const [addError, setAddError] = useState('');

  const loadAll = () => {
    supabase.from('stores').select('id, name, is_open, rating, commission_rate').maybeSingle().then(({ data }) => {
      if (data) {
        const row = data as MyStoreRow;
        setStore(row);
        supabase.from('orders').select('id, status, total_amount, delivery_fee, created_at, store_id, driver_id, delivery_address, notes, courier_distance, fulfillment_type, payment_status').eq('store_id', row.id).in('status', ['pending', 'accepted', 'preparing']).order('created_at', { ascending: false }).then(async ({ data: orders }) => {
          const list = (orders as FullOrderRow[]) || [];
          setIncoming(list);
          if (list.length > 0) {
            const { data: items } = await supabase.from('order_items').select('id, order_id, product_id, custom_name, unit_price, quantity').in('order_id', list.map((o) => o.id));
            const grouped: Record<string, OrderItemRow[]> = {};
            (items as OrderItemRow[] | null)?.forEach((item) => { grouped[item.order_id] = [...(grouped[item.order_id] || []), item]; });
            setOrderItems(grouped);
          }
        });
        supabase.from('products').select('id, store_id, name, description, price, image_url, is_available').eq('store_id', row.id).then(({ data: prods }) => { if (prods) setMyProducts(prods as MerchantProductRow[]); });
      }
    });
    supabase.from('merchant_wallets').select('balance').maybeSingle().then(({ data }) => { if (data) setWallet(data as { balance: number }); });
  };

  useEffect(() => { loadAll(); }, []);

  const toggleOpen = async () => {
    if (!store) return;
    await supabase.from('stores').update({ is_open: !store.is_open }).eq('id', store.id);
    loadAll();
  };

  const respond = async (orderId: string, accept: boolean) => {
    setBusy(true);
    await supabase.rpc('merchant_respond_to_order', { p_order_id: orderId, p_accept: accept, p_reject_reason: accept ? null : 'غير متوفر حالياً' });
    setBusy(false);
    loadAll();
  };

  const advance = async (orderId: string) => {
    setBusy(true);
    await supabase.rpc('merchant_update_order_status', { p_order_id: orderId, p_status: 'ready_for_pickup' });
    setBusy(false);
    loadAll();
  };

  const addProduct = async () => {
    if (!store) return;
    setAddError('');
    if (!newName.trim() || !newPrice) { setAddError('أدخل اسم المنتج والسعر'); return; }
    setBusy(true);
    const { error } = await supabase.from('products').insert({
      store_id: store.id, name: newName.trim(), description: newDesc.trim() || null,
      price: Number(newPrice), image_url: newImage.trim() || null, is_available: true
    });
    setBusy(false);
    if (error) { setAddError('تعذر إضافة المنتج'); return; }
    setShowAdd(false); setNewName(''); setNewDesc(''); setNewPrice(''); setNewImage('');
    loadAll();
  };

  const toggleProductAvailable = async (productId: string, current: boolean) => {
    await supabase.from('products').update({ is_available: !current }).eq('id', productId);
    loadAll();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Topbar role="merchant" title="مساحة التاجر" onLogout={onLogout} />
      <div className="mx-auto flex max-w-7xl">
        <SideNav role="merchant" active={active} onActive={setActive} />
        <main className="min-w-0 flex-1 p-5 sm:p-8">
          {active === 'dashboard' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-black">نظرة عامة</h2>
                {store && (
                  <button onClick={toggleOpen} className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-black ${store.is_open ? 'bg-[#e3fe00] text-black' : 'bg-white/10 text-white/50'}`}>
                    <span className={`h-3 w-3 rounded-full ${store.is_open ? 'bg-black' : 'bg-white/30'}`} />
                    المتجر {store.is_open ? 'مفتوح' : 'مغلق'}
                  </button>
                )}
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-xs text-white/40">طلبات قيد الانتظار</p><p className="mt-2 text-3xl font-black text-[#e3fe00]">{incoming.length}</p></div>
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-xs text-white/40">نسبة عمولة جَرْمَل</p><p className="mt-2 text-3xl font-black text-[#e3fe00]">{store?.commission_rate ? `${(store.commission_rate * 100).toFixed(0)}%` : '—'}</p></div>
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-xs text-white/40">تقييم المتجر</p><p className="mt-2 text-3xl font-black text-[#e3fe00]">★ {store?.rating ?? '—'}</p></div>
              </div>
            </div>
          )}

          {active === 'incoming' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">الطلبات الواردة</h2>
              <div className="space-y-4">
                {incoming.map((order) => {
                  const items = orderItems[order.id] || [];
                  const commission = store?.commission_rate ? order.total_amount * store.commission_rate : 0;
                  return (
                    <div key={order.id} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-black">{order.total_amount.toLocaleString('ar-YE')} {CURRENCY}</span>
                        <span className="rounded-lg bg-[#e3fe00]/10 px-3 py-1 text-xs font-black text-[#e3fe00]">{statusLabels[order.status] || order.status}</span>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-white/60">
                        {items.map((item) => (<p key={item.id}>{item.custom_name || 'منتج'} × {item.quantity}</p>))}
                      </div>
                      <p className="mt-2 text-xs text-white/35">عمولة جَرْمَل التقديرية: {commission.toLocaleString('ar-YE')} {CURRENCY}</p>
                      {order.status === 'pending' && (
                        <div className="mt-4 flex gap-2">
                          <button disabled={busy} onClick={() => respond(order.id, true)} className="flex-1 rounded-xl bg-[#e3fe00] py-3 text-sm font-black text-black disabled:opacity-50">قبول</button>
                          <button disabled={busy} onClick={() => respond(order.id, false)} className="flex-1 rounded-xl border border-red-500/40 py-3 text-sm font-black text-red-300 disabled:opacity-50">رفض</button>
                        </div>
                      )}
                      {(order.status === 'accepted' || order.status === 'preparing') && (
                        <button disabled={busy} onClick={() => advance(order.id)} className="mt-4 w-full rounded-xl border border-[#e3fe00]/40 py-3 text-sm font-black text-[#e3fe00] disabled:opacity-50">جاهز للاستلام</button>
                      )}
                    </div>
                  );
                })}
                {incoming.length === 0 && <p className="text-sm text-white/40">لا توجد طلبات واردة حالياً</p>}
              </div>
            </div>
          )}

          {active === 'products' && (
            <div>
              <div className="flex items-end justify-between">
                <h2 className="text-2xl font-black">إدارة المنتجات</h2>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-[#e3fe00] px-4 py-3 text-sm font-black text-black"><Plus size={17} />إضافة منتج</button>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {myProducts.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                        {product.image_url ? <img src={product.image_url} className="h-full w-full object-cover" /> : <ShoppingBag size={22} className="text-[#e3fe00]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold">{product.name}</h3>
                        <p className="mt-1 text-xs text-white/40">{product.price.toLocaleString('ar-YE')} {CURRENCY}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleProductAvailable(product.id, product.is_available)} className={`mt-4 w-full rounded-lg py-2 text-xs font-bold ${product.is_available ? 'bg-[#e3fe00]/10 text-[#e3fe00]' : 'bg-white/10 text-white/40'}`}>{product.is_available ? 'متوفر — اضغط للإخفاء' : 'غير متوفر — اضغط للإظهار'}</button>
                  </div>
                ))}
                {myProducts.length === 0 && <p className="text-sm text-white/40">لا توجد منتجات بعد</p>}
              </div>
              {showAdd && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-5 backdrop-blur">
                  <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-6">
                    <div className="flex items-center justify-between"><h2 className="text-xl font-black">إضافة منتج جديد</h2><button onClick={() => setShowAdd(false)}><X size={20} className="text-white/40" /></button></div>
                    <div className="mt-6 space-y-4">
                      <Field label="اسم المنتج" value={newName} onChange={setNewName} placeholder="مثال: وجبة اليوم" icon={<ShoppingBag size={17} />} />
                      <Field label="وصف المنتج" value={newDesc} onChange={setNewDesc} placeholder="اكتب وصفاً مختصراً" icon={<FileText size={17} />} />
                      <Field label="السعر" value={newPrice} onChange={(v) => setNewPrice(v.replace(/\D/g, ''))} placeholder="مثال: 2500" />
                      <Field label="رابط صورة المنتج (اختياري)" value={newImage} onChange={setNewImage} placeholder="https://..." />
                      {addError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{addError}</div>}
                      <button disabled={busy} onClick={addProduct} className="w-full rounded-xl bg-[#e3fe00] py-3.5 font-black text-black disabled:opacity-50">حفظ المنتج</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'wallet' && (
            <section>
              <p className="text-sm text-white/40">أموالك بين يديك</p>
              <h1 className="mt-1 text-3xl font-black">محفظتي</h1>
              <div className="mt-7 rounded-3xl bg-[#e3fe00] p-7 text-black">
                <span className="text-sm font-bold text-black/60">الرصيد المتاح</span>
                <p className="mt-6 text-4xl font-black">{wallet.balance.toLocaleString('ar-YE')} <span className="text-lg">{CURRENCY}</span></p>
              </div>
            </section>
          )}

          {active === 'settings' && store && (
            <div className="max-w-md space-y-4">
              <h2 className="text-2xl font-black">إعدادات المتجر</h2>
              <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                <p className="text-sm text-white/40">اسم المتجر</p>
                <p className="mt-1 font-bold">{store.name}</p>
              </div>
              <button onClick={toggleOpen} className={`w-full rounded-xl py-4 font-black ${store.is_open ? 'bg-[#e3fe00] text-black' : 'bg-white/10 text-white/50'}`}>{store.is_open ? 'إغلاق المتجر مؤقتاً' : 'فتح المتجر'}</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [role, setRole] = useState<Role>('customer');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem(
      'jarmal_test_role'
    ) as Role | null;

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && savedRole) {
        setSession(data.session);

        if (savedRole === 'admin') {
          setScreen('admin');
        } else {
          setRole(savedRole);
          setScreen('app');
        }
      }
    });
  }, []);

  const handleLogout = () => {
    void supabase.auth.signOut();
    localStorage.removeItem('jarmal_test_role');
    localStorage.removeItem('jarmal_test_name');
    localStorage.removeItem('jarmal_test_phone');
    setSession(null);
    setScreen('welcome');
  };

  if (screen === 'admin' && session) {
    return <AdminApp session={session} onLogout={handleLogout} />;
  }

  if (screen === 'app') {
    if (role === 'driver') {
      return <DriverApp onLogout={handleLogout} />;
    }

    if (role === 'merchant') {
      return <MerchantApp onLogout={handleLogout} />;
    }

    return <CustomerApp onLogout={handleLogout} />;
  }

  if (screen === 'auth') {
    return (
      <Auth
        role={role}
        onBack={() => setScreen('welcome')}
        onSuccess={(newSession, resolvedRole) => {
          setSession(newSession);

          if (resolvedRole === 'admin') {
            setScreen('admin');
          } else {
            setRole(resolvedRole);
            setScreen('app');
          }
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
