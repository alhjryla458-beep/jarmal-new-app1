import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { type CompanionContext, type CompanionEvent, decideCompanion, companionEventName } from './companionEngine';
import { companionController, type CompanionMotionState } from './companionController';
import { CompanionCharacter } from './CompanionCharacter';
import './jarmalCompanion.css';

type Props = {
  context: CompanionContext;
  onOpen?: () => void;
  compact?: boolean;
  bridgeToAssistant?: boolean;
};

export function JarmalCompanion({ context, onOpen, compact = false, bridgeToAssistant = false }: Props) {
  const [open, setOpen] = useState(false);
  const [motion, setMotion] = useState<CompanionMotionState>({
    animation: 'idle', expression: 'idle', visible: true, x: 0, y: 0, scale: 1
  });
  const [message, setMessage] = useState<string | undefined>();

  const reducedMotion = context.reducedMotion ?? (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) ?? false;
  const runtimeContext = useMemo(() => ({ ...context, reducedMotion }), [context, reducedMotion]);

  useEffect(() => {
    const unsubscribe = companionController.subscribe(setMotion);
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    const listeners: Array<[string, EventListener]> = [];
    const events: CompanionEvent['type'][] = ['open_assistant', 'success', 'error', 'notification', 'order_update', 'page_enter'];
    events.forEach((type) => {
      const handler: EventListener = (event) => {
        const detail = (event as CustomEvent<CompanionEvent>).detail;
        if (!detail) return;
        const decision = decideCompanion(detail, runtimeContext);
        setMessage(decision.message);
        const command = decision.animation === 'enterBottom'
          ? { type: 'enter' as const, direction: 'bottom' as const }
          : decision.animation === 'enterSide'
            ? { type: 'enter' as const, direction: 'side' as const }
            : decision.animation === 'success'
              ? { type: 'celebrate' as const }
              : decision.animation === 'error'
                ? { type: 'think' as const }
                : decision.animation === 'idle'
                  ? null
                  : ({ type: decision.animation } as Parameters<typeof companionController.command>[0]);
        if (command) companionController.command(command, runtimeContext);
      };
      const name = companionEventName({ type } as CompanionEvent);
      window.addEventListener(name, handler);
      listeners.push([name, handler]);
    });
    return () => listeners.forEach(([name, handler]) => window.removeEventListener(name, handler));
  }, [runtimeContext]);

  useEffect(() => {
    const decision = decideCompanion({ type: 'page_enter', page: context.page }, runtimeContext);
    setMessage(decision.message);
    companionController.command({ type: decision.animation === 'enterSide' ? 'enter' : 'enter', direction: decision.animation === 'enterSide' ? 'side' : 'bottom' }, runtimeContext);
  }, [context.page, runtimeContext]);

  if (context.enabled === false || !motion.visible) return null;

  const handleOpen = () => {
    if (!bridgeToAssistant) setOpen(true);
    setMessage(decideCompanion({ type: 'open_assistant' }, runtimeContext).message);
    companionController.wave(runtimeContext);
    onOpen?.();
  };

  return (
    <div className={compact ? 'jarmal-companion jc-compact' : 'jarmal-companion'} dir="rtl">
      {!compact && message && !open && <div className="jc-speech" role="status">{message}</div>}
      <CompanionCharacter context={runtimeContext} motion={motion} onClick={handleOpen} />

      {!bridgeToAssistant && open && (
        <div className="jc-panel" role="dialog" aria-label="رفيق جَرْمَل">
          <div className="jc-panel-head">
            <div><strong>رفيق جَرْمَل</strong><small>المحرك التفاعلي لرفيق جَرْمَل</small></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={17} /></button>
          </div>
          <div className="jc-panel-character">
            <CompanionCharacter context={runtimeContext} motion={motion} />
          </div>
          <p>{message || 'أبشر يا صديقي، كيف أساعدك؟'}</p>
        </div>
      )}
    </div>
  );
}
