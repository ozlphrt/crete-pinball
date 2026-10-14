import { I18nManager } from '../../i18n';
import { IStorageAdapter, UserPreferences, GraphicsQuality } from '../../persistence/contracts';
import { AudioManager } from '../../audio/audioManager';
import { GameDifficulty, SupportedLocale } from '../../types';
import { ImportExportService } from '../../persistence/ImportExportService';
import { AchievementsModal } from './achievementsModal';
import { DeveloperAnalyticsPanel } from '../../analytics/DeveloperAnalyticsPanel';
import { AnalyticsCollector } from '../../analytics/AnalyticsCollector';

export interface SettingsModalCallbacks {
  onResumeClick: () => void;
  onRestartClick: () => void;
  onReplayTutorialClick: () => void;
  onLocaleChanged: (locale: SupportedLocale) => void;
  onReducedMotionChanged: (enabled: boolean) => void;
  onQualityChanged: (quality: GraphicsQuality) => void;
  onDifficultyChanged: (diff: GameDifficulty) => void;
  onExploreClick?: () => void;
}

export class SettingsModal {
  private readonly storage: IStorageAdapter;
  private readonly i18n: I18nManager;
  private readonly audioManager: AudioManager;
  private readonly callbacks: SettingsModalCallbacks;
  private readonly importExportService: ImportExportService;

  private rootElement: HTMLDivElement | null = null;

  constructor(
    storage: IStorageAdapter,
    i18n: I18nManager,
    audioManager: AudioManager,
    callbacks: SettingsModalCallbacks,
  ) {
    this.storage = storage;
    this.i18n = i18n;
    this.audioManager = audioManager;
    this.callbacks = callbacks;
    this.importExportService = new ImportExportService();
  }

