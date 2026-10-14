import { I18nManager } from '../i18n';

export class OrientationHandler {
  private overlay: HTMLDivElement | null = null;
  private readonly i18n: I18nManager;

  constructor(i18n: I18nManager) {
    this.i18n = i18n;
    this.createDomOverlay();
    this.attachListeners();
    this.checkOrientation();
  }

  private createDomOverlay(): void {
    if (typeof document === 'undefined') return;

    this.overlay = document.createElement('div');
    this.overlay.id = 'rotate-device-overlay';
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100vw';
    this.overlay.style.height = '100vh';
    this.overlay.style.backgroundColor = 'rgba(5, 10, 20, 0.95)';
    this.overlay.style.color = '#ffffff';
    this.overlay.style.display = 'none';
    this.overlay.style.flexDirection = 'column';
    this.overlay.style.justifyContent = 'center';
    this.overlay.style.alignItems = 'center';
    this.overlay.style.zIndex = '99998';
    this.overlay.style.textAlign = 'center';
    this.overlay.style.padding = '20px';
    this.overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';

    const icon = document.createElement('div');
    icon.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
        <path d="M12 18h.01"></path>
      </svg>
    `;
    icon.style.marginBottom = '20px';
    icon.style.animation = 'rotate-hint 2s infinite ease-in-out';

    const text = document.createElement('p');
    text.id = 'rotate-device-text';
    text.style.fontSize = '18px';
    text.style.maxWidth = '300px';
    text.style.lineHeight = '1.5';
    text.textContent = this.i18n.t('orientation.rotatePrompt');

    this.overlay.appendChild(icon);
    this.overlay.appendChild(text);
    document.body.appendChild(this.overlay);
  }

  private attachListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', () => this.checkOrientation());
    window.addEventListener('orientationchange', () => this.checkOrientation());
  }

  public checkOrientation(): boolean {
    if (typeof window === 'undefined' || !this.overlay) return true;

    // Check if device is primarily mobile / touch and in landscape
    // Desktop monitors run in landscape by default and cannot be rotated physically
    const isLandscape = window.innerWidth > window.innerHeight;
    const isTouchDevice =
      'ontouchstart' in window ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
    const isMobileAgent =
      typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobileWidth = window.innerHeight < 600 || window.innerWidth < 900;

    const shouldShow = isLandscape && (isTouchDevice || isMobileAgent) && isMobileWidth;

    if (shouldShow) {
      this.overlay.style.display = 'flex';
      const text = document.getElementById('rotate-device-text');
      if (text) text.textContent = this.i18n.t('orientation.rotatePrompt');
      return false;
    } else {
      this.overlay.style.display = 'none';
      return true;
    }
  }

  public destroy(): void {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}
