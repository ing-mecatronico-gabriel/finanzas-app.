/**
 * FINANZASAPP — SISTEMA DE SONIDOS Y MICROINTERACCIONES ACÚSTICAS
 * Sintetizador nativo con Web Audio API (Cero archivos externos, 0ms latencia, funciona 100% offline)
 */

const SoundFX = {
  enabled: localStorage.getItem('finanzas_sound_enabled') !== 'false',
  audioCtx: null,

  init() {
    // Inicializar AudioContext al primer toque del usuario
    const unlockAudio = () => {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    this.updateSoundIndicatorUI();
  },

  toggleSound() {
    this.enabled = !this.enabled;
    localStorage.setItem('finanzas_sound_enabled', this.enabled);
    this.updateSoundIndicatorUI();
    if (this.enabled) {
      this.playSuccess();
      if (window.MotionSystem) window.MotionSystem.showToast('Sonido Activado', 'Efectos de sonido de la app encendidos', 'volume-up');
    } else {
      if (window.MotionSystem) window.MotionSystem.showToast('Sonido Silenciado', 'Efectos de sonido apagados', 'volume-mute');
    }
  },

  updateSoundIndicatorUI() {
    const icons = document.querySelectorAll('.sound-toggle-icon');
    icons.forEach(ic => {
      ic.className = this.enabled ? 'fas fa-volume-up sound-toggle-icon' : 'fas fa-volume-mute sound-toggle-icon';
      ic.style.color = this.enabled ? 'var(--brand-blue)' : 'var(--text-muted)';
    });
  },

  ensureContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.audioCtx = new AudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  },

  // 1. Sonido de Monedas / Caja Registradora / Ingreso Exitoso
  playCash() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Doble armónico brillante tipo campana de oro
      [987.77, 1318.51, 1975.53].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } catch (e) {}
  },

  // 2. Sonido de Éxito / Guardado
  playSuccess() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99, 1046.50]; // Acorde Do Mayor
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.3);
      });
    } catch (e) {}
  },

  // 3. Sonido de Clic / Pop suave
  playClick() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  },

  // 4. Sonido de Deslizamiento de Tarjeta de Crédito (Swipe)
  playCardSwipe() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.08);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  },

  // 5. Sonido de Alerta / Campana
  playBell() {
    if (!this.enabled) return;
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {}
  }
};

document.addEventListener('DOMContentLoaded', () => {
  SoundFX.init();
});

window.SoundFX = SoundFX;
