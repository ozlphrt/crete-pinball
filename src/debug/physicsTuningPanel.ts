import { PhysicsWorld } from '../game/physics/physicsWorld';
import { RunController } from '../game/systems/runController';

export class PhysicsTuningPanel {
  private panelElement: HTMLDivElement | null = null;
  private isVisible = false;
  private physicsWorld: PhysicsWorld;
  private runController: RunController;

  constructor(physicsWorld: PhysicsWorld, runController: RunController) {
    this.physicsWorld = physicsWorld;
    this.runController = runController;
    this.createPanel();
  }

  public toggle(): boolean {
    this.isVisible = !this.isVisible;
    if (this.panelElement) {
      this.panelElement.style.display = this.isVisible ? 'block' : 'none';
      if (this.isVisible) {
        this.refreshValues();
      }
    }
    return this.isVisible;
  }

  public get visible(): boolean {
    return this.isVisible;
  }

  private createPanel(): void {
    if (typeof document === 'undefined') return;

    this.panelElement = document.createElement('div');
    this.panelElement.id = 'physics-tuning-panel';
    Object.assign(this.panelElement.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '320px',
      maxHeight: '90vh',
      overflowY: 'auto',
      backgroundColor: 'rgba(13, 17, 23, 0.94)',
      color: '#e6edf3',
      fontFamily: 'monospace',
      fontSize: '12px',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #30363d',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      zIndex: '99999',
      display: 'none',
    });

    this.panelElement.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #30363d; padding-bottom:6px;">
        <strong style="color:#58a6ff; font-size:14px;">⚙️ Physics & Arcade Tuning</strong>
        <button id="btn-tuning-close" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; cursor:pointer; padding:2px 8px; border-radius:4px;">✕</button>
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-weight:bold; color:#7ee787; margin-bottom:4px;">Core Physics (Active Mode)</div>
        <label>Gravity Y: <span id="val-gravity">240</span>
          <input type="range" id="slider-gravity" min="100" max="500" step="10" value="240" style="width:100%;">
        </label>
        <label>Max Ball Speed: <span id="val-max-speed">1050</span>
          <input type="range" id="slider-max-speed" min="600" max="1800" step="50" value="1050" style="width:100%;">
        </label>
        <label>Crete Bounce: <span id="val-bounce">1.2</span>
          <input type="range" id="slider-bounce" min="1.0" max="1.6" step="0.05" value="1.2" style="width:100%;">
        </label>
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-weight:bold; color:#f1e05a; margin-bottom:4px;">⚡ Crete Power Bounce</div>
        <button id="btn-arm-power" style="width:100%; padding:4px; background:#238636; color:#fff; border:none; border-radius:4px; cursor:pointer; margin-bottom:4px;">Full Charge & Arm</button>
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-weight:bold; color:#f1e05a; margin-bottom:4px;">⚡ Multiball System</div>
        <button id="btn-trigger-multiball" style="width:100%; padding:4px; background:#8957e5; color:#fff; border:none; border-radius:4px; cursor:pointer; margin-bottom:4px;">Spawn 3-Ball Multiball</button>
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-weight:bold; color:#79c0ff; margin-bottom:4px;">🌬️ Aegean Weather Director</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:4px;">
          <button id="btn-weather-meltemi" style="padding:4px; background:#1f6feb; color:#fff; border:none; border-radius:4px; cursor:pointer;">Meltemi</button>
          <button id="btn-weather-crosswind" style="padding:4px; background:#1f6feb; color:#fff; border:none; border-radius:4px; cursor:pointer;">Crosswind</button>
          <button id="btn-weather-calm" style="padding:4px; background:#1f6feb; color:#fff; border:none; border-radius:4px; cursor:pointer;">Calm Seas</button>
          <button id="btn-weather-clear" style="padding:4px; background:#30363d; color:#fff; border:none; border-radius:4px; cursor:pointer;">Clear</button>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-weight:bold; color:#ff7b72; margin-bottom:4px;">⏱️ Cinematic Slow Motion</div>
        <button id="btn-trigger-slowmo" style="width:100%; padding:4px; background:#da3633; color:#fff; border:none; border-radius:4px; cursor:pointer; margin-bottom:4px;">Trigger 60% Slow Mo</button>
      </div>

