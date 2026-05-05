// src/services/audio/AudioService.ts
import AudioEventEmitter from "./AudioEventEmitter";
import { AUDIO_CONFIG } from "./AudioConfig";
import { VOLUME_CHANNELS } from "./AudioTypes";

// Define event types and their corresponding callback types
type AudioEvents = {
  volumeChanged: (data: { channel: string; value: number }) => void;
  initialized: () => void;
  progress: (data: { percent: number }) => void;
  error: (error: Error) => void;
  effectSettingChanged: (data: { effectType: string; setting: any }) => void;
  musicStarted: (data: { trackId: string }) => void; // Updated to expect an object
  musicStopped: (data: { trackId: string }) => void; // Updated to expect an object
  musicEnded: (data: { trackId: string }) => void;
};

class AudioService {
  private config: typeof AUDIO_CONFIG;
  private sounds: Map<string, { audio: HTMLAudioElement; config: any }>;
  private music: Map<string, { audio: HTMLAudioElement; config: any }>;
  private currentMusic: {
    id: string;
    audio: HTMLAudioElement;
    config: any;
  } | null;
  private eventEmitter: AudioEventEmitter;
  private volumes: { [key: string]: number };
  private initialized: boolean;
  private effectSettings: { [key: string]: any };
  private loopingSounds: Set<string>;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private connectedElements: Set<HTMLAudioElement> = new Set();
  private musicGeneration = 0;
  private musicDuckFactor = 1;
  private duckFadeInterval: ReturnType<typeof setInterval> | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private activeLoopNodes: Map<
    string,
    { source: AudioBufferSourceNode; gain: GainNode }
  > = new Map();
  private musicGains: Map<string, GainNode> = new Map();
  private _premuteVolumes: Map<string, number> = new Map();

  constructor(config: typeof AUDIO_CONFIG) {
    this.config = config;
    this.sounds = new Map();
    this.music = new Map();
    this.currentMusic = null;
    this.eventEmitter = new AudioEventEmitter();
    this.volumes = { ...config.defaultVolumes };
    this.initialized = false;
    this.effectSettings = { ...config.effectSettings };
    this.loopingSounds = new Set();
    this.loadSettings();
  }

  // Public getters for private properties
  getVolumes() {
    return this.volumes;
  }

  getEffectSettings() {
    return this.effectSettings;
  }

