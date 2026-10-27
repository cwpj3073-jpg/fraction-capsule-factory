import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Fraction,
  Problem,
  generateFractionProblem,
  areFractionsEqual,
} from '../game/fraction.ts';
import { sounds } from '../game/audio.ts';
import {
  GameView,
  CapsuleEntity,
  CraneState,
  Particle,
  FloatingText,
  GameStats,
} from '../game/types.ts';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Award,
  CheckCircle2,
  XCircle,
  Flame,
  Clock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Anchor,
  HelpCircle,
} from 'lucide-react';

export default function FractionCapsuleGame() {
  const [view, setView] = useState<GameView>('START');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(3);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);

  // Stats
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [mistakesByType, setMistakesByType] = useState<Record<string, number>>({});
  const [feedbackBanner, setFeedbackBanner] = useState<{ text: string; isCorrect: boolean } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // References for game loop to avoid tear-down
  const stateRef = useRef<{
    view: GameView;
    problem: Problem | null;
    score: number;
    combo: number;
    maxCombo: number;
    timeRemaining: number;
    correctCount: number;
    wrongCount: number;
    mistakesByType: Record<string, number>;
    trackAngle: number;
    trackSpeed: number;
    crane: CraneState;
    capsules: CapsuleEntity[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    keys: { left: boolean; right: boolean; drop: boolean };
    lastTime: number;
    feedbackTimer: number | null;
    isMobileLeft: boolean;
    isMobileRight: boolean;
    floatingIdCounter: number;
  }>({
    view: 'START',
    problem: null,
    score: 0,
    combo: 0,
    maxCombo: 0,
    timeRemaining: 60,
    correctCount: 0,
    wrongCount: 0,
    mistakesByType: {},
    trackAngle: 0,
    trackSpeed: 0.009, // smooth angular rotation
    crane: {
      x: 450,
      railY: 70,
      clawY: 100,
      minX: 180,
      maxX: 720,
      dropSpeed: 8,
      retractSpeed: 9,
      moveSpeed: 6.5,
      state: 'IDLE',
      grabbedCapsule: null,
      clawAngle: 0.35,
    },
    capsules: [],
    particles: [],
    floatingTexts: [],
    keys: { left: false, right: false, drop: false },
    lastTime: performance.now(),
    feedbackTimer: null,
    isMobileLeft: false,
    isMobileRight: false,
    floatingIdCounter: 0,
  });

  // Track Dimensions in virtual canvas (900 x 620)
  const TRACK_CX = 450;
  const TRACK_CY = 415;
  const TRACK_RX = 270;
  const TRACK_RY = 105;

  // Initialize fresh capsules for a problem
  const setupCapsulesForProblem = useCallback((problem: Problem) => {
    const list: CapsuleEntity[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const frac = problem.options[i];
      const isCorrect = areFractionsEqual(frac, problem.answer);
      list.push({
        id: i,
        angle: (i * (2 * Math.PI)) / count,
        fraction: frac,
        isCorrect,
        x: 0,
        y: 0,
        radius: 28,
        scale: 1,
        // All capsules share the exact same aesthetic color scheme so player cannot deduce from color
        colorScheme: {
          cap: '#0284c7', // vibrant sky blue cap
          body: '#0f172a', // dark sleek body
          glow: '#38bdf8', // crisp cyan glow
        },
      });
    }
    stateRef.current.capsules = list;
  }, []);

  // Show transient feedback
  const showFeedback = (text: string, isCorrect: boolean) => {
    setFeedbackBanner({ text, isCorrect });
    if (stateRef.current.feedbackTimer) {
      window.clearTimeout(stateRef.current.feedbackTimer);
    }
    stateRef.current.feedbackTimer = window.setTimeout(() => {
      setFeedbackBanner(null);
    }, 1800);
  };

  // Start a new game
  const startGame = useCallback((selectedDifficulty?: 1 | 2 | 3) => {
    const diff = selectedDifficulty || difficulty;
    const initialProblem = generateFractionProblem(diff);

    stateRef.current.view = 'PLAYING';
    stateRef.current.problem = initialProblem;
    stateRef.current.score = 0;
    stateRef.current.combo = 0;
    stateRef.current.maxCombo = 0;
    stateRef.current.timeRemaining = 60;
    stateRef.current.correctCount = 0;
    stateRef.current.wrongCount = 0;
    stateRef.current.mistakesByType = {};
    stateRef.current.particles = [];
    stateRef.current.floatingTexts = [];
    stateRef.current.crane = {
      x: 450,
      railY: 70,
      clawY: 100,
      minX: 180,
      maxX: 720,
      dropSpeed: 8,
      retractSpeed: 9,
      moveSpeed: 6.5,
      state: 'IDLE',
      grabbedCapsule: null,
      clawAngle: 0.35,
    };

    setupCapsulesForProblem(initialProblem);

    setView('PLAYING');
    setCurrentProblem(initialProblem);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeRemaining(60);
    setCorrectCount(0);
    setWrongCount(0);
    setMistakesByType({});
    setFeedbackBanner(null);

    sounds.playSuccess(1);
  }, [difficulty, setupCapsulesForProblem]);

  // Autostart query support (?autostart=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startGame(3);
    }
  }, [startGame]);

  // Audio mute toggle
  const toggleSound = () => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        stateRef.current.keys.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        stateRef.current.keys.right = true;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        triggerDrop();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        stateRef.current.keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        stateRef.current.keys.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Trigger claw drop
  const triggerDrop = () => {
    const crane = stateRef.current.crane;
    if (stateRef.current.view !== 'PLAYING' || crane.state !== 'IDLE') return;
    crane.state = 'DROPPING';
    crane.clawAngle = 0.6; // Open wide during descent
    sounds.playDrop();
  };

  // Timer countdown loop
  useEffect(() => {
    if (view !== 'PLAYING') return;

    const timer = setInterval(() => {
      stateRef.current.timeRemaining -= 1;
      const rem = stateRef.current.timeRemaining;
      setTimeRemaining(rem);

      if (rem <= 10 && rem > 0) {
        sounds.playCountdown();
      }

      if (rem <= 0) {
        clearInterval(timer);
        stateRef.current.view = 'RESULT';
        setView('RESULT');
        sounds.playGameOver();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [view]);

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - stateRef.current.lastTime) / 1000, 0.1);
      stateRef.current.lastTime = timestamp;

      update(dt);
      render(ctx);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Game Physics & State Update
  const update = (dt: number) => {
    const st = stateRef.current;
    if (st.view !== 'PLAYING') return;

    // Rotate track
    st.trackAngle = (st.trackAngle + st.trackSpeed) % (Math.PI * 2);

    // Update capsule positions along elliptical track
    st.capsules.forEach((cap) => {
      if (st.crane.grabbedCapsule && st.crane.grabbedCapsule.id === cap.id) {
        // Position attached to claw tip
        cap.x = st.crane.x;
        cap.y = st.crane.clawY + 20;
        cap.scale = 1.1;
      } else {
        const curAngle = (st.trackAngle + cap.angle) % (Math.PI * 2);
        cap.x = TRACK_CX + Math.cos(curAngle) * TRACK_RX;
        cap.y = TRACK_CY + Math.sin(curAngle) * TRACK_RY;
        // 3D perspective depth scale: front capsules (sin > 0) are closer & larger
        cap.scale = 0.85 + ((Math.sin(curAngle) + 1) / 2) * 0.35;
      }
    });

    const crane = st.crane;

    // Crane Left/Right Movement (only when IDLE)
    if (crane.state === 'IDLE') {
      const moveLeft = st.keys.left || st.isMobileLeft;
      const moveRight = st.keys.right || st.isMobileRight;

      if (moveLeft && crane.x > crane.minX) {
        crane.x -= crane.moveSpeed;
        sounds.playMove();
      }
      if (moveRight && crane.x < crane.maxX) {
        crane.x += crane.moveSpeed;
        sounds.playMove();
      }
      crane.clawAngle = 0.35;
    }

    // Claw Drop & Retract Mechanics
    const floorLimit = TRACK_CY + TRACK_RY + 15;

    if (crane.state === 'DROPPING') {
      crane.clawY += crane.dropSpeed;

      // Real collision check: Claw tip against all ungrabbed capsules
      // Test when claw is in the vertical range of the track
      if (crane.clawY >= TRACK_CY - TRACK_RY - 25) {
        let hitCapsule: CapsuleEntity | null = null;
        let minDistance = Infinity;

        for (const cap of st.capsules) {
          const dx = crane.x - cap.x;
          const dy = crane.clawY - (cap.y - 10);
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Capsule collision radius depends on its scale
          const hitRadius = cap.radius * cap.scale + 14;
          if (dist <= hitRadius && dist < minDistance) {
            minDistance = dist;
            hitCapsule = cap;
          }
        }

        if (hitCapsule) {
          // Grab success!
          crane.grabbedCapsule = hitCapsule;
          crane.state = 'GRABBING';
          crane.clawAngle = 0.12; // Clamp shut
          sounds.playGrab();

          // After momentary grasp clamp, start retracting
          setTimeout(() => {
            if (st.crane.state === 'GRABBING') {
              st.crane.state = 'RETRACTING';
            }
          }, 120);
        }
      }

      // Reached lowest boundary without hitting anything
      if (crane.clawY >= floorLimit && crane.state === 'DROPPING') {
        crane.clawAngle = 0.15; // Clack empty
        sounds.playGrab();
        crane.state = 'RETRACTING';
      }
    } else if (crane.state === 'RETRACTING') {
      crane.clawY -= crane.retractSpeed;
      crane.clawAngle = crane.grabbedCapsule ? 0.12 : 0.25;

      // Reached top rail
      if (crane.clawY <= crane.railY + 30) {
        crane.clawY = crane.railY + 30;

        if (crane.grabbedCapsule) {
          evaluateGrabbedCapsule(crane.grabbedCapsule);
          crane.grabbedCapsule = null;
        }

        crane.state = 'IDLE';
        crane.clawAngle = 0.35;
      }
    }

    // Update Particles
    for (let i = st.particles.length - 1; i >= 0; i--) {
      const p = st.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.life += dt;
      p.alpha = 1 - p.life / p.maxLife;
      if (p.life >= p.maxLife) {
        st.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = st.floatingTexts.length - 1; i >= 0; i--) {
      const ft = st.floatingTexts[i];
      ft.y += ft.vy;
      ft.life += dt;
      ft.alpha = 1 - ft.life / ft.maxLife;
      if (ft.life >= ft.maxLife) {
        st.floatingTexts.splice(i, 1);
      }
    }
  };

  // Evaluate the grabbed capsule
  const evaluateGrabbedCapsule = (cap: CapsuleEntity) => {
    const st = stateRef.current;
    const curProblem = st.problem;
    if (!curProblem) return;

    if (cap.isCorrect) {
      // Correct!
      const newCombo = st.combo + 1;
      const comboBonus = Math.min((newCombo - 1) * 20, 100);
      const earned = 100 + comboBonus;
      const newScore = st.score + earned;

      st.score = newScore;
      st.combo = newCombo;
      st.maxCombo = Math.max(st.maxCombo, newCombo);
      st.correctCount += 1;

      setScore(newScore);
      setCombo(newCombo);
      setMaxCombo(st.maxCombo);
      setCorrectCount(st.correctCount);

      // Sound & Visuals
      sounds.playSuccess(newCombo);
      showFeedback(`정답 캡슐 포착! +${earned}점`, true);
      spawnFloatingText(`+${earned} 정답!`, st.crane.x, st.crane.clawY - 20, '#22c55e');
      spawnParticles(st.crane.x, st.crane.clawY, '#4ade80', 25);

      // Generate next problem
      const nextProblem = generateFractionProblem(difficulty);
      st.problem = nextProblem;
      setCurrentProblem(nextProblem);
      setupCapsulesForProblem(nextProblem);
    } else {
      // Wrong!
      const penalty = 50;
      const newScore = Math.max(0, st.score - penalty);
      st.score = newScore;
      st.combo = 0;
      st.wrongCount += 1;

      // Track misconception
      const desc = curProblem.typeDescription;
      st.mistakesByType[desc] = (st.mistakesByType[desc] || 0) + 1;

      setScore(newScore);
      setCombo(0);
      setWrongCount(st.wrongCount);
      setMistakesByType({ ...st.mistakesByType });

      sounds.playWrong();
      showFeedback(`앗, 다른 캡슐이야! (${curProblem.hint})`, false);
      spawnFloatingText(`-${penalty}점`, st.crane.x, st.crane.clawY - 20, '#ef4444');
      spawnParticles(st.crane.x, st.crane.clawY, '#f87171', 14);

      // Generate next problem to keep game moving smoothly
      const nextProblem = generateFractionProblem(difficulty);
      st.problem = nextProblem;
      setCurrentProblem(nextProblem);
      setupCapsulesForProblem(nextProblem);
    }
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      stateRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        radius: 3 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
      });
    }
  };

  const spawnFloatingText = (text: string, x: number, y: number, color: string) => {
    stateRef.current.floatingIdCounter += 1;
    stateRef.current.floatingTexts.push({
      id: stateRef.current.floatingIdCounter,
      text,
      x,
      y,
      vy: -1.4,
      alpha: 1,
      color,
      life: 0,
      maxLife: 1.0,
    });
  };

  // Render Canvas
  const render = (ctx: CanvasRenderingContext2D) => {
    const st = stateRef.current;
    const w = 900;
    const h = 620;

    ctx.clearRect(0, 0, w, h);

    // 1. Factory Background & Grid Atmosphere
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.6, '#0f172a');
    bgGrad.addColorStop(1, '#0b1120');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle factory perspective depth grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 60; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 100);
      ctx.lineTo(TRACK_CX + (x - TRACK_CX) * 1.5, h);
      ctx.stroke();
    }

    // 2. Overhead Crane Rail & Support Girders
    drawOverheadRail(ctx, st.crane);

    // 3. Rotating Carousel Track
    drawTrackConveyor(ctx, st.trackAngle);

    // Sort capsules by depth (Y position) so rear ones render behind front ones
    const sortedCapsules = [...st.capsules].sort((a, b) => a.y - b.y);

    // Rear capsules (behind crane if crane is in front)
    const rearCaps = sortedCapsules.filter((c) => c.y < TRACK_CY);
    const frontCaps = sortedCapsules.filter((c) => c.y >= TRACK_CY);

    rearCaps.forEach((cap) => drawCapsule(ctx, cap));

    // 4. Crane Claw & Cable
    drawCraneAndClaw(ctx, st.crane);

    // Front capsules (closer to viewer)
    frontCaps.forEach((cap) => drawCapsule(ctx, cap));

    // 5. Particles
    st.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 6. Floating Text Alerts
    st.floatingTexts.forEach((ft) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  };

  // Draw Overhead Steel Rail
  const drawOverheadRail = (ctx: CanvasRenderingContext2D, crane: CraneState) => {
    const railY = crane.railY;

    // Steel I-beam rail
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(80, railY - 24, 740, 24);

    // Rail border & highlight
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, railY - 24, 740, 24);

    // Hazard Stripes on rail top edge
    ctx.save();
    ctx.beginPath();
    ctx.rect(80, railY - 24, 740, 8);
    ctx.clip();
    for (let x = 60; x < 840; x += 24) {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(x, railY - 24);
      ctx.lineTo(x + 12, railY - 24);
      ctx.lineTo(x + 4, railY - 16);
      ctx.lineTo(x - 8, railY - 16);
      ctx.fill();
    }
    ctx.restore();

    // Limit bumpers
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(crane.minX - 16, railY - 28, 12, 32);
    ctx.fillRect(crane.maxX + 4, railY - 28, 12, 32);

    ctx.restore();
  };

  // Draw Rotating Track & Conveyor Rollers
  const drawTrackConveyor = (ctx: CanvasRenderingContext2D, trackAngle: number) => {
    ctx.save();

    // Track outer glow bed
    ctx.beginPath();
    ctx.ellipse(TRACK_CX, TRACK_CY, TRACK_RX + 34, TRACK_RY + 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fill();

    // Track outer metallic ring
    ctx.beginPath();
    ctx.ellipse(TRACK_CX, TRACK_CY, TRACK_RX + 28, TRACK_RY + 28, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Track conveyor groove (dark cyan energy path)
    ctx.beginPath();
    ctx.ellipse(TRACK_CX, TRACK_CY, TRACK_RX, TRACK_RY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Neon flow indicator line
    ctx.beginPath();
    ctx.ellipse(TRACK_CX, TRACK_CY, TRACK_RX, TRACK_RY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Animated Roller Pins around the track
    const pinCount = 24;
    for (let i = 0; i < pinCount; i++) {
      const angle = (trackAngle + (i * Math.PI * 2) / pinCount) % (Math.PI * 2);
      const px = TRACK_CX + Math.cos(angle) * TRACK_RX;
      const py = TRACK_CY + Math.sin(angle) * TRACK_RY;

      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central Factory Machinery Core
    ctx.beginPath();
    ctx.ellipse(TRACK_CX, TRACK_CY, 80, 36, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center Gear / Core Glow
    ctx.beginPath();
    ctx.arc(TRACK_CX, TRACK_CY, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0369a1';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotation spokes
    for (let s = 0; s < 4; s++) {
      const spokeAngle = trackAngle * 1.5 + (s * Math.PI) / 2;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(TRACK_CX, TRACK_CY);
      ctx.lineTo(TRACK_CX + Math.cos(spokeAngle) * 20, TRACK_CY + Math.sin(spokeAngle) * 12);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Draw Capsule
  const drawCapsule = (ctx: CanvasRenderingContext2D, cap: CapsuleEntity) => {
    ctx.save();
    ctx.translate(cap.x, cap.y);
    ctx.scale(cap.scale, cap.scale);

    const r = cap.radius;

    // Ground Shadow under capsule
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, r + 6, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.restore();

    // Capsule Outer Aura / Soft Glow
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fill();

    // Capsule Body Base (Lower hemisphere)
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Capsule Glass Dome (Upper hemisphere)
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI, 0);
    const domeGrad = ctx.createLinearGradient(0, -r, 0, 0);
    domeGrad.addColorStop(0, '#0284c7');
    domeGrad.addColorStop(0.5, '#0369a1');
    domeGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = domeGrad;
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Center metallic divider ring
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-r, -2, r * 2, 4);

    // Glass shine highlight
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.3, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();

    // Fraction Display Inside Capsule Badge
    // Black pill background for crisp fraction text readability
    ctx.beginPath();
    ctx.roundRect(-22, -20, 44, 40, 8);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Render exact fraction with numerator, fraction bar, denominator
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Numerator
    ctx.fillText(`${cap.fraction.num}`, 0, -8);

    // Horizontal Fraction Bar
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 1);
    ctx.lineTo(12, 1);
    ctx.stroke();

    // Denominator
    ctx.fillText(`${cap.fraction.den}`, 0, 11);

    ctx.restore();
  };

  // Draw Crane Carriage, Braided Cable, and Mechanical Claw
  const drawCraneAndClaw = (ctx: CanvasRenderingContext2D, crane: CraneState) => {
    ctx.save();

    // 1. Crane Trolley Carriage (Slides along rail)
    const trolleyW = 54;
    const trolleyH = 26;
    const ty = crane.railY - 14;

    ctx.fillStyle = '#f59e0b'; // Industrial safety amber
    ctx.beginPath();
    ctx.roundRect(crane.x - trolleyW / 2, ty, trolleyW, trolleyH, 4);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wheels on rail
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(crane.x - 18, ty - 2, 6, 0, Math.PI * 2);
    ctx.arc(crane.x + 18, ty - 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Cable Drum Reel in center
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(crane.x - 12, ty + 6, 24, 14);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(crane.x - 12, ty + 6, 24, 14);

    // 2. Heavy Braided Steel Cable
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(crane.x, ty + 20);
    ctx.lineTo(crane.x, crane.clawY);
    ctx.stroke();

    // Cable segments / braid pattern
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    for (let y = ty + 20; y < crane.clawY; y += 8) {
      ctx.beginPath();
      ctx.moveTo(crane.x - 2, y);
      ctx.lineTo(crane.x + 2, y + 4);
      ctx.stroke();
    }

    // 3. Claw Assembly
    ctx.translate(crane.x, crane.clawY);

    // Claw Top Cap & Pivot Block
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Claw Center LED Indicator
    ctx.fillStyle = crane.state === 'DROPPING' ? '#ef4444' : crane.grabbedCapsule ? '#22c55e' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Left Claw Finger
    ctx.save();
    ctx.rotate(-crane.clawAngle);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-14, 22);
    ctx.lineTo(-4, 38);
    ctx.stroke();
    // Claw rubber grip pad
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 26);
    ctx.lineTo(-5, 36);
    ctx.stroke();
    ctx.restore();

    // Right Claw Finger
    ctx.save();
    ctx.rotate(crane.clawAngle);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(14, 22);
    ctx.lineTo(4, 38);
    ctx.stroke();
    // Claw rubber grip pad
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 26);
    ctx.lineTo(5, 36);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between select-none overflow-hidden">
      {/* Top Header / Status Bar */}
      <header className="w-full max-w-4xl px-4 py-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-amber-500 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              분수 캡슐 팩토리
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                실시간 아케이드
              </span>
            </h1>
            <p className="text-xs text-slate-400">회전 트랙에서 정답 분수 캡슐을 크레인으로 낚아 올리세요!</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {view === 'PLAYING' && (
            <button
              onClick={() => startGame()}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="게임 재시작"
              aria-label="게임 재시작"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={toggleSound}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isMuted ? '소리 켜기' : '소리 끄기'}
            aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Game Screen */}
      <main className="relative flex-1 w-full max-w-4xl flex flex-col items-center justify-center px-2 py-2">
        {/* HUD Overlay Bar during PLAYING */}
        {view === 'PLAYING' && currentProblem && (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2 bg-slate-900/90 rounded-2xl border border-slate-800/90 shadow-xl mb-2 z-10">
            {/* Target Math Question with Clear Vertical Fraction Bar */}
            <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-700/80">
              <span className="text-xs font-semibold text-sky-400 tracking-wide uppercase">문제</span>
              <div className="flex items-center gap-2 text-xl font-extrabold text-white">
                {/* Fraction A */}
                <div className="inline-flex flex-col items-center leading-none">
                  <span className="text-base text-amber-300">{currentProblem.a.num}</span>
                  <div className="w-6 h-[2px] bg-white my-0.5" />
                  <span className="text-base text-amber-300">{currentProblem.a.den}</span>
                </div>

                {/* Operator (+ or -) */}
                <span className="text-2xl text-sky-400 font-bold px-1">{currentProblem.op}</span>

                {/* Fraction B */}
                <div className="inline-flex flex-col items-center leading-none">
                  <span className="text-base text-amber-300">{currentProblem.b.num}</span>
                  <div className="w-6 h-[2px] bg-white my-0.5" />
                  <span className="text-base text-amber-300">{currentProblem.b.den}</span>
                </div>

                <span className="text-2xl text-slate-400 font-bold px-1">=</span>
                <span className="text-2xl text-emerald-400 font-bold px-1">?</span>
              </div>
            </div>

            {/* Score & Combo */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Flame className={`w-5 h-5 ${combo > 1 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">콤보</span>
                  <span className="text-sm font-bold text-amber-300">{combo} 연속</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <Award className="w-5 h-5 text-yellow-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">점수</span>
                  <span className="text-base font-extrabold text-white tabular-nums">{score}</span>
                </div>
              </div>

              {/* 60s Countdown Timer */}
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                <Clock className={`w-5 h-5 ${timeRemaining <= 10 ? 'text-rose-500 animate-bounce' : 'text-sky-400'}`} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium">남은 시간</span>
                  <span className={`text-base font-extrabold tabular-nums ${timeRemaining <= 10 ? 'text-rose-400' : 'text-white'}`}>
                    {timeRemaining}초
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transient Feedback Banner */}
        {feedbackBanner && (
          <div
            className={`absolute top-16 px-5 py-2.5 rounded-xl border text-sm font-bold shadow-2xl backdrop-blur-md z-30 transition-all duration-200 transform scale-100 ${
              feedbackBanner.isCorrect
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/80 shadow-emerald-900/50'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/80 shadow-rose-900/50'
            }`}
          >
            {feedbackBanner.text}
          </div>
        )}

        {/* Canvas Arcade Area */}
        <div className="relative w-full aspect-[900/620] max-h-[580px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl shadow-sky-950/20">
          <canvas
            ref={canvasRef}
            width={900}
            height={620}
            className="w-full h-full object-contain block"
          />

          {/* Start Screen Overlay */}
          {view === 'START' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-amber-500 flex items-center justify-center shadow-lg shadow-sky-500/30 mb-4 animate-bounce">
                <Anchor className="w-9 h-9 text-white" />
              </div>

              <h2 className="text-3xl font-extrabold text-white mb-2">분수 캡슐 팩토리</h2>
              <p className="text-slate-300 max-w-md text-sm mb-6 leading-relaxed">
                상단의 분수 문제를 계산하고, 회전하는 컨베이어 트랙에서 <strong>정답 분수 캡슐</strong>을 실시간으로 크레인으로 낚아 올리세요!
              </p>

              {/* Difficulty Selection */}
              <div className="mb-6 w-full max-w-sm">
                <span className="text-xs font-semibold text-slate-400 block mb-2">난이도 선택</span>
                <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setDifficulty(1)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      difficulty === 1 ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    기초 (분모 동일)
                  </button>
                  <button
                    onClick={() => setDifficulty(2)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      difficulty === 2 ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    응용 (통분 연습)
                  </button>
                  <button
                    onClick={() => setDifficulty(3)}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      difficulty === 3 ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    마스터 (전체 혼합)
                  </button>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={() => startGame()}
                className="px-8 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold rounded-xl shadow-lg shadow-sky-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-base cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                게임 시작 (60초 도전)
              </button>

              {/* Instructions snippet */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300">←</kbd>
                  <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300">→</kbd> 크레인 좌우 이동
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300">Space</kbd> 집게 하강 발사
                </span>
              </div>
            </div>
          )}

          {/* Game Over / Result Screen Overlay */}
          {view === 'RESULT' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 overflow-y-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                <Award className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-white mb-1">공장 가동 완료!</h2>
              <p className="text-xs text-slate-400 mb-5">60초 동안 분수 캡슐을 낚아 올린 최종 성적표입니다.</p>

              {/* Score Highlight */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 w-full max-w-md shadow-xl mb-4">
                <div className="text-xs text-slate-400 mb-1">최종 획득 점수</div>
                <div className="text-4xl font-black text-amber-400 tracking-tight mb-4 tabular-nums">
                  {score} <span className="text-lg font-semibold text-slate-300">점</span>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3">
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 정답
                    </span>
                    <span className="text-lg font-bold text-emerald-400 tabular-nums">{correctCount}개</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" /> 오답
                    </span>
                    <span className="text-lg font-bold text-rose-400 tabular-nums">{wrongCount}개</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> 최대 콤보
                    </span>
                    <span className="text-lg font-bold text-amber-400 tabular-nums">{maxCombo}회</span>
                  </div>
                </div>
              </div>

              {/* Educational Review & Advice */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 w-full max-w-md text-left text-xs mb-5">
                <div className="flex items-center gap-1.5 font-bold text-sky-400 mb-1">
                  <HelpCircle className="w-4 h-4" /> 학습 피드백 & 복습 가이드
                </div>
                {wrongCount === 0 ? (
                  <p className="text-slate-300 leading-relaxed">
                    완벽해요! 분수의 덧셈과 뺄셈을 매우 정확하고 빠른 속도로 풀어냈습니다. 실전 계산 실력이 뛰어납니다!
                  </p>
                ) : (
                  <p className="text-slate-300 leading-relaxed">
                    오답이 발생한 경우, 분모가 다른 분수는 반드시 <strong>최소공배수로 통분</strong>한 후 분자끼리 계산해야 합니다. 분모끼리 더하거나 빼지 않도록 주의해 보세요!
                  </p>
                )}
              </div>

              {/* Restart Button */}
              <button
                onClick={() => startGame()}
                className="px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold rounded-xl shadow-lg shadow-sky-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> 다시 도전하기
              </button>
            </div>
          )}
        </div>

        {/* Mobile & Keyboard Controls Strip */}
        <div className="w-full flex items-center justify-between gap-4 mt-2 px-3 py-2 bg-slate-900/60 rounded-xl border border-slate-800/80 z-10">
          <div className="flex items-center gap-2">
            <button
              onMouseDown={() => (stateRef.current.isMobileLeft = true)}
              onMouseUp={() => (stateRef.current.isMobileLeft = false)}
              onMouseLeave={() => (stateRef.current.isMobileLeft = false)}
              onTouchStart={(e) => {
                e.preventDefault();
                stateRef.current.isMobileLeft = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stateRef.current.isMobileLeft = false;
              }}
              className="px-5 py-3 bg-slate-800 active:bg-sky-600 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center transition-colors touch-none cursor-pointer"
              title="크레인 왼쪽 이동"
              aria-label="크레인 왼쪽 이동"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onMouseDown={() => (stateRef.current.isMobileRight = true)}
              onMouseUp={() => (stateRef.current.isMobileRight = false)}
              onMouseLeave={() => (stateRef.current.isMobileRight = false)}
              onTouchStart={(e) => {
                e.preventDefault();
                stateRef.current.isMobileRight = true;
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stateRef.current.isMobileRight = false;
              }}
              className="px-5 py-3 bg-slate-800 active:bg-sky-600 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center transition-colors touch-none cursor-pointer"
              title="크레인 오른쪽 이동"
              aria-label="크레인 오른쪽 이동"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center hidden sm:block">
            <span className="text-xs text-slate-400">
              키보드 <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">→</kbd> 또는 <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">A</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">D</kbd> 이동 / <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Space</kbd> 하강
            </span>
          </div>

          <button
            onClick={triggerDrop}
            onTouchStart={(e) => {
              e.preventDefault();
              triggerDrop();
            }}
            className="flex-1 sm:flex-initial px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all touch-none cursor-pointer"
            title="집게 발사"
          >
            <Anchor className="w-5 h-5" />
            <span>집게 발사! (SPACE)</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-2 text-[11px] text-slate-500 border-t border-slate-900">
        초등학교 수학 분수의 덧셈과 뺄셈 실시간 아케이드 교육 게임 · 분수 캡슐 팩토리
      </footer>
    </div>
  );
}
