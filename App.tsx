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

/*
 * ============================================================
 * جَرْمَل - وضع تسجيل تجريبي
 * ============================================================
 *
 * رمز التحقق التجريبي:
 * 123456
 *
 * هذا مؤقت للاختبار فقط.
 * لاحقاً سيتم استبداله بتوثيق SMS الحقيقي.
 */
const TEST_OTP = '123456';

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

  /*
   * الوضع التجريبي:
   * لا يتم إرسال SMS حقيقي.
   * الرمز الصحيح للاختبار هو 123456.
   */
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

  /*
   * إنشاء جلسة Supabase تجريبية حقيقية.
   *
   * نستخدم Anonymous Auth في وضع الاختبار حتى نستطيع
   * اختبار التطبيق بدون SMS مدفوع.
   *
   * لاحقاً سيتم استبدال هذا الجزء بـ:
   * signInWithOtp + verifyOtp
   * عند ربط رسائل اللوتس.
   */
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

        /*
         * التحقق من بنية جدول driver_access_codes الحالية.
         *
         * الجدول الحالي يحتوي على is_used و assigned_to_phone،
         * لذلك لا نستخدم is_active / used_by القديمة.
         */
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

      /*
       * حفظ بيانات الحساب في profiles.
       *
       * لا نرسل email أو password أو national_id
       * لأن التسجيل الجديد يعتمد على الهاتف.
       */
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

      /*
       * في حالة عدم وجود RLS مناسب حالياً لا نمنع تجربة
       * الدخول للتطبيق، لكن نحاول دائماً حفظ البيانات.
       */
      if (profileError) {
        console.warn('تعذر حفظ profile:', profileError);
      }

      /*
       * إذا كان المستخدم مندوباً، نعلّم كود المندوب بأنه مستخدم.
       */
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

      /*
       * إنشاء المتجر لصاحب المتجر.
       *
       * نستخدم store_type لأنه اسم الحقل الموجود
       * في بنية جدول stores التي تم العمل عليها.
       */
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

      /*
       * حفظ الدور محلياً أيضاً حتى لا تضيع تجربة الاختبار
       * إذا كانت RLS في profiles تحتاج ضبطاً لاحقاً.
       */
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
      /*
       * في النسخة التجريبية لا نطلب بريد أو كلمة مرور.
       *
       * المستخدم يدخل رقم هاتفه ثم 123456.
       */
      if (form.phone.length !== 9) {
        throw new Error('أدخل رقم الهاتف المكون من 9 أرقام');
      }

      if (form.otp !== TEST_OTP) {
        throw new Error('رمز التحقق غير صحيح. استخدم: 123456');
      }

      const session = await createTestSession();

      /*
       * نحاول استرجاع الدور من profiles.
       */
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

