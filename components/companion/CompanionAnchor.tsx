import { useEffect, useRef } from 'react';

type Props = {
  name: string;
  className?: string;
  children: React.ReactNode;
};

export function CompanionAnchor({ name, className = '', children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.dataset.companionAnchor = name;
    return () => {
      delete node.dataset.companionAnchor;
    };
  }, [name]);

  return <div ref={ref} className={className} data-companion-anchor={name}>{children}</div>;
}

export function getCompanionAnchor(name: string): DOMRect | null {
  if (typeof document === 'undefined') return null;
  const node = document.querySelector<HTMLElement>('[data-companion-anchor="' + name + '"]');
  return node?.getBoundingClientRect() ?? null;
}
