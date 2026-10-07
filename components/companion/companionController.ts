import type { CompanionAnimation, CompanionContext } from './companionEngine';

export type CompanionCommand =
  | { type: 'enter'; direction?: 'bottom' | 'side' }
  | { type: 'wave' }
  | { type: 'think' }
  | { type: 'search' }
  | { type: 'peek' }
  | { type: 'jump' }
  | { type: 'climb' }
  | { type: 'rideBike' }
  | { type: 'deliver' }
  | { type: 'celebrate' }
  | { type: 'exit' };

export type CompanionMotionState = {
  animation: CompanionAnimation;
  expression: 'idle' | 'happy' | 'thinking' | 'searching' | 'surprised' | 'success' | 'apology' | 'delivery';
  visible: boolean;
  x: number;
  y: number;
  scale: number;
};

const base: CompanionMotionState = {
  animation: 'idle',
  expression: 'idle',
  visible: true,
  x: 0,
  y: 0,
  scale: 1
};

export function commandToMotion(command: CompanionCommand, context: CompanionContext): CompanionMotionState {
  const reduced = Boolean(context.reducedMotion);
  const animation: CompanionAnimation =
    command.type === 'enter' ? (command.direction === 'side' ? 'enterSide' : 'enterBottom') :
    command.type === 'rideBike' ? 'rideBike' :
    command.type;

  const expression: CompanionMotionState['expression'] =
    command.type === 'think' ? 'thinking' :
    command.type === 'search' ? 'searching' :
    command.type === 'celebrate' || command.type === 'wave' ? 'happy' :
    command.type === 'deliver' ? 'delivery' :
    command.type === 'exit' ? 'idle' : 'idle';

  return {
    ...base,
    animation,
    expression,
    visible: command.type !== 'exit',
    scale: reduced ? 1 : command.type === 'jump' ? 1.03 : command.type === 'celebrate' ? 1.04 : 1
  };
}

export class CompanionController {
  private listeners = new Set<(state: CompanionMotionState) => void>();
  private state: CompanionMotionState = base;

  subscribe(listener: (state: CompanionMotionState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private emit(state: CompanionMotionState) {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  command(command: CompanionCommand, context: CompanionContext) {
    this.emit(commandToMotion(command, context));
    const duration = context.reducedMotion ? 0 : command.type === 'celebrate' ? 1200 : command.type === 'exit' ? 700 : 850;
    if (duration > 0 && command.type !== 'exit') {
      window.setTimeout(() => this.emit({ ...base, animation: 'idle' }), duration);
    }
  }

  enter(context: CompanionContext, direction: 'bottom' | 'side' = 'bottom') { this.command({ type: 'enter', direction }, context); }
  wave(context: CompanionContext) { this.command({ type: 'wave' }, context); }
  think(context: CompanionContext) { this.command({ type: 'think' }, context); }
  search(context: CompanionContext) { this.command({ type: 'search' }, context); }
  peek(context: CompanionContext) { this.command({ type: 'peek' }, context); }
  jump(context: CompanionContext) { this.command({ type: 'jump' }, context); }
  climb(context: CompanionContext) { this.command({ type: 'climb' }, context); }
  rideBike(context: CompanionContext) { this.command({ type: 'rideBike' }, context); }
  deliver(context: CompanionContext) { this.command({ type: 'deliver' }, context); }
  celebrate(context: CompanionContext) { this.command({ type: 'celebrate' }, context); }
  exit(context: CompanionContext) { this.command({ type: 'exit' }, context); }
}

export const companionController = new CompanionController();
