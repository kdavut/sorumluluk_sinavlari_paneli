
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { UserProfile } from '../types';
import { AlertCircle, ArrowRight, GraduationCap } from 'lucide-react';

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
      console.error("Firebase Login Error:", err.code, err.message);
      switch (err.code) {
        case 'auth/invalid-credential':
          setError('E-posta adresi veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.');
          break;
        case 'auth/invalid-email':
          setError('Geçersiz bir e-posta adresi girdiniz.');
          break;
        case 'auth/too-many-requests':
          setError('Çok fazla hatalı deneme yaptınız. Lütfen bir süre bekleyin.');
          break;
        default:
          setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm p-10 rounded-[2.5rem] shadow-2xl border border-white/20 space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="text-center">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-500/30">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Sistem Girişi</h1>
        <p className="text-slate-500 text-sm mt-2 font-medium italic">Sorumluluk sınavları yönetim paneli</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">E-posta Adresi</label>
          <input 
            type="email" 
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            placeholder="deneme@demo.com"
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
          <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-[11px] font-bold rounded-r-xl animate-in shake duration-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#111827] text-white py-5 rounded-2xl font-black text-xs uppercase shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {loading ? 'İşlem yapılıyor...' : 'Giriş Yap'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="text-center pt-6 border-t border-slate-100">
         <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-tight">
          Giriş Yetkisi & Lisanslama <br/>
          <span className="font-medium normal-case text-slate-500 block mt-1">
            Sistemi kullanmak için kurumunuza özel giriş yetkisi tanımlanması gerekmektedir.
          </span>
          <span className="font-black text-blue-600 block mt-1">Fiyatlandırma ve Bilgi için: davutk144@gmail.com</span>
        </p>
      </div>
    </div>
  );
};
