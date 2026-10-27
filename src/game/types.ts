import { Fraction, Problem } from './fraction.ts';

export type GameView = 'START' | 'PLAYING' | 'RESULT';

export interface CapsuleEntity {
  id: number;
  angle: number; // Angle around track in radians
  fraction: Fraction;
  isCorrect: boolean;
  x: number;
  y: number;
  radius: number;
  scale: number;
  colorScheme: {
    cap: string;
    body: string;
    glow: string;
  };
}

export type ClawState = 'IDLE' | 'DROPPING' | 'GRABBING' | 'RETRACTING';

export interface CraneState {
  x: number;
  railY: number;
  clawY: number;
  minX: number;
  maxX: number;
  dropSpeed: number;
  retractSpeed: number;
  moveSpeed: number;
  state: ClawState;
  grabbedCapsule: CapsuleEntity | null;
  clawAngle: number; // For claw opening/closing animation
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface GameStats {
  score: number;
  correctCount: number;
  wrongCount: number;
  combo: number;
  maxCombo: number;
  timeRemaining: number;
  mistakesByType: Record<string, number>;
}
