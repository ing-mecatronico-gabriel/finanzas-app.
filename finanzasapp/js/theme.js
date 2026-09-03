/**
 * FINANZASAPP — GESTOR DE TEMAS (CLARO, OSCURO Y AUTOMÁTICO)
 * Persistencia en localStorage y sincronización con preferencias de sistema
 */

const ThemeManager = {
  currentTheme: localStorage.getItem('finanzas_theme') || 'system',

  init() {
    this.applyTheme(this.currentTheme);

    // Escuchar cambios de preferencia de color del sistema operativo
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (this.currentTheme === 'system') {
        this.applySystemTheme();
      }
    });

    this.bindUI();
  },

  setTheme(theme) {
    this.currentTheme = theme;
    localStorage.setItem('finanzas_theme', theme);
    this.applyTheme(theme);
    this.updateUI();
  },

  cycleTheme() {
    const modes = ['light', 'dark', 'system'];
    const nextIdx = (modes.indexOf(this.currentTheme) + 1) % modes.length;
    this.setTheme(modes[nextIdx]);
  },

  applyTheme(theme) {
    if (theme === 'system') {
      this.applySystemTheme();
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  },

  applySystemTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  },

  updateUI() {
    const icons = {
      light: 'fa-sun',
      dark: 'fa-moon',
      system: 'fa-adjust'
    };
    const labels = {
      light: 'Modo Claro',
      dark: 'Modo Oscuro',
      system: 'Automático'
    };

    const iconEls = document.querySelectorAll('.theme-icon-indicator');
    iconEls.forEach(el => {
      el.className = `fas ${icons[this.currentTheme]} theme-icon-indicator`;
    });

    const labelEls = document.querySelectorAll('.theme-label-indicator');
    labelEls.forEach(el => {
      el.textContent = labels[this.currentTheme];
    });
  },

  bindUI() {
    const btns = document.querySelectorAll('[data-action="toggle-theme"]');
    btns.forEach(b => {
      b.addEventListener('click', () => this.cycleTheme());
    });
    this.updateUI();
  }
};

window.ThemeManager = ThemeManager;
document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
