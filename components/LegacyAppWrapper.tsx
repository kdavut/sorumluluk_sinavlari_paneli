
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from '../services/firebase';
import { UserProfile } from '../types';
import { 
  ShieldCheck, Settings, Users, PlusCircle, BarChart3, 
  Printer, HelpCircle, LogOut, Trash2, Download, 
  Upload, BookOpen, Coffee 
} from 'lucide-react';

interface LegacyAppWrapperProps {
  user: UserProfile;
  onLogout: () => void;
}

export const LegacyAppWrapper: React.FC<LegacyAppWrapperProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('settings');
  const [exams, setExams] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([
    { id: 1, name: "Örnek Öğretmen", branch: "Matematik" }
  ]);
  const [settings, setSettings] = useState({
    schoolName: 'İBNİ SİNA MESLEKİ VE TEKNİK ANADOLU LİSESİ',
    examPeriod: '2024-2025 EĞİTİM ÖĞRETİM YILI ŞUBAT DÖNEMİ',
    principalName: 'Okul Müdürü Adı',
    allowedDates: [] as string[],
    allowedTimes: [] as string[]
  });

  const [selectedTeacherForPaper, setSelectedTeacherForPaper] = useState<any>(null);
  const [printMode, setPrintMode] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newExam, setNewExam] = useState<any>({
    grade: '9. Sınıf', subject: '', studentCount: '', date: '', time: '',
    proctorCount: 1, examinerCount: 1, proctors: [''], examiners: ['']
  });
  const [teacherForm, setTeacherForm] = useState({ id: null as number | null, name: '', branch: '' });
  const [notification, setNotification] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, "users", user.uid, "data", "appData");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.exams) setExams(data.exams);
          if (data.teachers) setTeachers(data.teachers);
          if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
        }
      } catch (error) {
        console.error("Firestore yükleme hatası:", error);
      } finally {
        setLoading(false);
        isInitialLoad.current = false;
      }
    };
    loadData();
  }, [user?.uid]);

  useEffect(() => {
    if (isInitialLoad.current || loading || !user?.uid) return;
    const saveData = async () => {
      try {
        const docRef = doc(db, "users", user.uid, "data", "appData");
        await setDoc(docRef, { exams, teachers, settings });
      } catch (error) {
        console.error("Firestore kayıt hatası:", error);
      }
    };
    const timer = setTimeout(saveData, 1500);
    return () => clearTimeout(timer);
  }, [exams, teachers, settings, user?.uid, loading]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const sortedTeachers = useMemo(() => {
    return [...teachers].sort((a, b) => (a.branch || '').localeCompare(b.branch || '', 'tr'));
  }, [teachers]);

  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [exams]);

  const getAvailableTeachers = (currentDate: string, currentTime: string, currentRoleType: string, currentIndex: number) => {
    if (!currentDate || !currentTime) return sortedTeachers;
    return sortedTeachers.filter(t => {
      const isAlreadyInSameExam = [
        ...newExam.proctors.filter((p: any, idx: number) => currentRoleType === 'proctor' ? idx !== currentIndex : true),
        ...newExam.examiners.filter((e: any, idx: number) => currentRoleType === 'examiner' ? idx !== currentIndex : true)
      ].includes(t.name);
      if (isAlreadyInSameExam) return false;
      const hasConflict = exams.some(ex => {
        if (editingId && ex.id === editingId) return false;
        const sameTime = ex.date === currentDate && ex.time === currentTime;
        if (!sameTime) return false;
        return ex.proctors.includes(t.name) || ex.examiners.includes(t.name);
      });
      return !hasConflict;
    });
  };

  const handleCountChange = (type: string, count: string) => {
    const val = Math.max(0, parseInt(count) || 0);
    if (type === 'proctor') {
      setNewExam((prev: any) => ({
        ...prev, proctorCount: val, 
        proctors: Array(val).fill('').map((_, i) => prev.proctors[i] || '')
      }));
    } else {
      setNewExam((prev: any) => ({
        ...prev, examinerCount: val, 
        examiners: Array(val).fill('').map((_, i) => prev.examiners[i] || '')
      }));
    }
  };

  const handleAddOrUpdateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setExams(exams.map(ex => ex.id === editingId ? { ...newExam, id: editingId } : ex));
      showNotification("Sınav güncellendi.");
      setEditingId(null);
    } else {
      setExams([...exams, { ...newExam, id: Date.now() }]);
      showNotification("Sınav eklendi.");
    }
    setNewExam({
      grade: '9. Sınıf', subject: '', studentCount: '', date: '', time: '',
      proctorCount: 1, examinerCount: 1, proctors: [''], examiners: ['']
    });
  };

  const handleAddOrUpdateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name) return;
    if (teacherForm.id) {
      const oldName = teachers.find(t => t.id === teacherForm.id)?.name;
      const newName = teacherForm.name;
      if (oldName && oldName !== newName) {
        setExams(exams.map(ex => ({
          ...ex,
          proctors: ex.proctors.map((p: any) => p === oldName ? newName : p),
          examiners: ex.examiners.map((e: any) => e === oldName ? newName : e)
        })));
      }
      setTeachers(teachers.map(t => t.id === teacherForm.id ? { ...t, name: newName, branch: teacherForm.branch } : t));
      showNotification("Öğretmen güncellendi.");
    } else {
      setTeachers([...teachers, { id: Date.now(), name: teacherForm.name, branch: teacherForm.branch }]);
      showNotification("Öğretmen eklendi.");
    }
    setTeacherForm({ id: null, name: '', branch: '' });
  };

  const runPrint = (mode: string, teacher: any = null) => {
    setPrintMode(mode);
    setSelectedTeacherForPaper(teacher);
    setTimeout(() => { window.print(); setPrintMode(null); }, 500);
  };

  const teacherStats = useMemo(() => {
    return teachers.map(t => {
      let p = 0, e = 0;
      exams.forEach(ex => {
        if (ex.proctors.includes(t.name)) p++;
        if (ex.examiners.includes(t.name)) e++;
      });
      return { ...t, proctor: p, examiner: e, total: p + e };
    }).sort((a, b) => b.total - a.total);
  }, [teachers, exams]);

  const TaskPaperTemplate = ({ teacher }: { teacher: any }) => (
    <div className="task-card-full">
        <div>
            <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-8">
                <div className="text-[14px] font-bold text-center leading-tight mb-2 uppercase">
                    T.C. <br/> MİLLİ EĞİTİM BAKANLIĞI <br/> {settings.schoolName}
                </div>
            </div>
            <div className="mt-8 px-4">
                <h3 className="text-center font-black text-[16px] mb-8 underline tracking-wider uppercase">SINAV GÖREVLENDİRME VE TEBLİĞ BELGESİ</h3>
                <div className="mb-8 space-y-2">
                    <p className="text-[12px] font-bold">Sayın {teacher.name},</p>
                    <p className="text-[12px] leading-relaxed text-justify"> 
                        {settings.examPeriod} kapsamında okulumuzda gerçekleştirilecek olan sorumluluk sınavlarında aşağıda belirtilen gün ve saatlerde görevlendirilmiş bulunmaktasınız.
                    </p>
                    <p className="text-[12px] leading-relaxed text-justify">
                        Sınavların sağlıklı yürütülebilmesi ve herhangi bir aksaklığa meydan verilmemesi için <b>sınav başlama saatinden en az 30 dakika önce</b> okul idaresinden sınav evraklarını teslim alarak sınav salonunda hazır bulunmanız hususunda gereğini rica ederim.
                    </p>
                </div>
                <table className="w-full border-collapse border-2 border-black text-[11px] mb-12">
                    <thead>
                        <tr className="bg-gray-100 font-bold uppercase">
                            <th className="border-2 border-black p-3 text-center w-32">Sınav Tarihi</th>
                            <th className="border-2 border-black p-3 text-center w-24">Saat</th>
                            <th className="border-2 border-black p-3">Ders Adı ve Seviye</th>
                            <th className="border-2 border-black p-3 text-center">Görev Unvanı</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exams.filter(ex => ex.proctors.includes(teacher.name) || ex.examiners.includes(teacher.name))
                            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((ex, i) => (
                            <tr key={i} className="font-bold">
                                <td className="border-2 border-black p-3 text-center">{new Date(ex.date).toLocaleDateString('tr-TR')}</td>
                                <td className="border-2 border-black p-3 text-center">{ex.time}</td>
                                <td className="border-2 border-black p-3 uppercase">{ex.subject} ({ex.grade})</td>
                                <td className="border-2 border-black p-3 text-center">{ex.examiners.includes(teacher.name) ? 'KOMİSYON ÜYESİ' : 'GÖZETMEN'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        <div className="flex justify-between items-end px-12 pb-12">
            <div className="text-center w-48">
                <p className="text-[10px] uppercase font-bold mb-12 italic">Tebellüğ Eden (İmza)</p>
                <p className="text-[12px] font-black">{teacher.name}</p>
                <p className="text-[10px] text-slate-500 uppercase">{teacher.branch}</p>
            </div>
            <div className="text-center w-48">
                <p className="text-[12px] font-black uppercase mb-12">{settings.principalName}</p>
                <p className="text-[11px] font-bold border-t border-black pt-1 uppercase">Okul Müdürü</p>
            </div>
        </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Veriler Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-50">
        <nav className="bg-slate-900/95 backdrop-blur-md text-white p-4 shadow-2xl sticky top-0 z-50 no-print border-b border-white/10">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20"><ShieldCheck className="w-6 h-6" /></div>
                    <div>
                        <h1 className="text-[11px] font-black uppercase tracking-tight text-white/90 leading-none mb-1">{settings.schoolName}</h1>
                        <span className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.2em]">Oturum: {user.email}</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
                    {[
                        { id: 'settings', label: 'Ayarlar', icon: Settings },
                        { id: 'teachers_list', label: 'Öğretmenler', icon: Users },
                        { id: 'input', label: 'Sınav Girişi', icon: PlusCircle },
                        { id: 'stats', label: 'Görev Sayıları', icon: BarChart3 },
                        { id: 'task_paper', label: 'Görev Kağıdı', icon: Printer },
                        { id: 'support', label: 'Destek ve Yedekleme', icon: HelpCircle }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all duration-300 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                        </button>
                    ))}
                    <button 
                        onClick={onLogout}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all ml-2"
                    >
                        <LogOut className="w-4 h-4" /> 
                        <span className="hidden md:inline">Çıkış</span>
                    </button>
                </div>
            </div>
        </nav>

        <main className="max-w-7xl mx-auto p-6 no-print">
            {notification && <div className="fixed top-24 right-6 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 text-xs font-black uppercase animate-bounce border border-white/10">{notification}</div>}

            {activeTab === 'settings' && (
                <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-4">Genel Bilgiler</h2>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Okul Adı</label><input type="text" value={settings.schoolName} onChange={e => setSettings({...settings, schoolName: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Sınav Dönemi</label><input type="text" value={settings.examPeriod} onChange={e => setSettings({...settings, examPeriod: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Okul Müdürü</label><input type="text" value={settings.principalName} onChange={e => setSettings({...settings, principalName: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
                        <div>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4">Takvim Tanımları</h2>
                            <div className="flex gap-2 mb-4"><input type="date" id="dInp" className="flex-grow p-3 bg-slate-50 border rounded-xl text-sm outline-none" /><button onClick={() => { const el = document.getElementById('dInp') as HTMLInputElement; if(el.value && !settings.allowedDates.includes(el.value)) setSettings({...settings, allowedDates: [...settings.allowedDates, el.value].sort()}); }} className="bg-slate-900 text-white px-6 rounded-xl font-black transition hover:bg-black">+</button></div>
                            <div className="flex flex-wrap gap-2">{settings.allowedDates.map(d => (<span key={d} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-black border border-blue-100 flex items-center gap-2">{new Date(d).toLocaleDateString('tr-TR')}<button onClick={() => setSettings({...settings, allowedDates: settings.allowedDates.filter(x => x !== d)})} className="hover:text-red-500">×</button></span>))}</div>
                        </div>
                        <div>
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4">Saat Tanımları</h2>
                            <div className="flex gap-2 mb-4"><input type="time" id="tInp" className="flex-grow p-3 bg-slate-50 border rounded-xl text-sm outline-none" /><button onClick={() => { const el = document.getElementById('tInp') as HTMLInputElement; if(el.value && !settings.allowedTimes.includes(el.value)) setSettings({...settings, allowedTimes: [...settings.allowedTimes, el.value].sort()}); }} className="bg-slate-900 text-white px-6 rounded-xl font-black transition hover:bg-black">+</button></div>
                            <div className="flex flex-wrap gap-2">{settings.allowedTimes.map(t => (<span key={t} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-100 flex items-center gap-2">{t}<button onClick={() => setSettings({...settings, allowedTimes: settings.allowedTimes.filter(x => x !== t)})} className="hover:text-red-500">×</button></span>))}</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'teachers_list' && (
                <div className="grid lg:grid-cols-4 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-28">
                            <h2 className="text-xs font-black text-slate-800 uppercase border-b pb-2 mb-4">{teacherForm.id ? "Düzenle" : "Öğretmen Ekle"}</h2>
                            <form onSubmit={handleAddOrUpdateTeacher} className="space-y-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Ad Soyad</label><input required type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none" /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Branş</label><input type="text" value={teacherForm.branch} onChange={e => setTeacherForm({...teacherForm, branch: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none" /></div>
                                <button className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:opacity-90 active:scale-95 transition-all">{teacherForm.id ? "Güncelle" : "Ekle"}</button>
                            </form>
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm font-bold">
                                <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase"><tr><th className="p-4">Branş</th><th className="p-4">Ad Soyad</th><th className="p-4 text-center">İşlem</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">{sortedTeachers.map(t => (<tr key={t.id} onClick={() => setTeacherForm({ id: t.id, name: t.name, branch: t.branch })} className="hover:bg-slate-50 cursor-pointer"><td className="p-4 text-xs text-blue-600">{t.branch}</td><td className="p-4">{t.name}</td><td className="p-4 text-center"><button onClick={(e) => { e.stopPropagation(); setTeachers(teachers.filter(x => x.id !== t.id)); }} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'input' && (
                <div className="grid lg:grid-cols-12 gap-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-fit space-y-6">
                        <h2 className="text-xs font-black text-slate-800 uppercase border-b pb-4">{editingId ? 'Sınavı Güncelle' : 'Yeni Sınav Kaydı'}</h2>
                        <form onSubmit={handleAddOrUpdateExam} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase">Tarih</label><select required value={newExam.date} onChange={e => setNewExam({...newExam, date: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold"><option value="">Seçiniz</option>{settings.allowedDates.map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString('tr-TR')}</option>)}</select></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase">Saat</label><select required value={newExam.time} onChange={e => setNewExam({...newExam, time: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold"><option value="">Seçiniz</option>{settings.allowedTimes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            </div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase">Ders Adı</label><input required type="text" value={newExam.subject} onChange={e => setNewExam({...newExam, subject: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase">Seviye</label><select value={newExam.grade} onChange={e => setNewExam({...newExam, grade: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold"><option value="9. Sınıf">9. Sınıf</option><option value="10. Sınıf">10. Sınıf</option><option value="11. Sınıf">11. Sınıf</option><option value="12. Sınıf">12. Sınıf</option></select></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase">Öğrenci</label><input type="number" value={newExam.studentCount} onChange={e => setNewExam({...newExam, studentCount: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold" /></div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-blue-600 uppercase">Komisyon</span><input type="number" value={newExam.examinerCount} onChange={e => handleCountChange('examiner', e.target.value)} className="w-12 p-1 text-xs border rounded text-center font-bold" /></div>
                                {newExam.examiners.map((n: string, i: number) => (
                                    <select key={i} value={n} onChange={e => { const u = [...newExam.examiners]; u[i] = e.target.value; setNewExam({...newExam, examiners: u}) }} className="w-full p-2 bg-white border rounded-lg text-xs font-semibold">
                                        <option value="">Seçiniz...</option>
                                        {getAvailableTeachers(newExam.date, newExam.time, 'examiner', i).map(t => <option key={t.id} value={t.name}>{t.name} ({t.branch})</option>)}
                                    </select>
                                ))}
                                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-emerald-600 uppercase">Gözetmen</span><input type="number" value={newExam.proctorCount} onChange={e => handleCountChange('proctor', e.target.value)} className="w-12 p-1 text-xs border rounded text-center font-bold" /></div>
                                {newExam.proctors.map((n: string, i: number) => (
                                    <select key={i} value={n} onChange={e => { const u = [...newExam.proctors]; u[i] = e.target.value; setNewExam({...newExam, proctors: u}) }} className="w-full p-2 bg-white border rounded-lg text-xs font-semibold">
                                        <option value="">Seçiniz...</option>
                                        {getAvailableTeachers(newExam.date, newExam.time, 'proctor', i).map(t => <option key={t.id} value={t.name}>{t.name} ({t.branch})</option>)}
                                    </select>
                                ))}
                            </div>
                            <button className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all active:scale-95">{editingId ? 'Sınavı Güncelle' : 'Sınavı Kaydet'}</button>
                        </form>
                    </div>
                    <div className="lg:col-span-8 space-y-4">
                        <div className="flex justify-end gap-3"><button onClick={() => runPrint('program_pdf')} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"><Printer className="w-3.5 h-3.5" /> Program Yazdır</button></div>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-xs font-bold">
                                <thead className="bg-slate-50 border-b uppercase font-black text-slate-400 text-[10px]"><tr><th className="p-4">Tarih/Saat</th><th className="p-4">Ders / Seviye</th><th className="p-4">Görevliler</th><th className="p-4 text-center">İşlem</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">{sortedExams.map(ex => (<tr key={ex.id} onClick={() => { setEditingId(ex.id); setNewExam({...ex}); }} className={`hover:bg-slate-50 cursor-pointer ${editingId === ex.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}><td className="p-4"><b>{new Date(ex.date).toLocaleDateString('tr-TR')}</b><br/><span className="text-blue-600">{ex.time}</span></td><td className="p-4 uppercase">{ex.subject}<br/><span className="text-slate-400 text-[9px]">{ex.grade}</span></td><td className="p-4"><div className="flex flex-wrap gap-1">{ex.examiners.filter((n:any)=>n).map((n:any, i:any) => <span key={i} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[9px]">A: {n}</span>)}{ex.proctors.filter((n:any)=>n).map((n:any, i:any) => <span key={i} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-[9px]">G: {n}</span>)}</div></td><td className="p-4 text-center"><button onClick={(e) => { e.stopPropagation(); setExams(exams.filter(x => x.id !== ex.id)); }} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'support' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                            <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><Download className="text-emerald-600 w-6 h-6" /></div>
                            <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Yedekle</h3>
                            <button onClick={() => {
                                const data = { exams, teachers, settings };
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = `sinav_yedek_${new Date().toISOString().split('T')[0]}.json`; a.click();
                                showNotification("Veriler yedeklendi.");
                            }} className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl font-black text-[10px] uppercase">Dışa Aktar</button>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                            <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><Upload className="text-blue-600 w-6 h-6" /></div>
                            <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Geri Yükle</h3>
                            <input type="file" accept=".json" ref={fileInputRef} onChange={(e) => {
                                const file = e.target.files?.[0]; if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    try {
                                        const data = JSON.parse(ev.target?.result as string);
                                        if (data.exams && data.teachers && data.settings) {
                                            setExams(data.exams); setTeachers(data.teachers); setSettings(data.settings);
                                            showNotification("Yedek yüklendi.");
                                        }
                                    } catch(err) { alert("Dosya formatı hatalı!"); }
                                };
                                reader.readAsText(file);
                            }} style={{ display: 'none' }} />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-black text-[10px] uppercase">Dosya Seç</button>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                            <div className="bg-red-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4"><Trash2 className="text-red-600 w-6 h-6" /></div>
                            <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Sıfırla</h3>
                            <button onClick={() => { if(confirm("Emin misiniz?")) { setExams([]); setTeachers([]); showNotification("Sıfırlandı."); } }} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-black text-[10px] uppercase">Verileri Sil</button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><HelpCircle className="text-blue-600 w-8 h-8" /></div>
                        <h2 className="text-xl font-black text-slate-800 uppercase mb-4">Destek ve Kullanım Kılavuzu</h2>
                        <a href="https://github.com/kdavut/sorumluluk_sinavlari_paneli/blob/main/README.md" target="_blank" className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-blue-600 transition-all group">
                            <BookOpen className="w-4 h-4 transition-transform group-hover:scale-125" />
                            Kılavuzu Görüntüle (GitHub)
                        </a>
                    </div>

                    <div className="bg-amber-50 p-8 rounded-3xl border border-amber-200 text-center shadow-sm">
                        <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Coffee className="text-amber-600 w-8 h-8" /></div>
                        <h2 className="text-lg font-black text-amber-900 uppercase mb-2">Geliştiriciye Destek Olun</h2>
                        <p className="text-amber-800/70 text-sm mb-6 max-w-xl mx-auto font-medium italic">Bu web Uygulaması MEB Öğretmeni Davut KILIÇ tarafından yapıldı.</p>
                        <a href="https://www.buymeacoffee.com/kdavut" target="_blank" className="inline-flex items-center gap-3 bg-[#FFDD00] text-black px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-[#FFCC00] transition-all group">
                            <img src="https://cdn.buymeacoffee.com/widget/assets/queues/coffee.svg" alt="Coffee" className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            Bana Bir Kahve Ismarla
                        </a>
                    </div>
                </div>
            )}
        </main>

        <footer className="py-10 text-center text-slate-400 text-[9px] font-black uppercase tracking-widest border-t bg-white/50 no-print">
            &copy; {new Date().getFullYear()} {settings.schoolName} &bull; Sınav Yönetim Sistemi
        </footer>

        {/* --- PRINT AREA --- */}
        <div className="print-only">
            {printMode === 'program_pdf' && (
                <div className="print-container p-4">
                    <div className="text-center mb-6">
                        <h1 className="text-lg font-bold uppercase">{settings.schoolName}</h1>
                        <h2 className="text-md font-bold uppercase">{settings.examPeriod}</h2>
                        <h3 className="text-sm font-bold uppercase underline">SORUMLULUK SINAV PROGRAMI</h3>
                    </div>
                    <table className="program-table-print">
                        <thead><tr><th>Tarih</th><th>Saat</th><th>Ders Adı</th><th>Seviye</th><th>Öğr. Sayısı</th><th>Komisyon Üyeleri</th><th>Gözetmenler</th></tr></thead>
                        <tbody>{sortedExams.map((ex, idx) => (<tr key={idx}><td>{new Date(ex.date).toLocaleDateString('tr-TR')}</td><td>{ex.time}</td><td className="uppercase">{ex.subject}</td><td>{ex.grade}</td><td>{ex.studentCount}</td><td>{ex.examiners.filter((x:any)=>x).join(", ")}</td><td>{ex.proctors.filter((x:any)=>x).join(", ")}</td></tr>))}</tbody>
                    </table>
                </div>
            )}
            {(printMode === 'all_tasks' || printMode === 'single_task') && (printMode === 'all_tasks' ? teacherStats.filter(t => t.total > 0) : [selectedTeacherForPaper]).filter(t => t).map((t: any, index: number) => (
                <div key={t.id} className={`print-container ${index !== 0 ? 'page-break' : ''}`}>
                    <TaskPaperTemplate teacher={t} />
                </div>
            ))}
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @media print { 
                .no-print { display: none !important; } 
                .print-only { display: block !important; }
                body { background-color: white; margin: 0; padding: 0; }
                @page { margin: 1.5cm; }
                .task-card-full { min-height: 250mm; display: flex; flex-direction: column; justify-content: space-between; }
                .program-table-print { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .program-table-print th, .program-table-print td { border: 1px solid black; padding: 6px; font-size: 9pt; text-align: left; }
                .page-break { page-break-before: always; }
            }
            .print-only { display: none; }
        `}} />
    </div>
  );
};
