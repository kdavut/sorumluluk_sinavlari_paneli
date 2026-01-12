
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { LoginForm } from './components/LoginForm';
import { LegacyAppWrapper } from './components/LegacyAppWrapper';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({ 
          uid: u.uid, 
          email: u.email, 
          displayName: u.displayName || u.email?.split('@')[0] 
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase Auth Error:", error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if(window.confirm("Güvenli çıkış yapmak istediğinize emin misiniz?")) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Logout Error:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistem Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#4c1d95]">
        <div className="w-full max-w-md">
          <LoginForm onSuccess={(u) => setUser(u)} />
        </div>
      </div>
    );
  }

  return <LegacyAppWrapper user={user} onLogout={handleLogout} />;
};

export default App;
