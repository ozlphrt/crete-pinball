export class AchievementToast {
  private static activeToast: HTMLElement | null = null;
  private static timeoutId: number | null = null;

  public static show(payload: {
    achievementId: string;
    title: string;
    description: string;
    icon: string;
  }): void {
    if (typeof document === 'undefined') return;

    if (AchievementToast.activeToast) {
      AchievementToast.activeToast.remove();
      if (AchievementToast.timeoutId !== null) {
        clearTimeout(AchievementToast.timeoutId);
      }
    }

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(13, 17, 23, 0.95);
      border: 1.5px solid #f1e05a;
      border-radius: 10px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7), 0 0 16px rgba(241, 224, 90, 0.3);
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #e6edf3;
      max-width: 90vw;
      width: 360px;
      pointer-events: none;
      animation: toastFadeIn 0.25s ease-out;
    `;

    toast.innerHTML = `
      <div style="font-size: 32px; line-height: 1;">${payload.icon}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 11px; font-weight: 700; color: #f1e05a; letter-spacing: 0.8px; text-transform: uppercase;">
          ★ ACHIEVEMENT UNLOCKED!
        </div>
        <div style="font-size: 15px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
          ${payload.title}
        </div>
        <div style="font-size: 12px; color: #8b949e; margin-top: 2px;">
          ${payload.description}
        </div>
      </div>
    `;

    document.body.appendChild(toast);
    AchievementToast.activeToast = toast;

    AchievementToast.timeoutId = window.setTimeout(() => {
      if (AchievementToast.activeToast === toast) {
        toast.style.transition = 'opacity 0.4s ease-out';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
      }
    }, 4500);
  }
}
