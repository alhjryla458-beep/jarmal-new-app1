import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [dragPosition, setDragPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    try {
      const saved = window.localStorage.getItem('jarmal-companion-position-v2');
      if (saved) {
        const parsed = JSON.parse(saved) as { x?: number; y?: number };
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          return {
            x: Math.max(8, Math.min(window.innerWidth - 104, parsed.x as number)),
            y: Math.max(8, Math.min(window.innerHeight - 150, parsed.y as number)),
          };
        }
      }
    } catch { /* Ignore unavailable or invalid local position data. */ }
    return {
      x: typeof window === 'undefined' ? 0 : Math.max(8, window.innerWidth - 112),
      y: typeof window === 'undefined' ? 0 : Math.max(8, window.innerHeight - 238),
    };
  });
  const dragStart = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  useEffect(() => {
    try { window.localStorage.setItem('jarmal-companion-position-v2', JSON.stringify(dragPosition)); }
    catch { /* Position persistence is optional on restricted browsers. */ }
  }, [dragPosition]);

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

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragStart.current) return;
      event.preventDefault();
      const dx = event.clientX - dragStart.current.pointerX;
      const dy = event.clientY - dragStart.current.pointerY;
      if (Math.abs(dx) + Math.abs(dy) > 5) didDrag.current = true;
      const width = 96;
      const height = 150;
      setDragPosition({
        x: Math.max(4, Math.min(window.innerWidth - width - 4, dragStart.current.x + dx)),
        y: Math.max(4, Math.min(window.innerHeight - height - 4, dragStart.current.y + dy)),
      });
    };
    const stop = () => {
      if (dragStart.current) dragStart.current = null;
      if (didDrag.current) window.setTimeout(() => { didDrag.current = false; }, 350);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  if (context.enabled === false || !motion.visible) return null;

  const handleOpen = () => {
    if (didDrag.current) { didDrag.current = false; return; }
    if (!bridgeToAssistant) setOpen(true);
    setMessage(decideCompanion({ type: 'open_assistant' }, runtimeContext).message);
    companionController.wave(runtimeContext);
    onOpen?.();
  };

  return (
    <div
      className={(compact ? 'jarmal-companion jc-compact' : 'jarmal-companion') + (dragStart.current ? ' jc-dragging' : '')}
      dir="rtl"
      style={{ left: `${dragPosition.x}px`, top: `${dragPosition.y}px`, right: 'auto', bottom: 'auto' }}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.jc-runtime-character, .jc-character')) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, x: dragPosition.x, y: dragPosition.y };
        didDrag.current = false;
      }}
    >
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
