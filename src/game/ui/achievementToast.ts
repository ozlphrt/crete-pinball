export interface AchievementPayload {
  readonly achievementId: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

export interface AchievementToastOptions {
  readonly durationSeconds?: number;
  readonly onDismiss?: () => void;
  readonly resumeLabel?: string;
  readonly resumingTemplate?: (seconds: number) => string;
}

export class AchievementToast {
  private static activeModal: HTMLElement | null = null;
  private static keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private static currentItems: AchievementPayload[] = [];
  private static onDismissCallback?: () => void;

  public static show(
    payload: AchievementPayload,
    options: AchievementToastOptions = {},
  ): void {
    if (typeof document === 'undefined') return;

    if (options.onDismiss) {
      AchievementToast.onDismissCallback = options.onDismiss;
    }

    // If modal is already visible, append this achievement to the current modal
    if (AchievementToast.activeModal) {
      if (!AchievementToast.currentItems.some((i) => i.achievementId === payload.achievementId)) {
        AchievementToast.currentItems.push(payload);
        AchievementToast.updateCardContents(options.resumeLabel ?? 'CONTINUE ▶');
      }
      return;
    }

    // First achievement: create modal
    AchievementToast.currentItems = [payload];
    const resumeLabel = options.resumeLabel ?? 'CONTINUE ▶';

    const backdrop = document.createElement('div');
    backdrop.id = 'achievement-unlock-backdrop';
    backdrop.className = 'achievement-unlock-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(3, 7, 16, 0.65);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
      pointer-events: auto;
      animation: achievementModalFadeIn 0.22s ease-out;
    `;

    const card = document.createElement('div');
    card.id = 'achievement-unlock-card';
    card.className = 'achievement-unlock-card';
    card.style.cssText = `
      background: #0d1117;
      border: 1.5px solid #f1e05a;
      border-radius: 14px;
      padding: 24px 26px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.8), 0 0 24px rgba(241, 224, 90, 0.35);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #e6edf3;
      max-width: 90vw;
      width: 380px;
      box-sizing: border-box;
      animation: achievementCardPop 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    AchievementToast.activeModal = backdrop;

    AchievementToast.renderCard(card, resumeLabel);

    // Tap/click backdrop to resume immediately
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        AchievementToast.dismiss();
      }
    });

    // Space, Enter, or Escape key to resume immediately
    AchievementToast.keyHandler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        AchievementToast.dismiss();
      }
    };
    window.addEventListener('keydown', AchievementToast.keyHandler);
  }

  private static renderCard(card: HTMLElement, resumeLabel: string): void {
    const items = AchievementToast.currentItems;
    const isMulti = items.length > 1;

    let itemsHtml = '';
    if (!isMulti) {
      const item = items[0] ?? { id: '', title: '', description: '', icon: '🏆' };
      itemsHtml = `
        <div style="width: 60px; height: 60px; border-radius: 50%; background: radial-gradient(circle, rgba(241, 224, 90, 0.25) 0%, rgba(241, 224, 90, 0.05) 70%, transparent 100%); display: flex; align-items: center; justify-content: center; font-size: 34px; line-height: 1; border: 1px solid rgba(241, 224, 90, 0.35); margin-bottom: 2px;">
          ${item.icon}
        </div>
        <div>
          <div style="font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px;">
            ${item.title}
          </div>
          <div style="font-size: 13.5px; color: #94a3b8; margin-top: 6px; line-height: 1.45;">
            ${item.description}
          </div>
        </div>
      `;
    } else {
      itemsHtml = items
        .map(
          (item) => `
        <div style="display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(241, 224, 90, 0.15); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; border: 1px solid rgba(241, 224, 90, 0.3);">
            ${item.icon}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 15px; font-weight: 800; color: #ffffff;">${item.title}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">${item.description}</div>
          </div>
        </div>
      `,
        )
        .join('');
    }

    const headerText = isMulti
      ? `★ ${items.length} ACHIEVEMENTS UNLOCKED!`
      : '★ ACHIEVEMENT UNLOCKED!';

    card.innerHTML = `
      <div id="achievement-header-text" style="font-size: 12px; font-weight: 800; color: #f1e05a; letter-spacing: 1.3px; text-transform: uppercase;">
        ${headerText}
      </div>
      <div id="achievement-items-container" style="display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%;">
        ${itemsHtml}
      </div>
      <div style="display: flex; align-items: center; justify-content: center; width: 100%; margin-top: 10px;">
        <button id="achievement-resume-btn" style="background: linear-gradient(135deg, #f5bf62 0%, #d4a72c 100%); border: none; border-radius: 8px; padding: 10px 32px; font-size: 14px; font-weight: 800; color: #050b14; cursor: pointer; letter-spacing: 0.6px; box-shadow: 0 4px 14px rgba(245, 191, 98, 0.45); transition: transform 0.15s ease, filter 0.15s ease;">
          ${resumeLabel}
        </button>
      </div>
    `;

    const resumeBtn = card.querySelector('#achievement-resume-btn') as HTMLButtonElement | null;
    resumeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      AchievementToast.dismiss();
    });
  }

  private static updateCardContents(resumeLabel: string): void {
    if (!AchievementToast.activeModal) return;
    const card = AchievementToast.activeModal.querySelector('#achievement-unlock-card') as HTMLElement | null;
    if (card) {
      AchievementToast.renderCard(card, resumeLabel);
    }
  }

  public static dismiss(): void {
    if (!AchievementToast.activeModal) return;
    const modal = AchievementToast.activeModal;

    if (AchievementToast.keyHandler !== null) {
      window.removeEventListener('keydown', AchievementToast.keyHandler);
      AchievementToast.keyHandler = null;
    }

    modal.style.transition = 'opacity 0.2s ease-out';
    modal.style.opacity = '0';

    setTimeout(() => {
      modal.remove();
      if (AchievementToast.activeModal === modal) {
        AchievementToast.activeModal = null;
      }
      AchievementToast.currentItems = [];

      const cb = AchievementToast.onDismissCallback;
      AchievementToast.onDismissCallback = undefined;
      cb?.();
    }, 200);
  }

  public static dismissAll(): void {
    AchievementToast.dismiss();
  }
}
