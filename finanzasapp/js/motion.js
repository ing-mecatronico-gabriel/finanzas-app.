/**
 * ==========================================================================
 * FINANZASAPP — MOTION DESIGN & ANIMATION SYSTEM
 * Motor de animaciones, interpolación numérica, gráfica interactiva y microinteracciones
 * ==========================================================================
 */

const MotionSystem = {
  activeChartCoords: [],
  activeChartData: [],

  init() {
    this.setupCounterAnimations();
    this.setup3DTilt();
    this.setupInteractiveChart();
    this.setupSpeedDial();
    this.setupAnimatedModals();
    this.setupPullToRefresh();
    this.setupMobileTouchFeedback();
  },

  // ==========================================================
  // 1. INTERPOLACIÓN NUMÉRICA SUAVE (EASE OUT CUBIC)
  // ==========================================================
  animateValue(element, start, end, duration = 1200, formatFn = null) {
    if (!element) return;
    const startTime = performance.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = Math.round(start + (end - start) * easedProgress);

      element.textContent = formatFn ? formatFn(current) : current.toLocaleString('es-CO');

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = formatFn ? formatFn(end) : end.toLocaleString('es-CO');
      }
    }

    requestAnimationFrame(step);
  },

  animateBalance(targetAmount) {
    const el = document.getElementById('portfolio-total-balance');
    if (!el) return;
    this.animateValue(el, 0, targetAmount, 1200, val => formatCurrency(val));
  },

  setupCounterAnimations() {
    // Animar porcentajes pastel
    document.querySelectorAll('.acc-change-tag').forEach(tag => {
      const text = tag.textContent.trim();
      const match = text.match(/([+-])?([0-9.]+)/);
      if (match) {
        const sign = match[1] || '+';
        const num = parseFloat(match[2]);
        this.animateValue(tag, 0, num * 10, 800, val => `${sign}${(val / 10).toFixed(1)}%`);
      }
    });
  },

  // ==========================================================
  // 2. GRÁFICA VECTORIAL ANIMADA E INTERACTIVA
  // ==========================================================
  renderAnimatedSvgChart(containerId, points, activePeriod = '1M') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.activeChartData = points;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = (max - min) || 1;

    const width = 460;
    const height = 100;
    const padding = 12;

    const coords = points.map((val, idx) => {
      const x = padding + (idx / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return { x, y, val };
    });

    this.activeChartCoords = coords;

    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');

    const areaD = `${pathD} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;
    const lastPt = coords[coords.length - 1];

    container.innerHTML = `
      <div class="chart-tooltip-bubble" id="chart-tooltip"></div>
      <svg class="portfolio-chart-svg" id="chart-svg-elem" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow: visible; width: 100%; height: 100%;">
        <defs>
          <linearGradient id="chartGradientMotion" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563EB" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <!-- Área sombreada con entrada suave -->
        <path class="chart-fade-area" d="${areaD}" fill="url(#chartGradientMotion)" />
        <!-- Línea guía interactiva -->
        <line class="chart-guideline" id="chart-guideline-elem" x1="0" y1="0" x2="0" y2="${height}" />
        <!-- Línea progresiva dibujada de izquierda a derecha -->
        <path class="chart-draw-line" d="${pathD}" fill="none" stroke="#2563EB" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Punto final con pulso sutil -->
        <circle class="chart-pulse-dot" id="chart-end-dot" cx="${lastPt.x}" cy="${lastPt.y}" r="4.5" fill="#2563EB" stroke="#FFFFFF" stroke-width="2" />
        <!-- Punto rastreador interactivo -->
        <circle id="chart-scrub-dot" cx="-20" cy="-20" r="5" fill="#2563EB" stroke="#FFFFFF" stroke-width="2.5" style="transition: opacity 0.15s; opacity: 0;" />
      </svg>
    `;

    this.bindChartInteraction(container, coords, width, height);
  },

  bindChartInteraction(container, coords, width, height) {
    const tooltip = document.getElementById('chart-tooltip');
    const guideline = document.getElementById('chart-guideline-elem');
    const scrubDot = document.getElementById('chart-scrub-dot');
    if (!tooltip || !guideline || !scrubDot) return;

    const handlePointerMove = (clientX) => {
      const rect = container.getBoundingClientRect();
      const relX = clientX - rect.left;
      const normalizedX = (relX / rect.width) * width;

      // Encontrar el punto más cercano en la curva
      let closestPt = coords[0];
      let minDiff = Infinity;
      coords.forEach(pt => {
        const diff = Math.abs(pt.x - normalizedX);
        if (diff < minDiff) {
          minDiff = diff;
          closestPt = pt;
        }
      });

      // Posicionar guía vertical y punto sobre la curva sin saltos
      guideline.setAttribute('x1', closestPt.x);
      guideline.setAttribute('x2', closestPt.x);
      guideline.style.opacity = '1';

      scrubDot.setAttribute('cx', closestPt.x);
      scrubDot.setAttribute('cy', closestPt.y);
      scrubDot.style.opacity = '1';

      // Posicionar y mostrar tooltip
      const tooltipLeft = (closestPt.x / width) * rect.width;
      const tooltipTop = (closestPt.y / height) * rect.height;
      tooltip.style.left = `${tooltipLeft}px`;
      tooltip.style.top = `${tooltipTop}px`;
      tooltip.textContent = formatCurrency(closestPt.val);
      tooltip.classList.add('active');
    };

    const handlePointerLeave = () => {
      guideline.style.opacity = '0';
      scrubDot.style.opacity = '0';
      tooltip.classList.remove('active');
    };

    container.onmousemove = (e) => handlePointerMove(e.clientX);
    container.onmouseleave = handlePointerLeave;

    container.ontouchmove = (e) => {
      if (e.touches && e.touches[0]) {
        handlePointerMove(e.touches[0].clientX);
      }
    };
    container.ontouchend = handlePointerLeave;
  },

  // ==========================================================
  // 3. TARJETAS 3D TILT Y PARALLAX
  // ==========================================================
  setup3DTilt() {
    const cards = document.querySelectorAll('.tilt-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      });
    });
  },

  // ==========================================================
  // 4. SPEED DIAL (BOTÓN "+" ANIMADO PARA ACCIONES RÁPIDAS)
  // ==========================================================
  setupSpeedDial() {
    const fabBtn = document.getElementById('mobile-fab-btn');
    const wrapper = document.getElementById('mobile-fab-wrapper');
    if (!fabBtn || !wrapper) return;

    fabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      wrapper.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
      }
    });
  },

  // ==========================================================
  // 5. NOTIFICACIONES FLUIDAS (TOAST SYSTEM CON PROGRESS BAR)
  // ==========================================================
  showToast(title, message, icon = 'check-circle') {
    let container = document.getElementById('app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'app-toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `
      <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10B981; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">
        <i class="fas fa-${icon}"></i>
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 0.88rem; line-height: 1.2;">${title}</div>
        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">${message}</div>
      </div>
      <div class="toast-progress-bar"></div>
    `;

    container.appendChild(toast);

    // Oscilación de campana
    const bell = document.querySelector('.fa-bell');
    if (bell) {
      bell.classList.remove('bell-ring');
      void bell.offsetWidth;
      bell.classList.add('bell-ring');
    }

    // Auto cierre fluido
    setTimeout(() => {
      toast.classList.add('exit');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // ==========================================================
  // 6. MODALES CON ENTRADA Y SALIDA TRANSICIONADA
  // ==========================================================
  setupAnimatedModals() {
    window.closeModalAnimated = function(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      modal.classList.add('closing');
      setTimeout(() => {
        modal.classList.remove('active');
        modal.classList.remove('closing');
        document.body.style.overflow = '';
      }, 250);
    };
  },

  // ==========================================================
  // 7. PARTÍCULAS FINANCIERAS (CELEBRACIÓN EN ACCIONES CLAVE)
  // ==========================================================
  spawnFinancialParticles(targetEl) {
    const rect = targetEl ? targetEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    const container = document.createElement('div');
    container.className = 'particle-burst-container';
    document.body.appendChild(container);

    const chars = ['✦', '•', '+', '★', '●'];
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

    for (let i = 0; i < 16; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle-elem';
      particle.textContent = chars[Math.floor(Math.random() * chars.length)];
      particle.style.color = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = `${originX}px`;
      particle.style.top = `${originY}px`;
      particle.style.fontSize = `${10 + Math.random() * 12}px`;

      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.5;
      const distance = 40 + Math.random() * 70;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      const rot = Math.round(Math.random() * 360);

      particle.style.setProperty('--dx', `${dx}px`);
      particle.style.setProperty('--dy', `${dy}px`);
      particle.style.setProperty('--rot', `${rot}deg`);

      container.appendChild(particle);
    }

    setTimeout(() => container.remove(), 1000);
  },

  // ==========================================================
  // 8. PULL TO REFRESH VISUAL (MÓVIL)
  // ==========================================================
  setupPullToRefresh() {
    let startY = 0;
    let isPulling = false;
    const refreshIndicator = document.getElementById('mobile-pull-indicator');

    window.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0 && e.touches[0]) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isPulling || window.scrollY > 0 || !refreshIndicator) return;
      const currentY = e.touches[0].clientY;
      const pullDist = currentY - startY;

      if (pullDist > 15 && pullDist < 100) {
        refreshIndicator.style.transform = `translateY(${pullDist * 0.5}px) rotate(${pullDist * 3}deg)`;
        refreshIndicator.style.opacity = '1';
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (!isPulling || !refreshIndicator) return;
      isPulling = false;
      refreshIndicator.style.transform = 'translateY(0px)';
      refreshIndicator.style.opacity = '0';
    });
  },

  // ==========================================================
  // 9. FEEDBACK TÁCTIL (PRESIÓN FÍSICA)
  // ==========================================================
  setupMobileTouchFeedback() {
    document.querySelectorAll('.account-pastel-card, .movement-item, .nav-item-btn').forEach(el => {
      el.addEventListener('touchstart', () => {
        el.style.transform = 'scale(0.97)';
      }, { passive: true });

      el.addEventListener('touchend', () => {
        el.style.transform = '';
      }, { passive: true });
    });
  }
};

window.MotionSystem = MotionSystem;
document.addEventListener('DOMContentLoaded', () => MotionSystem.init());