  public show(): void {
    if (!this.rootElement) {
      this.initDOM();
    }
    if (this.rootElement) {
      this.renderCurrentValues();
      this.rootElement.style.display = 'flex';
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
    overlay.id = 'settings-modal-overlay';
    overlay.className = 'settings-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', this.i18n.t('settings.title'));

    overlay.innerHTML = `
      <div class="settings-card" style="max-height: 88vh; overflow-y: auto;">
        <div class="settings-header">
          <h2 class="settings-title" id="settings-title">${this.i18n.t('settings.title')}</h2>
          <button class="settings-close-btn" id="settings-close-btn" aria-label="Close Settings">✕</button>
        </div>

        <div class="settings-content">
          <!-- NAVIGATION SHORTCUTS -->
          <div class="settings-section">
            <h3 class="settings-section-title">GAME MODES & PROGRESS</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="settings-action-btn secondary" id="btn-open-atlas" style="margin: 0; font-size: 13px;">
                🗺️ ${this.i18n.t('menu.explore') || 'Atlas'}
              </button>
              <button class="settings-action-btn secondary" id="btn-open-achievements" style="margin: 0; font-size: 13px;">
                🏆 ${this.i18n.t('menu.achievements') || 'Badges'}
              </button>
            </div>
          </div>

          <!-- AUDIO SECTION -->
          <div class="settings-section">
            <h3 class="settings-section-title" id="sec-audio-title">AUDIO</h3>

            <!-- SFX Volume -->
            <div class="settings-row">
              <span class="settings-label" id="lbl-sfx">${this.i18n.t('settings.sfxVolume')}</span>
              <div class="settings-ctrl-group">
                <input type="range" min="0" max="100" value="80" class="settings-slider" id="slider-sfx" />
                <button class="settings-toggle-btn" id="btn-mute-sfx">${this.i18n.t('settings.mute')}</button>
              </div>
            </div>

            <!-- Ambience Volume -->
            <div class="settings-row">
              <span class="settings-label" id="lbl-ambience">${this.i18n.t('settings.ambienceVolume')}</span>
              <div class="settings-ctrl-group">
                <input type="range" min="0" max="100" value="40" class="settings-slider" id="slider-ambience" />
                <button class="settings-toggle-btn" id="btn-mute-ambience">${this.i18n.t('settings.mute')}</button>
              </div>
            </div>

            <!-- Music Volume -->
            <div class="settings-row">
              <span class="settings-label" id="lbl-music">${this.i18n.t('settings.musicVolume')}</span>
              <div class="settings-ctrl-group">
                <input type="range" min="0" max="100" value="60" class="settings-slider" id="slider-music" />
                <button class="settings-toggle-btn" id="btn-mute-music">${this.i18n.t('settings.mute')}</button>
              </div>
            </div>
          </div>

          <!-- LANGUAGE SECTION -->
          <div class="settings-section">
            <h3 class="settings-section-title" id="sec-lang-title">${this.i18n.t('settings.language')}</h3>
            <div class="settings-btn-group" id="group-locale">
              <button class="settings-pill-btn active" data-locale="en">English</button>
              <button class="settings-pill-btn" data-locale="tr">Türkçe</button>
              <button class="settings-pill-btn" data-locale="el">Ελληνικά</button>
            </div>
          </div>

          <!-- ACCESSIBILITY SECTION -->
          <div class="settings-section">
            <h3 class="settings-section-title">ACCESSIBILITY</h3>
            <div class="settings-row">
              <span class="settings-label" id="lbl-reduced-motion">${this.i18n.t('settings.reducedMotion')}</span>
              <input type="checkbox" class="settings-checkbox" id="check-reduced-motion" />
            </div>
            <div class="settings-row">
              <span class="settings-label" id="lbl-high-contrast">${this.i18n.t('settings.highContrast')}</span>
              <input type="checkbox" class="settings-checkbox" id="check-high-contrast" />
            </div>
          </div>

          <!-- GRAPHICS QUALITY SECTION -->
          <div class="settings-section">
            <h3 class="settings-section-title" id="sec-quality-title">${this.i18n.t('settings.graphicsQuality')}</h3>
            <div class="settings-btn-group" id="group-quality">
              <button class="settings-pill-btn active" data-quality="auto">Auto</button>
              <button class="settings-pill-btn" data-quality="high">High</button>
              <button class="settings-pill-btn" data-quality="medium">Med</button>
              <button class="settings-pill-btn" data-quality="low">Low</button>
            </div>
          </div>

          <!-- BACKUP & RESTORE SECTION -->
          <div class="settings-section">
            <h3 class="settings-section-title">DATA BACKUP & RESTORE</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="settings-action-btn secondary" id="btn-export-backup" style="margin: 0; font-size: 13px;">
                📥 Export Backup
              </button>
              <button class="settings-action-btn secondary" id="btn-import-backup" style="margin: 0; font-size: 13px;">
                📤 Restore Backup
              </button>
            </div>
            <input type="file" id="backup-file-input" accept=".json,application/json" style="display: none;" />
            <div id="backup-status-msg" style="font-size: 12px; color: #8b949e; margin-top: 6px; text-align: center;"></div>
          </div>

          <!-- LOCAL TELEMETRY & DEVELOPER DASHBOARD -->
          <div class="settings-section">
            <h3 class="settings-section-title">TELEMETRY & DEV TOOLS</h3>
            <div class="settings-row">
              <span class="settings-label">Local Gameplay Telemetry</span>
              <input type="checkbox" class="settings-checkbox" id="check-analytics-enabled" checked />
            </div>
            <button class="settings-action-btn secondary" id="btn-open-dev-analytics" style="margin-top: 8px; font-size: 13px;">
              📊 Open Developer Analytics
            </button>
          </div>

          <!-- TUTORIAL BUTTON -->
          <div class="settings-section">
            <button class="settings-action-btn secondary" id="btn-replay-tutorial">
              📖 ${this.i18n.t('settings.replayTutorial')}
            </button>
          </div>
        </div>

        <div class="settings-footer">
          <button class="settings-action-btn danger" id="btn-restart-game">
            ${this.i18n.t('settings.restartGame')}
          </button>
          <button class="settings-action-btn primary" id="btn-resume-game">
            ${this.i18n.t('settings.resumeGame')}
          </button>
        </div>
      </div>
    `;

    container.appendChild(overlay);
    this.rootElement = overlay;

    this.wireListeners();
  }

