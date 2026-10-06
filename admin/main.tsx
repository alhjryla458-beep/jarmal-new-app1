import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import AdminApp from '@/components/AdminApp';
import { supabase } from '@/lib/supabase';
import '../index.css';

function AdminLogin() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    const normalized = phone.replace(/\D/g, '');
    if (normalized.length !== 9) {
      setError('أدخل رقم هاتف يمني صحيح مكون من 9 أرقام');
      return;
    }
    setBusy(true); setError('');
    try {
      const { error: e } = await supabase.auth.signInWithOtp({ phone: `+967${normalized}` });
      if (e) throw e;
      setPhone(normalized); setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إرسال رمز التحقق');
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (otp.length !== 6) { setError('أدخل رمز التحقق المكون من 6 أرقام'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: e } = await supabase.auth.verifyOtp({ phone: `+967${phone}`, token: otp, type: 'sms' });
      if (e) throw e;
      if (!data.session) throw new Error('تعذر إنشاء جلسة الإدارة');
      const { data: profile, error: pe } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle();
      if (pe) throw pe;
      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('هذا الحساب ليس حساب إدارة');
      }
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تسجيل الدخول');
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#171a16] px-5 py-10 text-white">
      <div className="mx-auto mt-16 max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm font-bold text-[#e3fe00]">جَرْمَل</p>
          <h1 className="mt-2 text-3xl font-black">لوحة الإدارة</h1>
          <p className="mt-2 text-sm text-white/55">دخول مخصص لفريق الإدارة فقط</p>
        </div>
        {!sent ? (
          <>
            <label className="mb-2 block text-sm font-bold">رقم الهاتف</label>
            <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,9))} inputMode="tel" placeholder="7XXXXXXXX" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[#e3fe00]" />
            <button disabled={busy} onClick={sendOtp} className="mt-4 w-full rounded-xl bg-[#e3fe00] py-3.5 font-black text-black disabled:opacity-50">{busy ? 'جارٍ الإرسال...' : 'إرسال رمز الدخول'}</button>
          </>
        ) : (
          <>
            <label className="mb-2 block text-sm font-bold">رمز التحقق</label>
            <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" placeholder="000000" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center tracking-[.4em] outline-none focus:border-[#e3fe00]" />
            <button disabled={busy} onClick={verify} className="mt-4 w-full rounded-xl bg-[#e3fe00] py-3.5 font-black text-black disabled:opacity-50">{busy ? 'جارٍ التحقق...' : 'دخول الإدارة'}</button>
            <button disabled={busy} onClick={()=>{setSent(false);setOtp('');setError('')}} className="mt-3 w-full py-2 text-sm font-bold text-white/60">تغيير الرقم</button>
          </>
        )}
        {error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      </div>
    </main>
  );
}

function AdminRoot() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { if (mounted) setChecking(false); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).maybeSingle();
      if (mounted) {
        setSession(profile?.role === 'admin' ? data.session : null);
        setChecking(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  if (checking) return <main className="min-h-screen bg-[#171a16] flex items-center justify-center text-white">جارٍ التحقق من صلاحية الإدارة...</main>;
  if (!session) return <AdminLogin />;
  return <AdminApp session={session} onLogout={() => { void supabase.auth.signOut(); setSession(null); }} />;
}

createRoot(document.getElementById('admin-root')!).render(
  <StrictMode><AdminRoot /></StrictMode>
);