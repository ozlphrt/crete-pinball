import { ResultCardOptions, ResultsCardRenderer } from './ResultsCardRenderer';

export interface ShareResultOutcome {
  readonly shared: boolean;
  readonly downloaded: boolean;
  readonly error?: string;
}

export class ShareService {
  /**
   * Shares the generated result image via Web Share API if supported;
   * otherwise falls back directly to an instant PNG download.
   */
  public static async shareOrDownloadResult(
    options: ResultCardOptions,
  ): Promise<ShareResultOutcome> {
    try {
      const blob = await ResultsCardRenderer.renderToBlob(options);
      const filename = `crete-pinball-score-${options.run.finalScore}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      // Check if Web Share API with files is supported
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] }) &&
        typeof navigator.share === 'function'
      ) {
        try {
          await navigator.share({
            title: 'Crete Pinball — Aegean Score',
            text: `I scored ${options.run.finalScore.toLocaleString()} points defending the Aegean in Crete Pinball!`,
            files: [file],
          });
          return { shared: true, downloaded: false };
        } catch (shareErr) {
          // If user aborted/cancelled share modal, don't trigger download
          if ((shareErr as Error).name === 'AbortError') {
            return { shared: false, downloaded: false };
          }
          // On other errors (e.g. permission/unsupported in iframe), fallback to download
          console.warn('[ShareService] Web Share failed, falling back to download:', shareErr);
        }
      }

      // Download Fallback
      ShareService.triggerFileDownload(blob, filename);
      return { shared: false, downloaded: true };
    } catch (err) {
      console.error('[ShareService] Error sharing or downloading result card:', err);
      return { shared: false, downloaded: false, error: (err as Error).message };
    }
  }

  private static triggerFileDownload(blob: Blob, filename: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