  private wireListeners(): void {
    if (!this.rootElement) return;

    // Close / Resume
    const closeBtn = this.rootElement.querySelector('#settings-close-btn');
    const resumeBtn = this.rootElement.querySelector('#btn-resume-game');
    const restartBtn = this.rootElement.querySelector('#btn-restart-game');
    const replayTutBtn = this.rootElement.querySelector('#btn-replay-tutorial');

    closeBtn?.addEventListener('click', () => {
      this.hide();
      this.callbacks.onResumeClick();
    });

    resumeBtn?.addEventListener('click', () => {
      this.hide();
      this.callbacks.onResumeClick();
    });

    restartBtn?.addEventListener('click', () => {
      this.hide();
      this.callbacks.onRestartClick();
    });

    replayTutBtn?.addEventListener('click', () => {
      this.hide();
      this.callbacks.onReplayTutorialClick();
    });

    // Atlas Shortcut
    this.rootElement.querySelector('#btn-open-atlas')?.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onExploreClick) {
        this.callbacks.onExploreClick();
      }
    });

    // Achievements Shortcut
    this.rootElement.querySelector('#btn-open-achievements')?.addEventListener('click', () => {
      new AchievementsModal(undefined, this.i18n).show();
    });

    // Developer Analytics
    this.rootElement.querySelector('#btn-open-dev-analytics')?.addEventListener('click', () => {
      new DeveloperAnalyticsPanel(undefined, this.i18n).show();
    });

    // Analytics toggle
    const analyticsCheck = this.rootElement.querySelector(
      '#check-analytics-enabled',
    ) as HTMLInputElement;
    analyticsCheck?.addEventListener('change', () => {
      const enabled = analyticsCheck.checked;
      AnalyticsCollector.getInstance().setEnabled(enabled);
      this.savePrefPartial({ analyticsEnabled: enabled });
    });

    // Backup Export
    this.rootElement.querySelector('#btn-export-backup')?.addEventListener('click', async () => {
      const msg = this.rootElement?.querySelector('#backup-status-msg');
      if (msg) msg.textContent = '⏳ Generating backup...';
      try {
        await this.importExportService.downloadBackupFile();
        if (msg) msg.textContent = '✓ Backup downloaded successfully!';
        setTimeout(() => {
          if (msg) msg.textContent = '';
        }, 4000);
      } catch (e) {
        if (msg) msg.textContent = `❌ Backup failed: ${(e as Error).message}`;
      }
    });

    // Backup Import
    const fileInput = this.rootElement.querySelector('#backup-file-input') as HTMLInputElement;
    this.rootElement.querySelector('#btn-import-backup')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const msg = this.rootElement?.querySelector('#backup-status-msg');
      if (msg) msg.textContent = '⏳ Reading backup file...';

      try {
        const text = await file.text();
        const validation = this.importExportService.validateBackup(text);
        if (!validation.isValid) {
          if (msg) msg.textContent = `❌ Invalid file: ${validation.errors.join(', ')}`;
          return;
        }

        const modeChoice = window.confirm(
          'Backup file is valid!\n\nClick OK to MERGE progress with your current records (Recommended).\nClick Cancel to REPLACE all records with this backup.',
        )
          ? 'merge'
          : 'replace';

        const report = await this.importExportService.importBackup(text, modeChoice);
        if (msg) {
          msg.textContent = `✓ Imported (${report.mode}): +${report.newDiscoveriesCount} islands, +${report.newAchievementsCount} achievements!`;
        }
        setTimeout(() => {
          if (msg) msg.textContent = '';
        }, 5000);
      } catch (err) {
        if (msg) msg.textContent = `❌ Import failed: ${(err as Error).message}`;
      } finally {
        fileInput.value = '';
      }
    });

    // SFX Slider & Mute
    const sfxSlider = this.rootElement.querySelector('#slider-sfx') as HTMLInputElement;
    const sfxMuteBtn = this.rootElement.querySelector('#btn-mute-sfx') as HTMLButtonElement;
    sfxSlider?.addEventListener('input', () => {
      const vol = Number(sfxSlider.value) / 100;
      this.audioManager.setSfxVolume(vol);
      this.savePrefPartial({ soundVolume: vol });
    });
    sfxMuteBtn?.addEventListener('click', () => {
      const cur = this.audioManager.getAudioState().soundMuted;
      this.audioManager.setSfxMuted(!cur);
      sfxMuteBtn.classList.toggle('muted', !cur);
      this.savePrefPartial({ soundMuted: !cur });
    });

    // Ambience Slider & Mute
    const ambSlider = this.rootElement.querySelector('#slider-ambience') as HTMLInputElement;
    const ambMuteBtn = this.rootElement.querySelector('#btn-mute-ambience') as HTMLButtonElement;
    ambSlider?.addEventListener('input', () => {
      const vol = Number(ambSlider.value) / 100;
      this.audioManager.setAmbienceVolume(vol);
      this.savePrefPartial({ ambienceVolume: vol });
    });
    ambMuteBtn?.addEventListener('click', () => {
      const cur = this.audioManager.getAudioState().ambienceMuted;
      this.audioManager.setAmbienceMuted(!cur);
      ambMuteBtn.classList.toggle('muted', !cur);
      this.savePrefPartial({ ambienceMuted: !cur });
    });

    // Music Slider & Mute
    const musSlider = this.rootElement.querySelector('#slider-music') as HTMLInputElement;
    const musMuteBtn = this.rootElement.querySelector('#btn-mute-music') as HTMLButtonElement;
    musSlider?.addEventListener('input', () => {
      const vol = Number(musSlider.value) / 100;
      this.audioManager.setMusicVolume(vol);
      this.savePrefPartial({ musicVolume: vol });
    });
    musMuteBtn?.addEventListener('click', () => {
      const cur = this.audioManager.getAudioState().musicMuted;
      this.audioManager.setMusicMuted(!cur);
      musMuteBtn.classList.toggle('muted', !cur);
      this.savePrefPartial({ musicMuted: !cur });
    });

    // Locales
    const localeBtns = this.rootElement.querySelectorAll<HTMLButtonElement>('#group-locale button');
    localeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const locale = btn.dataset.locale as SupportedLocale;
        if (locale) {
          localeBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.i18n.setLocale(locale);
          this.savePrefPartial({ locale });
          this.callbacks.onLocaleChanged(locale);
          this.updateTexts();
        }
      });
    });

    // Reduced Motion
    const redMotionCheck = this.rootElement.querySelector(
      '#check-reduced-motion',
    ) as HTMLInputElement;
    redMotionCheck?.addEventListener('change', () => {
      const enabled = redMotionCheck.checked;
      this.callbacks.onReducedMotionChanged(enabled);
      this.savePrefPartial({ reducedMotion: enabled });
    });

    // High Contrast
    const hiContrastCheck = this.rootElement.querySelector(
      '#check-high-contrast',
    ) as HTMLInputElement;
    hiContrastCheck?.addEventListener('change', () => {
      const enabled = hiContrastCheck.checked;
      document.body.classList.toggle('high-contrast', enabled);
      this.savePrefPartial({ highContrast: enabled });
    });

    // Graphics Quality
    const qualityBtns =
      this.rootElement.querySelectorAll<HTMLButtonElement>('#group-quality button');
    qualityBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const quality = btn.dataset.quality as GraphicsQuality;
        if (quality) {
          qualityBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.callbacks.onQualityChanged(quality);
          this.savePrefPartial({ graphicsQuality: quality });
        }
      });
    });

    // Prevent backdrop clicks bubbling to canvas
    this.rootElement.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.rootElement.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }

  private renderCurrentValues(): void {
    if (!this.rootElement) return;

    const prefs = this.storage.getPreferencesSync();
    const audio = this.audioManager.getAudioState();

    // SFX
    const sfxSlider = this.rootElement.querySelector('#slider-sfx') as HTMLInputElement;
    const sfxMuteBtn = this.rootElement.querySelector('#btn-mute-sfx') as HTMLButtonElement;
    if (sfxSlider) sfxSlider.value = String(Math.round(audio.soundVolume * 100));
    if (sfxMuteBtn) sfxMuteBtn.classList.toggle('muted', audio.soundMuted);

    // Ambience
    const ambSlider = this.rootElement.querySelector('#slider-ambience') as HTMLInputElement;
    const ambMuteBtn = this.rootElement.querySelector('#btn-mute-ambience') as HTMLButtonElement;
    if (ambSlider) ambSlider.value = String(Math.round(audio.ambienceVolume * 100));
    if (ambMuteBtn) ambMuteBtn.classList.toggle('muted', audio.ambienceMuted);

    // Music
    const musSlider = this.rootElement.querySelector('#slider-music') as HTMLInputElement;
    const musMuteBtn = this.rootElement.querySelector('#btn-mute-music') as HTMLButtonElement;
    if (musSlider) musSlider.value = String(Math.round(audio.musicVolume * 100));
    if (musMuteBtn) musMuteBtn.classList.toggle('muted', audio.musicMuted);

    // Locales
    const localeBtns = this.rootElement.querySelectorAll<HTMLButtonElement>('#group-locale button');
    localeBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.locale === prefs.locale);
    });

    // Reduced motion & High contrast
    const redMotionCheck = this.rootElement.querySelector(
      '#check-reduced-motion',
    ) as HTMLInputElement;
    if (redMotionCheck) redMotionCheck.checked = prefs.reducedMotion;

    const hiContrastCheck = this.rootElement.querySelector(
      '#check-high-contrast',
    ) as HTMLInputElement;
    if (hiContrastCheck) {
      hiContrastCheck.checked = prefs.highContrast;
      document.body.classList.toggle('high-contrast', prefs.highContrast);
    }

    // Quality
    const qualityBtns =
      this.rootElement.querySelectorAll<HTMLButtonElement>('#group-quality button');
    qualityBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.quality === prefs.graphicsQuality);
    });

    // Analytics
    const analyticsCheck = this.rootElement.querySelector(
      '#check-analytics-enabled',
    ) as HTMLInputElement;
    if (analyticsCheck) analyticsCheck.checked = prefs.analyticsEnabled ?? true;

    this.updateTexts();
  }

  private updateTexts(): void {
    if (!this.rootElement) return;

    const setText = (id: string, text: string): void => {
      const el = this.rootElement!.querySelector(id);
      if (el) el.textContent = text;
    };

    setText('#settings-title', this.i18n.t('settings.title'));
    setText('#lbl-sfx', this.i18n.t('settings.sfxVolume'));
    setText('#lbl-ambience', this.i18n.t('settings.ambienceVolume'));
    setText('#lbl-music', this.i18n.t('settings.musicVolume'));
    setText('#sec-lang-title', this.i18n.t('settings.language'));
    setText('#lbl-reduced-motion', this.i18n.t('settings.reducedMotion'));
    setText('#lbl-high-contrast', this.i18n.t('settings.highContrast'));
    setText('#sec-quality-title', this.i18n.t('settings.graphicsQuality'));
    setText('#btn-replay-tutorial', `📖 ${this.i18n.t('settings.replayTutorial')}`);
    setText('#btn-restart-game', this.i18n.t('settings.restartGame'));
    setText('#btn-resume-game', this.i18n.t('settings.resumeGame'));
  }

  private savePrefPartial(partial: Partial<UserPreferences>): void {
    const prefs = this.storage.getPreferencesSync();
    this.storage.savePreferencesSync({
      ...prefs,
      ...partial,
    });
  }

  public destroy(): void {
    this.rootElement?.remove();
    this.rootElement = null;
  }
}
