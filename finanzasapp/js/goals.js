/**
 * FINANZASAPP — MÓDULO DE METAS DE AHORRO
 * Progreso visual porcentual, aportes a metas y creación de nuevos objetivos
 */

const GoalsModule = {
  init() {
    this.bindEvents();
    this.render();
  },

  bindEvents() {
    const form = document.getElementById('form-add-goal');
    if (form) {
      form.addEventListener('submit', (e) => this.handleCreateGoal(e));
    }
  },

  render() {
    const container = document.getElementById('goals-list-container');
    if (!container) return;

    if (AppState.goals.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-muted);">
          <i class="fas fa-bullseye" style="font-size: 2.2rem; margin-bottom: 12px; opacity: 0.5;"></i>
          <p>No tienes metas de ahorro activas. ¡Crea una para alcanzar tus sueños!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = AppState.goals.map(g => {
      const current = parseFloat(g.current_amount) || 0;
      const target = parseFloat(g.target_amount) || 1;
      const pct = Math.min(100, Math.round((current / target) * 100));
      const color = g.color || '#8B5CF6';

      return `
        <div class="activity-card" style="margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="acc-icon-square" style="background: ${color}20; color: ${color};">
                <i class="fas fa-${g.icon || 'bullseye'}"></i>
              </div>
              <div>
                <h4 style="font-size: 1.05rem; font-weight: 700;">${g.title}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted);">${formatCurrency(current)} de ${formatCurrency(target)}</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.1rem; font-weight: 800; color: ${color};">${pct}%</span>
              <button onclick="GoalsModule.deleteGoal('${g.id}')" style="background: none; border: none; color: var(--text-muted); cursor: pointer;" title="Eliminar">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>

          <div style="width: 100%; height: 12px; background: var(--bg-input); border-radius: 9999px; overflow: hidden; margin-bottom: 12px;">
            <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 9999px; transition: width 0.6s ease;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Faltan: ${formatCurrency(Math.max(0, target - current))}</span>
            <button onclick="GoalsModule.addContribution('${g.id}')" class="btn-secondary" style="padding: 6px 14px; font-size: 0.75rem; border-radius: 9999px;">
              <i class="fas fa-plus"></i> Abonar a Meta
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  handleCreateGoal(e) {
    e.preventDefault();
    const title = document.getElementById('goal-new-title').value.trim();
    const target = parseFloat(document.getElementById('goal-new-target').value);
    const initial = parseFloat(document.getElementById('goal-new-initial').value) || 0;
    const color = document.getElementById('goal-new-color').value || '#8B5CF6';

    if (!title || !target || target <= 0) return alert('Ingresa un título y un monto objetivo válido.');

    const newGoal = {
      id: uuidv4(),
      title,
      target_amount: target,
      current_amount: initial,
      color,
      icon: 'bullseye'
    };

    AppState.goals.push(newGoal);
    saveLocalState();

    document.getElementById('form-add-goal').reset();
    closeModal('modal-add-goal');
    this.render();
  },

  addContribution(id) {
    const amountStr = prompt('¿Cuánto dinero deseas abonar a esta meta? ($)');
    if (!amountStr) return;

    const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
    if (isNaN(amount) || amount <= 0) return alert('Monto no válido.');

    const goal = AppState.goals.find(g => g.id === id);
    if (!goal) return;

    goal.current_amount = (parseFloat(goal.current_amount) || 0) + amount;
    saveLocalState();
    this.render();
    alert(`🎉 ¡Abono registrado! Has avanzado hacia tu meta de ${goal.title}.`);
  },

  deleteGoal(id) {
    if (!confirm('¿Eliminar esta meta de ahorro?')) return;
    const idx = AppState.goals.findIndex(g => g.id === id);
    if (idx !== -1) {
      AppState.goals.splice(idx, 1);
      saveLocalState();
      this.render();
    }
  }
};

window.GoalsModule = GoalsModule;
