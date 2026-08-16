declare module 'react-native-mmkv' {
  export interface MMKVConfiguration {
    id?: string;
    path?: string;
    encryptionKey?: string;
  }

  export class MMKV {
    constructor(configuration?: MMKVConfiguration);
    set(key: string, value: boolean | string | number | Uint8Array): void;
    getBoolean(key: string): boolean | undefined;
    getString(key: string): string | undefined;
    getNumber(key: string): number | undefined;
    getBuffer(key: string): Uint8Array | undefined;
    delete(key: string): void;
    clearAll(): void;
    getAllKeys(): string[];
    contains(key: string): boolean;
    addOnValueChangedListener(onValueChanged: (key: string) => void): { remove: () => void };
  }
}
