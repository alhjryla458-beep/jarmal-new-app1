export type CompanionAssetKind = 'gltf' | 'glb' | 'webm' | 'lottie' | 'svg-fallback';

export type CompanionAsset = {
  id: string;
  kind: CompanionAssetKind;
  src: string;
  version?: string;
  preload?: boolean;
  clips?: Record<string, string>;
};

export const defaultCompanionAsset: CompanionAsset = {
  id: 'jarmal-mascot-v1',
  kind: 'svg-fallback',
  src: '',
  preload: false,
  clips: {
    idle: 'idle',
    wave: 'wave',
    think: 'think',
    search: 'search',
    success: 'success',
    error: 'error',
    peek: 'peek',
    enterBottom: 'enterBottom',
    enterSide: 'enterSide',
    jump: 'jump',
    climb: 'climb',
    rideBike: 'rideBike',
    deliver: 'deliver',
    celebrate: 'celebrate',
    exit: 'exit'
  }
};

/**
 * Contract for the approved 3D mascot.
 * The engine stays independent from a specific 3D library so the
 * approved GLB/GLTF can be lazy-loaded later.
 */
export type CompanionCharacterRuntime = {
  mount(container: HTMLElement, asset: CompanionAsset): Promise<void>;
  play(clip: string, loop?: boolean): void;
  setExpression(expression: string): void;
  setTransform(transform: { x: number; y: number; scale: number }): void;
  dispose(): void;
};
