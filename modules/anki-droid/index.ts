import { NativeModule, requireNativeModule } from 'expo-modules-core';

interface AnkiDroidModuleInterface extends NativeModule {
  isInstalled(): Promise<boolean>;
  getDeckNames(): Promise<string[]>;
  getDueCards(deckName: string): Promise<Array<{
    cardId: number;
    front: string;
    back: string;
    deckName: string;
  }>>;
  triggerSync(): Promise<void>;
}

// This call loads the native module object from the JSI
const AnkiDroidModule = requireNativeModule<AnkiDroidModuleInterface>('AnkiDroid');

export default AnkiDroidModule;
