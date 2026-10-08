export type CompanionRole = 'customer' | 'merchant' | 'driver' | 'admin';
export type CompanionAnimation =
  | 'idle' | 'wave' | 'think' | 'search' | 'success' | 'error'
  | 'peek' | 'enterBottom' | 'enterSide' | 'jump' | 'climb'
  | 'walk' | 'run' | 'sit' | 'point' | 'usePhone' | 'carryBox' | 'apologize'
  | 'rideBike' | 'deliver' | 'celebrate' | 'exit';

export type CompanionContext = {
  role: CompanionRole;
  page: string;
  section?: string;
  orderId?: string | null;
  storeId?: string | null;
  hasActiveOrder?: boolean;
  reducedMotion?: boolean;
  enabled?: boolean;
};

export type CompanionEvent =
  | { type: 'page_enter'; page: string }
  | { type: 'open_assistant' }
  | { type: 'success'; message?: string }
  | { type: 'error'; message?: string }
  | { type: 'notification'; message?: string }
  | { type: 'order_update'; orderId?: string };

export type CompanionDecision = {
  animation: CompanionAnimation;
  message?: string;
  durationMs: number;
  interactive: boolean;
};

const pageMessages: Record<string, string> = {
  home: 'أبشر يا صديقي، كيف أساعدك؟',
  orders: 'خلني أساعدك في متابعة طلبك.',
  services: 'أبشر، خلنا نشوف الخدمات المتاحة.',
  wallet: 'أقدر أساعدك في الدفع والمحفظة.',
  notifications: 'عندك تنبيهات؟ خلني أساعدك.',
  settings: 'إذا احتجت شيئًا من الإعدادات أنا معك.'
};

export function decideCompanion(event: CompanionEvent, context: CompanionContext): CompanionDecision {
  if (context.enabled === false) return { animation: 'idle', durationMs: 0, interactive: false };
  if (context.reducedMotion) {
    if (event.type === 'success') return { animation: 'success', message: event.message, durationMs: 350, interactive: true };
    if (event.type === 'error') return { animation: 'apologize', message: event.message, durationMs: 350, interactive: true };
    return { animation: 'idle', message: pageMessages[context.page], durationMs: 250, interactive: true };
  }

  switch (event.type) {
    case 'open_assistant': return { animation: 'wave', message: pageMessages[context.page], durationMs: 900, interactive: true };
    case 'success': return { animation: 'celebrate', message: event.message, durationMs: 1300, interactive: true };
    case 'error': return { animation: 'apologize', message: event.message, durationMs: 1000, interactive: true };
    case 'notification': return { animation: 'peek', message: event.message, durationMs: 900, interactive: true };
    case 'order_update': return { animation: context.hasActiveOrder ? 'deliver' : 'wave', durationMs: 1100, interactive: true };
    case 'page_enter':
      if (context.page === 'orders' && context.hasActiveOrder) return { animation: 'rideBike', message: 'طلبك في المتابعة، خلني أساعدك.', durationMs: 1200, interactive: true };
      if (context.page === 'home') return { animation: 'enterBottom', message: pageMessages.home, durationMs: 900, interactive: true };
      if (context.page === 'services') return { animation: 'search', message: pageMessages.services, durationMs: 900, interactive: true };
      if (context.page === 'wallet') return { animation: 'usePhone', message: pageMessages.wallet, durationMs: 900, interactive: true };
      if (context.page === 'notifications') return { animation: 'peek', message: pageMessages.notifications, durationMs: 900, interactive: true };
      if (context.page === 'settings') return { animation: 'think', message: pageMessages.settings, durationMs: 900, interactive: true };
      return { animation: 'enterSide', message: pageMessages[context.page], durationMs: 800, interactive: true };
  }
}

export function companionEventName(event: CompanionEvent): string {
  return 'jarmal:companion:' + event.type;
}

export function emitCompanionEvent(event: CompanionEvent): void {
  window.dispatchEvent(new CustomEvent(companionEventName(event), { detail: event }));
}
