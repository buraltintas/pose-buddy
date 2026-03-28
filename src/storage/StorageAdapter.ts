export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class BrowserStorageAdapter implements StorageAdapter {
  public getItem(key: string): string | null {
    return window.localStorage.getItem(key);
  }

  public setItem(key: string, value: string): void {
    window.localStorage.setItem(key, value);
  }

  public removeItem(key: string): void {
    window.localStorage.removeItem(key);
  }
}