      <div style="border-top:1px solid #30363d; padding-top:8px; display:flex; flex-direction:column; gap:4px;">
        <button id="btn-tuning-reset" style="padding:4px; background:#21262d; border:1px solid #30363d; color:#c9d1d9; border-radius:4px; cursor:pointer;">Reset Defaults</button>
        <button id="btn-tuning-export" style="padding:4px; background:#21262d; border:1px solid #30363d; color:#58a6ff; border-radius:4px; cursor:pointer;">Export Config JSON</button>
      </div>
    `;

    document.body.appendChild(this.panelElement);
    this.wireEvents();
  }

  private wireEvents(): void {
    if (!this.panelElement) return;

    this.panelElement.querySelector('#btn-tuning-close')?.addEventListener('click', () => {
      this.toggle();
    });

    const sGravity = this.panelElement.querySelector('#slider-gravity') as HTMLInputElement;
    sGravity?.addEventListener('input', () => {
      const val = parseFloat(sGravity.value);
      const span = this.panelElement?.querySelector('#val-gravity');
      if (span) span.textContent = String(val);
      this.physicsWorld.setGravity(0, val);
    });

    const sMaxSpeed = this.panelElement.querySelector('#slider-max-speed') as HTMLInputElement;
    sMaxSpeed?.addEventListener('input', () => {
      const val = parseFloat(sMaxSpeed.value);
      const span = this.panelElement?.querySelector('#val-max-speed');
      if (span) span.textContent = String(val);
      this.physicsWorld.setMaxBallSpeed(val);
    });

    const sBounce = this.panelElement.querySelector('#slider-bounce') as HTMLInputElement;
    sBounce?.addEventListener('input', () => {
      const val = parseFloat(sBounce.value);
      const span = this.panelElement?.querySelector('#val-bounce');
      if (span) span.textContent = val.toFixed(2);
      const cfg = this.physicsWorld.getConfig();
      this.physicsWorld.setConfig({ ...cfg, creteBounceFactor: val });
    });

    this.panelElement.querySelector('#btn-arm-power')?.addEventListener('click', () => {
      const creteSys = this.runController.getCreteEnergySystem();
      // Add 4 combo charges to guarantee 100% full
      creteSys.addComboCharge();
      creteSys.addComboCharge();
      creteSys.addComboCharge();
      creteSys.addComboCharge();
      creteSys.arm();
      this.physicsWorld.setPowerBounceArmed(true);
    });

    this.panelElement.querySelector('#btn-trigger-multiball')?.addEventListener('click', () => {
      this.runController.getMultiballSystem().triggerMultiball();
    });

    this.panelElement.querySelector('#btn-weather-meltemi')?.addEventListener('click', () => {
      this.runController.getWeatherDirector().triggerEvent('meltemi');
      const force = this.runController.getWeatherDirector().activeForce;
      this.physicsWorld.setWeatherForce(force.x, force.y);
    });

    this.panelElement.querySelector('#btn-weather-crosswind')?.addEventListener('click', () => {
      this.runController.getWeatherDirector().triggerEvent('crosswind', 'east');
      const force = this.runController.getWeatherDirector().activeForce;
      this.physicsWorld.setWeatherForce(force.x, force.y);
    });

    this.panelElement.querySelector('#btn-weather-calm')?.addEventListener('click', () => {
      this.runController.getWeatherDirector().triggerEvent('calm');
      const force = this.runController.getWeatherDirector().activeForce;
      this.physicsWorld.setWeatherForce(force.x, force.y);
    });

    this.panelElement.querySelector('#btn-weather-clear')?.addEventListener('click', () => {
      this.runController.getWeatherDirector().clearActiveEvent();
      this.physicsWorld.setWeatherForce(0, 0);
    });

    this.panelElement.querySelector('#btn-trigger-slowmo')?.addEventListener('click', () => {
      this.runController.getTimeDilationController().triggerSlowMotion();
      this.physicsWorld.setTimeDilationFactor(
        this.runController.getTimeDilationController().timeScale,
      );
    });

    this.panelElement.querySelector('#btn-tuning-reset')?.addEventListener('click', () => {
      const diffSys = this.runController.getDifficultySystem();
      this.physicsWorld.setGravity(0, diffSys.getGravity());
      this.physicsWorld.setMaxBallSpeed(diffSys.getMaxBallSpeed());
      this.refreshValues();
    });

    this.panelElement.querySelector('#btn-tuning-export')?.addEventListener('click', () => {
      const exportData = {
        difficulty: this.runController.difficulty,
        physicsConfig: this.physicsWorld.getConfig(),
        specialIslands: this.runController
          .getSpecialIslandSystem()
          .getAllStatuses()
          .map((s) => s.config),
        powerBounceConfig: this.runController.getCreteEnergySystem().getConfig(),
        multiballConfig: this.runController.getMultiballSystem().getConfig(),
        weatherConfig: this.runController.getWeatherDirector().getConfig(),
        timeDilationConfig: this.runController.getTimeDilationController().getConfig(),
        landingPredictorConfig: this.runController.getLandingPredictor().getConfig(),
      };
      const jsonStr = JSON.stringify(exportData, null, 2);
      navigator.clipboard?.writeText(jsonStr);
      alert('Tuning configuration copied to clipboard!');
    });
  }

  private refreshValues(): void {
    if (!this.panelElement) return;
    const cfg = this.physicsWorld.getConfig();

    const sGravity = this.panelElement.querySelector('#slider-gravity') as HTMLInputElement;
    if (sGravity) sGravity.value = String(cfg.gravity.y);
    const spanG = this.panelElement.querySelector('#val-gravity');
    if (spanG) spanG.textContent = String(cfg.gravity.y);

    const sMax = this.panelElement.querySelector('#slider-max-speed') as HTMLInputElement;
    if (sMax) sMax.value = String(cfg.maxBallSpeed);
    const spanM = this.panelElement.querySelector('#val-max-speed');
    if (spanM) spanM.textContent = String(cfg.maxBallSpeed);

    const sB = this.panelElement.querySelector('#slider-bounce') as HTMLInputElement;
    if (sB) sB.value = String(cfg.creteBounceFactor);
    const spanB = this.panelElement.querySelector('#val-bounce');
    if (spanB) spanB.textContent = cfg.creteBounceFactor.toFixed(2);
  }

  public destroy(): void {
    if (this.panelElement) {
      this.panelElement.remove();
      this.panelElement = null;
    }
  }
}
