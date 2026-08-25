import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, Bike, Check, CheckCircle2, ChevronLeft,
  CircleUserRound, ClipboardList, Clock3, FileText, Home, Landmark, ListChecks,
  LogOut, MapPin, Menu, Minus, Navigation, Package, Phone, Plus, Search, Settings2,
  ShieldCheck, ShoppingBag, Sparkles, Store, Truck, UserRound, WalletCards, X, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import AdminApp from '@/components/AdminApp';

type Role = 'customer' | 'driver' | 'merchant' | 'admin';
type Screen = 'welcome' | 'auth' | 'app' | 'admin';
type AuthMode = 'login' | 'signup';
type Product = { id: string; name: string; description: string; price: number; category: string; storeId: string };
type CartItem = Product & { quantity: number };
type StoreItem = { id: string; name: string; category: string; description: string; rating: number; time: string; color: string; isOpen: boolean };

const CURRENCY = 'ر.ي';
const paymentChannels = ['جيب', 'ون كاش', 'الكريمي', 'البنك اليمني الكويتي', 'حوالة محلية'];
const businessCategories = ['بقالة', 'مطعم', 'بوفيه', 'سوبرماركت', 'صيدلية', 'خضار وفواكه', 'حلويات', 'ملابس', 'إلكترونيات'];
const categories = [{ name: 'الكل', icon: ListChecks }, { name: 'بقالة', icon: Store }, { name: 'مطاعم', icon: Store }, { name: 'قهوة', icon: Store }, { name: 'صيدلية', icon: ShieldCheck }, { name: 'حلويات', icon: Sparkles }];
const stores: StoreItem[] = [
  { id: 's1', name: 'تموينات النخبة', category: 'بقالة', description: 'كل احتياجات البيت في مكان واحد', rating: 4.9, time: '15 - 25 د', color: '#263700', isOpen: true },
  { id: 's2', name: 'مذاق المدينة', category: 'مطاعم', description: 'وجبات ساخنة بطعم لا يُنسى', rating: 4.8, time: '25 - 35 د', color: '#3e2900', isOpen: true },
  { id: 's3', name: 'بُنّ ومزاج', category: 'قهوة', description: 'قهوة مختصة وحلويات يومية', rating: 4.7, time: '10 - 20 د', color: '#30251c', isOpen: false },
  { id: 's4', name: 'صيدلية الحياة', category: 'صيدلية', description: 'احتياجاتك الصحية تصلك بسرعة', rating: 4.9, time: '20 - 30 د', color: '#172e32', isOpen: true },
];
const products: Product[] = [
  { id: 'p1', name: 'سلة الفطور اليومية', description: 'خبز طازج، بيض، حليب، جبنة ومربى', price: 3400, category: 'الأكثر طلباً', storeId: 's1' },
  { id: 'p2', name: 'مياه معدنية 6 حبات', description: 'مياه نقية بحجم 1.5 لتر', price: 1200, category: 'مشروبات', storeId: 's1' },
  { id: 'p3', name: 'برجر جَرْمَل', description: 'لحم مشوي، جبنة شيدر، صوص خاص', price: 2900, category: 'الأكثر طلباً', storeId: 's2' },
  { id: 'p4', name: 'بطاطس بالجبنة', description: 'بطاطس مقرمشة مع صوص الجبنة', price: 1500, category: 'مقبلات', storeId: 's2' },
  { id: 'p5', name: 'لاتيه كراميل', description: 'إسبريسو، حليب مبخر، كراميل', price: 1800, category: 'مشروبات', storeId: 's3' },
  { id: 'p6', name: 'كوكيز الشوكولاتة', description: 'كوكيز مخبوزة طازجة يومياً', price: 1400, category: 'حلويات', storeId: 's3' },
];

