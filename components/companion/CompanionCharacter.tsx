import { useEffect, useState, type CSSProperties } from 'react';
import { Bike, Package, Search, Sparkles } from 'lucide-react';
import type { CompanionContext } from './companionEngine';
import type { CompanionMotionState } from './companionController';
import './companionCharacter.css';

type Props = {
  context: CompanionContext;
  motion: CompanionMotionState;
  onClick?: () => void;
};

export function CompanionCharacter({ context, motion, onClick }: Props) {
  const [look, setLook] = useState(0);

  useEffect(() => {
    if (context.reducedMotion) return;
    const timer = window.setInterval(() => setLook((value) => value === 0 ? 1 : value === 1 ? -1 : 0), 2600);
    return () => window.clearInterval(timer);
  }, [context.reducedMotion]);

  const cls = ['jc-runtime-character', 'jc-motion-' + motion.animation, 'jc-expression-' + motion.expression].join(' ');

  return (
    <button type="button" className={cls} onClick={onClick} aria-label="رفيق جَرْمَل" style={{ '--jc-scale': motion.scale } as CSSProperties}>
      <span className="jc3-shadow" />
      <span className="jc3-bike">{context.role === 'driver' && <Bike size={42} />}</span>
      <span className="jc3-helmet" />
      <span className="jc3-head" style={{ transform: 'translateX(' + (look * 2) + 'px)' }}>
        <span className="jc3-eye jc3-eye-a" />
        <span className="jc3-eye jc3-eye-b" />
        <span className="jc3-brow jc3-brow-a" />
        <span className="jc3-brow jc3-brow-b" />
        <span className="jc3-mouth" />
      </span>
      <span className="jc3-neck" />
      <span className="jc3-thobe" />
      <span className="jc3-arm jc3-arm-a" />
      <span className="jc3-arm jc3-arm-b" />
      <span className="jc3-box"><Package size={18} /><b>J</b></span>
      {motion.animation === 'search' && <span className="jc3-badge"><Search size={17} /></span>}
      {motion.animation === 'celebrate' && <span className="jc3-spark"><Sparkles size={20} /></span>}
    </button>
  );
}
