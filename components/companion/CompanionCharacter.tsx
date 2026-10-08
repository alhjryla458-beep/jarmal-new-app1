import { useEffect, useState, type CSSProperties } from 'react';
import { Bike, Package, Phone, Search, Sparkles } from 'lucide-react';
import type { CompanionContext } from './companionEngine';
import type { CompanionMotionState } from './companionController';
import './companionCharacter.css';

type Props = {
  context: CompanionContext;
  motion: CompanionMotionState;
  onClick?: () => void;
};

/**
 * JARMAL Companion visual identity.
 * The runtime character intentionally uses the approved young JARMAL look:
 * white Yemeni thobe, red/white scarf, black/lime helmet, branded backpack,
 * black/lime sneakers and the original JARMAL mark on the gear.
 *
 * The motion/engine layer stays independent so this visual can later be
 * replaced by the approved GLB without changing the Companion API.
 */
export function CompanionCharacter({ context, motion, onClick }: Props) {
  const [look, setLook] = useState(0);

  useEffect(() => {
    if (context.reducedMotion) return;
    const timer = window.setInterval(() => setLook((value) => value === 0 ? 1 : value === 1 ? -1 : 0), 2600);
    return () => window.clearInterval(timer);
  }, [context.reducedMotion]);

  const cls = [
    'jc-runtime-character',
    'jc-motion-' + motion.animation,
    'jc-expression-' + motion.expression,
  ].join(' ');

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      aria-label="مساعد جَرْمَل"
      style={{ '--jc-scale': motion.scale } as CSSProperties}
    >
      <span className="jc3-shadow" />

      <span className="jc3-backpack" aria-hidden="true">
        <img src="/jarmal-logo.svg" alt="" />
        <span className="jc3-backpack-label">معا جَرْمَل توصيل اسهل</span>
      </span>

      <span className="jc3-shoulder jc3-shoulder-a" />
      <span className="jc3-shoulder jc3-shoulder-b" />

      <span className="jc3-helmet" aria-hidden="true">
        <img src="/jarmal-logo.svg" alt="" />
      </span>

      <span className="jc3-head" style={{ transform: 'translateX(' + (look * 2) + 'px)' }}>
        <span className="jc3-hair" />
        <span className="jc3-ear jc3-ear-a" />
        <span className="jc3-ear jc3-ear-b" />
        <span className="jc3-eye jc3-eye-a" />
        <span className="jc3-eye jc3-eye-b" />
        <span className="jc3-brow jc3-brow-a" />
        <span className="jc3-brow jc3-brow-b" />
        <span className="jc3-nose" />
        <span className="jc3-mouth" />
      </span>

      <span className="jc3-scarf" aria-hidden="true">
        <span />
        <span />
      </span>

      <span className="jc3-neck" />
      <span className="jc3-thobe" />
      <span className="jc3-belt" aria-hidden="true" />
      <span className="jc3-dagger" aria-hidden="true" />

      <span className="jc3-arm jc3-arm-a" />
      <span className="jc3-arm jc3-arm-b" />

      <span className="jc3-hand jc3-hand-a" />
      <span className="jc3-hand jc3-hand-b" />

      <span className="jc3-leg jc3-leg-a" />
      <span className="jc3-leg jc3-leg-b" />
      <span className="jc3-shoe jc3-shoe-a" />
      <span className="jc3-shoe jc3-shoe-b" />

      {context.role === 'driver' && <span className="jc3-bike"><Bike size={40} /></span>}
      {motion.animation === 'search' && <span className="jc3-badge"><Search size={17} /></span>}
      {motion.animation === 'celebrate' && <span className="jc3-spark"><Sparkles size={20} /></span>}
      {(motion.animation === 'deliver' || motion.animation === 'carryBox') && <span className="jc3-delivery-package"><Package size={17} /></span>}
      {motion.animation === 'usePhone' && <span className="jc3-phone"><Phone size={18} /></span>}
    </button>
  );
}