function Logo({ dark = false }: { dark?: boolean }) {
  return <div className={`flex items-center gap-2 ${dark ? 'text-black' : 'text-white'}`}><div className="relative flex h-11 w-11 items-center justify-center rounded-[50%_50%_50%_12px] border-2 border-black bg-[#e3fe00] text-2xl font-black text-black shadow-[0_0_22px_rgba(227,254,0,.22)]"><span className="relative -top-0.5">ج</span><span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-black" /></div><div className="text-2xl font-black tracking-[-.08em]">جَرْمَل<span className="text-[#e3fe00]">.</span></div></div>;
}
function Pill({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) { return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${dark ? 'bg-black/10 text-black' : 'bg-[#e3fe00] text-black'}`}>{children}</span>; }
function Field({ label, value, onChange, placeholder, type = 'text', icon }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; icon?: React.ReactNode }) { return <div><label className="mb-2 block text-sm font-bold">{label}</label><div className="relative"><span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">{icon}</span><input required value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} dir={type === 'email' ? 'ltr' : 'rtl'} className="w-full rounded-xl border border-white/10 bg-black px-11 py-3.5 text-white outline-none transition placeholder:text-white/20 focus:border-[#e3fe00]" /></div></div>; }
function PhoneField({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <div><label className="mb-2 block text-sm font-bold">رقم الهاتف اليمني</label><div className="flex gap-2" dir="ltr"><div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-[#e3fe00]"><span>+967</span></div><input required value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="7xx xxx xxx" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none placeholder:text-white/20 focus:border-[#e3fe00]" /></div><p className="mt-1 text-[11px] text-white/30">مثال: 711 234 567</p></div>; }

function Welcome({ onSelect }: { onSelect: (role: Role) => void }) { const roles = [{ role: 'customer' as const, icon: ShoppingBag, title: 'عميل', desc: 'اطلب احتياجاتك من متاجر حيك' }, { role: 'driver' as const, icon: Bike, title: 'مندوب توصيل', desc: 'كن جزءاً من فريق جَرْمَل' }, { role: 'merchant' as const, icon: Store, title: 'تاجر / صاحب متجر', desc: 'وصّل منتجاتك لعملائك' }]; return <main className="relative min-h-screen overflow-hidden bg-black px-5 py-7 text-white"><div className="absolute -left-28 top-28 h-80 w-80 rounded-full bg-[#e3fe00]/10 blur-[120px]" /><header className="relative mx-auto flex max-w-6xl items-center justify-between"><Logo /><div className="flex items-center gap-2 text-xs text-white/50"><ShieldCheck size={15} className="text-[#e3fe00]" /> توصيل موثوق داخل اليمن</div></header><section className="relative mx-auto flex min-h-[calc(100vh-92px)] max-w-6xl flex-col justify-center py-10"><div className="max-w-3xl animate-slide-up"><Pill>أسرع من توقعك</Pill><h1 className="mt-6 text-5xl font-black leading-[1.12] tracking-[-.05em] sm:text-7xl">طلبك عند بابك،<br /><span className="text-[#e3fe00]">بسرعة جَرْمَل.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-white/55">كل ما تحتاجه من متاجر حيك، في مكان واحد. اختر حسابك وابدأ رحلتك معنا.</p></div><div className="mt-12 grid max-w-4xl gap-4 md:grid-cols-3">{roles.map(({ role, icon: Icon, title, desc }, index) => <button key={role} onClick={() => onSelect(role)} className="group rounded-2xl border border-white/10 bg-white/[.04] p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:border-[#e3fe00]/60 hover:bg-[#e3fe00] hover:text-black animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}><div className="mb-10 flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e3fe00] text-black transition-colors group-hover:bg-black group-hover:text-[#e3fe00]"><Icon size={24} /></div><ArrowLeft className="text-white/30 group-hover:text-black" size={20} /></div><h2 className="text-2xl font-black">{title}</h2><p className="mt-2 text-sm text-white/50 group-hover:text-black/65">{desc}</p><p className="mt-5 text-xs font-bold text-[#e3fe00] group-hover:text-black">ابدأ الآن</p></button>)}</div><div className="mt-12 flex flex-wrap items-center gap-6 text-xs text-white/35"><span className="flex items-center gap-2"><Zap size={15} className="text-[#e3fe00]" /> توصيل سريع</span><span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#e3fe00]" /> متاجر موثوقة</span><span className="flex items-center gap-2"><Navigation size={15} className="text-[#e3fe00]" /> تتبع مباشر</span><button onClick={() => onSelect('admin')} className="flex items-center gap-2 text-white/20 transition hover:text-[#e3fe00]"><ShieldCheck size={15} /> دخول الإدارة</button></div></section></main>; }

function Auth({ role, onBack, onSuccess }: { role: Role; onBack: () => void; onSuccess: (session: Session, role: Role) => void }) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', nationalId: '', email: '', password: '', confirmPassword: '', otp: '', accessCode: '', storeName: '', category: 'بقالة' });
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const totalSteps = role === 'merchant' ? 4 : 3;
  const stepLabels = role === 'merchant'
    ? ['البيانات الأساسية', 'تأكيد الهاتف', 'بيانات الحساب', 'بيانات المتجر']
    : ['البيانات الأساسية', 'تأكيد الهاتف', 'بيانات الحساب'];
  const next = () => { setError(''); setStep((s) => Math.min(s + 1, totalSteps)); };
  const prev = () => { setError(''); setStep((s) => Math.max(s - 1, 1)); };
  const sendOtp = () => { setOtpSent(true); setStep(2); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (mode === 'signup' && form.password !== form.confirmPassword) { setError('كلمتا المرور غير متطابقتين'); return; }
    setBusy(true);
    try {
      if (mode === 'signup' && role === 'driver') {
        const { data: code } = await supabase.from('driver_access_codes').select('id').eq('code', form.accessCode.trim().toUpperCase()).eq('is_active', true).is('used_by', null).maybeSingle();
        if (!code) throw new Error('كود الاعتماد غير صحيح أو مستخدم من قبل');
      }
      const result = mode === 'signup' ? await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { role } } }) : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (result.error) throw result.error;
      if (!result.data.session) throw new Error('تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجّل الدخول.');
      const userId = result.data.session.user.id;
      if (mode === 'signup') {
        const { error: profileError } = await supabase.from('profiles').upsert({ id: userId, role, full_name: form.name, phone: `+967${form.phone}`, national_id: form.nationalId, email: form.email, store_name: form.storeName || null, store_category: form.category || null });
        if (profileError) throw profileError;
        if (role === 'merchant' && form.storeName) {
          const { error: storeError } = await supabase.from('stores').insert({ merchant_id: userId, name: form.storeName, category: form.category, description: 'متجر جديد على جَرْمَل', is_open: true });
          if (storeError) throw storeError;
        }
      }
      onSuccess(result.data.session, role);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'حدث خطأ، حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const roleTitle = role === 'customer' ? 'حساب العميل' : role === 'driver' ? 'حساب المندوب' : role === 'merchant' ? 'حساب التاجر' : 'لوحة الإدارة';
  const isAdmin = role === 'admin';

  return (
    <main className="min-h-screen bg-black px-5 py-7 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowRight size={18} /> العودة</button>
        <Logo />
      </header>
      <div className="mx-auto max-w-2xl py-10">
        <div className="mb-8 text-center">
          <Pill>{roleTitle}</Pill>
          <h1 className="mt-4 text-4xl font-black">{mode === 'signup' ? 'أنشئ حسابك' : 'سجّل دخولك'}</h1>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#0d0d0d] p-6 sm:p-9">
          {mode === 'signup' && (
            <div className="mb-8 grid gap-2" style={{ gridTemplateColumns: `repeat(${totalSteps}, 1fr)` }}>
              {stepLabels.map((label, index) => (
                <div key={label} className="text-center">
                  <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition-all ${index + 1 <= step ? 'bg-[#e3fe00] text-black' : 'bg-white/10 text-white/30'}`}>{index + 1 < step ? <Check size={15} /> : index + 1}</div>
                  <p className={`mt-2 hidden text-[10px] sm:block ${index + 1 === step ? 'text-[#e3fe00]' : 'text-white/30'}`}>{label}</p>
                </div>
              ))}
            </div>
          )}
          {!isAdmin && <div className="mb-7 flex rounded-xl bg-white/5 p-1"><button onClick={() => { setMode('signup'); setStep(1); setError(''); }} className={`flex-1 rounded-lg py-3 text-sm font-bold ${mode === 'signup' ? 'bg-[#e3fe00] text-black' : 'text-white/40'}`}>حساب جديد</button><button onClick={() => { setMode('login'); setError(''); }} className={`flex-1 rounded-lg py-3 text-sm font-bold ${mode === 'login' ? 'bg-[#e3fe00] text-black' : 'text-white/40'}`}>لدي حساب</button></div>}
          {isAdmin && <div className="mb-7 rounded-xl border border-[#e3fe00]/20 bg-[#e3fe00]/5 px-4 py-3 text-center text-sm text-white/60">دخول مدير النظام — الصلاحية مطلوبة</div>}
          <form onSubmit={submit} className="space-y-4">
            {mode === 'login' && (
              <>
                <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => update('email', v)} placeholder="name@example.com" type="email" icon={<CircleUserRound size={17} />} />
                <Field label="كلمة المرور" value={form.password} onChange={(v) => update('password', v)} placeholder="••••••••" type="password" icon={<ShieldCheck size={17} />} />
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50">{busy ? 'جارٍ الدخول...' : 'دخول إلى حسابي'} <ArrowLeft size={18} /></button>
              </>
            )}
            {mode === 'signup' && step === 1 && (
              <>
                <div className="mb-2 text-center"><h2 className="text-xl font-black">البيانات الأساسية</h2><p className="mt-1 text-sm text-white/40">أدخل اسمك ورقم هاتفك للبدء</p></div>
                <Field label="الاسم الكامل" value={form.name} onChange={(v) => update('name', v)} placeholder="اكتب الاسم الكامل" icon={<UserRound size={17} />} />
                <PhoneField value={form.phone} onChange={(v) => update('phone', v)} />
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                <button type="button" onClick={sendOtp} disabled={!form.name || form.phone.length < 9} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50">التالي <ArrowLeft size={18} /></button>
              </>
            )}
            {mode === 'signup' && step === 2 && (
              <>
                <div className="rounded-2xl border border-[#e3fe00]/20 bg-[#e3fe00]/5 p-5 text-center">
                  <ShieldCheck className="mx-auto text-[#e3fe00]" size={32} />
                  <h2 className="mt-4 text-xl font-black">تأكيد رقم الهاتف</h2>
                  <p className="mt-2 text-sm leading-6 text-white/45">{otpSent ? `تم إرسال رمز التحقق إلى +967 ${form.phone}` : `أدخل رمز التحقق المرسل إلى +967 ${form.phone || '7xx xxx xxx'}`}</p>
                </div>
                <Field label="رمز التحقق OTP" value={form.otp} onChange={(v) => update('otp', v.replace(/\D/g, '').slice(0, 6))} placeholder="000000" icon={<ShieldCheck size={17} />} />
                <button type="button" onClick={() => setOtpSent(true)} className="mx-auto block text-xs text-[#e3fe00] hover:underline">إعادة إرسال الرمز</button>
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                <div className="flex gap-3">
                  <button type="button" onClick={prev} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-4 text-sm font-bold text-white/60 hover:border-white/30"><ArrowRight size={18} /> السابق</button>
                  <button type="button" onClick={next} disabled={form.otp.length < 4} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50">تأكيد واستمرار <ArrowLeft size={18} /></button>
                </div>
              </>
            )}
            {mode === 'signup' && step === 3 && (
              <>
                <div className="mb-2 text-center"><h2 className="text-xl font-black">بيانات الحساب والأمان</h2><p className="mt-1 text-sm text-white/40">أدخل بيانات الحساب وكلمة المرور</p></div>
                <Field label="رقم الهوية الوطنية" value={form.nationalId} onChange={(v) => update('nationalId', v)} placeholder="رقم الهوية" icon={<FileText size={17} />} />
                <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => update('email', v)} placeholder="name@example.com" type="email" icon={<CircleUserRound size={17} />} />
                <Field label="كلمة المرور" value={form.password} onChange={(v) => update('password', v)} placeholder="••••••••" type="password" icon={<ShieldCheck size={17} />} />
                <Field label="تأكيد كلمة المرور" value={form.confirmPassword} onChange={(v) => update('confirmPassword', v)} placeholder="••••••••" type="password" icon={<ShieldCheck size={17} />} />
                {role === 'driver' && (
                  <div>
                    <label className="mb-2 block text-sm font-bold">كود الاعتماد / رقم التسجيل</label>
                    <input required value={form.accessCode} onChange={(e) => update('accessCode', e.target.value)} placeholder="مثال: JARMAL-101" className="w-full rounded-xl border border-[#e3fe00]/40 bg-black px-4 py-3.5 text-left font-bold tracking-widest text-[#e3fe00] outline-none placeholder:text-white/20 focus:border-[#e3fe00]" />
                    <p className="mt-2 text-xs text-white/35">للتجربة استخدم الكود: JARMAL-101</p>
                  </div>
                )}
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                <div className="flex gap-3">
                  <button type="button" onClick={prev} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-4 text-sm font-bold text-white/60 hover:border-white/30"><ArrowRight size={18} /> السابق</button>
                  {role === 'merchant' ? (
                    <button type="button" onClick={next} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white">التالي <ArrowLeft size={18} /></button>
                  ) : (
                    <button disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50">{busy ? 'جارٍ الإنشاء...' : 'إنشاء الحساب ودخول التطبيق'} <ArrowLeft size={18} /></button>
                  )}
                </div>
              </>
            )}
            {mode === 'signup' && step === 4 && role === 'merchant' && (
              <>
                <div className="mb-2 text-center"><h2 className="text-xl font-black">بيانات المتجر</h2><p className="mt-1 text-sm text-white/40">أدخل تفاصيل متجرك للانطلاق</p></div>
                <Field label="اسم المتجر / المحل" value={form.storeName} onChange={(v) => update('storeName', v)} placeholder="مثال: تموينات النخبة" icon={<Store size={17} />} />
                <div>
                  <label className="mb-2 block text-sm font-bold">نوع النشاط التجاري</label>
                  <select value={form.category} onChange={(e) => update('category', e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none focus:border-[#e3fe00]">{businessCategories.map((category) => <option key={category}>{category}</option>)}</select>
                </div>
                {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                <div className="flex gap-3">
                  <button type="button" onClick={prev} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-4 text-sm font-bold text-white/60 hover:border-white/30"><ArrowRight size={18} /> السابق</button>
                  <button disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e3fe00] py-4 font-black text-black hover:bg-white disabled:opacity-50">{busy ? 'جارٍ الإنشاء...' : 'إنشاء الحساب ودخول التطبيق'} <ArrowLeft size={18} /></button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

function Topbar({ role, onLogout, title }: { role: Role; onLogout: () => void; title: string }) { return <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 px-5 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between"><div className="flex items-center gap-4"><button className="rounded-lg p-2 text-white/60 lg:hidden"><Menu size={22} /></button><Logo /><span className="hidden h-5 w-px bg-white/20 sm:block" /><span className="hidden text-sm text-white/45 sm:block">{title}</span></div><div className="flex items-center gap-4"><button className="relative rounded-xl p-2 text-white/60"><Bell size={19} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#e3fe00]" /></button><div className="hidden items-center gap-2 text-sm font-bold sm:flex"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3fe00] text-black"><UserRound size={17} /></div><span>{role === 'customer' ? 'أهلاً بك' : role === 'driver' ? 'مندوب جَرْمَل' : 'متجرك'}</span></div><button onClick={onLogout} className="rounded-xl p-2 text-white/40 hover:text-red-400"><LogOut size={18} /></button></div></div></header>; }
function SideNav({ role, active, onActive }: { role: Role; active: string; onActive: (value: string) => void }) { const items: [string, string, React.ElementType][] = role === 'customer' ? [['home', 'الرئيسية', Home], ['orders', 'طلباتي', ClipboardList], ['map', 'تتبع الطلب', Navigation], ['profile', 'حسابي', UserRound]] : role === 'driver' ? [['available', 'الطلبات القريبة', Navigation], ['active', 'الطلب الحالي', Truck], ['history', 'سجل التوصيلات', ClipboardList], ['wallet', 'محفظتي', WalletCards]] : [['dashboard', 'نظرة عامة', BarChart3], ['incoming', 'الطلبات الواردة', ClipboardList], ['products', 'إدارة المنتجات', ShoppingBag], ['wallet', 'محفظتي', WalletCards], ['settings', 'إعدادات المتجر', Settings2]]; return <aside className="hidden w-60 shrink-0 border-l border-white/10 bg-[#080808] p-4 lg:block"><p className="mb-5 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/25">القائمة الرئيسية</p><nav className="space-y-1">{items.map(([id, label, Icon]) => <button key={id} onClick={() => onActive(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${active === id ? 'bg-[#e3fe00] text-black' : 'text-white/45 hover:bg-white/5 hover:text-white'}`}><Icon size={18} />{label}{id === 'incoming' && <span className="mr-auto rounded-full bg-[#e3fe00] px-2 py-0.5 text-[10px] text-black">3</span>}</button>)}</nav></aside>; }
function MapCard({ driver = false }: { driver?: boolean }) { return <div className="map-grid relative h-[360px] overflow-hidden rounded-3xl border border-white/10"><div className="absolute right-[24%] top-[23%] h-3 w-3 rounded-full bg-[#e3fe00] shadow-[0_0_0_8px_rgba(227,254,0,.15)]" /><div className="absolute left-[24%] bottom-[22%] h-3 w-3 rounded-full bg-white shadow-[0_0_0_8px_rgba(255,255,255,.12)]" /><div className="absolute left-1/3 top-1/3 h-48 w-48 rounded-full border-2 border-dashed border-[#e3fe00]/50" /><div className="absolute right-5 top-5 rounded-xl border border-white/10 bg-black/75 px-3 py-2 text-xs text-white/50"><MapPin size={14} className="ml-1 inline text-[#e3fe00]" /> {driver ? 'المسار الأقصر' : 'تتبع مباشر'}</div><div className="absolute bottom-5 right-5 left-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/85 p-4 backdrop-blur"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e3fe00] text-black">{driver ? <Navigation size={19} /> : <Bike size={19} />}</div><div><p className="font-bold">{driver ? 'المسار إلى المتجر ثم العميل' : 'المندوب في طريقه إليك'}</p><p className="text-xs text-white/40">{driver ? 'افتح المسار في خرائط Google' : 'متبقي تقريباً 12 دقيقة'}</p></div><button onClick={() => window.open('https://www.google.com/maps', '_blank', 'noopener,noreferrer')} className="mr-auto rounded-lg bg-[#e3fe00] px-3 py-2 text-xs font-black text-black">خرائط Google</button></div></div>; }
function Wallet({ role }: { role: 'driver' | 'merchant' }) { const [show, setShow] = useState(false); const [channel, setChannel] = useState(paymentChannels[0]); return <section><p className="text-sm text-white/40">أموالك بين يديك</p><h1 className="mt-1 text-3xl font-black">محفظتي</h1><div className="mt-7 rounded-3xl bg-[#e3fe00] p-7 text-black"><div className="flex items-center justify-between"><span className="text-sm font-bold text-black/60">الرصيد المتاح</span><WalletCards size={23} /></div><p className="mt-6 text-4xl font-black">{role === 'driver' ? '18,450' : '42,780'} <span className="text-lg">{CURRENCY}</span></p><button onClick={() => setShow(true)} className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-black text-white">سحب الأرباح <ArrowLeft className="mr-2 inline" size={16} /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-xs text-white/40">إجمالي الأرباح</p><p className="mt-3 text-xl font-black">{role === 'driver' ? '86,500' : '210,300'} {CURRENCY}</p></div><div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-xs text-white/40">عمولات هذا الشهر</p><p className="mt-3 text-xl font-black text-[#e3fe00]">+12,400 {CURRENCY}</p></div><div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-xs text-white/40">آخر سحب</p><p className="mt-3 text-xl font-black">15,000 {CURRENCY}</p></div></div>{show && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-5 backdrop-blur"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">سحب الأرباح</h2><button onClick={() => setShow(false)}><X size={20} className="text-white/40" /></button></div><div className="mt-6 space-y-4"><Field label="المبلغ" value="" onChange={() => undefined} placeholder={`مثال: 10000 ${CURRENCY}`} icon={<WalletCards size={17} />} /><div><label className="mb-2 block text-sm font-bold">قناة السحب</label><select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white outline-none focus:border-[#e3fe00]">{paymentChannels.map((item) => <option key={item}>{item}</option>)}</select></div><Field label={channel === 'حوالة محلية' ? 'اسم المستلم / الوكيل' : 'رقم الحساب أو الهاتف'} value="" onChange={() => undefined} placeholder="أدخل البيانات" icon={<Phone size={17} />} /><button onClick={() => setShow(false)} className="w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black">إرسال طلب السحب</button></div></div></div>}</section>; }

function CustomerApp({ onLogout }: { onLogout: () => void }) { const [active, setActive] = useState('home'); const [category, setCategory] = useState('الكل'); const [selectedStore, setSelectedStore] = useState<string | null>(null); const [cart, setCart] = useState<CartItem[]>([]); const [showCart, setShowCart] = useState(false); const [ordered, setOrdered] = useState(false); const filtered = category === 'الكل' ? stores : stores.filter((s) => s.category === category); const add = (product: Product) => setCart((current) => { const found = current.find((item) => item.id === product.id); return found ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }]; }); const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); return <div className="min-h-screen bg-black text-white"><Topbar role="customer" title="مساحة العميل" onLogout={onLogout} /><div className="mx-auto flex max-w-7xl"><SideNav role="customer" active={active} onActive={setActive} /><main className="min-w-0 flex-1 p-5 sm:p-8">{active === 'home' && !selectedStore && <><div className="rounded-3xl bg-[#e3fe00] p-7 text-black sm:p-10"><Pill dark>مرحباً بك في جَرْمَل</Pill><h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">نقوم بتوصيل طلبكم<br />بكل حماس وفاعلية.</h1><p className="mt-4 text-sm font-bold text-black/60">أوقات الدوام من الساعة 9:00 صباحًا حتى 9:00 مساءً</p></div><section className="mt-10"><div className="flex items-end justify-between"><div><p className="text-sm text-white/40">اكتشف ما حولك</p><h2 className="mt-1 text-2xl font-black">تسوّق حسب الفئة</h2></div><span className="flex items-center gap-1 text-xs text-white/35"><MapPin size={14} className="text-[#e3fe00]" /> صنعاء</span></div><div className="no-scrollbar mt-5 flex gap-3 overflow-x-auto pb-2">{categories.map(({ name, icon: Icon }) => <button key={name} onClick={() => setCategory(name)} className={`flex min-w-[88px] flex-col items-center gap-3 rounded-2xl border px-4 py-4 ${category === name ? 'border-[#e3fe00] bg-[#e3fe00] text-black' : 'border-white/10 bg-white/[.03] text-white/55'}`}><Icon size={22} /><span className="text-xs font-bold">{name}</span></button>)}</div></section><section className="mt-10"><h2 className="text-2xl font-black">متاجر مميزة</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((store) => <button key={store.id} disabled={!store.isOpen} onClick={() => setSelectedStore(store.id)} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] text-right transition hover:-translate-y-1 hover:border-[#e3fe00]/50 disabled:cursor-not-allowed disabled:opacity-60"><div className="flex h-32 items-center justify-center" style={{ backgroundColor: store.color }}><Store size={44} className="text-[#e3fe00]" /></div><div className="p-4"><div className="flex items-start justify-between"><div><h3 className="font-black">{store.name}</h3><p className="mt-1 text-xs text-white/40">{store.description}</p></div><span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${store.isOpen ? 'bg-[#e3fe00]/10 text-[#e3fe00]' : 'bg-white/10 text-white/50'}`}>{store.isOpen ? 'مفتوح' : 'مغلق'}</span></div><div className="mt-4 flex items-center justify-between text-xs text-white/35"><span>★ {store.rating} • {store.time}</span><span className="font-bold text-[#e3fe00]">{store.isOpen ? 'اطلب الآن' : 'لا يستقبل طلبات'}</span></div></div></button>)}</div></section></>}{active === 'home' && selectedStore && <StoreView store={stores.find((item) => item.id === selectedStore)!} onBack={() => setSelectedStore(null)} onAdd={add} />}{active === 'orders' && <Orders ordered={ordered} />}{active === 'map' && <section><h1 className="text-3xl font-black">تتبع الطلب</h1><p className="mt-2 text-sm text-white/40">تحديث مباشر لموقع مندوبك</p><div className="mt-7"><MapCard /></div></section>}</main></div>{cart.length > 0 && <button onClick={() => setShowCart(true)} className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-5 rounded-2xl bg-[#e3fe00] px-5 py-4 text-black"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-black text-[#e3fe00]">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span><span className="font-black">عرض السلة</span><span className="border-r border-black/20 pr-5 text-sm font-bold">{total.toLocaleString('ar-YE')} {CURRENCY}</span></button>}{showCart && <Cart cart={cart} setCart={setCart} total={total} onClose={() => setShowCart(false)} onOrder={() => { setShowCart(false); setOrdered(true); setActive('orders'); }} />}</div>; }
function StoreView({ store, onBack, onAdd }: { store: StoreItem; onBack: () => void; onAdd: (product: Product) => void }) { return <div><button onClick={onBack} className="mb-7 flex items-center gap-2 text-sm text-white/45"><ArrowRight size={17} /> المتاجر</button><div className="rounded-3xl p-7" style={{ backgroundColor: store.color }}><Store size={45} className="text-[#e3fe00]" /><h1 className="mt-5 text-3xl font-black">{store.name}</h1><p className="mt-2 text-sm text-white/60">{store.description}</p><div className="mt-5 text-xs font-bold">★ {store.rating} • {store.time} • توصيل 500 {CURRENCY}</div></div><h2 className="mt-10 text-2xl font-black">الأكثر طلباً</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{products.filter((item) => item.storeId === store.id).map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d0d0d] p-4"><div><h3 className="font-bold">{product.name}</h3><p className="mt-1 text-xs text-white/35">{product.description}</p><p className="mt-2 font-black text-[#e3fe00]">{product.price.toLocaleString('ar-YE')} {CURRENCY}</p></div><button onClick={() => onAdd(product)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e3fe00] text-black"><Plus size={19} /></button></div>)}</div></div>; }
function Cart({ cart, setCart, total, onClose, onOrder }: { cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; total: number; onClose: () => void; onOrder: () => void }) { return <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"><div className="absolute bottom-0 left-0 right-0 mx-auto max-h-[90vh] max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#111] p-6 sm:bottom-5 sm:rounded-3xl"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">سلة مشترياتك</h2><button onClick={onClose}><X size={19} className="text-white/50" /></button></div><div className="mt-6 space-y-3">{cart.map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white/[.04] p-3"><div><p className="text-sm font-bold">{item.name}</p><p className="text-xs text-white/40">{item.price.toLocaleString('ar-YE')} {CURRENCY}</p></div><div className="flex items-center gap-3"><button onClick={() => setCart((current) => current.map((x) => x.id === item.id ? { ...x, quantity: x.quantity + 1 } : x))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e3fe00] text-black"><Plus size={14} /></button><span>{item.quantity}</span><button onClick={() => setCart((current) => current.flatMap((x) => x.id === item.id ? (x.quantity > 1 ? [{ ...x, quantity: x.quantity - 1 }] : []) : [x]))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10"><Minus size={14} /></button></div></div>)}</div><div className="mt-7 border-t border-white/10 pt-5"><div className="flex justify-between text-xl font-black"><span>الإجمالي</span><span className="text-[#e3fe00]">{(total + 500).toLocaleString('ar-YE')} {CURRENCY}</span></div><button onClick={onOrder} className="mt-6 w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black">إتمام الطلب <ArrowLeft className="mr-2 inline" size={17} /></button></div></div></div>; }
function Orders({ ordered }: { ordered: boolean }) { return <section><h1 className="text-3xl font-black">طلباتي</h1>{ordered ? <div className="mt-8 rounded-2xl border border-[#e3fe00]/30 bg-[#e3fe00]/5 p-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e3fe00] text-black"><Truck size={21} /></div><div><p className="font-black">طلبك #JR-2048 في الطريق إليك</p><p className="mt-1 text-xs text-white/45">جاري التوصيل • منذ دقائق</p></div><span className="mr-auto rounded-full bg-[#e3fe00] px-3 py-1 text-[10px] font-black text-black">نشط</span></div><div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-3/4 rounded-full bg-[#e3fe00]" /></div></div> : <div className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-white/10 py-16"><Package size={42} className="text-white/20" /><h2 className="mt-4 font-bold">لا توجد طلبات بعد</h2></div>}</section>; }

function DriverApp({ onLogout }: { onLogout: () => void }) { const [active, setActive] = useState('available'); const [accepted, setAccepted] = useState(false); return <div className="min-h-screen bg-black text-white"><Topbar role="driver" title="مساحة المندوب" onLogout={onLogout} /><div className="mx-auto flex max-w-7xl"><SideNav role="driver" active={active} onActive={setActive} /><main className="min-w-0 flex-1 p-5 sm:p-8">{active === 'available' && <><Pill>متصل الآن</Pill><h1 className="mt-4 text-3xl font-black">الطلبات القريبة</h1><div className="mt-8 grid gap-4 xl:grid-cols-2">{[{ id: 'JR-2049', store: 'تموينات النخبة', address: 'حي حدة، شارع 12', total: 8600 }, { id: 'JR-2050', store: 'مذاق المدينة', address: 'شارع الزبيري', total: 4700 }].map((order) => <div key={order.id} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><p className="text-xs text-white/35">طلب #{order.id}</p><h2 className="mt-2 text-xl font-black">{order.store}</h2><p className="mt-5 border-y border-white/10 py-4 text-sm text-white/55"><MapPin size={16} className="ml-2 inline text-[#e3fe00]" />{order.address}<br /><WalletCards size={16} className="ml-2 mt-3 inline text-[#e3fe00]" /> قيمة الطلب {order.total.toLocaleString('ar-YE')} {CURRENCY}</p><button onClick={() => { setAccepted(true); setActive('active'); }} className="mt-4 w-full rounded-xl bg-[#e3fe00] py-3 font-black text-black">قبول الطلب</button></div>)}</div></>}{active === 'active' && <section><Pill>رحلتك الحالية</Pill><h1 className="mt-4 text-3xl font-black">الطلب #JR-2049</h1><div className="mt-7"><MapCard driver /></div><button onClick={() => setAccepted(!accepted)} className="mt-6 w-full rounded-xl bg-[#e3fe00] py-4 font-black text-black">{accepted ? 'تحديث حالة التوصيل' : 'بدء الرحلة'}</button></section>}{active === 'wallet' && <Wallet role="driver" />}{active === 'history' && <Orders ordered />}</main></div></div>; }
function MerchantApp({ onLogout }: { onLogout: () => void }) { const [active, setActive] = useState('dashboard'); const [isOpen, setIsOpen] = useState(true); const [orders, setOrders] = useState([{ id: 'JR-2048', customer: 'محمد العتيبي', items: 'برجر جَرْمَل × 2', total: 7300, status: 'جديد' }, { id: 'JR-2047', customer: 'نورة القحطاني', items: 'لاتيه كراميل × 1', total: 2300, status: 'قيد التجهيز' }, { id: 'JR-2046', customer: 'سلمان الحربي', items: 'سلة الفطور اليومية', total: 3900, status: 'جاهز للاستلام' }]); const update = (id: string) => setOrders((current) => current.map((order) => order.id === id ? { ...order, status: order.status === 'جديد' ? 'قيد التجهيز' : 'جاهز للاستلام' } : order)); return <div className="min-h-screen bg-black text-white"><Topbar role="merchant" title="لوحة التاجر" onLogout={onLogout} /><div className="mx-auto flex max-w-7xl"><SideNav role="merchant" active={active} onActive={setActive} /><main className="min-w-0 flex-1 p-5 sm:p-8">{active === 'dashboard' && <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-white/40">صباح الخير</p><h1 className="mt-1 text-3xl font-black">نظرة عامة</h1></div><button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-black ${isOpen ? 'bg-[#e3fe00] text-black' : 'bg-white/10 text-white/50'}`}><span className={`h-3 w-3 rounded-full ${isOpen ? 'bg-black' : 'bg-white/30'}`} /> المتجر {isOpen ? 'مفتوح' : 'مغلق'}</button></div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['طلبات اليوم', '24', ClipboardList], ['مبيعات اليوم', '124,800', BarChart3], ['متوسط التقييم', '4.9', Sparkles], ['قيد التجهيز', '3', Clock3]].map(([label, value, Icon]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><div className="flex justify-between text-sm text-white/45"><span>{String(label)}</span><Icon size={18} className="text-[#e3fe00]" /></div><p className="mt-5 text-3xl font-black">{String(value)}{label === 'مبيعات اليوم' ? ` ${CURRENCY}` : ''}</p></div>)}</div><section className="mt-10 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><h2 className="text-xl font-black">الطلبات الواردة</h2><OrderTable orders={orders} onUpdate={update} /></section></>}{active === 'incoming' && <section><h1 className="text-3xl font-black">الطلبات الواردة</h1><p className="mt-2 text-sm text-white/40">استلم الطلب، راجع التفاصيل والمسافة والقيمة، ثم ابدأ التجهيز.</p><div className="mt-7 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5"><OrderTable orders={orders} onUpdate={update} /></div></section>}{active === 'products' && <ProductsManage />}{active === 'wallet' && <Wallet role="merchant" />}{active === 'settings' && <section><h1 className="text-3xl font-black">إعدادات المتجر</h1><div className="mt-7 rounded-2xl border border-white/10 bg-[#0d0d0d] p-6"><div className="flex items-center justify-between"><div><h2 className="font-black">حالة استقبال الطلبات</h2><p className="mt-1 text-sm text-white/40">عند الإغلاق لن يتمكن العملاء من الطلب من متجرك.</p></div><button onClick={() => setIsOpen(!isOpen)} className={`relative h-7 w-14 rounded-full ${isOpen ? 'bg-[#e3fe00]' : 'bg-white/20'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-black transition ${isOpen ? 'right-1' : 'right-8'}`} /></button></div></div></section>}</main></div></div>; }
function OrderTable({ orders, onUpdate }: { orders: { id: string; customer: string; items: string; total: number; status: string }[]; onUpdate: (id: string) => void }) { return <div className="mt-5 space-y-3">{orders.map((order) => <div key={order.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-white/[.02] p-4"><div className="flex min-w-[130px] items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e3fe00]/10 text-[#e3fe00]"><ShoppingBag size={17} /></div><p className="text-sm font-bold">#{order.id}</p></div><div className="min-w-[160px] flex-1"><p className="text-sm font-bold">{order.customer}</p><p className="mt-1 text-xs text-white/35">{order.items} • 1.4 كم</p></div><span className="text-sm font-black">{order.total.toLocaleString('ar-YE')} {CURRENCY}</span><span className="rounded-full bg-[#e3fe00]/10 px-3 py-1 text-[10px] font-black text-[#e3fe00]">{order.status}</span><button onClick={() => onUpdate(order.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/60 hover:border-[#e3fe00]">{order.status === 'جديد' ? 'استلام وتجهيز' : 'تحديث الحالة'}</button></div>)}</div>; }
function ProductsManage() { const [showAdd, setShowAdd] = useState(false); return <section><div className="flex items-end justify-between"><div><p className="text-sm text-white/40">متجرك، بطريقتك</p><h1 className="mt-1 text-3xl font-black">إدارة المنتجات</h1></div><button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-[#e3fe00] px-4 py-3 text-sm font-black text-black"><Plus size={17} /> إضافة منتج جديد</button></div><div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <div key={product.id} className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5"><ShoppingBag size={24} className="text-[#e3fe00]" /></div><div><h3 className="font-bold">{product.name}</h3><p className="mt-1 text-xs text-white/40">{product.price.toLocaleString('ar-YE')} {CURRENCY}</p></div></div><div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-xs text-white/40"><span>{product.description}</span><button className="font-bold text-[#e3fe00]">تعديل</button></div></div>)}</div>{showAdd && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-5 backdrop-blur"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">إضافة منتج جديد</h2><button onClick={() => setShowAdd(false)}><X size={20} className="text-white/40" /></button></div><div className="mt-6 space-y-4"><Field label="اسم المنتج" value="" onChange={() => undefined} placeholder="مثال: وجبة اليوم" icon={<ShoppingBag size={17} />} /><Field label="وصف المنتج" value="" onChange={() => undefined} placeholder="اكتب وصفاً مختصراً" icon={<FileText size={17} />} /><div className="rounded-xl border border-dashed border-white/20 p-5 text-center text-sm text-white/40"><Plus className="mx-auto mb-2 text-[#e3fe00]" size={22} />إضافة صورة المنتج</div><button onClick={() => setShowAdd(false)} className="w-full rounded-xl bg-[#e3fe00] py-3.5 font-black text-black">حفظ المنتج</button></div></div></div>}</section>; }

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [role, setRole] = useState<Role | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdminPath = window.location.pathname.startsWith('/admin');

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle().then(({ data: profile }) => {
          if (profile?.role) {
            const userRole = profile.role as Role;
            setRole(userRole);
            if (userRole === 'admin') setScreen('admin');
            else setScreen('app');
          }
          setLoading(false);
        });
      } else {
        if (isAdminPath) setScreen('auth');
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!currentSession) {
        setSession(null);
        setRole(null);
        setScreen(window.location.pathname.startsWith('/admin') ? 'auth' : 'welcome');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setScreen(window.location.pathname.startsWith('/admin') ? 'auth' : 'welcome');
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black"><Logo /></div>;

  // Admin route: only admin role can access
  if (screen === 'admin' && session && role === 'admin') return <AdminApp session={session} onLogout={logout} />;
  if (screen === 'app' && session && role === 'admin') return <AdminApp session={session} onLogout={logout} />;

  if (screen === 'welcome') return <Welcome onSelect={(selected) => { setRole(selected); setScreen('auth'); }} />;
  if (screen === 'auth' && role) return <Auth role={role} onBack={() => setScreen('welcome')} onSuccess={(currentSession, selectedRole) => {
    setSession(currentSession);
    setRole(selectedRole);
    if (selectedRole === 'admin') setScreen('admin');
    else setScreen('app');
  }} />;
  if (screen === 'app' && session && role === 'customer') return <CustomerApp onLogout={logout} />;
  if (screen === 'app' && session && role === 'driver') return <DriverApp onLogout={logout} />;
  if (screen === 'app' && session && role === 'merchant') return <MerchantApp onLogout={logout} />;
  return <Welcome onSelect={(selected) => { setRole(selected); setScreen('auth'); }} />;
}
