import { I18nManager, TranslationKey } from '../../i18n';
import { IStorageAdapter } from '../../persistence/contracts';

export interface TutorialStep {
  readonly index: number;
  readonly titleKey: TranslationKey;
  readonly descKey: TranslationKey;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { index: 1, titleKey: 'tutorial.step1.title', descKey: 'tutorial.step1.desc' },
  { index: 2, titleKey: 'tutorial.step2.title', descKey: 'tutorial.step2.desc' },
  { index: 3, titleKey: 'tutorial.step3.title', descKey: 'tutorial.step3.desc' },
  { index: 4, titleKey: 'tutorial.step4.title', descKey: 'tutorial.step4.desc' },
  { index: 5, titleKey: 'tutorial.step5.title', descKey: 'tutorial.step5.desc' },
  { index: 6, titleKey: 'tutorial.step6.title', descKey: 'tutorial.step6.desc' },
  { index: 7, titleKey: 'tutorial.step7.title', descKey: 'tutorial.step7.desc' },
];

export class TutorialDirector {
  private currentStepIndex = 0;
  private isActive = false;
  private readonly storage: IStorageAdapter;
  private readonly i18n: I18nManager;

  private onStepChangedCallback?: (step: TutorialStep | null, isLast: boolean) => void;
  private onCompleteCallback?: () => void;

  constructor(storage: IStorageAdapter, i18n: I18nManager) {
    this.storage = storage;
    this.i18n = i18n;
  }

  public shouldShowTutorialSync(): boolean {
    const prefs = this.storage.getPreferencesSync();
    if (prefs.tutorialCompleted) return false;
    // In automated testing environments, suppress automatic popup unless explicitly requested with ?tutorial=1
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.webdriver &&
      !window.location.search.includes('tutorial=1')
    ) {
      return false;
    }
    return true;
  }

  public start(): void {
    this.isActive = true;
    this.currentStepIndex = 0;
    this.notifyStep();
  }

  public next(): void {
    if (!this.isActive) return;

    if (this.currentStepIndex < TUTORIAL_STEPS.length - 1) {
      this.currentStepIndex++;
      this.notifyStep();
    } else {
      this.complete();
    }
  }

  public skip(): void {
    this.complete();
  }

  public complete(): void {
    this.isActive = false;
    // Mark as completed in storage
    const prefs = this.storage.getPreferencesSync();
    this.storage.savePreferencesSync({
      ...prefs,
      tutorialCompleted: true,
    });

    if (this.onStepChangedCallback) {
      this.onStepChangedCallback(null, false);
    }
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }

  public isRunning(): boolean {
    return this.isActive;
  }

  public getCurrentStep(): TutorialStep | null {
    if (!this.isActive) return null;
    return TUTORIAL_STEPS[this.currentStepIndex] ?? null;
  }

  public getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  public getTotalSteps(): number {
    return TUTORIAL_STEPS.length;
  }

  public getI18n(): I18nManager {
    return this.i18n;
  }

  public onStepChanged(callback: (step: TutorialStep | null, isLast: boolean) => void): void {
    this.onStepChangedCallback = callback;
  }

  public onComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  private notifyStep(): void {
    if (this.onStepChangedCallback) {
      const step = TUTORIAL_STEPS[this.currentStepIndex] ?? null;
      const isLast = this.currentStepIndex === TUTORIAL_STEPS.length - 1;
      this.onStepChangedCallback(step, isLast);
    }
  }
}