  isInitialized() {
    return this.initialized;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  on<K extends keyof AudioEvents>(
    event: K,
    callback: AudioEvents[K]
  ): () => void {
    return this.eventEmitter.on(event, callback);
  }

  off<K extends keyof AudioEvents>(event: K, callback: AudioEvents[K]): void {
    this.eventEmitter.off(event, callback);
  }

  async loadMusic(id: string, config: any): Promise<void> {
    const audio = new Audio(config.path);
    audio.volume = 0;
    audio.loop = config.loop;
    audio.addEventListener("ended", () => {
      if (this.currentMusic?.id === id) {
        this.eventEmitter.emit("musicEnded", { trackId: id });
      }
    });

    await new Promise((resolve, reject) => {
      audio.addEventListener("canplaythrough", resolve);
      audio.addEventListener("error", reject);
      audio.load();
    });

    // Route through Web Audio graph via a GainNode for reliable cross-browser volume control.
    // Safari ignores audio.volume on MediaElementSource-connected elements at runtime.
    if (this.audioCtx && this.analyser && !this.connectedElements.has(audio)) {
      try {
        const source = this.audioCtx.createMediaElementSource(audio);
        const gain = this.audioCtx.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(this.analyser);
        this.musicGains.set(id, gain);
        this.connectedElements.add(audio);
        audio.volume = 1; // gain node owns volume from here on
      } catch {
        // ignore — element may already be connected
      }
    }

    this.music.set(id, { audio, config });
  }

  async playMusic(
    id: string,
    options: { loop?: boolean; fadeIn?: boolean } = {}
  ): Promise<void> {
    if (!this.initialized) {
      console.log("Attempted to play music before initialization:", id);
      return;
    }

    const music = this.music.get(id);
    if (!music) {
      console.warn(`Music track not found: ${id}`);
      return;
    }

    // Already playing this track — nothing to do
    if (this.currentMusic?.id === id) return;

    // Snapshot what's playing now so we can fade it out
    const outgoing = this.currentMusic;
    this.currentMusic = null;

    // Stamp this request so stale concurrent calls can self-abort
    const myGen = ++this.musicGeneration;

    try {
      // Resume AudioContext if suspended (browser autoplay policy)
      if (this.audioCtx?.state === "suspended") {
        await this.audioCtx.resume();
      }

      // Fade out the old track first, then start the new one — sequential, no overlap
      if (outgoing) {
        const outGain = this.musicGains.get(outgoing.id);
        if (outGain && this.audioCtx) {
          const t = this.audioCtx.currentTime;
          outGain.gain.cancelScheduledValues(t);
          outGain.gain.setValueAtTime(outGain.gain.value, t);
          outGain.gain.linearRampToValueAtTime(0, t + 1);
          await new Promise<void>((r) => setTimeout(r, 1000));
        } else {
          await this.fadeOut(outgoing.audio);
        }
        outgoing.audio.pause();
        outgoing.audio.currentTime = 0;
      }

      // Abort if a newer request came in during the fade-out
      if (myGen !== this.musicGeneration) return;

      const { audio, config } = music;
      audio.loop = options.loop ?? config.loop;
      const gain = this.musicGains.get(id);
      const targetVol = this.calculateMusicVolume(config);

      if (gain && this.audioCtx) {
        audio.volume = 1;
        gain.gain.cancelScheduledValues(this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        await audio.play();
        if (options.fadeIn) {
          const fadeSecs = (config.fadeInDuration || 1000) / 1000;
          gain.gain.linearRampToValueAtTime(targetVol, this.audioCtx.currentTime + fadeSecs);
          await new Promise<void>((r) => setTimeout(r, config.fadeInDuration || 1000));
        } else {
          gain.gain.setValueAtTime(targetVol, this.audioCtx.currentTime);
        }
      } else {
        audio.volume = targetVol;
        if (options.fadeIn) {
          await this.fadeIn(audio, config.fadeInDuration || 1000);
        } else {
          await audio.play();
        }
      }

      // Abort if a newer request came in during the fade-in
      if (myGen !== this.musicGeneration) {
        audio.pause();
        audio.currentTime = 0;
        return;
      }

      this.currentMusic = { id, audio, config };
      this.eventEmitter.emit("musicStarted", { trackId: id });
    } catch (error) {
      if (myGen !== this.musicGeneration) return;
      console.error(`Error playing music ${id}:`, error);
      this.eventEmitter.emit("error", { type: "playMusic", id, error });
    }
  }

  async stopMusic(
    id: string,
    options: { fadeOut?: boolean } = {}
  ): Promise<void> {
    const music = this.music.get(id);
    if (!music) {
      console.warn(`Attempted to stop non-existent music: ${id}`);
      return;
    }

    try {
      console.log(`Stopping music: ${id}`, { options });
      const { audio } = music;

      if (options.fadeOut) {
        await this.fadeOut(audio);
      }

      audio.pause();
      audio.currentTime = 0;

      if (this.currentMusic?.id === id) {
        this.currentMusic = null;
      }

      this.eventEmitter.emit("musicStopped", { trackId: id }); // Updated to provide data
    } catch (error) {
      console.error(`Error stopping music ${id}:`, error);
      this.eventEmitter.emit("error", { type: "stopMusic", id, error }); // Updated to provide data
    }
  }

  async transitionMusic(
    fromId: string,
    toId: string,
    options: { crossFadeDuration?: number } = {}
  ): Promise<void> {
    const fromMusic = this.music.get(fromId);
    const toMusic = this.music.get(toId);

    if (!fromMusic || !toMusic) {
      console.warn("One or both music tracks not found for transition");
      return;
    }

    try {
      const duration = options.crossFadeDuration || 1000;

      // Start new music at 0 volume
      toMusic.audio.volume = 0;
      await toMusic.audio.play();

      // Cross-fade
      await Promise.all([
        this.fadeOut(fromMusic.audio, duration),
        this.fadeIn(toMusic.audio, duration),
      ]);

      // Clean up old music
      fromMusic.audio.pause();
      fromMusic.audio.currentTime = 0;

      this.currentMusic = { id: toId, ...toMusic };
      this.eventEmitter.emit("musicTransitioned", { from: fromId, to: toId }); // Updated to provide data
    } catch (error) {
      this.eventEmitter.emit("error", { type: "transitionMusic", error }); // Updated to provide data
    }
  }

  setEffectSetting(effectType: string, setting: any): void {
    if (this.effectSettings.hasOwnProperty(effectType)) {
      this.effectSettings[effectType] = setting;
      this.saveSettings();
      this.eventEmitter.emit("effectSettingChanged", { effectType, setting }); // This is already correct
    }
  }

  private saveSettings(): void {
    try {
      const settings = {
        volumes: this.volumes,
        effectSettings: this.effectSettings,
      };
      localStorage.setItem("audioSettings", JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save audio settings:", error);
    }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem("audioSettings");
      if (saved) {
        const settings = JSON.parse(saved);
        this.volumes = { ...this.volumes, ...settings.volumes };
        this.effectSettings = {
          ...this.effectSettings,
          ...settings.effectSettings,
        };
      }
    } catch (error) {
      console.error("Failed to load audio settings:", error);
    }
  }

  resetSettings(): void {
    // Reset to default values from config
    this.volumes = { ...this.config.defaultVolumes };
    this.effectSettings = { ...this.config.effectSettings };

    // Update all audio volumes
    this.updateAllVolumes();

    // Save the reset settings
    this.saveSettings();

    // Emit events for UI updates
    Object.entries(this.volumes).forEach(([channel, value]) => {
      this.eventEmitter.emit("volumeChanged", { channel, value }); // This is already correct
    });

    Object.entries(this.effectSettings).forEach(([effectType, setting]) => {
      this.eventEmitter.emit("effectSettingChanged", { effectType, setting }); // This is already correct
    });

    this.eventEmitter.emit("settingsReset", {}); // Updated to provide empty data
  }

  private async fadeIn(
    audio: HTMLAudioElement,
    duration = 1000
  ): Promise<void> {
    const targetVolume = audio.volume;
    audio.volume = 0;
    await audio.play();

    return new Promise((resolve) => {
      const steps = duration / 50;
      const volumeStep = targetVolume / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        audio.volume = Math.min(targetVolume, volumeStep * currentStep);

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          resolve();
        }
      }, 50);
    });
  }

  private async fadeOut(
    audio: HTMLAudioElement,
    duration = 1000
  ): Promise<void> {
    const startVolume = audio.volume;
    return new Promise((resolve) => {
      const steps = duration / 50;
      const volumeStep = startVolume / steps;
      let currentStep = 0;

      const fadeInterval = setInterval(() => {
        currentStep++;
        audio.volume = Math.max(0, startVolume - volumeStep * currentStep);

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          resolve();
        }
      }, 50);
    });
  }

  async init(onProgress: (progress: number) => void = () => {}): Promise<void> {
    if (this.initialized) return;

    try {
      // Set up Web Audio API analyser for visualizer
      try {
        this.audioCtx = new AudioContext();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64; // 32 frequency bins — enough for a bar graph
        this.analyser.smoothingTimeConstant = 0.75;
        this.analyser.connect(this.audioCtx.destination);
      } catch {
        // Web Audio API unavailable — visualizer will be disabled
      }

      // Calculate total assets (both sounds and music)
      const totalAssets =
        Object.keys(this.config.sounds).length +
        Object.keys(this.config.music).length;
      let loadedAssets = 0;

      const updateProgress = () => {
        loadedAssets++;
        const progress = (loadedAssets / totalAssets) * 100;
        onProgress(progress);
        this.eventEmitter.emit("progress", { percent: progress });
      };

      // Load sound effects
      await Promise.all(
        Object.entries(this.config.sounds).map(([id, config]) =>
          this.loadSound(id, config).then(updateProgress)
        )
      );

      // Load music tracks
      await Promise.all(
        Object.entries(this.config.music).map(([id, config]) =>
          this.loadMusic(id, config).then(updateProgress)
        )
      );

      this.initialized = true;
      console.log("Audio system initialized with:", {
        sounds: Array.from(this.sounds.keys()),
        music: Array.from(this.music.keys()),
      });
      this.eventEmitter.emit("initialized", {}); // Updated to provide empty data
    } catch (error) {
      console.error("Failed to initialize audio system:", error);
      this.eventEmitter.emit("error", error); // Updated to provide data
      throw error;
    }
  }

  private async loadSound(id: string, config: any): Promise<void> {
    try {
      const audio = new Audio(config.path);
      audio.volume = 0;

      await new Promise((resolve, reject) => {
        audio.addEventListener("canplaythrough", resolve);
        audio.addEventListener("error", reject);
        audio.load();
      });

      this.sounds.set(id, { audio, config });

      if (this.audioCtx) {
        try {
          const response = await fetch(config.path);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(id, audioBuffer);
        } catch {
          // Falls back to HTMLAudioElement looping
        }
      }
    } catch (error) {
      console.error(`Failed to load sound: ${id}`, error);
      throw error;
    }
  }

  playSoundLoop(id: string): void {
    if (this.loopingSounds.has(id)) return;
    const sound = this.sounds.get(id);
    if (!sound || !this.initialized) return;

    if (this.audioCtx?.state === "suspended") {
      void this.audioCtx.resume();
    }

    const volume =
      this.calculateVolume(sound.config.category) * sound.config.volume;

    if (id === "thrust" && this.audioCtx && this.analyser) {
      const node = this.buildThrustNode(volume);
      if (node) {
        this.activeLoopNodes.set(id, node);
        this.loopingSounds.add(id);
        return;
      }
    }

    const buffer = this.audioBuffers.get(id);
    if (buffer && this.audioCtx && this.analyser) {
      const gain = this.audioCtx.createGain();
      gain.gain.value = volume;
      gain.connect(this.analyser);

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start(0);

      this.activeLoopNodes.set(id, { source, gain });
      this.loopingSounds.add(id);
      return;
    }

    // Fallback: HTMLAudioElement (has a small loop gap)
    const { audio, config } = sound;
    audio.loop = true;
    audio.volume = this.calculateVolume(config.category) * config.volume;
    audio.play().catch(() => {});
    this.loopingSounds.add(id);
  }

  private buildThrustNode(
    volume: number
  ): { source: AudioBufferSourceNode; gain: GainNode } | null {
    if (!this.audioCtx || !this.analyser) return null;

    const sampleRate = this.audioCtx.sampleRate;
    // Two seconds of white noise — seamlessly loopable since each sample is independent
    const frameCount = sampleRate * 2;
    const noiseBuffer = this.audioCtx.createBuffer(1, frameCount, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    // Low-pass filter shapes the hiss into a low engine rumble
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    filter.Q.value = 0.7;

    const gain = this.audioCtx.createGain();
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);
    source.start(0);

    return { source, gain };
  }

  stopSoundLoop(id: string): void {
    if (!this.loopingSounds.has(id)) return;

    const node = this.activeLoopNodes.get(id);
    if (node) {
      try {
        node.source.stop();
      } catch {
        // May already be stopped
      }
      node.gain.disconnect();
      this.activeLoopNodes.delete(id);
      this.loopingSounds.delete(id);
      return;
    }

    // Fallback: HTMLAudioElement
    const sound = this.sounds.get(id);
    if (sound) {
      sound.audio.loop = false;
      sound.audio.pause();
      sound.audio.currentTime = 0;
    }
    this.loopingSounds.delete(id);
  }

  async playSound(id: string): Promise<HTMLAudioElement | null> {
    if (!this.initialized) {
      console.warn("Audio system not initialized");
      return null;
    }

    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`Sound not found: ${id}`);
      return null;
    }

    try {
      const { audio, config } = sound;
      const instance = audio.cloneNode(true) as HTMLAudioElement;
      instance.volume = this.calculateVolume(config.category) * config.volume;
      instance.loop = false;
      await instance.play();
      this.eventEmitter.emit("soundPlayed", { id }); // Updated to provide data
      return instance;
    } catch (error) {
      this.eventEmitter.emit("error", { type: "playSound", id, error }); // Updated to provide data
      return null;
    }
  }

  setVolume(channel: string, value: number): void {
    if (!Object.values(VOLUME_CHANNELS).includes(channel)) {
      console.warn(`Invalid volume channel: ${channel}`);
      return;
    }

    const normalizedValue = Math.max(0, Math.min(1, value));
    // If the user explicitly sets a non-zero volume, treat that as unmuting
    if (normalizedValue > 0) this._premuteVolumes.delete(channel);
    this.volumes[channel] = normalizedValue;

    this.updateAllVolumes();

    this.eventEmitter.emit("volumeChanged", { channel, value: normalizedValue });
  }

  toggleMute(channel: string): void {
    if (!Object.values(VOLUME_CHANNELS).includes(channel)) return;
    if (this._premuteVolumes.has(channel)) {
      const saved = this._premuteVolumes.get(channel)!;
      this._premuteVolumes.delete(channel);
      this.setVolume(channel, saved);
    } else {
      const current = this.volumes[channel] ?? 0.5;
      if (current === 0) return;
      this._premuteVolumes.set(channel, current);
      this.volumes[channel] = 0;
      this.updateAllVolumes();
      this.eventEmitter.emit("volumeChanged", { channel, value: 0 });
    }
  }

  isMuted(channel: string): boolean {
    return this._premuteVolumes.has(channel);
  }

  private updateAllVolumes(): void {
    // Update sound effects (HTMLAudioElement path)
    this.sounds.forEach(({ audio, config }) => {
      audio.volume = this.calculateVolume(config.category) * config.volume;
    });

    // Update active loop nodes (Web Audio GainNode path — thrust, space-wind, etc.)
    this.activeLoopNodes.forEach(({ gain }, id) => {
      const sound = this.sounds.get(id);
      if (sound) {
        gain.gain.value = this.calculateVolume(sound.config.category) * sound.config.volume;
      }
    });

    // Update music — use GainNode if wired (Safari-safe), else fall back to audio.volume.
    // Must cancel scheduled automation events first; assigning .value is silently ignored
    // when any scheduled event (e.g. the fade-in ramp) is still in the parameter queue.
    if (this.currentMusic) {
      const { audio, config } = this.currentMusic;
      const gain = this.musicGains.get(this.currentMusic.id);
      if (gain && this.audioCtx) {
        const t = this.audioCtx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(this.calculateMusicVolume(config), t);
      } else {
        audio.volume = this.calculateMusicVolume(config);
      }
    }
  }

  private calculateVolume(category: string): number {
    return this.volumes[VOLUME_CHANNELS.MASTER] * (this.volumes[category] ?? 1);
  }

  private calculateMusicVolume(config: any): number {
    return (
      this.calculateVolume(VOLUME_CHANNELS.MUSIC) *
      config.volume *
      this.musicDuckFactor
    );
  }

  private fadeCurrentMusicTo(
    targetFactor: number,
    duration = 200
  ): Promise<void> {
    if (this.duckFadeInterval) {
      clearInterval(this.duckFadeInterval);
      this.duckFadeInterval = null;
    }

    const current = this.currentMusic;
    this.musicDuckFactor = Math.max(0, Math.min(1, targetFactor));
    if (!current) return Promise.resolve();

    const endVolume = this.calculateMusicVolume(current.config);
    const gain = this.musicGains.get(current.id);

    if (gain && this.audioCtx) {
      const t = this.audioCtx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(endVolume, t + duration / 1000);
      return new Promise<void>((r) => setTimeout(r, duration));
    }

    // Fallback: setInterval on audio.volume
    const startVolume = current.audio.volume;
    const steps = Math.max(1, Math.ceil(duration / 50));
    let currentStep = 0;

    return new Promise((resolve) => {
      this.duckFadeInterval = setInterval(() => {
        currentStep++;
        const t = Math.min(1, currentStep / steps);
        current.audio.volume = startVolume + (endVolume - startVolume) * t;
        if (currentStep >= steps) {
          if (this.duckFadeInterval) clearInterval(this.duckFadeInterval);
          this.duckFadeInterval = null;
          resolve();
        }
      }, 50);
    });
  }

  duckMusic(targetFactor: number, duration = 200): Promise<void> {
    return this.fadeCurrentMusicTo(targetFactor, duration);
  }

  restoreMusic(duration = 800): Promise<void> {
    return this.fadeCurrentMusicTo(1, duration);
  }

  destroy(): void {
    this.activeLoopNodes.forEach(({ source, gain }) => {
      try {
        source.stop();
      } catch {
        // ignore
      }
      gain.disconnect();
    });
    this.activeLoopNodes.clear();
    this.sounds.forEach(({ audio }) => {
      audio.pause();
      audio.src = "";
    });
    this.sounds.clear();
    this.audioBuffers.clear();
    this.musicGains.clear();
    this.music.clear();
    this.loopingSounds.clear();
    this.initialized = false;
  }
}

// Create and export singleton instance.
// NOTE: do NOT call audioService.init() here — AudioManager owns initialization
// to avoid double-play under React StrictMode.
export const audioService = new AudioService(AUDIO_CONFIG);
