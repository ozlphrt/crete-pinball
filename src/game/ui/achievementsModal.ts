import { I18nManager, type TranslationKey } from '../../i18n';
import { AchievementRegistry } from '../../progress/AchievementRegistry';
import { GameDatabase } from '../../persistence/GameDatabase';

export class AchievementsModal {
  private container: HTMLElement | null = null;
  private readonly db: GameDatabase;
  private readonly i18n: I18nManager;

  constructor(db?: GameDatabase, i18n?: I18nManager) {
    this.db = db ?? GameDatabase.getInstance();
    this.i18n = i18n ?? new I18nManager('en');
  }

  public async show(): Promise<void> {
    if (this.container) {
      this.container.remove();
    }

    await this.db.init();
    const achsRecord = await this.db.getAchievements();
    const unlockedMap = achsRecord.unlocked;

    const allAchs = AchievementRegistry.getAll();
    const unlockedCount = Object.keys(unlockedMap).length;
    const totalCount = allAchs.length;

    const modal = document.createElement('div');
    modal.id = 'achievements-modal';
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #e6edf3;
      padding: 16px;
      box-sizing: border-box;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #0d1117;
      border: 1.5px solid #30363d;
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      max-height: 85vh;
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
      <div>
        <div style="font-weight: 700; font-size: 18px; color: #f1e05a; letter-spacing: 0.5px;">
          🏆 ${this.i18n.t('achievements.galleryTitle') || 'AEGEAN ACHIEVEMENTS'}
        </div>
        <div style="font-size: 13px; color: #8b949e; margin-top: 2px;">
          ${unlockedCount} / ${totalCount} UNLOCKED (${Math.round((unlockedCount / totalCount) * 100)}%)
        </div>
      </div>
      <button id="achievements-close" style="
        background: transparent;
        border: none;
        color: #8b949e;
        font-size: 22px;
        cursor: pointer;
        padding: 4px 8px;
        line-height: 1;
      ">✕</button>
    `;

    // List Body
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 16px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;

    body.innerHTML = allAchs
      .map((ach) => {
        const item = unlockedMap[ach.id];
        const isUnlocked = Boolean(item);
        const title = this.i18n.t(ach.titleKey as TranslationKey) || ach.id;
        const desc = this.i18n.t(ach.descKey as TranslationKey) || '';
        const unlockDate = item?.unlockedAtIso ? item.unlockedAtIso.slice(0, 10) : '';

        return `
        <div style="
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 8px;
          background: ${isUnlocked ? 'rgba(31, 111, 235, 0.1)' : '#161b22'};
          border: 1px solid ${isUnlocked ? '#388bfd' : '#21262d'};
        ">
          <div style="
            font-size: 28px;
            filter: ${isUnlocked ? 'none' : 'grayscale(100%) opacity(40%)'};
            line-height: 1;
          ">${ach.icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-size: 15px; font-weight: 700; color: ${isUnlocked ? '#ffffff' : '#8b949e'};">
                ${title}
              </span>
              <span style="
                font-size: 11px;
                font-weight: 700;
                padding: 2px 6px;
                border-radius: 4px;
                background: ${isUnlocked ? 'rgba(63, 185, 80, 0.2)' : '#21262d'};
                color: ${isUnlocked ? '#3fb950' : '#6e7681'};
              ">
                ${isUnlocked ? `✓ ${unlockDate}` : 'LOCKED'}
              </span>
            </div>
            <div style="font-size: 12px; color: #8b949e; margin-top: 3px;">
              ${desc}
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);
    this.container = modal;

    modal.querySelector('#achievements-close')?.addEventListener('click', () => this.hide());

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        this.hide();
        window.removeEventListener('keydown', onKeyDown);
      }
    };
    window.addEventListener('keydown', onKeyDown);
  }

  public hide(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
