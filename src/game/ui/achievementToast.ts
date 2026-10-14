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
  private static timeoutId: number | null = null;
  private static intervalId: number | null = null;
  private static keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private static currentItems: AchievementPayload[] = [];
  private static onDismissCallback?: () => void;
  private static startTime = 0;
  private static totalMs = 3000;
  private static resumingTemplateFn: (seconds: number) => string = (s) =>
    `Resuming in ${s}s...`;

  public static show(
    payload: AchievementPayload,
    options: AchievementToastOptions = {},
  ): void {
    if (typeof document === 'undefined') return;

    const durationSeconds = options.durationSeconds ?? 3;
    AchievementToast.totalMs = durationSeconds * 1000;
    AchievementToast.startTime = performance.now();
    if (options.onDismiss) {
      AchievementToast.onDismissCallback = options.onDismiss;
    }
    if (options.resumingTemplate) {
      AchievementToast.resumingTemplateFn = options.resumingTemplate;
    }

    // If modal is already visible, append this achievement to the current modal
    if (AchievementToast.activeModal) {
      // Check if already in current list
      if (!AchievementToast.currentItems.some((i) => i.achievementId === payload.achievementId)) {
        AchievementToast.currentItems.push(payload);
        AchievementToast.updateCardContents(options.resumeLabel ?? 'RESUME ▶');
      }

      // Reset auto-dismiss timer so user has fresh 3 seconds to read both
      if (AchievementToast.timeoutId !== null) {
        clearTimeout(AchievementToast.timeoutId);
      }
      AchievementToast.timeoutId = window.setTimeout(() => {
        AchievementToast.dismiss();
      }, AchievementToast.totalMs);
      return;
    }

    // First achievement: create modal
    AchievementToast.currentItems = [payload];
    const resumeLabel = options.resumeLabel ?? 'RESUME ▶';

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
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
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

    // Setup interval for progress bar and countdown text
    AchievementToast.intervalId = window.setInterval(() => {
      const elapsed = performance.now() - AchievementToast.startTime;
      const progress = Math.max(0, 1 - elapsed / AchievementToast.totalMs);
      const timerBar = card.querySelector('#achievement-timer-bar') as HTMLElement | null;
      if (timerBar) {
        timerBar.style.width = `${(progress * 100).toFixed(1)}%`;
      }
      const remainSecs = Math.max(1, Math.ceil((AchievementToast.totalMs - elapsed) / 1000));
      const countdownText = card.querySelector('#achievement-countdown-text') as HTMLElement | null;
      if (countdownText) {
        countdownText.textContent = AchievementToast.resumingTemplateFn(remainSecs);
      }
    }, 50);

    // Auto dismiss timer
    AchievementToast.timeoutId = window.setTimeout(() => {
      AchievementToast.dismiss();
    }, AchievementToast.totalMs);

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
      const item = items[0];
      itemsHtml = `
        <div style="width: 58px; height: 58px; border-radius: 50%; background: radial-gradient(circle, rgba(241, 224, 90, 0.25) 0%, rgba(241, 224, 90, 0.05) 70%, transparent 100%); display: flex; align-items: center; justify-content: center; font-size: 34px; line-height: 1; border: 1px solid rgba(241, 224, 90, 0.3);">
          ${item.icon}
        </div>
        <div>
          <div style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px;">
            ${item.title}
          </div>
          <div style="font-size: 13px; color: #94a3b8; margin-top: 5px; line-height: 1.45;">
            ${item.description}
          </div>
        </div>
      `;
    } else {
      itemsHtml = items
        .map(
          (item) => `
        <div style="display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="width: 42px; height: 42px; border-radius: 50%; background: rgba(241, 224, 90, 0.15); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; border: 1px solid rgba(241, 224, 90, 0.3);">
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
      <div id="achievement-header-text" style="font-size: 11.5px; font-weight: 800; color: #f1e05a; letter-spacing: 1.2px; text-transform: uppercase;">
        ${headerText}
      </div>
      <div id="achievement-items-container" style="display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%;">
        ${itemsHtml}
      </div>
      <div style="width: 100%; height: 3px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; overflow: hidden; margin-top: 4px;">
        <div id="achievement-timer-bar" style="height: 100%; width: 100%; background: #f1e05a; box-shadow: 0 0 8px #f1e05a; transition: width 0.08s linear;"></div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 6px;">
        <span id="achievement-countdown-text" style="font-size: 12px; color: #8b949e; font-family: monospace; font-weight: 600;">
          ${AchievementToast.resumingTemplateFn(3)}
        </span>
        <button id="achievement-resume-btn" style="background: linear-gradient(135deg, #f1e05a 0%, #d4a72c 100%); border: none; border-radius: 6px; padding: 6px 14px; font-size: 12px; font-weight: 700; color: #050b14; cursor: pointer; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(241, 224, 90, 0.4); transition: transform 0.15s ease, filter 0.15s ease;">
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

    if (AchievementToast.timeoutId !== null) {
      clearTimeout(AchievementToast.timeoutId);
      AchievementToast.timeoutId = null;
    }
    if (AchievementToast.intervalId !== null) {
      clearInterval(AchievementToast.intervalId);
      AchievementToast.intervalId = null;
    }
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
