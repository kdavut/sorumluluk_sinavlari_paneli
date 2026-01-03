
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { UserProfile } from '../types';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface LoginFormProps {
  onSuccess: (user: UserProfile) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (result.user) {
        onSuccess({ 
          uid: result.user.uid, 
          email: result.user.email,
          displayName: result.user.displayName 
        });
      }
    } catch (err: any) {
      console.error("Firebase Login Error:", err.code);
      switch (err.code) {
        case 'auth/invalid-credential':
          setError('E-posta adresi veya şifre hatalı.');
          break;
        case 'auth/user-not-found':
          setError('Kullanıcı bulunamadı.');
          break;
        case 'auth/wrong-password':
          setError('Hatalı şifre.');
          break;
        case 'auth/too-many-requests':
          setError('Çok fazla deneme yaptınız. Lütfen bekleyin.');
          break;
        default:
          setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="text-center">
        <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-500/30">
          <Lock className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Sistem Girişi</h1>
        <p className="text-slate-500 text-sm mt-2 font-medium italic">Sorumluluk sınavları yönetim paneli</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">E-posta Adresi</label>
          <input 
            type="email" 
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            placeholder="ornek@mail.com"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Şifre</label>
          <input 
            type="password" 
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-[11px] font-bold rounded-r-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="text-center pt-4 border-t border-slate-100">
         <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
          Giriş yetkisi için yönetici ile iletişime geçin:<br/>
          <span className="font-bold text-slate-600">davutk144@gmail.com</span>
        </p>
      </div>
    </div>
  );
};
