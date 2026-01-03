
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

export type AuthMode = 'login' | 'register';

export interface AppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
