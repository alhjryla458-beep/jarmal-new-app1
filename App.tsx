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

const CURRENCY = 'ط±.ظٹ';

/*
 * ============================================================
 * ط¬ظژط±ظ’ظ…ظژظ„ - ظˆط¶ط¹ طھط³ط¬ظٹظ„ طھط¬ط±ظٹط¨ظٹ
 * ============================================================
 *
 * ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ط§ظ„طھط¬ط±ظٹط¨ظٹ:
 * 123456
 *
 * ظ‡ط°ط§ ظ…ط¤ظ‚طھ ظ„ظ„ط§ط®طھط¨ط§ط± ظپظ‚ط·.
 * ظ„ط§ط­ظ‚ط§ظ‹ ط³ظٹطھظ… ط§ط³طھط¨ط¯ط§ظ„ظ‡ ط¨طھظˆط«ظٹظ‚ SMS ط§ظ„ط­ظ‚ظٹظ‚ظٹ.
 */
const TEST_OTP = '123456';

const paymentChannels = [
  'ط¬ظٹط¨',
  'ظˆظ† ظƒط§ط´',
  'ط§ظ„ظƒط±ظٹظ…ظٹ',
  'ط§ظ„ط¨ظ†ظƒ ط§ظ„ظٹظ…ظ†ظٹ ط§ظ„ظƒظˆظٹطھظٹ',
  'ط­ظˆط§ظ„ط© ظ…ط­ظ„ظٹط©'
];

const businessCategories = [
  'ط¨ظ‚ط§ظ„ط©',
  'ظ…ط·ط¹ظ…',
  'ط¨ظˆظپظٹظ‡',
  'ط³ظˆط¨ط±ظ…ط§ط±ظƒطھ',
  'طµظٹط¯ظ„ظٹط©',
  'ط®ط¶ط§ط± ظˆظپظˆط§ظƒظ‡',
  'ط­ظ„ظˆظٹط§طھ',
  'ظ…ظ„ط§ط¨ط³',
  'ط¥ظ„ظƒطھط±ظˆظ†ظٹط§طھ'
];

const categories = [
  { name: 'ط§ظ„ظƒظ„', icon: ListChecks },
  { name: 'ط¨ظ‚ط§ظ„ط©', icon: Store },
  { name: 'ظ…ط·ط§ط¹ظ…', icon: Store },
  { name: 'ظ‚ظ‡ظˆط©', icon: Store },
  { name: 'طµظٹط¯ظ„ظٹط©', icon: ShieldCheck },
  { name: 'ط­ظ„ظˆظٹط§طھ', icon: Sparkles }
];

const stores: StoreItem[] = [
  {
    id: 's1',
    name: 'طھظ…ظˆظٹظ†ط§طھ ط§ظ„ظ†ط®ط¨ط©',
    category: 'ط¨ظ‚ط§ظ„ط©',
    description: 'ظƒظ„ ط§ط­طھظٹط§ط¬ط§طھ ط§ظ„ط¨ظٹطھ ظپظٹ ظ…ظƒط§ظ† ظˆط§ط­ط¯',
    rating: 4.9,
    time: '15 - 25 ط¯',
    color: '#263700',
    isOpen: true
  },
  {
    id: 's2',
    name: 'ظ…ط°ط§ظ‚ ط§ظ„ظ…ط¯ظٹظ†ط©',
    category: 'ظ…ط·ط§ط¹ظ…',
    description: 'ظˆط¬ط¨ط§طھ ط³ط§ط®ظ†ط© ط¨ط·ط¹ظ… ظ„ط§ ظٹظڈظ†ط³ظ‰',
    rating: 4.8,
    time: '25 - 35 ط¯',
    color: '#3e2900',
    isOpen: true
  },
  {
    id: 's3',
    name: 'ط¨ظڈظ†ظ‘ ظˆظ…ط²ط§ط¬',
    category: 'ظ‚ظ‡ظˆط©',
    description: 'ظ‚ظ‡ظˆط© ظ…ط®طھطµط© ظˆط­ظ„ظˆظٹط§طھ ظٹظˆظ…ظٹط©',
    rating: 4.7,
    time: '10 - 20 ط¯',
    color: '#30251c',
    isOpen: false
  },
  {
    id: 's4',
    name: 'طµظٹط¯ظ„ظٹط© ط§ظ„ط­ظٹط§ط©',
    category: 'طµظٹط¯ظ„ظٹط©',
    description: 'ط§ط­طھظٹط§ط¬ط§طھظƒ ط§ظ„طµط­ظٹط© طھطµظ„ظƒ ط¨ط³ط±ط¹ط©',
    rating: 4.9,
    time: '20 - 30 ط¯',
    color: '#172e32',
    isOpen: true
  }
];

