import { I18nManager } from '../i18n';
import { AnalyticsCollector } from './AnalyticsCollector';

export class DeveloperAnalyticsPanel {
  private container: HTMLElement | null = null;
  private readonly analytics: AnalyticsCollector;
  private readonly i18n: I18nManager;

  constructor(analytics?: AnalyticsCollector, i18n?: I18nManager) {
    this.analytics = analytics ?? AnalyticsCollector.getInstance();
    this.i18n = i18n ?? new I18nManager('en');
  }

  public show(): void {
    if (this.container) {
      this.container.remove();
    }

    const data = this.analytics.getAnalyticsData();
    const saveRatePercent = (data.saveRate * 100).toFixed(1);
    const avgSurvival =
      data.totalSessions > 0 ? Math.round(data.totalSurvivalSeconds / data.totalSessions) : 0;

    const modal = document.createElement('div');
    modal.id = 'dev-analytics-modal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(3, 7, 16, 0.88);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      color: #e6edf3;
      padding: 16px;
      box-sizing: border-box;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 12px;
      width: 100%;
      max-width: 640px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 36px rgba(0,0,0,0.6);
      overflow: hidden;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid #21262d;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #161b22;
    `;
    header.innerHTML = `
      <div style="font-weight: 700; font-size: 16px; color: #58a6ff; letter-spacing: 0.5px;">
        📊 ${this.i18n.t('analytics.title') || 'DEVELOPER ANALYTICS DASHBOARD'}
      </div>
      <button id="dev-analytics-close" style="
        background: transparent;
        border: none;
        color: #8b949e;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        line-height: 1;
      ">✕</button>
    `;

    // Scrollable Body
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
    `;

    // Metric Cards Grid
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #8b949e; margin-bottom: 4px;">TOTAL RUNS</div>
          <div style="font-size: 20px; font-weight: 700; color: #58a6ff;">${data.totalSessions}</div>
        </div>
        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #8b949e; margin-bottom: 4px;">SAVE RATE</div>
          <div style="font-size: 20px; font-weight: 700; color: #3fb950;">${saveRatePercent}%</div>
        </div>
        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #8b949e; margin-bottom: 4px;">AVG SURVIVAL</div>
          <div style="font-size: 20px; font-weight: 700; color: #d29922;">${avgSurvival}s</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #8b949e; margin-bottom: 4px;">SAVED / MISSED</div>
          <div style="font-size: 14px; font-weight: 600; color: #c9d1d9;">${data.totalNorthernCatches} / ${data.totalSouthernMisses}</div>
        </div>
        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #8b949e; margin-bottom: 4px;">MULTIBALLS</div>
          <div style="font-size: 16px; font-weight: 700; color: #a371f7;">${data.multiballCount}</div>
        </div>
        <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #8b949e; margin-bottom: 4px;">ANTI-STUCK FIXES</div>
          <div style="font-size: 16px; font-weight: 700; color: #f85149;">${data.antiStuckActivations}</div>
        </div>
      </div>

      <!-- Heatmap Visualizer -->
      <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 14px;">
        <div style="font-size: 13px; font-weight: 600; color: #79c0ff; margin-bottom: 10px; display: flex; justify-content: space-between;">
          <span>AEGEAN BOUNCE HEATMAP (20×35 GRID)</span>
          <span style="font-size: 11px; color: #8b949e;">Low 🟦 🟩 🟨 🟥 High</span>
        </div>
        <div style="display: flex; justify-content: center;">
          <canvas id="dev-analytics-heatmap" width="200" height="350" style="background: #09111e; border: 1px solid #21262d; border-radius: 4px;"></canvas>
        </div>
      </div>

      <!-- Top Collisions -->
      <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 14px;">
        <div style="font-size: 13px; font-weight: 600; color: #79c0ff; margin-bottom: 8px;">TOP 5 ISLAND IMPACTS</div>
        <div id="dev-top-islands" style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-family: monospace;"></div>
      </div>
    `;

    // Footer actions
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 14px 20px;
      border-top: 1px solid #21262d;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      background: #161b22;
    `;
    footer.innerHTML = `
      <button id="dev-analytics-export" style="
        background: #21262d;
        color: #c9d1d9;
        border: 1px solid #30363d;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        font-weight: 600;
      ">📥 Export JSON</button>
      <button id="dev-analytics-reset" style="
        background: rgba(248, 81, 73, 0.1);
        color: #f85149;
        border: 1px solid rgba(248, 81, 73, 0.4);
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        font-weight: 600;
      ">🗑️ Reset Data</button>
    `;

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    this.container = modal;

    // Render Heatmap Canvas
    this.renderHeatmapCanvas(data.heatmapGrid);

    // Render Top Islands
    this.renderTopIslands(data.islandHitCounts);

    // Event Handlers
    modal.querySelector('#dev-analytics-close')?.addEventListener('click', () => this.hide());
    modal.querySelector('#dev-analytics-export')?.addEventListener('click', () => {
      const jsonStr = this.analytics.exportAnalyticsJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crete-pinball-analytics-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    modal.querySelector('#dev-analytics-reset')?.addEventListener('click', async () => {
      if (window.confirm('Reset all local analytics metrics?')) {
        await this.analytics.clearAnalytics();
        this.hide();
        this.show();
      }
    });

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        this.hide();
        window.removeEventListener('keydown', onKeyDown);
      }
    };
    window.addEventListener('keydown', onKeyDown);
  }

  private renderHeatmapCanvas(grid: Record<string, number>): void {
    const canvas = this.container?.querySelector('#dev-analytics-heatmap') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cols = AnalyticsCollector.GRID_COLS;
    const rows = AnalyticsCollector.GRID_ROWS;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    let maxVal = 1;
    for (const val of Object.values(grid)) {
      if (val > maxVal) maxVal = val;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${c}_${r}`;
        const count = grid[key] || 0;
        if (count > 0) {
          const ratio = Math.min(1, count / maxVal);
          // Color ramp: Blue (ratio 0) -> Cyan -> Yellow -> Red (ratio 1)
          let rVal = 0;
          let gVal = 0;
          let bVal = 255;

          if (ratio < 0.33) {
            const t = ratio / 0.33;
            rVal = 0;
            gVal = Math.round(t * 200);
            bVal = 255;
          } else if (ratio < 0.66) {
            const t = (ratio - 0.33) / 0.33;
            rVal = Math.round(t * 255);
            gVal = 220;
            bVal = Math.round((1 - t) * 255);
          } else {
            const t = (ratio - 0.66) / 0.34;
            rVal = 255;
            gVal = Math.round((1 - t) * 200);
            bVal = 0;
          }

          ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${0.2 + ratio * 0.8})`;
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }
  }

  private renderTopIslands(islandHits: Record<string, number>): void {
    const el = this.container?.querySelector('#dev-top-islands');
    if (!el) return;

    const sorted = Object.entries(islandHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (sorted.length === 0) {
      el.innerHTML = '<span style="color: #8b949e;">No island collisions recorded yet.</span>';
      return;
    }

    el.innerHTML = sorted
      .map(
        ([id, count], i) => `
        <div style="display: flex; justify-content: space-between; padding: 4px 8px; background: #0d1117; border-radius: 4px;">
          <span>#${i + 1} ${id}</span>
          <span style="color: #79c0ff; font-weight: 700;">${count} hits</span>
        </div>
      `,
      )
      .join('');
  }

  public hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
