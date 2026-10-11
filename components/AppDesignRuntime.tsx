import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function AppDesignRuntime() {
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from('app_design_public').select('published').eq('id', 1).maybeSingle();
      if (!active || !data?.published) return;
      const design = data.published as Record<string, unknown>;
      const roots = document.querySelectorAll('.jarmal-app');
      if (!roots.length) return;
      const colors: Record<string, string> = {
        primaryColor: '--jarmal-primary',
        secondaryColor: '--jarmal-secondary',
        accentColor: '--jarmal-lime',
        surfaceColor: '--jarmal-surface',
        backgroundColor: '--jarmal-bg',
        textColor: '--jarmal-ink',
      };
      roots.forEach((node) => {
        const root = node as HTMLElement;
        for (const [key, variable] of Object.entries(colors)) {
          const value = design[key];
          if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) root.style.setProperty(variable, value);
        }
        const radius = Number(design.borderRadius);
        if (Number.isFinite(radius)) root.style.setProperty('--jarmal-radius', Math.max(8, Math.min(28, radius)) + 'px');
        const fonts: Record<string, string> = { Tajawal: 'Tajawal, Cairo, system-ui, sans-serif', Cairo: 'Cairo, Tajawal, system-ui, sans-serif', 'system-ui': 'system-ui, sans-serif' };
        if (typeof design.fontFamily === 'string' && fonts[design.fontFamily]) root.style.setProperty('--jarmal-font', fonts[design.fontFamily]);
        root.style.setProperty('--jarmal-compact', design.compactMode === true ? '1' : '0');
      });
    };
    void load();
    return () => { active = false; };
  }, []);
  return null;
}
