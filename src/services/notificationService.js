// Web Notification API & Sound Effects Service

class NotificationService {
  constructor() {
    this.audioCtx = null;
  }

  // Initialize Web Audio context lazily upon user interaction
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play pleasant acoustic tone for notifications
  playChime(type = 'success') {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // High pleasant dual chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'alert') {
        // Distinct alert chime for manager approval request
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(880, now + 0.24); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'error') {
        // Low soft thud
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // Request browser permission for system notifications
  async requestPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return Notification.permission;
  }

  // Send Browser Notification with vibration & sound
  sendSystemNotification(title, options = {}) {
    this.playChime(options.soundType || 'alert');

    // Trigger mobile vibration if available
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const defaultOptions = {
      icon: '/icon.svg',
      badge: '/icon.svg',
      dir: 'rtl',
      lang: 'ar',
      ...options
    };

    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, defaultOptions);
        });
      } else {
        new Notification(title, defaultOptions);
      }
    } catch (err) {
      console.warn('Notification display failed:', err);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
