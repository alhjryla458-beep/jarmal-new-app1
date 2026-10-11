import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function AppDesignRuntime() {
  useEffect(() => {
    let active = true;
    let design: Record<string, unknown> | null = null;
    const colors: Record<string, string> = {
      primaryColor: '--jarmal-primary',
      secondaryColor: '--jarmal-secondary',
      accentColor: '--jarmal-lime',
      surfaceColor: '--jarmal-surface',
      backgroundColor: '--jarmal-bg',
      textColor: '--jarmal-ink',
    };
    const applyTo = (node: Element) => {
      if (!(node instanceof HTMLElement) || !design) return;
      const root = node;
      for (const [key, variable] of Object.entries(colors)) {
        const value = design[key];
        if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) root.style.setProperty(variable, value);
      }
      const surfaceColor = design.surfaceColor;
      if (typeof surfaceColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(surfaceColor)) {
        const red = parseInt(surfaceColor.slice(1, 3), 16);
        const green = parseInt(surfaceColor.slice(3, 5), 16);
        const blue = parseInt(surfaceColor.slice(5, 7), 16);
        const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
        root.style.setProperty('--jarmal-card-ink', brightness >= 150 ? '#171a1f' : '#f7faff');
      }
      const radius = Number(design.borderRadius);
      if (Number.isFinite(radius)) root.style.setProperty('--jarmal-radius', Math.max(8, Math.min(28, radius)) + 'px');
      const fonts: Record<string, string> = { Tajawal: 'Tajawal, Cairo, system-ui, sans-serif', Cairo: 'Cairo, Tajawal, system-ui, sans-serif', 'system-ui': 'system-ui, sans-serif' };
      if (typeof design.fontFamily === 'string' && fonts[design.fontFamily]) root.style.setProperty('--jarmal-font', fonts[design.fontFamily]);
      root.dataset.compact = design.compactMode === true ? 'true' : 'false';
    };
    const applyAll = () => {
      document.querySelectorAll('.jarmal-app').forEach(applyTo);
      if (typeof design?.brandName === 'string' && design.brandName.trim()) {
        document.querySelectorAll<HTMLElement>('[data-jarmal-brand]').forEach((label) => {
          if (label.textContent !== design?.brandName) label.textContent = design?.brandName || '';
        });
      }
    };
    const load = async () => {
      const { data, error } = await supabase.from('app_design_public').select('published').eq('id', 1).maybeSingle();
      if (!active || error || !data?.published) return;
      design = data.published as Record<string, unknown>;
      applyAll();
    };
    const observer = new MutationObserver(() => applyAll());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    void load();
    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);
  return null;
}
