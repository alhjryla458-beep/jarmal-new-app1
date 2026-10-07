import { useEffect, useMemo, useState } from 'react';
import { Bike, Search, Sparkles, X } from 'lucide-react';
import {
  type CompanionAnimation,
  type CompanionContext,
  type CompanionEvent,
  decideCompanion,
  companionEventName
} from './companionEngine';
import './jarmalCompanion.css';

type Props = {
  context: CompanionContext;
  onOpen?: () => void;
  compact?: boolean;
  bridgeToAssistant?: boolean;
};

const animationClass: Record<CompanionAnimation, string> = {
  idle: 'jc-idle', wave: 'jc-wave', think: 'jc-think', search: 'jc-search',
  success: 'jc-success', error: 'jc-error', peek: 'jc-peek', enterBottom: 'jc-enter-bottom',
  enterSide: 'jc-enter-side', jump: 'jc-jump', climb: 'jc-climb', rideBike: 'jc-ride-bike',
  deliver: 'jc-deliver', celebrate: 'jc-celebrate', exit: 'jc-exit'
};

export default function JarmalCompanion({ context, onOpen, compact = false, bridgeToAssistant = false }: Props) {
  const [open, setOpen] = useState(false);
  const [animation, setAnimation] = useState<CompanionAnimation>('idle');
  const [message, setMessage] = useState<string | undefined>();

  const reducedMotion = context.reducedMotion ?? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ?? false;
  const runtimeContext = useMemo(() => ({ ...context, reducedMotion }), [context, reducedMotion]);

  useEffect(() => {
    const listeners: Array<[string, EventListener]> = [];
    const events: CompanionEvent['type'][] = ['open_assistant', 'success', 'error', 'notification', 'order_update', 'page_enter'];
    events.forEach((type) => {
      const handler: EventListener = (event) => {
        const detail = (event as CustomEvent<CompanionEvent>).detail;
        if (!detail) return;
        const decision = decideCompanion(detail, runtimeContext);
        setAnimation(decision.animation);
        setMessage(decision.message);
        window.setTimeout(() => setAnimation('idle'), decision.durationMs);
      };
      const name = companionEventName({ type } as CompanionEvent);
      window.addEventListener(name, handler);
      listeners.push([name, handler]);
    });
    return () => listeners.forEach(([name, handler]) => window.removeEventListener(name, handler));
  }, [runtimeContext]);

  useEffect(() => {
    const decision = decideCompanion({ type: 'page_enter', page: context.page }, runtimeContext);
    setAnimation(decision.animation);
    setMessage(decision.message);
    const timer = window.setTimeout(() => setAnimation('idle'), decision.durationMs);
    return () => window.clearTimeout(timer);
  }, [context.page, runtimeContext]);

  if (context.enabled === false) return null;

  const handleOpen = () => {
    if (!bridgeToAssistant) setOpen(true);
    const decision = decideCompanion({ type: 'open_assistant' }, runtimeContext);
    setAnimation(decision.animation);
    setMessage(decision.message);
    onOpen?.();
  };

  const characterClass = 'jc-character ' + animationClass[animation];
  const panelCharacterClass = 'jc-character jc-panel-mascot ' + animationClass[animation];

  return (
    <div className={compact ? 'jarmal-companion jc-compact' : 'jarmal-companion'} dir="rtl">
      {!compact && message && !open && <div className="jc-speech" role="status">{message}</div>}

      <button type="button" className={characterClass} onClick={handleOpen} aria-label="فتح رفيق جَرْمَل">
        <span className="jc-shadow" />
        <span className="jc-helmet" />
        <span className="jc-head"><span className="jc-eye jc-eye-a" /><span className="jc-eye jc-eye-b" /><span className="jc-smile" /></span>
        <span className="jc-body" />
        <span className="jc-thobe" />
        <span className="jc-box">J</span>
        <span className="jc-arm jc-arm-a" />
        <span className="jc-arm jc-arm-b" />
        {context.role === 'driver' && <span className="jc-bike"><Bike size={22} /></span>}
        {animation === 'search' && <span className="jc-search-badge"><Search size={15} /></span>}
        {animation === 'celebrate' && <span className="jc-spark"><Sparkles size={18} /></span>}
      </button>

      {!bridgeToAssistant && open && (
        <div className="jc-panel" role="dialog" aria-label="رفيق جَرْمَل">
          <div className="jc-panel-head">
            <div><strong>رفيق جَرْمَل</strong><small>الشخصية المساعدة</small></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={17} /></button>
          </div>
          <div className="jc-panel-character">
            <div className={panelCharacterClass}>
              <span className="jc-shadow"/><span className="jc-helmet"/>
              <span className="jc-head"><span className="jc-eye jc-eye-a"/><span className="jc-eye jc-eye-b"/><span className="jc-smile"/></span>
              <span className="jc-body"/><span className="jc-thobe"/><span className="jc-box">J</span>
              <span className="jc-arm jc-arm-a"/><span className="jc-arm jc-arm-b"/>
            </div>
          </div>
          <p>{message || 'أبشر يا صديقي، كيف أساعدك؟'}</p>
        </div>
      )}
    </div>
  );
}
