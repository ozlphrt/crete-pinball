import { GameEventBus } from '../game/events/gameEventBus';
import { UserPreferences } from '../persistence/contracts';

export interface AudioOptions {
  soundVolume: number;
  ambienceVolume: number;
  musicVolume: number;
  soundMuted: boolean;
  ambienceMuted: boolean;
  musicMuted: boolean;
}

export class AudioManager {
  private static instance: AudioManager | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private isUnlocked = false;
  private isAmbiencePlaying = false;
  private ambienceNoiseNode: AudioNode | null = null;
  private ambienceFilterNode: BiquadFilterNode | null = null;
  private ambienceLfoOsc: OscillatorNode | null = null;

  // Volume & Mute state
  private sfxVolume = 0.8;
  private ambienceVolume = 0.05;
  private musicVolume = 0.6;
  private sfxMuted = false;
  private ambienceMuted = false;
  private musicMuted = false;

  // Intelligent throttling timestamps
  private lastIslandSoundTime = 0;
  private lastMainlandSoundTime = 0;
  private lastCreteSoundTime = 0;
  private lastThunderTime = 0;
  private readonly MIN_COLLISION_INTERVAL_MS = 50;
  private readonly MIN_THUNDER_INTERVAL_MS = 90;

  private cleanupListeners: Array<() => void> = [];

  constructor() {
    this.setupGestureUnlock();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initializes audio settings from stored user preferences.
   */
  public initFromPreferences(prefs: Partial<UserPreferences & AudioOptions>): void {
    if (typeof prefs.soundVolume === 'number') this.sfxVolume = prefs.soundVolume;
    if (typeof prefs.ambienceVolume === 'number') {
      this.ambienceVolume = prefs.ambienceVolume === 0.4 ? 0.05 : prefs.ambienceVolume;
    }
    if (typeof prefs.musicVolume === 'number') this.musicVolume = prefs.musicVolume;
    if (typeof prefs.soundMuted === 'boolean') this.sfxMuted = prefs.soundMuted;
    if (typeof prefs.ambienceMuted === 'boolean') this.ambienceMuted = prefs.ambienceMuted;
    if (typeof prefs.musicMuted === 'boolean') this.musicMuted = prefs.musicMuted;

    this.updateGainLevels();
  }

  private readonly gestureEvents = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];
  private unlockHandler?: () => void;

