import { I18nManager } from '../../i18n';
import { TutorialDirector, TutorialStep } from '../tutorial/tutorialDirector';

export class TutorialOverlay {
  private readonly director: TutorialDirector;
  private readonly i18n: I18nManager;
  private rootElement: HTMLDivElement | null = null;
  private titleEl: HTMLElement | null = null;
  private stepTitleEl: HTMLElement | null = null;
  private stepDescEl: HTMLElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private dotsContainerEl: HTMLElement | null = null;

  constructor(director: TutorialDirector, i18n: I18nManager) {
    this.director = director;
    this.i18n = i18n;

    this.director.onStepChanged((step, isLast) => {
      if (step) {
        this.renderStep(step, isLast);
      } else {
        this.hide();
      }
    });

    this.director.onComplete(() => {
      this.hide();
    });
  }

  public show(): void {
    if (!this.rootElement) {
      this.initDOM();
    }
    if (this.rootElement) {
      this.rootElement.style.display = 'flex';
      const step = this.director.getCurrentStep();
      if (step) {
        this.renderStep(
          step,
          this.director.getCurrentStepIndex() === this.director.getTotalSteps() - 1,
        );
      }
    }
  }

  public hide(): void {
    if (this.rootElement) {
      this.rootElement.style.display = 'none';
    }
  }

  public isVisible(): boolean {
    return !!(this.rootElement && this.rootElement.style.display !== 'none');
  }

  private initDOM(): void {
    const container = document.getElementById('game-container') ?? document.body;

    const overlay = document.createElement('div');
    overlay.id = 'tutorial-modal-overlay';
    overlay.className = 'tutorial-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', this.i18n.t('tutorial.title'));

    overlay.innerHTML = `
      <div class="tutorial-card">
        <div class="tutorial-header">
          <span class="tutorial-step-badge" id="tutorial-step-badge">1 / 7</span>
          <button class="tutorial-skip-btn" id="tutorial-skip-btn" aria-label="Skip Tutorial">
            ${this.i18n.t('tutorial.skip')}
          </button>
        </div>

        <div class="tutorial-body">
          <h2 class="tutorial-step-title" id="tutorial-step-title">NORTHERN ENTRANCE</h2>
          <p class="tutorial-step-desc" id="tutorial-step-desc">The nautical ball drops from the northern Aegean into play.</p>
        </div>

        <div class="tutorial-dots" id="tutorial-dots"></div>

        <div class="tutorial-footer">
          <button class="tutorial-next-btn" id="tutorial-next-btn">
            ${this.i18n.t('tutorial.next')}
          </button>
        </div>
      </div>
    `;

    container.appendChild(overlay);
    this.rootElement = overlay;
    this.titleEl = overlay.querySelector('#tutorial-step-badge');
    this.stepTitleEl = overlay.querySelector('#tutorial-step-title');
    this.stepDescEl = overlay.querySelector('#tutorial-step-desc');
    this.nextBtn = overlay.querySelector('#tutorial-next-btn');
    this.skipBtn = overlay.querySelector('#tutorial-skip-btn');
    this.dotsContainerEl = overlay.querySelector('#tutorial-dots');

    this.nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.director.next();
    });

    this.skipBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.director.skip();
    });

    // Prevent clicks from reaching Phaser canvas
    overlay.addEventListener('pointerdown', (e) => e.stopPropagation());
    overlay.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }

  private renderStep(step: TutorialStep, isLast: boolean): void {
    if (!this.rootElement) this.initDOM();

    if (this.titleEl) {
      this.titleEl.textContent = `${step.index} / ${this.director.getTotalSteps()}`;
    }
    if (this.stepTitleEl) {
      this.stepTitleEl.textContent = this.i18n.t(step.titleKey);
    }
    if (this.stepDescEl) {
      this.stepDescEl.textContent = this.i18n.t(step.descKey);
    }
    if (this.nextBtn) {
      this.nextBtn.textContent = isLast
        ? this.i18n.t('tutorial.gotit')
        : this.i18n.t('tutorial.next');
    }
    if (this.skipBtn) {
      this.skipBtn.textContent = this.i18n.t('tutorial.skip');
    }

    // Render step dots
    if (this.dotsContainerEl) {
      const total = this.director.getTotalSteps();
      let dotsHtml = '';
      for (let i = 1; i <= total; i++) {
        const activeClass = i === step.index ? 'active' : '';
        dotsHtml += `<div class="tutorial-dot ${activeClass}"></div>`;
      }
      this.dotsContainerEl.innerHTML = dotsHtml;
    }
  }

  public updateLocale(): void {
    const step = this.director.getCurrentStep();
    if (step) {
      this.renderStep(
        step,
        this.director.getCurrentStepIndex() === this.director.getTotalSteps() - 1,
      );
    }
  }

  public destroy(): void {
    this.rootElement?.remove();
    this.rootElement = null;
  }
}
