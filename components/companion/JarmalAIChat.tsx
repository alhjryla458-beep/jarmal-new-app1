import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Send, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Role = 'customer' | 'driver' | 'merchant' | 'admin';
type Message = { id: string; from: 'user' | 'assistant'; text: string };

type Props = {
  role: Role;
  page: string;
  visible?: boolean;
};

const suggestionsByRole: Record<Role, string[]> = {
  customer: ['أين طلبي؟', 'طرق الدفع', 'أريد منتجًا', 'كيف أستخدم جَرْمَل؟'],
  driver: ['ما الطلب الجاهز؟', 'كيف أستلم الطلب؟', 'كيف أسجل التحصيل؟', 'أحتاج مساعدة'],
  merchant: ['ما الطلبات الجديدة؟', 'كيف أجهز الطلب؟', 'كيف أسحب أرباحي؟', 'أحتاج مساعدة'],
  admin: ['ما الذي يحتاج مراجعة؟', 'اشرح لي هذا القسم', 'أحتاج مساعدة'],
};

export function JarmalAIChat({ role, page, visible = true }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      from: 'assistant',
      text: 'هلا بك 👋 أنا رفيق جَرْمَل. اسألني عن جَرْمَل أو عن أي موضوع آخر، وسأحاول مساعدتك.',
    },
  ]);

  const suggestions = useMemo(() => suggestionsByRole[role], [role]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('jarmal-open-assistant', handler);
    return () => window.removeEventListener('jarmal-open-assistant', handler);
  }, []);

  const push = (from: Message['from'], text: string) => {
    setMessages((current) => [
      ...current.slice(-11),
      { id: `${Date.now()}-${from}`, from, text },
    ]);
  };

  const buildContext = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return {};

    if (role === 'customer') {
      const { data } = await supabase
        .from('orders')
        .select('id,status,total_amount,payment_status,payment_method,delivery_fee,created_at')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);
      return { recentOrders: data || [] };
    }

    if (role === 'driver') {
      const [{ data: profile }, { data: orders }] = await Promise.all([
        supabase
          .from('driver_profiles')
          .select('verification_status,is_available,current_latitude,current_longitude')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('orders')
          .select('id,status,total_amount,payment_status,payment_method,store_id,created_at')
          .eq('driver_id', userId)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);
      return { driverProfile: profile || null, recentOrders: orders || [] };
    }

    if (role === 'merchant') {
      const { data: stores } = await supabase
        .from('stores')
        .select('id,name,approval_status,is_open')
        .eq('merchant_id', userId)
        .limit(10);
      const storeIds = (stores || []).map((store) => store.id);
      let orders: unknown[] = [];
      if (storeIds.length) {
        const { data } = await supabase
          .from('orders')
          .select('id,status,total_amount,payment_status,payment_method,store_id,created_at')
          .in('store_id', storeIds)
          .order('created_at', { ascending: false })
          .limit(8);
        orders = data || [];
      }
      return { stores: stores || [], recentOrders: orders };
    }

    return {};
  };

  const send = async (raw: string) => {
    const value = raw.trim();
    if (!value || busy) return;

    setInput('');
    push('user', value);
    setBusy(true);

    try {
      const context = await buildContext();
      const history = messages.slice(-8).map((item) => ({
        role: item.from,
        text: item.text,
      }));

      const { data, error } = await supabase.functions.invoke('jarmal-ai', {
        body: { message: value, role, page, context, history },
      });

      if (error) throw error;

      push(
        'assistant',
        data?.reply ||
          'أستطيع مساعدتك في وظائف جَرْمَل، لكن خدمة المحادثة الذكية غير مفعلة على الخادم حاليًا.'
      );
    } catch {
      push('assistant', 'تعذر الوصول إلى رفيق جَرْمَل الآن. حاول مرة أخرى بعد قليل.');
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      {open && (
        <div
          className="jarmal-assistant-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {open && (
        <section
          className="jarmal-assistant-panel"
          dir="rtl"
          role="dialog"
          aria-label="محادثة رفيق جَرْمَل"
        >
          <header className="jarmal-assistant-head">
            <div className="jarmal-assistant-avatar" aria-hidden="true">
              <Sparkles size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2>رفيق جَرْمَل</h2>
                <span>متاح</span>
              </div>
              <p>مساعدك في جَرْمَل والأسئلة العامة</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="jarmal-assistant-close"
              aria-label="إغلاق"
            >
              <X size={19} />
            </button>
          </header>

          <div className="jarmal-assistant-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`jarmal-assistant-message ${message.from === 'user' ? 'is-user' : 'is-assistant'}`}
              >
                {message.text}
              </div>
            ))}
            {busy && (
              <div className="jarmal-assistant-typing">
                <span />
                <span />
                <span />
                أفكر وأبحث لك...
              </div>
            )}
          </div>

          <div className="jarmal-assistant-suggestions">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => void send(suggestion)}>
                {suggestion}
                <ChevronLeft size={14} />
              </button>
            ))}
          </div>

          <form
            className="jarmal-assistant-input"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <Sparkles size={17} />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="اسأل رفيق جَرْمَل أي شيء..."
              aria-label="اسأل رفيق جَرْمَل أي شيء"
            />
            <button type="submit" disabled={!input.trim() || busy} aria-label="إرسال">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`jarmal-assistant-launcher ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="فتح محادثة رفيق جَرْمَل"
      >
        <span className="jarmal-assistant-launcher-icon">
          <Sparkles size={21} />
        </span>
        <span className="jarmal-assistant-launcher-copy">
          <strong>رفيق جَرْمَل</strong>
          <small>اسألني أي شيء</small>
        </span>
      </button>
    </>
  );
}