const products: Product[] = [
  {
    id: 'p1',
    name: 'ط³ظ„ط© ط§ظ„ظپط·ظˆط± ط§ظ„ظٹظˆظ…ظٹط©',
    description: 'ط®ط¨ط² ط·ط§ط²ط¬طŒ ط¨ظٹط¶طŒ ط­ظ„ظٹط¨طŒ ط¬ط¨ظ†ط© ظˆظ…ط±ط¨ظ‰',
    price: 3400,
    category: 'ط§ظ„ط£ظƒط«ط± ط·ظ„ط¨ط§ظ‹',
    storeId: 's1'
  },
  {
    id: 'p2',
    name: 'ظ…ظٹط§ظ‡ ظ…ط¹ط¯ظ†ظٹط© 6 ط­ط¨ط§طھ',
    description: 'ظ…ظٹط§ظ‡ ظ†ظ‚ظٹط© ط¨ط­ط¬ظ… 1.5 ظ„طھط±',
    price: 1200,
    category: 'ظ…ط´ط±ظˆط¨ط§طھ',
    storeId: 's1'
  },
  {
    id: 'p3',
    name: 'ط¨ط±ط¬ط± ط¬ظژط±ظ’ظ…ظژظ„',
    description: 'ظ„ط­ظ… ظ…ط´ظˆظٹطŒ ط¬ط¨ظ†ط© ط´ظٹط¯ط±طŒ طµظˆطµ ط®ط§طµ',
    price: 2900,
    category: 'ط§ظ„ط£ظƒط«ط± ط·ظ„ط¨ط§ظ‹',
    storeId: 's2'
  },
  {
    id: 'p4',
    name: 'ط¨ط·ط§ط·ط³ ط¨ط§ظ„ط¬ط¨ظ†ط©',
    description: 'ط¨ط·ط§ط·ط³ ظ…ظ‚ط±ظ…ط´ط© ظ…ط¹ طµظˆطµ ط§ظ„ط¬ط¨ظ†ط©',
    price: 1500,
    category: 'ظ…ظ‚ط¨ظ„ط§طھ',
    storeId: 's2'
  },
  {
    id: 'p5',
    name: 'ظ„ط§طھظٹظ‡ ظƒط±ط§ظ…ظٹظ„',
    description: 'ط¥ط³ط¨ط±ظٹط³ظˆطŒ ط­ظ„ظٹط¨ ظ…ط¨ط®ط±طŒ ظƒط±ط§ظ…ظٹظ„',
    price: 1800,
    category: 'ظ…ط´ط±ظˆط¨ط§طھ',
    storeId: 's3'
  },
  {
    id: 'p6',
    name: 'ظƒظˆظƒظٹط² ط§ظ„ط´ظˆظƒظˆظ„ط§طھط©',
    description: 'ظƒظˆظƒظٹط² ظ…ط®ط¨ظˆط²ط© ط·ط§ط²ط¬ط© ظٹظˆظ…ظٹط§ظ‹',
    price: 1400,
    category: 'ط­ظ„ظˆظٹط§طھ',
    storeId: 's3'
  }
];

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${dark ? 'text-black' : 'text-white'}`}>
      <div className="relative flex h-11 w-11 items-center justify-center rounded-[50%_50%_50%_12px] border-2 border-black bg-[#e3fe00] text-2xl font-black text-black shadow-[0_0_22px_rgba(227,254,0,.22)]">
        <span className="relative -top-0.5">ط¬</span>
        <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-black" />
      </div>

      <div className="text-2xl font-black tracking-[-.08em]">
        ط¬ظژط±ظ’ظ…ظژظ„<span className="text-[#e3fe00]">.</span>
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
        ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط§ظ„ظٹظ…ظ†ظٹ
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
        ظ…ط«ط§ظ„: 711 234 567
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
      title: 'ط¹ظ…ظٹظ„',
      desc: 'ط§ط·ظ„ط¨ ط§ط­طھظٹط§ط¬ط§طھظƒ ظ…ظ† ظ…طھط§ط¬ط± ط­ظٹظƒ'
    },
    {
      role: 'driver' as const,
      icon: Bike,
      title: 'ظ…ظ†ط¯ظˆط¨ طھظˆطµظٹظ„',
      desc: 'ظƒظ† ط¬ط²ط،ط§ظ‹ ظ…ظ† ظپط±ظٹظ‚ ط¬ظژط±ظ’ظ…ظژظ„'
    },
    {
      role: 'merchant' as const,
      icon: Store,
      title: 'طھط§ط¬ط± / طµط§ط­ط¨ ظ…طھط¬ط±',
      desc: 'ظˆطµظ‘ظ„ ظ…ظ†طھط¬ط§طھظƒ ظ„ط¹ظ…ظ„ط§ط¦ظƒ'
    }
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-5 py-7 text-white">
      <div className="absolute -left-28 top-28 h-80 w-80 rounded-full bg-[#e3fe00]/10 blur-[120px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between">
        <Logo />

        <div className="flex items-center gap-2 text-xs text-white/50">
          <ShieldCheck size={15} className="text-[#e3fe00]" />
          طھظˆطµظٹظ„ ظ…ظˆط«ظˆظ‚ ط¯ط§ط®ظ„ ط§ظ„ظٹظ…ظ†
        </div>
      </header>

      <section className="relative mx-auto flex min-h-[calc(100vh-92px)] max-w-6xl flex-col justify-center py-10">
        <div className="max-w-3xl animate-slide-up">
          <Pill>ط£ط³ط±ط¹ ظ…ظ† طھظˆظ‚ط¹ظƒ</Pill>

          <h1 className="mt-6 text-5xl font-black leading-[1.12] tracking-[-.05em] sm:text-7xl">
            ط·ظ„ط¨ظƒ ط¹ظ†ط¯ ط¨ط§ط¨ظƒطŒ
            <br />
            <span className="text-[#e3fe00]">ط¨ط³ط±ط¹ط© ط¬ظژط±ظ’ظ…ظژظ„.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-white/55">
            ظƒظ„ ظ…ط§ طھط­طھط§ط¬ظ‡ ظ…ظ† ظ…طھط§ط¬ط± ط­ظٹظƒطŒ ظپظٹ ظ…ظƒط§ظ† ظˆط§ط­ط¯. ط§ط®طھط± ط­ط³ط§ط¨ظƒ ظˆط§ط¨ط¯ط£ ط±ط­ظ„طھظƒ ظ…ط¹ظ†ط§.
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
                ط§ط¨ط¯ط£ ط§ظ„ط¢ظ†
              </p>
            </button>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-6 text-xs text-white/35">
          <span className="flex items-center gap-2">
            <Zap size={15} className="text-[#e3fe00]" />
            طھظˆطµظٹظ„ ط³ط±ظٹط¹
          </span>

          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#e3fe00]" />
            ظ…طھط§ط¬ط± ظ…ظˆط«ظˆظ‚ط©
          </span>

          <span className="flex items-center gap-2">
            <Navigation size={15} className="text-[#e3fe00]" />
            طھطھط¨ط¹ ظ…ط¨ط§ط´ط±
          </span>

          <button
            onClick={() => onSelect('admin')}
            className="flex items-center gap-2 text-white/20 transition hover:text-[#e3fe00]"
          >
            <ShieldCheck size={15} />
            ط¯ط®ظˆظ„ ط§ظ„ط¥ط¯ط§ط±ط©
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
    category: 'ط¨ظ‚ط§ظ„ط©'
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
      ? ['ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©', 'طھط£ظƒظٹط¯ ط§ظ„ظ‡ط§طھظپ', 'ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…طھط¬ط±']
      : role === 'driver'
        ? ['ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©', 'طھط£ظƒظٹط¯ ط§ظ„ظ‡ط§طھظپ', 'ظƒظˆط¯ ط§ظ„ظ…ظ†ط¯ظˆط¨']
        : ['ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©', 'طھط£ظƒظٹط¯ ط§ظ„ظ‡ط§طھظپ'];

  const prev = () => {
    setError('');
    setStep((current) => Math.max(current - 1, 1));
  };

  /*
   * ط§ظ„ظˆط¶ط¹ ط§ظ„طھط¬ط±ظٹط¨ظٹ:
   * ظ„ط§ ظٹطھظ… ط¥ط±ط³ط§ظ„ SMS ط­ظ‚ظٹظ‚ظٹ.
   * ط§ظ„ط±ظ…ط² ط§ظ„طµط­ظٹط­ ظ„ظ„ط§ط®طھط¨ط§ط± ظ‡ظˆ 123456.
   */
  const sendOtp = () => {
    setError('');

    if (!form.name.trim()) {
      setError('ط§ظƒطھط¨ ط§ط³ظ…ظƒ ط£ظˆظ„ط§ظ‹');
      return;
    }

    if (form.phone.length !== 9) {
      setError('ط£ط¯ط®ظ„ ط±ظ‚ظ… ظ‡ط§طھظپ ظٹظ…ظ†ظٹ طµط­ظٹط­ ظ…ظƒظˆظ† ظ…ظ† 9 ط£ط±ظ‚ط§ظ…');
      return;
    }

    setOtpSent(true);
    setOtpVerified(false);
    setStep(2);
  };

  const verifyTestOtp = () => {
    setError('');

    if (form.otp !== TEST_OTP) {
      setError('ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ط؛ظٹط± طµط­ظٹط­. ط§ط³طھط®ط¯ظ… ط§ظ„ط±ظ…ط² ط§ظ„طھط¬ط±ظٹط¨ظٹ: 123456');
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
   * ط¥ظ†ط´ط§ط، ط¬ظ„ط³ط© Supabase طھط¬ط±ظٹط¨ظٹط© ط­ظ‚ظٹظ‚ظٹط©.
   *
   * ظ†ط³طھط®ط¯ظ… Anonymous Auth ظپظٹ ظˆط¶ط¹ ط§ظ„ط§ط®طھط¨ط§ط± ط­طھظ‰ ظ†ط³طھط·ظٹط¹
   * ط§ط®طھط¨ط§ط± ط§ظ„طھط·ط¨ظٹظ‚ ط¨ط¯ظˆظ† SMS ظ…ط¯ظپظˆط¹.
   *
   * ظ„ط§ط­ظ‚ط§ظ‹ ط³ظٹطھظ… ط§ط³طھط¨ط¯ط§ظ„ ظ‡ط°ط§ ط§ظ„ط¬ط²ط، ط¨ظ€:
   * signInWithOtp + verifyOtp
   * ط¹ظ†ط¯ ط±ط¨ط· ط±ط³ط§ط¦ظ„ ط§ظ„ظ„ظˆطھط³.
   */
  const createTestSession = async () => {
    const result = await supabase.auth.signInAnonymously();

    if (result.error) {
      throw result.error;
    }

    if (!result.data.session) {
      throw new Error(
        'طھط¹ط°ط± ط¥ظ†ط´ط§ط، ط¬ظ„ط³ط© ط§ظ„ط§ط®طھط¨ط§ط±. ظٹط¬ط¨ طھظپط¹ظٹظ„ Anonymous Sign-Ins ظپظٹ Supabase.'
      );
    }

    return result.data.session;
  };

  const finishSignup = async () => {
    setError('');
    setBusy(true);

    try {
      if (!otpVerified && role !== 'admin') {
        throw new Error('ظٹط¬ط¨ طھط£ظƒظٹط¯ ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط£ظˆظ„ط§ظ‹');
      }

      if (role === 'driver') {
        if (!form.accessCode.trim()) {
          throw new Error('ط£ط¯ط®ظ„ ظƒظˆط¯ ط§ظ„ظ…ظ†ط¯ظˆط¨');
        }

        const normalizedCode = form.accessCode.trim().toUpperCase();

        /*
         * ط§ظ„طھط­ظ‚ظ‚ ظ…ظ† ط¨ظ†ظٹط© ط¬ط¯ظˆظ„ driver_access_codes ط§ظ„ط­ط§ظ„ظٹط©.
         *
         * ط§ظ„ط¬ط¯ظˆظ„ ط§ظ„ط­ط§ظ„ظٹ ظٹط­طھظˆظٹ ط¹ظ„ظ‰ is_used ظˆ assigned_to_phoneطŒ
         * ظ„ط°ظ„ظƒ ظ„ط§ ظ†ط³طھط®ط¯ظ… is_active / used_by ط§ظ„ظ‚ط¯ظٹظ…ط©.
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
          throw new Error('ظƒظˆط¯ ط§ظ„ظ…ظ†ط¯ظˆط¨ ط؛ظٹط± طµط­ظٹط­ ط£ظˆ طھظ… ط§ط³طھط®ط¯ط§ظ…ظ‡ ظ…ظ† ظ‚ط¨ظ„');
        }
      }

      if (role === 'merchant') {
        if (!form.storeName.trim()) {
          throw new Error('ط£ط¯ط®ظ„ ط§ط³ظ… ط§ظ„ظ…طھط¬ط±');
        }

        if (!form.category.trim()) {
          throw new Error('ط§ط®طھط± ظ†ظˆط¹ ط§ظ„ظ†ط´ط§ط· ط§ظ„طھط¬ط§ط±ظٹ');
        }
      }

      const session = await createTestSession();
      const userId = session.user.id;

      /*
       * ط­ظپط¸ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط­ط³ط§ط¨ ظپظٹ profiles.
       *
       * ظ„ط§ ظ†ط±ط³ظ„ email ط£ظˆ password ط£ظˆ national_id
       * ظ„ط£ظ† ط§ظ„طھط³ط¬ظٹظ„ ط§ظ„ط¬ط¯ظٹط¯ ظٹط¹طھظ…ط¯ ط¹ظ„ظ‰ ط§ظ„ظ‡ط§طھظپ.
       */
      const profilePayload = {
        id: userId,
        full_name: form.name.trim(),
        phone: `+967${form.phone}`,
        role,
        is_active: true
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload);

      /*
       * ظپظٹ ط­ط§ظ„ط© ط¹ط¯ظ… ظˆط¬ظˆط¯ RLS ظ…ظ†ط§ط³ط¨ ط­ط§ظ„ظٹط§ظ‹ ظ„ط§ ظ†ظ…ظ†ط¹ طھط¬ط±ط¨ط©
       * ط§ظ„ط¯ط®ظˆظ„ ظ„ظ„طھط·ط¨ظٹظ‚طŒ ظ„ظƒظ† ظ†ط­ط§ظˆظ„ ط¯ط§ط¦ظ…ط§ظ‹ ط­ظپط¸ ط§ظ„ط¨ظٹط§ظ†ط§طھ.
       */
      if (profileError) {
        console.warn('طھط¹ط°ط± ط­ظپط¸ profile:', profileError);
      }

      /*
       * ط¥ط°ط§ ظƒط§ظ† ط§ظ„ظ…ط³طھط®ط¯ظ… ظ…ظ†ط¯ظˆط¨ط§ظ‹طŒ ظ†ط¹ظ„ظ‘ظ… ظƒظˆط¯ ط§ظ„ظ…ظ†ط¯ظˆط¨ ط¨ط£ظ†ظ‡ ظ…ط³طھط®ط¯ظ….
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
          console.warn('طھط¹ط°ط± طھط­ط¯ظٹط« ظƒظˆط¯ ط§ظ„ظ…ظ†ط¯ظˆط¨:', codeUpdateError);
        }
      }

      /*
       * ط¥ظ†ط´ط§ط، ط§ظ„ظ…طھط¬ط± ظ„طµط§ط­ط¨ ط§ظ„ظ…طھط¬ط±.
       *
       * ظ†ط³طھط®ط¯ظ… store_type ظ„ط£ظ†ظ‡ ط§ط³ظ… ط§ظ„ط­ظ‚ظ„ ط§ظ„ظ…ظˆط¬ظˆط¯
       * ظپظٹ ط¨ظ†ظٹط© ط¬ط¯ظˆظ„ stores ط§ظ„طھظٹ طھظ… ط§ظ„ط¹ظ…ظ„ ط¹ظ„ظٹظ‡ط§.
       */
      if (role === 'merchant') {
        const { error: storeError } = await supabase
          .from('stores')
          .insert({
            merchant_id: userId,
            name: form.storeName.trim(),
            store_type: form.category,
            description: 'ظ…طھط¬ط± ط¬ط¯ظٹط¯ ط¹ظ„ظ‰ ط¬ظژط±ظ’ظ…ظژظ„',
            is_open: true
          });

        if (storeError) {
          console.warn('طھط¹ط°ط± ط¥ظ†ط´ط§ط، ط§ظ„ظ…طھط¬ط±:', storeError);
        }
      }

      /*
       * ط­ظپط¸ ط§ظ„ط¯ظˆط± ظ…ط­ظ„ظٹط§ظ‹ ط£ظٹط¶ط§ظ‹ ط­طھظ‰ ظ„ط§ طھط¶ظٹط¹ طھط¬ط±ط¨ط© ط§ظ„ط§ط®طھط¨ط§ط±
       * ط¥ط°ط§ ظƒط§ظ†طھ RLS ظپظٹ profiles طھط­طھط§ط¬ ط¶ط¨ط·ط§ظ‹ ظ„ط§ط­ظ‚ط§ظ‹.
       */
      localStorage.setItem('jarmal_test_role', role);
      localStorage.setItem('jarmal_test_name', form.name.trim());
      localStorage.setItem('jarmal_test_phone', `+967${form.phone}`);

      onSuccess(session, role);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'ط­ط¯ط« ط®ط·ط£طŒ ط­ط§ظˆظ„ ظ…ط±ط© ط£ط®ط±ظ‰'
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
       * ظپظٹ ط§ظ„ظ†ط³ط®ط© ط§ظ„طھط¬ط±ظٹط¨ظٹط© ظ„ط§ ظ†ط·ظ„ط¨ ط¨ط±ظٹط¯ ط£ظˆ ظƒظ„ظ…ط© ظ…ط±ظˆط±.
       *
       * ط§ظ„ظ…ط³طھط®ط¯ظ… ظٹط¯ط®ظ„ ط±ظ‚ظ… ظ‡ط§طھظپظ‡ ط«ظ… 123456.
       */
      if (form.phone.length !== 9) {
        throw new Error('ط£ط¯ط®ظ„ ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط§ظ„ظ…ظƒظˆظ† ظ…ظ† 9 ط£ط±ظ‚ط§ظ…');
      }

      if (form.otp !== TEST_OTP) {
        throw new Error('ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ط؛ظٹط± طµط­ظٹط­. ط§ط³طھط®ط¯ظ…: 123456');
      }

      const session = await createTestSession();

      /*
       * ظ†ط­ط§ظˆظ„ ط§ط³طھط±ط¬ط§ط¹ ط§ظ„ط¯ظˆط± ظ…ظ† profiles.
       */
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, phone')
        .eq('phone', `+967${form.phone}`)
        .maybeSingle();

      const savedRole = profile?.role as Role | undefined;

      if (!savedRole) {
        const localRole = localStorage.getItem(
          'jarmal_test_role'
        ) as Role | null;

        if (!localRole) {
          throw new Error(
            'ظ„ظ… ظٹطھظ… ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط­ط³ط§ط¨ ط¨ظ‡ط°ط§ ط§ظ„ط±ظ‚ظ…. ط§ط®طھط± "ط­ط³ط§ط¨ ط¬ط¯ظٹط¯" ط£ظˆظ„ط§ظ‹.'
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
        profile?.phone || `+967${form.phone}`
      );

      onSuccess(session, savedRole);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„'
      );
    } finally {
      setBusy(false);
    }
  };

  const roleTitle =
    role === 'customer'
      ? 'ط­ط³ط§ط¨ ط§ظ„ط¹ظ…ظٹظ„'
      : role === 'driver'
        ? 'ط­ط³ط§ط¨ ط§ظ„ظ…ظ†ط¯ظˆط¨'
        : role === 'merchant'
          ? 'ط­ط³ط§ط¨ ط§ظ„طھط§ط¬ط±'
          : 'ظ„ظˆط­ط© ط§ظ„ط¥ط¯ط§ط±ط©';

  const isAdmin = role === 'admin';

  return (
    <main className="min-h-screen bg-black px-5 py-7 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white"
        >
          <ArrowRight size={18} />
          ط§ظ„ط¹ظˆط¯ط©
        </button>

        <Logo />
      </header>

      <div className="mx-auto max-w-2xl py-10">
        <div className="mb-8 text-center">
          <Pill>{roleTitle}</Pill>

          <h1 className="mt-4 text-4xl font-black">
            {mode === 'signup'
              ? 'ط£ظ†ط´ط¦ ط­ط³ط§ط¨ظƒ'
              : 'ط³ط¬ظ‘ظ„ ط¯ط®ظˆظ„ظƒ'}
          </h1>

          {mode === 'signup' && (
            <p className="mt-3 text-sm text-white/40">
              طھط³ط¬ظٹظ„ ط³ط±ظٹط¹ ظˆط³ظ‡ظ„ ط¨ط§ط³طھط®ط¯ط§ظ… ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ
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
                ط­ط³ط§ط¨ ط¬ط¯ظٹط¯
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
                ظ„ط¯ظٹ ط­ط³ط§ط¨
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="mb-7 rounded-xl border border-[#e3fe00]/20 bg-[#e3fe00]/5 px-4 py-3 text-center text-sm text-white/60">
              ط¯ط®ظˆظ„ ظ…ط¯ظٹط± ط§ظ„ظ†ط¸ط§ظ… â€” ط§ظ„طµظ„ط§ط­ظٹط© ظ…ط·ظ„ظˆط¨ط©
            </div>
          )}

          {mode === 'login' && !isAdmin && (
            <form onSubmit={submitLogin} className="space-y-4">
              <div className="mb-3 text-center">
                <h2 className="text-xl font-black">
                  طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  ط£ط¯ط®ظ„ ط±ظ‚ظ… ظ‡ط§طھظپظƒ ظˆط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚
                </p>
              </div>

              <PhoneField
                value={form.phone}
                onChange={(value) => update('phone', value)}
              />

              <Field
                label="ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚"
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
                ط±ظ…ط² ط§ظ„ط§ط®طھط¨ط§ط±: <strong>123456</strong>
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
                {busy ? 'ط¬ط§ط±ظچ ط§ظ„ط¯ط®ظˆظ„...' : 'ط¯ط®ظˆظ„ ط¥ظ„ظ‰ ط­ط³ط§ط¨ظٹ'}
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
                label="ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚"
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
                {busy ? 'ط¬ط§ط±ظچ ط§ظ„ط¯ط®ظˆظ„...' : 'ط¯ط®ظˆظ„ ط§ظ„ط¥ط¯ط§ط±ط©'}
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
                  ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط£ط³ط§ط³ظٹط©
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  ط£ط¯ط®ظ„ ط§ط³ظ…ظƒ ظˆط±ظ‚ظ… ظ‡ط§طھظپظƒ ظ„ظ„ط¨ط¯ط،
                </p>
              </div>

              <Field
                label="ط§ظ„ط§ط³ظ…"
                value={form.name}
                onChange={(value) => update('name', value)}
                placeholder="ط§ظƒطھط¨ ط§ط³ظ…ظƒ"
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
                طھط£ظƒظٹط¯ ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ
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
                  طھط£ظƒظٹط¯ ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/45">
                  {otpSent
                    ? `طھظ… ط¥ط±ط³ط§ظ„ ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ طھط¬ط±ظٹط¨ظٹط§ظ‹ ط¥ظ„ظ‰ +967 ${form.phone}`
                    : `ط£ط¯ط®ظ„ ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ ط¥ظ„ظ‰ +967 ${form.phone}`}
                </p>
              </div>

              <div className="rounded-xl border border-[#e3fe00]/30 bg-[#e3fe00]/10 px-4 py-4 text-center">
                <p className="text-xs text-white/50">
                  ط±ظ…ط² SMS ط§ظ„طھط¬ط±ظٹط¨ظٹ
                </p>

                <p className="mt-1 text-2xl font-black tracking-[.3em] text-[#e3fe00]">
                  123456
                </p>
              </div>

              <Field
                label="ط±ظ…ط² ط§ظ„طھط­ظ‚ظ‚ OTP"
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
                ط¥ط¹ط§ط¯ط© ط¥ط±ط³ط§ظ„ ط§ظ„ط±ظ…ط²
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
                  ط§ظ„ط³ط§ط¨ظ‚
                </button>

                <button
                  type="button"
                  onClick={verifyTestOtp}
                  disabled={form.otp.length !== 6}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50"
                >
                  طھط£ظƒظٹط¯ ظˆط§ط³طھظ…ط±ط§ط±
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
                    ظƒظˆط¯ ط§ظ„ظ…ظ†ط¯ظˆط¨
                  </h2>

                  <p className="mt-1 text-sm text-white/40">
                    ط£ط¯ط®ظ„ ط§ظ„ظƒظˆط¯ ط§ظ„ط°ظٹ ط£طµط¯ط±ظ‡ ظ„ظƒ ظ…ط¯ظٹط± ط¬ظژط±ظ’ظ…ظژظ„
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    ظƒظˆط¯ ط§ظ„ظ…ظ†ط¯ظˆط¨
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
                    placeholder="ظ…ط«ط§ظ„: JARMAL-101"
                    className="w-full rounded-xl border border-[#e3fe00]/40 bg-black px-4 py-3.5 text-left font-bold tracking-widest text-[#e3fe00] outline-none placeholder:text-white/20 focus:border-[#e3fe00]"
                  />

                  <p className="mt-2 text-xs text-white/35">
                    ط§ظ„ظƒظˆط¯ ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† طµط§ط¯ط±ظ‹ط§ ظ…ظ† ط§ظ„ط¥ط¯ط§ط±ط©.
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
                    ط§ظ„ط³ط§ط¨ظ‚
                  </button>

                  <button
                    type="button"
                    disabled={busy || !form.accessCode.trim()}
                    onClick={() => void finishSignup()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50"
                  >
                    {busy
                      ? 'ط¬ط§ط±ظچ ط¥ظ†ط´ط§ط، ط§ظ„ط­ط³ط§ط¨...'
                      : 'ط¥ظ†ط´ط§ط، ط§ظ„ط­ط³ط§ط¨'}
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
                    ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…طھط¬ط±
                  </h2>

                  <p className="mt-1 text-sm text-white/40">
                    ط¨ظ‚ظٹطھ ط®ط·ظˆط© ظˆط§ط­ط¯ط© ظپظ‚ط·
                  </p>
                </div>

                <Field
                  label="ط§ط³ظ… ط§ظ„ظ…طھط¬ط±"
                  value={form.storeName}
                  onChange={(value) =>
                    update('storeName', value)
                  }
                  placeholder="ظ…ط«ط§ظ„: طھظ…ظˆظٹظ†ط§طھ ط§ظ„ظ†ط®ط¨ط©"
                  icon={<Store size={17} />}
                />

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    ظ†ظˆط¹ ط§ظ„ظ†ط´ط§ط· ط§ظ„طھط¬ط§ط±ظٹ
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
                    ط§ظ„ط³ط§ط¨ظ‚
                  </button>

                  <button
                    type="button"
                    disabled={busy || !form.storeName.trim()}
                    onClick={() => void finishSignup()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50"
                  >
                    {busy
                      ? 'ط¬ط§ط±ظچ ط¥ظ†ط´ط§ط، ط§ظ„ط­ط³ط§ط¨...'
                      : 'ط¥ظ†ط´ط§ط، ط§ظ„ط­ط³ط§ط¨ ظˆط¯ط®ظˆظ„ ط§ظ„طھط·ط¨ظٹظ‚'}
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
                ? 'ط£ظ‡ظ„ط§ظ‹ ط¨ظƒ'
                : role === 'driver'
                  ? 'ظ…ظ†ط¯ظˆط¨ ط¬ظژط±ظ’ظ…ظژظ„'
                  : 'ظ…طھط¬ط±ظƒ'}
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
          ['home', 'ط§ظ„ط±ط¦ظٹط³ظٹط©', Home],
          ['orders', 'ط·ظ„ط¨ط§طھظٹ', ClipboardList],
          ['map', 'طھطھط¨ط¹ ط§ظ„ط·ظ„ط¨', Navigation],
          ['profile', 'ط­ط³ط§ط¨ظٹ', UserRound]
        ]
      : role === 'driver'
        ? [
            ['available', 'ط§ظ„ط·ظ„ط¨ط§طھ ط§ظ„ظ‚ط±ظٹط¨ط©', Navigation],
            ['active', 'ط§ظ„ط·ظ„ط¨ ط§ظ„ط­ط§ظ„ظٹ', Truck],
            ['history', 'ط³ط¬ظ„ ط§ظ„طھظˆطµظٹظ„ط§طھ', ClipboardList],
            ['wallet', 'ظ…ط­ظپط¸طھظٹ', WalletCards]
          ]
        : [
            ['dashboard', 'ظ†ط¸ط±ط© ط¹ط§ظ…ط©', BarChart3],
            ['incoming', 'ط§ظ„ط·ظ„ط¨ط§طھ ط§ظ„ظˆط§ط±ط¯ط©', ClipboardList],
            ['products', 'ط¥ط¯ط§ط±ط© ط§ظ„ظ…ظ†طھط¬ط§طھ', ShoppingBag],
            ['wallet', 'ظ…ط­ظپط¸طھظٹ', WalletCards],
            ['settings', 'ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظ…طھط¬ط±', Settings2]
          ];

  return (
    <aside className="hidden w-60 shrink-0 border-l border-white/10 bg-[#080808] p-4 lg:block">
      <p className="mb-5 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/25">
        ط§ظ„ظ‚ط§ط¦ظ…ط© ط§ظ„ط±ط¦ظٹط³ظٹط©
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
        {driver ? 'ط§ظ„ظ…ط³ط§ط± ط§ظ„ط£ظ‚طµط±' : 'طھطھط¨ط¹ ظ…ط¨ط§ط´ط±'}
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
              ? 'ط§ظ„ظ…ط³ط§ط± ط¥ظ„ظ‰ ط§ظ„ظ…طھط¬ط± ط«ظ… ط§ظ„ط¹ظ…ظٹظ„'
              : 'ط§ظ„ظ…ظ†ط¯ظˆط¨ ظپظٹ ط·ط±ظٹظ‚ظ‡ ط¥ظ„ظٹظƒ'}
          </p>

          <p className="text-xs text-white/40">
            {driver
              ? 'ط§ظپطھط­ ط§ظ„ظ…ط³ط§ط± ظپظٹ ط®ط±ط§ط¦ط· Google'
              : 'ظ…طھط¨ظ‚ظٹ طھظ‚ط±ظٹط¨ط§ظ‹ 12 ط¯ظ‚ظٹظ‚ط©'}
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
          ط®ط±ط§ط¦ط· Google
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
        ط£ظ…ظˆط§ظ„ظƒ ط¨ظٹظ† ظٹط¯ظٹظƒ
      </p>

      <h1 className="mt-1 text-3xl font-black">
        ظ…ط­ظپط¸طھظٹ
      </h1>

      <div className="mt-7 rounded-3xl bg-[#e3fe00] p-7 text-black">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-black/60">
            ط§ظ„ط±طµظٹط¯ ط§ظ„ظ…طھط§ط­
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
          ط³ط­ط¨ ط§ظ„ط£ط±ط¨ط§ط­
          <ArrowLeft
            className="mr-2 inline"
            size={16}
          />
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
          <p className="text-xs text-white/40">
            ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£ط±ط¨ط§ط­
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
            ط¹ظ…ظˆظ„ط§طھ ظ‡ط°ط§ ط§ظ„ط´ظ‡ط±
          </p>

          <p className="mt-3 text-xl font-black text-[#e3fe00]">
            +12,400 {CURRENCY}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">
          <p className="text-xs text-white/40">
            ط¢ط®ط± ط³ط­ط¨
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
                ط³ط­ط¨ ط§ظ„ط£ط±ط¨ط§ط­
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
                label="ط§ظ„ظ…ط¨ظ„ط؛"
                value=""
                onChange={() => undefined}
                placeholder={`ظ…ط«ط§ظ„: 10000 ${CURRENCY}`}
                icon={<WalletCards size={17} />}
              />

              <div>
                <label className="mb-2 block text-sm font-bold">
                  ظ‚ظ†ط§ط© ط§ظ„ط³ط­ط¨
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
                  channel === 'ط­ظˆط§ظ„ط© ظ…ط­ظ„ظٹط©'
                    ? 'ط§ط³ظ… ط§ظ„ظ…ط³طھظ„ظ… / ط§ظ„ظˆظƒظٹظ„'
                    : 'ط±ظ‚ظ… ط§ظ„ط­ط³ط§ط¨ ط£ظˆ ط§ظ„ظ‡ط§طھظپ'
                }
                value=""
                onChange={() => undefined}
                placeholder="ط£ط¯ط®ظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ"
                icon={<Phone size={17} />}
              />

              <button
                onClick={() => setShow(false)}
                className="w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black"
              >
                ط¥ط±ط³ط§ظ„ ط·ظ„ط¨ ط§ظ„ط³ط­ط¨
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
  const [category, setCategory] = useState('ط§ظ„ظƒظ„');
  const [selectedStore, setSelectedStore] =
    useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [ordered, setOrdered] = useState(false);

  const filtered =
    category === 'ط§ظ„ظƒظ„'
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
        title="ظ…ط³ط§ط­ط© ط§ظ„ط¹ظ…ظٹظ„"
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
                  ظ…ط±ط­ط¨ط§ظ‹ ط¨ظƒ ظپظٹ ط¬ظژط±ظ’ظ…ظژظ„
                </Pill>

                <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
                  ظ†ظ‚ظˆظ… ط¨طھظˆطµظٹظ„ ط·ظ„ط¨ظƒظ…
                  <br />
                  ط¨ظƒظ„ ط­ظ…ط§ط³ ظˆظپط§ط¹ظ„ظٹط©.
                </h1>

                <p className="mt-4 text-sm font-bold text-black/60">
                  ط£ظˆظ‚ط§طھ ط§ظ„ط¯ظˆط§ظ… ظ…ظ† ط§ظ„ط³ط§ط¹ط© 9:00 طµط¨ط§ط­ظ‹ط§ ط­طھظ‰ 9:00 ظ…ط³ط§ط،ظ‹
                </p>
              </div>

              <section className="mt-10">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-white/40">
                      ط§ظƒطھط´ظپ ظ…ط§ ط­ظˆظ„ظƒ
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      طھط³ظˆظ‘ظ‚ ط­ط³ط¨ ط§ظ„ظپط¦ط©
                    </h2>
                  </div>

                  <span className="flex items-center gap-1 text-xs text-white/35">
                    <MapPin
                      size={14}
                      className="text-[#e3fe00]"
                    />
                    طµظ†ط¹ط§ط،
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
                  ظ…طھط§ط¬ط± ظ…ظ…ظٹط²ط©
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
                              ? 'ظ…ظپطھظˆط­'
                              : 'ظ…ط؛ظ„ظ‚'}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-white/35">
                          <span>
                            âک… {store.rating} â€¢ {store.time}
                          </span>

                          <span className="font-bold text-[#e3fe00]">
                            {store.isOpen
                              ? 'ط§ط·ظ„ط¨ ط§ظ„ط¢ظ†'
                              : 'ظ„ط§ ظٹط³طھظ‚ط¨ظ„ ط·ظ„ط¨ط§طھ'}
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
            <
