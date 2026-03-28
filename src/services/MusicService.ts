import Phaser from 'phaser';

export class MusicService {
  private readonly src: string;
  private audio: HTMLAudioElement | null;
  private enabled: boolean;
  private unlockBound: boolean;

  constructor(src: string, enabled: boolean) {
    this.src = src;
    this.enabled = enabled;
    this.audio = null;
    this.unlockBound = false;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (!enabled) {
      this.pause();
      return;
    }

    void this.play();
  }

  public attachAutoplayUnlock(scene: Phaser.Scene): void {
    if (this.unlockBound) {
      return;
    }

    this.unlockBound = true;

    scene.input.once('pointerdown', () => {
      void this.play();
    });
  }

  public async play(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const audio = this.getAudio();
    try {
      await audio.play();
    } catch {
      // iOS can block autoplay until a user gesture; we retry on next gesture.
    }
  }

  public pause(): void {
    if (!this.audio) {
      return;
    }

    this.audio.pause();
  }

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio(this.src);
      this.audio.loop = true;
      this.audio.volume = 0.45;
      this.audio.preload = 'auto';
    }

    return this.audio;
  }
}
