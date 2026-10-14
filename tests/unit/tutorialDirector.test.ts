import { describe, it, expect, beforeEach } from 'vitest';
import { TutorialDirector, TUTORIAL_STEPS } from '../../src/game/tutorial/tutorialDirector';
import { LocalStorageAdapter } from '../../src/persistence/storageAdapter';
import { I18nManager } from '../../src/i18n';

describe('TutorialDirector', () => {
  let storage: LocalStorageAdapter;
  let i18n: I18nManager;
  let director: TutorialDirector;

  beforeEach(() => {
    storage = new LocalStorageAdapter();
    storage.savePreferencesSync({
      ...storage.getPreferencesSync(),
      tutorialCompleted: false,
    });
    i18n = new I18nManager('en');
    director = new TutorialDirector(storage, i18n);
  });

  it('contains exactly 7 instructional steps matching design specifications', () => {
    expect(TUTORIAL_STEPS.length).toBe(7);
    expect(TUTORIAL_STEPS[0]!.titleKey).toBe('tutorial.step1.title');
    expect(TUTORIAL_STEPS[6]!.titleKey).toBe('tutorial.step7.title');
  });

  it('determines tutorial visibility based on player completion state', () => {
    // New player without completion
    expect(storage.getPreferencesSync().tutorialCompleted).toBe(false);

    // After completion
    director.complete();
    expect(storage.getPreferencesSync().tutorialCompleted).toBe(true);
  });

  it('advances sequentially through steps on next() calls', () => {
    director.start();
    expect(director.isRunning()).toBe(true);
    expect(director.getCurrentStepIndex()).toBe(0);
    expect(director.getCurrentStep()?.index).toBe(1);

    director.next();
    expect(director.getCurrentStepIndex()).toBe(1);
    expect(director.getCurrentStep()?.index).toBe(2);

    // Advance to final step
    for (let i = 2; i < 7; i++) {
      director.next();
    }
    expect(director.getCurrentStepIndex()).toBe(6);
    expect(director.getCurrentStep()?.index).toBe(7);

    // Calling next on last step completes the tutorial
    let completed = false;
    director.onComplete(() => {
      completed = true;
    });

    director.next();
    expect(completed).toBe(true);
    expect(director.isRunning()).toBe(false);
    expect(storage.getPreferencesSync().tutorialCompleted).toBe(true);
  });

  it('allows players to skip tutorial immediately at any step', () => {
    director.start();
    expect(director.isRunning()).toBe(true);

    let completed = false;
    director.onComplete(() => {
      completed = true;
    });

    director.skip();
    expect(completed).toBe(true);
    expect(director.isRunning()).toBe(false);
    expect(storage.getPreferencesSync().tutorialCompleted).toBe(true);
  });
});