function CustomerApp({
  onLogout
}: {
  onLogout: () => void;
}) {
  const [active, setActive] = useState('home');
  const [category, setCategory] = useState('الكل');
  const [selectedStore, setSelectedStore] =
    useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const filtered =
    category === 'الكل'
      ? stores
      : stores.filter((s) => s.category === category);

  const add = (product: Product) =>
    setCart((current) => {
      const found = current.find(
        (item) => item.id === product.id
      );

      return found
        ? current.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1
                }
              : item
          )
        : [
            ...current,
            {
              ...product,
              quantity: 1
            }
          ];
    });

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Topbar
        role="customer"
        title="مساحة العميل"
        onLogout={onLogout}
      />

      <div className="mx-auto flex max-w-7xl">
        <SideNav
          role="customer"
          active={active}
          onActive={setActive}
        />

        <main className="min-w-0 flex-1 p-5 sm:p-8">
          {active === 'home' && !selectedStore && (
            <>
              <div className="rounded-3xl bg-[#e3fe00] p-7 text-black sm:p-10">
                <Pill dark>
                  مرحباً بك في جَرْمَل
                </Pill>

                <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                  نقوم بتوصيل طلبكم
                  <br />
                  بكل حماس وفاعلية.
                </h1>

                <p className="mt-4 text-sm font-bold text-black/60">
                  أوقات الدوام من الساعة 9:00 صباحًا حتى 9:00 مساءً
                </p>
              </div>

              <section className="mt-10">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-white/40">
                      اكتشف ما حولك
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      تسوّق حسب الفئة
                    </h2>
                  </div>

                  <span className="flex items-center gap-1 text-xs text-white/35">
                    <MapPin
                      size={14}
                      className="text-[#e3fe00]"
                    />
                    صنعاء
                  </span>
                </div>

                <div className="no-scrollbar mt-5 flex gap-3 overflow-x-auto pb-2">
                  {categories.map(
                    ({ name, icon: Icon }) => (
                      <button
                        key={name}
                        onClick={() => setCategory(name)}
                        className={`flex min-w-[88px] flex-col items-center gap-3 rounded-2xl border px-4 py-4 ${
                          category === name
                            ? 'border-[#e3fe00] bg-[#e3fe00] text-black'
                            : 'border-white/10 bg-white/[.03] text-white/55'
                        }`}
                      >
                        <Icon size={22} />
                        <span className="text-xs font-bold">
                          {name}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </section>

              <section className="mt-10">
                <h2 className="text-2xl font-black">
                  متاجر مميزة
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((store) => (
                    <button
                      key={store.id}
                      disabled={!store.isOpen}
                      onClick={() =>
                        setSelectedStore(store.id)
                      }
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] text-right transition hover:-translate-y-1 hover:border-[#e3fe00]/50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div
                        className="flex h-32 items-center justify-center"
                        style={{
                          backgroundColor: store.color
                        }}
                      >
                        <Store
                          size={44}
                          className="text-[#e3fe00]"
                        />
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-black">
                              {store.name}
                            </h3>

                            <p className="mt-1 text-xs text-white/40">
                              {store.description}
                            </p>
                          </div>

                          <span
                            className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                              store.isOpen
                                ? 'bg-[#e3fe00]/10 text-[#e3fe00]'
                                : 'bg-white/10 text-white/50'
                            }`}
                          >
                            {store.isOpen
                              ? 'مفتوح'
                              : 'مغلق'}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-white/35">
                          <span>
                            ★ {store.rating} • {store.time}
                          </span>

                          <span className="font-bold text-[#e3fe00]">
                            {store.isOpen
                              ? 'اطلب الآن'
                              : 'لا يستقبل طلبات'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          {active === 'home' && selectedStore && (
            <StoreView
              store={
                stores.find(
                  (item) => item.id === selectedStore
                )!
              }
              onBack={() => setSelectedStore(null)}
              onAdd={add}
            />
          )}

          {active === 'orders' && (
            <Orders ordered={ordered} />
          )}

          {active === 'map' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">
                تتبع الطلب
              </h2>

              <MapCard />
            </div>
          )}

          {active === 'profile' && (
            <div className="mx-auto max-w-md space-y-4">
              <h2 className="text-2xl font-black">حسابي</h2>

              <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                <p className="text-sm text-white/40">الاسم</p>
                <p className="mt-1 font-bold">
                  {localStorage.getItem('jarmal_test_name') || '—'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                <p className="text-sm text-white/40">رقم الهاتف</p>
                <p className="mt-1 font-bold" dir="ltr">
                  {localStorage.getItem('jarmal_test_phone') || '—'}
                </p>
              </div>

              <button
                onClick={onLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-4 font-black text-red-300 hover:bg-red-500/20"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>
          )}
        </main>
      </div>

      {cart.length > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-[#e3fe00] px-6 py-4 font-black text-black shadow-2xl"
        >
          <ShoppingBag size={18} />
          عرض السلة (
          {cart.reduce((n, item) => n + item.quantity, 0)})
          <span className="mr-2">
            {total} {CURRENCY}
          </span>
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:rounded-3xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black">سلة الطلبات</h3>

              <button
                onClick={() => setShowCart(false)}
                className="rounded-lg p-2 text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="py-10 text-center text-white/40">
                السلة فارغة
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 p-3"
                  >
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-white/40">
                        {item.price} {CURRENCY} × {item.quantity}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCart((current) =>
                            current
                              .map((c) =>
                                c.id === item.id
                                  ? {
                                      ...c,
                                      quantity: c.quantity - 1
                                    }
                                  : c
                              )
                              .filter((c) => c.quantity > 0)
                          )
                        }
                        className="h-7 w-7 rounded-lg bg-white/10 font-black"
                      >
                        −
                      </button>

                      <span className="w-5 text-center font-bold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => add(item)}
                        className="h-7 w-7 rounded-lg bg-white/10 font-black"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-lg font-black">
                  <span>الإجمالي</span>
                  <span>
                    {total} {CURRENCY}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setOrdered(true);
                    setCart([]);
                    setShowCart(false);
                    setActive('orders');
                  }}
                  className="mt-2 w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white"
                >
                  تأكيد الطلب
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StoreView({
  store,
  onBack,
  onAdd
}: {
  store: StoreItem;
  onBack: () => void;
  onAdd: (product: Product) => void;
}) {
  const items = products.filter(
    (product) => product.storeId === store.id
  );

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white"
      >
        <ArrowRight size={16} />
        رجوع للمتاجر
      </button>

      <div
        className="flex h-40 items-center justify-center rounded-3xl"
        style={{ backgroundColor: store.color }}
      >
        <Store size={56} className="text-[#e3fe00]" />
      </div>

      <div className="mt-5 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black">{store.name}</h2>
          <p className="mt-1 text-sm text-white/40">
            {store.description}
          </p>
        </div>

        <span className="rounded-lg bg-white/5 px-3 py-1 text-xs text-white/50">
          ★ {store.rating} • {store.time}
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0d0d0d] p-4"
          >
            <div>
              <p className="font-bold">{product.name}</p>
              <p className="mt-1 text-xs text-white/40">
                {product.description}
              </p>
              <p className="mt-2 font-black text-[#e3fe00]">
                {product.price} {CURRENCY}
              </p>
            </div>

            <button
              onClick={() => onAdd(product)}
              className="rounded-xl bg-[#e3fe00] px-4 py-2 text-sm font-black text-black hover:bg-white"
            >
              إضافة
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Orders({ ordered }: { ordered: boolean }) {
  if (!ordered) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ClipboardList size={40} className="text-white/20" />
        <p className="mt-4 text-white/40">
          لا توجد طلبات حتى الآن
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-5 text-2xl font-black">طلباتي</h2>

      <div className="rounded-2xl border border-[#e3fe00]/30 bg-[#e3fe00]/5 p-5">
        <div className="flex items-center justify-between">
          <span className="font-black">طلب جارٍ #1</span>

          <span className="rounded-lg bg-[#e3fe00] px-3 py-1 text-xs font-black text-black">
            قيد التحضير
          </span>
        </div>

        <p className="mt-3 text-sm text-white/40">
          سيتم تحديث حالة طلبك فور مغادرته المتجر.
        </p>
      </div>
    </div>
  );
}

function DriverApp({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState('available');

  return (
    <div className="min-h-screen bg-black text-white">
      <Topbar
        role="driver"
        title="مساحة المندوب"
        onLogout={onLogout}
      />

      <div className="mx-auto flex max-w-7xl">
        <SideNav
          role="driver"
          active={active}
          onActive={setActive}
        />

        <main className="min-w-0 flex-1 p-5 sm:p-8">
          {active === 'available' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">
                الطلبات القريبة
              </h2>

              <div className="space-y-3">
                {stores.slice(0, 2).map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0d0d0d] p-4"
                  >
                    <div>
                      <p className="font-bold">{store.name}</p>
                      <p className="text-xs text-white/40">
                        {store.description}
                      </p>
                    </div>

                    <button
                      onClick={() => setActive('active')}
                      className="rounded-xl bg-[#e3fe00] px-4 py-2 text-sm font-black text-black hover:bg-white"
                    >
                      قبول الطلب
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'active' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">
                الطلب الحالي
              </h2>

              <MapCard driver />
            </div>
          )}

          {active === 'history' && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <ClipboardList size={40} className="text-white/20" />
              <p className="mt-4 text-white/40">
                لا يوجد سجل توصيلات بعد
              </p>
            </div>
          )}

          {active === 'wallet' && <Wallet role="driver" />}
        </main>
      </div>
    </div>
  );
}

function MerchantApp({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState('dashboard');

  const myProducts = products.filter(
    (product) => product.storeId === 's1'
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Topbar
        role="merchant"
        title="مساحة التاجر"
        onLogout={onLogout}
      />

      <div className="mx-auto flex max-w-7xl">
        <SideNav
          role="merchant"
          active={active}
          onActive={setActive}
        />

        <main className="min-w-0 flex-1 p-5 sm:p-8">
          {active === 'dashboard' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">
                نظرة عامة
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                  <p className="text-xs text-white/40">
                    طلبات اليوم
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#e3fe00]">
                    0
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                  <p className="text-xs text-white/40">
                    إجمالي المبيعات
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#e3fe00]">
                    0 {CURRENCY}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
                  <p className="text-xs text-white/40">
                    تقييم المتجر
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#e3fe00]">
                    —
                  </p>
                </div>
              </div>
            </div>
          )}

          {active === 'incoming' && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <ClipboardList size={40} className="text-white/20" />
              <p className="mt-4 text-white/40">
                لا توجد طلبات واردة حالياً
              </p>
            </div>
          )}

          {active === 'products' && (
            <div>
              <h2 className="mb-5 text-2xl font-black">
                إدارة المنتجات
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {myProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0d0d0d] p-4"
                  >
                    <div>
                      <p className="font-bold">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {product.category}
                      </p>
                    </div>

                    <span className="font-black text-[#e3fe00]">
                      {product.price} {CURRENCY}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'wallet' && <Wallet role="merchant" />}

          {active === 'settings' && (
            <div className="max-w-md space-y-4">
              <h2 className="text-2xl font-black">
                إعدادات المتجر
              </h2>

              <Field
                label="اسم المتجر"
                value={
                  localStorage.getItem('jarmal_test_name') || ''
                }
                onChange={() => {}}
                placeholder="اسم متجرك"
              />
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

