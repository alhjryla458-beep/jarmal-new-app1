import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function AppDesignRuntime() {
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from('app_design_settings').select('published').eq('id', 1).maybeSingle();
      if (!active || !data?.published) return;
      const design = data.published as Record<string, unknown>;
      const root = document.documentElement;
      const colors: Record<string, string> = {
        primaryColor: '--jarmal-primary',
        secondaryColor: '--jarmal-secondary',
        accentColor: '--jarmal-lime',
        surfaceColor: '--jarmal-surface',
        backgroundColor: '--jarmal-bg',
        textColor: '--jarmal-ink',
      };
      for (const [key, variable] of Object.entries(colors)) {
        const value = design[key];
        if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) root.style.setProperty(variable, value);
      }
      const radius = Number(design.borderRadius);
      if (Number.isFinite(radius)) root.style.setProperty('--jarmal-radius', Math.max(8, Math.min(28, radius)) + 'px');
      const fonts: Record<string, string> = { Tajawal: 'Tajawal, Cairo, system-ui, sans-serif', Cairo: 'Cairo, Tajawal, system-ui, sans-serif', 'system-ui': 'system-ui, sans-serif' };
      if (typeof design.fontFamily === 'string' && fonts[design.fontFamily]) root.style.setProperty('--jarmal-font', fonts[design.fontFamily]);
    };
    void load();
    return () => { active = false; };
  }, []);
  return null;
}