  private setupGestureUnlock(): void {
    if (typeof window === 'undefined') return;

    this.unlockHandler = (): void => {
      this.unlock();
      if (this.ctx && this.ctx.state === 'running') {
        this.gestureEvents.forEach((evt) => {
          if (this.unlockHandler) window.removeEventListener(evt, this.unlockHandler);
        });
      }
    };

    this.gestureEvents.forEach((evt) => {
      window.addEventListener(evt, this.unlockHandler!, { passive: true });
    });

    // Handle tab visibility to pause and resume audio context
    const visibilityHandler = (): void => {
      if (document.hidden) {
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      } else {
        if (this.ctx && this.ctx.state === 'suspended' && this.isUnlocked) {
          this.ctx.resume().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    this.cleanupListeners.push(() => {
      document.removeEventListener('visibilitychange', visibilityHandler);
      this.gestureEvents.forEach((evt) => {
        if (this.unlockHandler) window.removeEventListener(evt, this.unlockHandler);
      });
    });
  }

  public unlock(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.isUnlocked = true;
      if (!this.isAmbiencePlaying) {
        this.startAmbience();
      }
      return;
    }

    try {
      if (!this.ctx) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtxClass) return;

        this.ctx = new AudioCtxClass();

        // Master bus
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        // SFX bus
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        // Ambience bus
        this.ambienceGain = this.ctx.createGain();
        this.ambienceGain.connect(this.masterGain);

        // Music bus
        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);

        this.updateGainLevels();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx
          .resume()
          .then(() => {
            if (this.ctx && this.ctx.state === 'running') {
              this.isUnlocked = true;
              this.startAmbience();
            }
          })
          .catch(() => {});
      } else if (this.ctx.state === 'running') {
        this.isUnlocked = true;
        this.startAmbience();
      }
    } catch {
      // Audio context restricted or unavailable
    }
  }

  public resumeContext(): void {
    this.unlock();
  }

  public bindToEventBus(eventBus: GameEventBus): void {
    const unsubPowerArmed = eventBus.on('powerBounceArmed', (e) => {
      if (e.armed) this.playPowerBounceArmed();
    });
    const unsubPowerFired = eventBus.on('powerBounceFired', () => {
      this.playPowerBounceFired();
    });
    const unsubSpecial = eventBus.on('specialIslandActivated', (e) => {
      this.playSpecialActivation(e.ability);
    });
    const unsubMultiball = eventBus.on('multiballStarted', () => {
      this.playMultiballStart();
    });
    const unsubWeather = eventBus.on('weatherChanged', (e) => {
      this.updateWeatherAmbience(e.type);
    });
    const unsubIslandHit = eventBus.on('islandHit', (e) => {
      this.playIslandCollision(e.islandId, e.impactSpeed, e.isSpecial);
    });
    const unsubMainlandHit = eventBus.on('mainlandHit', (e) => {
      this.playMainlandCollision(e.impactSpeed);
    });
    const unsubCreteRebound = eventBus.on('creteRebound', (e) => {
      this.playCreteRebound(e.isCharged, e.impactSpeed);
    });
    const unsubCombo = eventBus.on('comboIncreased', (e) => {
      this.playComboIncrement(e.combo);
    });
    const unsubBonusTarget = eventBus.on('bonusTargetHit', () => {
      this.playBonusTarget();
    });
    const unsubBallLost = eventBus.on('ballLost', () => {
      this.playBallLost();
    });
    const unsubExtraBall = eventBus.on('extraBallEarned', () => {
      this.playExtraBall();
    });
    const unsubGameOver = eventBus.on('gameOver', () => {
      this.playGameOver();
    });

    this.cleanupListeners.push(
      unsubPowerArmed,
      unsubPowerFired,
      unsubSpecial,
      unsubMultiball,
      unsubWeather,
      unsubIslandHit,
      unsubMainlandHit,
      unsubCreteRebound,
      unsubCombo,
      unsubBonusTarget,
      unsubBallLost,
      unsubExtraBall,
      unsubGameOver,
    );
  }

  // --- Volume & Mute Controls ---

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.updateGainLevels();
  }

  public setAmbienceVolume(vol: number): void {
    this.ambienceVolume = Math.max(0, Math.min(1, vol));
    this.updateGainLevels();
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.updateGainLevels();
  }

  public setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
    this.updateGainLevels();
  }

  public setAmbienceMuted(muted: boolean): void {
    this.ambienceMuted = muted;
    this.updateGainLevels();
  }

  public setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    this.updateGainLevels();
  }

  public getAudioState(): AudioOptions {
    return {
      soundVolume: this.sfxVolume,
      ambienceVolume: this.ambienceVolume,
      musicVolume: this.musicVolume,
      soundMuted: this.sfxMuted,
      ambienceMuted: this.ambienceMuted,
      musicMuted: this.musicMuted,
    };
  }

  private updateGainLevels(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.sfxGain) {
      const target = this.sfxMuted ? 0 : this.sfxVolume;
      this.sfxGain.gain.setValueAtTime(target, now);
    }
    if (this.ambienceGain) {
      const target = this.ambienceMuted ? 0 : this.ambienceVolume * 0.45; // Ambience kept subtle and restrained
      this.ambienceGain.gain.setValueAtTime(target, now);
    }
    if (this.musicGain) {
      const target = this.musicMuted ? 0 : this.musicVolume;
      this.musicGain.gain.setValueAtTime(target, now);
    }
  }

  // --- Maritime Ambience Synthesis ---

  public startAmbience(): void {
    if (!this.ctx || !this.ambienceGain || this.isAmbiencePlaying || this.ambienceMuted) return;

    if (this.ctx.state !== 'running') {
      this.ctx
        .resume()
        .then(() => {
          if (
            this.ctx &&
            this.ctx.state === 'running' &&
            !this.isAmbiencePlaying &&
            !this.ambienceMuted
          ) {
            this.startAmbience();
          }
        })
        .catch(() => {});
      return;
    }

    try {
      // Procedural oceanic wave wash using a noise buffer and slow resonant filter LFO
      const bufferSize = this.ctx.sampleRate * 4; // 4 seconds noise loop
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Bandpass filter to sculpt ocean spray & surf frequencies
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      // Low-frequency oscillator simulating gentle 5-second Aegean wave swell
      const lfo = this.ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime); // ~5.5s wave period
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(160, this.ctx.currentTime);

      lfo.connect(filter.frequency);
      whiteNoise.connect(filter);
      filter.connect(this.ambienceGain);

      whiteNoise.start();
      lfo.start();

      this.ambienceNoiseNode = whiteNoise;
      this.ambienceFilterNode = filter;
      this.ambienceLfoOsc = lfo;
      this.isAmbiencePlaying = true;
    } catch {
      // Audio context not ready
    }
  }

  public stopAmbience(): void {
    if (this.ambienceNoiseNode) {
      try {
        (this.ambienceNoiseNode as AudioBufferSourceNode).stop();
        this.ambienceNoiseNode.disconnect();
      } catch {
        // Source node already stopped
      }
      this.ambienceNoiseNode = null;
    }
    if (this.ambienceLfoOsc) {
      try {
        this.ambienceLfoOsc.stop();
        this.ambienceLfoOsc.disconnect();
      } catch {
        // Oscillator already stopped
      }
      this.ambienceLfoOsc = null;
    }
    this.isAmbiencePlaying = false;
  }

  public updateWeatherAmbience(weatherType: string): void {
    if (!this.ctx || !this.ambienceFilterNode) return;
    const now = this.ctx.currentTime;

    if (weatherType === 'meltemi') {
      // Gusty northern winds: shift filter higher and widen resonance
      this.ambienceFilterNode.frequency.linearRampToValueAtTime(550, now + 1.5);
      this.ambienceFilterNode.Q.linearRampToValueAtTime(1.2, now + 1.5);
    } else if (weatherType === 'calm') {
      // Calm glassy sea: gentle low-frequency deep water murmurs
      this.ambienceFilterNode.frequency.linearRampToValueAtTime(220, now + 2.0);
      this.ambienceFilterNode.Q.linearRampToValueAtTime(2.5, now + 2.0);
    } else {
      // Normal Aegean nautical breeze
      this.ambienceFilterNode.frequency.linearRampToValueAtTime(320, now + 1.5);
      this.ambienceFilterNode.Q.linearRampToValueAtTime(1.8, now + 1.5);
    }
  }

  // --- Distinctive Sound Effects ---

  /**
   * Island hit: Melodic organic resonant chime with pitch variation based on island name/hash
   * and dynamics proportional to impact velocity. Lowered octave and filtered for subtle, warm presence.
   */
  public playIslandCollision(islandId: string, impactVelocity = 300, isSpecial = false): void {
    if (!this.canPlaySound() || this.sfxMuted) return;

    const now = performance.now();
    if (now - this.lastIslandSoundTime < this.MIN_COLLISION_INTERVAL_MS) return;
    this.lastIslandSoundTime = now;

    const ctx = this.ctx!;
    const t = ctx.currentTime;

    // Warm, understated nautical pentatonic scale (D3 to D4) - low, rounded, subtle
    const scale = [146.83, 164.81, 196.0, 220.0, 246.94, 293.66];
    let hash = 0;
    for (let i = 0; i < islandId.length; i++) hash = (hash * 31 + islandId.charCodeAt(i)) >>> 0;
    const baseFreq = scale[hash % scale.length]!;

    // Restrained velocity dynamics (0.25 to 0.7)
    const intensity = Math.min(0.7, Math.max(0.25, impactVelocity / 600));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Warm lowpass filter to remove harshness
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isSpecial ? 580 : 440, t);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);

    // Subtle pitch dip for warm acoustic feel
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.95, t + 0.1);

    const decay = isSpecial ? 0.2 : 0.11;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.11 * intensity, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + decay + 0.02);

    // Layer subtle, muffled distant thunder undertone with lightning strike
    if (impactVelocity >= 220) {
      this.playSubtleThunder(intensity);
    }
  }

  /**
   * Distant Mediterranean Thunder: Muffled sub-bass rumble accompanying the lightning flash.
   * Completely low-passed (40–65 Hz) for a deep, cinematic roll without high-frequency harshness.
   */
  public playSubtleThunder(intensity = 0.5): void {
    if (!this.canPlaySound() || this.sfxMuted) return;

    const now = performance.now();
    if (now - this.lastThunderTime < this.MIN_THUNDER_INTERVAL_MS) return;
    this.lastThunderTime = now;

    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const clampedIntensity = Math.min(0.65, Math.max(0.2, intensity));

    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.28);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < output.length; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.35;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(65, t);
      filter.frequency.exponentialRampToValueAtTime(38, t + 0.25);
      filter.Q.setValueAtTime(2.0, t);

      const gain = ctx.createGain();
      const duration = 0.28;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.06 * clampedIntensity, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      noiseSource.start(t);
      noiseSource.stop(t + duration + 0.01);
    } catch {
      // Graceful fallback if buffer source creation is unavailable
    }
  }

  /**
   * Mainland collision: Deep muted shoreline bedrock thump.
   */
  public playMainlandCollision(impactVelocity = 300): void {
    if (!this.canPlaySound() || this.sfxMuted) return;

    const now = performance.now();
    if (now - this.lastMainlandSoundTime < this.MIN_COLLISION_INTERVAL_MS * 1.5) return;
    this.lastMainlandSoundTime = now;

    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const intensity = Math.min(0.65, Math.max(0.25, impactVelocity / 600));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(105, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.09 * intensity, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.1);

    if (impactVelocity >= 260) {
      this.playSubtleThunder(intensity * 0.7);
    }
  }

  /**
   * Crete paddle rebound: Rich wooden hull / acoustic bumper resonance.
   */
  public playCreteRebound(isCharged = false, impactVelocity = 400): void {
    if (!this.canPlaySound() || this.sfxMuted) return;

    const now = performance.now();
    if (now - this.lastCreteSoundTime < this.MIN_COLLISION_INTERVAL_MS) return;
    this.lastCreteSoundTime = now;

    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const intensity = Math.min(0.75, Math.max(0.3, impactVelocity / 600));

    // Fundamental hull tone - deep, warm, restrained acoustic bounce
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const startFreq = isCharged ? 180 : 130;
    osc.type = isCharged ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + (isCharged ? 0.2 : 0.12));

    const peakGain = isCharged ? 0.2 : 0.14;
    const decay = isCharged ? 0.22 : 0.13;

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peakGain * intensity, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + decay + 0.02);

    // If charged power bounce, add subtle warm golden harmonic
    if (isCharged) {
      const harm = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harm.type = 'sine';
      harm.frequency.setValueAtTime(293.66, t); // D4
      harm.frequency.exponentialRampToValueAtTime(440, t + 0.18); // A4

      harmGain.gain.setValueAtTime(0.0001, t);
      harmGain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      harm.connect(harmGain);
      harmGain.connect(this.sfxGain!);

      harm.start(t);
      harm.stop(t + 0.24);
    }
  }

  /**
   * Charged power bounce armed: Quick charging rising tone.
   */
  public playPowerBounceArmed(): void {
    if (!this.canPlaySound() || this.sfxMuted) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(360, t + 0.16);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.21);
  }

  public playPowerBounceFired(): void {
    // Played alongside playCreteRebound(true)
  }

  /**
   * Special island activation: Gentle warm three-tone arpeggio.
   */
  public playSpecialActivation(_abilityType: string): void {
    if (!this.canPlaySound() || this.sfxMuted) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const freqs = [261.63, 329.63, 392.0]; // C4, E4, G4 (warm octave)
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = t + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.14, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.22);
    });
  }

  /**
   * Combo increase: Ascending maritime pitch (×2 to ×5).
   */
  public playComboIncrement(combo: number): void {
    if (!this.canPlaySound() || this.sfxMuted) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    // Warm ascending scale corresponding to multiplier (A3 to A4)
    const comboNotes = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0];
    const freq = comboNotes[Math.min(combo, comboNotes.length - 1)]!;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.13, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.17);
  }

  /**
   * Bonus target island hit: Radiant warm harmonic chime.
   */
  public playBonusTarget(): void {
    if (!this.canPlaySound() || this.sfxMuted) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    [329.63, 440.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = t + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.15, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.22);
    });
  }

  /**
   * Ball lost through southern drain: Descending somber nautical bell.
   */
  public playBallLost(): void {
    if (!this.canPlaySound() || this.sfxMuted) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.45);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  /**
   * Extra life earned: Triumphant uplifting 3-tone flourish.
   */
  public playExtraBall(): void {
    if (!this.canPlaySound() || this.sfxMuted) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const notes = [440, 554.37, 659.25]; // A4, C#5, E5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = t + idx * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.28, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.34);
    });
  }

  /**
   * Multiball started: Resonant dual-tone maritime horn fanfare.
   */
  public playMultiballStart(): void {
    if (!this.canPlaySound() || this.sfxMuted) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    [261.63, 392.0].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.24, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  /**
   * Game Over: Distant deep atmospheric bell.
   */
  public playGameOver(): void {
    if (!this.canPlaySound() || this.sfxMuted) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(146.83, t); // D3
    osc.frequency.exponentialRampToValueAtTime(73.42, t + 0.8);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.95);
  }

  /**
   * UI Click / toggle.
   */
  public playUIClick(): void {
    if (!this.canPlaySound() || this.sfxMuted) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.04);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  private canPlaySound(): boolean {
    if (!this.ctx || !this.sfxGain) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
      return false;
    }
    return this.ctx.state === 'running';
  }

  public destroy(): void {
    this.stopAmbience();
    this.cleanupListeners.forEach((cleanup) => cleanup());
    this.cleanupListeners = [];
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.isUnlocked = false;
  }
}
