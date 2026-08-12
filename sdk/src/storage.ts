import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_VERSION_KEY = '@rn-pushdeck/local-version';

export async function getLocalVersion(): Promise<string | null> {
  return AsyncStorage.getItem(LOCAL_VERSION_KEY);
}

export async function setLocalVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(LOCAL_VERSION_KEY, version);
}
