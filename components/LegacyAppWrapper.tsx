import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from '../services/firebase';
import { UserProfile } from '../types';
import { 
  ShieldCheck, Settings, Users, PlusCircle, BarChart3, 
  Printer, HelpCircle, LogOut, Trash2, Download, 
  Upload, BookOpen, Coffee, Edit, UserPlus, X, Check
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
  const [mergeSourceId, setMergeSourceId] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firestore'dan verileri yükle
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

  // Firestore'a verileri kaydet (Değişiklik olduğunda)
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
    const timer = setTimeout(saveData, 1000);
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

  // Görev istatistiklerini hesapla
  const teacherStats = useMemo(() => {
    return teachers.map(t => {
      let p = 0, e = 0;
      exams.forEach(ex => {
        // null/undefined kontrolü eklenerek verilerin gelmeme sorunu giderildi
        if (ex.proctors && Array.isArray(ex.proctors) && ex.proctors.includes(t.name)) p++;
        if (ex.examiners && Array.isArray(ex.examiners) && ex.examiners.includes(t.name)) e++;
      });
      return { ...t, proctor: p, examiner: e, total: p + e };
    }).sort((a, b) => b.total - a.total);
  }, [teachers, exams]);

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
        return (ex.proctors && ex.proctors.includes(t.name)) || (ex.examiners && ex.examiners.includes(t.name));
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

  const handleMergeExams = (targetId: number) => {
    if (!mergeSourceId) {
      setMergeSourceId(targetId);
      showNotification("Birleştirilecek ilk sınav seçildi. Şimdi hedef sınavı seçin.");
      return;
    }

    if (mergeSourceId === targetId) {
      setMergeSourceId(null);
      showNotification("Seçim iptal edildi.");
      return;
    }

    const sourceExam = exams.find(ex => ex.id === mergeSourceId);
    const targetExam = exams.find(ex => ex.id === targetId);

    if (sourceExam && targetExam) {
      // Create merged record
      const mergedExam = {
        ...targetExam,
        subject: `${sourceExam.subject} / ${targetExam.subject}`,
        grade: sourceExam.grade === targetExam.grade ? targetExam.grade : `${sourceExam.grade} / ${targetExam.grade}`,
        studentCount: (parseInt(sourceExam.studentCount) || 0) + (parseInt(targetExam.studentCount) || 0),
        // Use source's teachers as the base for the combined session
        proctorCount: sourceExam.proctorCount,
        examinerCount: sourceExam.examinerCount,
        proctors: [...sourceExam.proctors],
        examiners: [...sourceExam.examiners]
      };

      // Remove source from list and update target in one go
      setExams(exams
        .filter(ex => ex.id !== mergeSourceId)
        .map(ex => ex.id === targetId ? mergedExam : ex)
      );
      
      showNotification("Sınavlar ve görevliler başarıyla birleştirildi.");
    }
    setMergeSourceId(null);
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
    setTimeout(() => { 
        window.print(); 
        setPrintMode(null); 
    }, 500);
  };

  const TaskPaperTemplate = ({ teacher }: { teacher: any }) => (
    <div className="task-card-full bg-white text-black">
        <div>
            <div className="flex flex-col items-center border-b-2 border-black pb-4 mb-8">
                <div className="text-[14px] font-bold text-center leading-tight mb-2 uppercase">
                    T.C. <br/> MİLLİ EĞİTİM BAKANLIĞI <br/> {settings.schoolName}
                </div>
            </div>
            <div className="mt-8 px-4">
                <h3 className="text-center font-black text-[16px] mb-8 underline tracking-wider uppercase">SINAV GÖREVLENDİRME VE TEBLİĞ BELGESİ</h3>
                <div className="mb-8 space-y-2 text-justify">
                    <p className="text-[12px] font-bold">Sayın {teacher.name},</p>
                    <p className="text-[12px] leading-relaxed"> 
                        {settings.examPeriod} kapsamında okulumuzda gerçekleştirilecek olan sorumluluk sınavlarında aşağıda belirtilen gün ve saatlerde görevlendirilmiş bulunmaktasınız.
                    </p>
                    <p className="text-[12px] leading-relaxed">
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
                        {exams.filter(ex => (ex.proctors && ex.proctors.includes(teacher.name)) || (ex.examiners && ex.examiners.includes(teacher.name)))
                            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((ex, i) => (
                            <tr key={i} className="font-bold">
                                <td className="border-2 border-black p-3 text-center">{new Date(ex.date).toLocaleDateString('tr-TR')}</td>
                                <td className="border-2 border-black p-3 text-center">{ex.time}</td>
                                <td className="border-2 border-black p-3 uppercase">{ex.subject} ({ex.grade})</td>
                                <td className="border-2 border-black p-3 text-center">{ex.examiners && ex.examiners.includes(teacher.name) ? 'KOMİSYON ÜYESİ' : 'GÖZETMEN'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        <div className="flex justify-between items-end px-12 pb-12 mt-auto">
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
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Veriler Senkronize Ediliyor...</p>
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
                        <span className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.2em]">{settings.examPeriod}</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1 bg-white/5 p-1 rounded-2xl border border-white/10">
                    {[
                        { id: 'settings', label: 'Ayarlar', icon: Settings },
                        { id: 'teachers_list', label: 'Öğretmenler', icon: Users },
                        { id: 'input', label: 'Sınav Girişi', icon: PlusCircle },
                        { id: 'stats', label: 'Görev Sayıları', icon: BarChart3 },
                        { id: 'task_paper', label: 'Görev Kağıdı', icon: Printer },
                        { id: 'support', label: 'Yedekle', icon: HelpCircle }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all duration-300 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                        </button>
                    ))}
                    <button 
                        onClick={onLogout}
                        className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ml-2"
                    >
                        <LogOut className="w-4 h-4" /> 
                    </button>
                </div>
            </div>
        </nav>

        <main className="max-w-7xl mx-auto p-6 no-print">
            {notification && <div className="fixed top-24 right-6 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 text-xs font-black uppercase animate-in slide-in-from-right-10 border border-white/10 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> {notification}</div>}

            {activeTab === 'settings' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-4 flex items-center gap-2"><Settings className="w-4 h-4"/> Kurum ve Dönem Bilgileri</h2>
                            <div className="space-y-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Okul Adı</label><input type="text" value={settings.schoolName} onChange={e => setSettings({...settings, schoolName: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Sınav Dönemi</label><input type="text" value={settings.examPeriod} onChange={e => setSettings({...settings, examPeriod: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Okul Müdürü</label><input type="text" value={settings.principalName} onChange={e => setSettings({...settings, principalName: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" /></div>
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

                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200 text-left space-y-8 max-w-4xl mx-auto animate-in fade-in duration-700">
                        <div className="border-b pb-6">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">SORUMLULUK SINAVI YÖNETİM PANELİ</h2>
                            <p className="text-slate-600 text-sm leading-relaxed font-medium italic">
                                Bu sistem, okulumuzdaki sorumluluk sınavlarının planlanması, öğretmen görevlendirmelerinin adil bir şekilde dağıtılması ve resmi belgelerin (görev tebliğ kağıtları, sınav programı vb.) hızlıca oluşturulması için tasarlanmıştır. Geliştirici Davut KILIÇ'a destek olmak için <a href="https://buymeacoffee.com/kdavut" target="_blank" className="text-blue-600 underline font-bold">https://buymeacoffee.com/kdavut</a> adresine tıklayabilirsiniz.
                            </p>
                        </div>

                        <div className="space-y-8">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">🚀 KULLANIM KILAVUZU VE GÜNCELLEMELER HAKKINDA </h3>
                            
                             <div className="space-y-4">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">🛠️ Son Yapılan Güncellemeler (Sürüm Notları)</h3>
                            <div className="text-sm text-slate-600 space-y-3 font-medium">
                                <div className="flex gap-2">
                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-black h-fit">DÜZELTME</span>
                                    <p><strong>Çakışma Kontrolü:</strong> Aynı tarih ve saatte bir öğretmene birden fazla görev verilmesi engellendi.</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black h-fit">İYİLEŞTİRME</span>
                                    <p><strong>PDF Tasarımı:</strong> Resmi yazı formatına uygun, okul müdürü imzalı görev tebliğ belgesi tasarımı güncellendi.</p>
                                </div>
                                 <div className="flex gap-2">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black h-fit">EKLEME</span>
                                    <p><strong>SINAV BİRLEŞTİRME:</strong> Sınavlarda sadece birkaç öğrenci varsa Sınav Girişi sekmesi altında sınavların yanında bulunan "Görevlileri Birleştir" ikonu ile iki sınavı tek kayıtta birleştirebilirsiniz.</p>
                                </div>
                            </div>
                        </div>
                            
                            <div className="space-y-8 text-sm text-slate-600">
                                <div>
                                    <h4 className="font-black text-slate-900 text-sm mb-1">Genel ayarların yapılandırılması (Ayarlar sekmesi)</h4>
                                    <p>Okul Bilgileri: Okul adı, sınav dönemi ve okul müdürü bilgilerini girin. Bu bilgiler tüm resmi çıktılarda (Görev Kağıtları, Program vb.) otomatik olarak kullanılır.</p>
                                    <p>TARİH VE SAATİ BİR KEZ GİRİN VE AÇILIR MENÜDE SADECE ONLAR ÇIKACAK</p>
                                    <h4 className="font-black text-slate-900 text-sm mb-1">E-okul girişi > Ortaöğretim Kurum İşlemleri > Sorumluluk/Tasdikname > Hızlı Sorumluluk Girişi > Yazdır > Sorumlu Dersi Olan Öğrenciler ve Dersleri (Önceki Sınıflar Boş Not Çizelgesi) </h4>
                                    <h4 className="font-black text-slate-900 text-sm mb-1"> BU DOSYAYA GÖRE SINAVLARINIZ, SEVİYE VE ÖĞRENCİ SAYISINI GİRİNİZ</h4>
                                </div>

                                <div>
                                    <h4 className="font-black text-slate-900 text-sm mb-1">Öğretmen kadrosunu oluşturma (Öğretmenler sekmesi)</h4>
                                    <p>Sınavlarda görev alacak tüm öğretmenleri Ad Soyad ve Branş bilgileriyle sisteme kaydedin. Listeden bir isme tıklayarak bilgilerini güncelleyebilir veya silebilirsiniz.</p>
                                </div>

                                <div>
                                    <h4 className="font-black text-slate-900 text-sm mb-1">Sınavların tanımlanması (Sınav girişi sekmesi)</h4>
                                    <p>Ders ve Seviye: Sınavı yapılacak dersi ve sınıf seviyesini seçin.</p>
                                    <p>Görevli Atama: Sistem, seçtiğiniz tarih ve saatte başka bir sınavda görevi olan öğretmenleri listede göstermez (Çakışma Kontrolü).</p>
                                    <p>Komisyon ve Gözetmen: İhtiyaca göre görevli sayılarını artırıp azaltabilirsiniz.</p>
                                </div>

                                <div>
                                    <h4 className="font-black text-slate-900 text-sm mb-1">Takip ve istatistikler (Görev sayıları sekmesi)</h4>
                                    <p>Bu sekmeden hangi öğretmenin kaç komisyon, kaç gözetmenlik görevi aldığını anlık olarak görebilirsiniz. Adil bir görev dağılımı yapmak için "Toplam" sütununu takip edebilirsiniz.</p>
                                </div>

                                <div>
                                    <h4 className="font-black text-slate-900 text-sm mb-1">Yazdırma ve tebliğ (Görev kağıdı sekmesi)</h4>
                                    <div className="space-y-2">
                                        <p><strong>Tekli Yazdır:</strong> İstediğiniz öğretmenin görev belgesini hazırlar.</p>
                                        <p><strong>Tümünü Yazdır:</strong> Tüm görevli öğretmenlerin belgelerini arka arkaya, her öğretmen yeni bir sayfaya gelecek şekilde PDF olarak hazırlar.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">💾 Veri Güvenliği ve Yedekleme</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">Sistem verileri Firebase ve tarayıcınızda tutar. Bilgisayar değişikliği yapacaksanız veya verileri garantiye almak istiyorsanız "Destek ve Yedekleme" sekmesini kullanın:</p>
                            <ul className="text-sm text-slate-600 space-y-2 list-none pl-1">
                                <li>-- <strong>Yedekle:</strong> Mevcut tüm sınav ve öğretmen verilerini .json dosyası olarak bilgisayarınıza indirir.</li>
                                <li>-- <strong>Geri Yükle:</strong> Daha önce aldığınız yedek dosyasını sisteme geri yükler.</li>
                                <li>-- <strong>Sıfırla:</strong> Yeni bir sınav dönemi başlangıcında tüm eski kayıtları temizlemek için kullanılır.</li>
                            </ul>
                        </div>
                        
                        <div className="pt-8 border-t border-slate-100 text-center space-y-4">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center justify-center gap-2">☕ Destek</h3>
                            <p className="text-sm text-slate-500 italic max-w-xl mx-auto leading-relaxed">
                                Bu sistem tamamen okul ihtiyaçları doğrultusunda geliştirilmiştir. Memnun kaldıysanız Destek sekmesinden bir kahve ısmarlayarak katkıda bulunabilirsiniz!
                            </p>
                            <a href="https://buymeacoffee.com/kdavut" target="_blank" className="inline-flex items-center gap-3 bg-[#FFDD00] text-black px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-[#FFCC00] transition-all group active:scale-95">
                                <Coffee className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                KAHVE ISMARLA (BU ME A COFFEE)
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'teachers_list' && (
                <div className="grid lg:grid-cols-4 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-28">
                            <h2 className="text-xs font-black text-slate-800 uppercase border-b pb-2 mb-4 flex items-center gap-2">
                                {teacherForm.id ? <Edit className="w-3.5 h-3.5"/> : <UserPlus className="w-3.5 h-3.5"/>}
                                {teacherForm.id ? "Bilgileri Düzenle" : "Yeni Öğretmen Kaydı"}
                            </h2>
                            <form onSubmit={handleAddOrUpdateTeacher} className="space-y-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Ad Soyad</label><input required type="text" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400" /></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Branş</label><input type="text" value={teacherForm.branch} onChange={e => setTeacherForm({...teacherForm, branch: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-400" /></div>
                                <button className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:opacity-90 active:scale-95 transition-all">{teacherForm.id ? "Güncelle" : "Sisteme Kaydet"}</button>
                                {teacherForm.id && <button type="button" onClick={() => setTeacherForm({id: null, name: '', branch: ''})} className="w-full text-[10px] font-bold text-red-500 uppercase mt-2">İptal</button>}
                            </form>
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                                <h2 className="text-xs font-black text-slate-800 uppercase">Öğretmen Listesi (Branşa Göre)</h2>
                                <button onClick={() => runPrint('teacher_list_pdf')} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-700 transition">
                                    <Printer className="w-3.5 h-3.5" /> PDF Liste
                                </button>
                            </div>
                            <table className="w-full text-left text-sm font-bold">
                                <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase"><tr><th className="p-4">Branş</th><th className="p-4">Ad Soyad</th><th className="p-4 text-center">İşlem</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">{sortedTeachers.map(t => (<tr key={t.id} onClick={() => setTeacherForm({ id: t.id, name: t.name, branch: t.branch })} className="hover:bg-slate-50 cursor-pointer transition-colors group"><td className="p-4 text-xs text-blue-600 uppercase">{t.branch}</td><td className="p-4">{t.name} <span className="opacity-0 group-hover:opacity-100 text-[9px] text-blue-400 lowercase ml-2 font-normal">(düzenle)</span></td><td className="p-4 text-center"><button onClick={(e) => { e.stopPropagation(); if(confirm('Öğretmeni silmek istediğinize emin misiniz?')) setTeachers(teachers.filter(x => x.id !== t.id)); }} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></td></tr>))}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'input' && (
                <div className="grid lg:grid-cols-12 gap-8 animate-in slide-in-from-right-4 duration-500">
                    <div className="lg:col-span-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-fit space-y-6">
                        <h2 className="text-xs font-black text-slate-800 uppercase border-b pb-4">{editingId ? 'Sınav Kaydını Düzenle' : 'Yeni Sınav Planlama'}</h2>
                        <form onSubmit={handleAddOrUpdateExam} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase">Tarih</label><select required value={newExam.date} onChange={e => setNewExam({...newExam, date: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none"><option value="">Seçiniz</option>{settings.allowedDates.map(d => <option key={d} value={d}>{new Date(d).toLocaleDateString('tr-TR')}</option>)}</select></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase">Saat</label><select required value={newExam.time} onChange={e => setNewExam({...newExam, time: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none"><option value="">Seçiniz</option>{settings.allowedTimes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            </div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase">Ders Adı ve Konusu</label><input required type="text" value={newExam.subject} onChange={e => setNewExam({...newExam, subject: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold outline-none" placeholder="Örn: Türk Dili ve Edebiyatı" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-slate-400 uppercase">Sınıf Seviyesi</label><select value={newExam.grade} onChange={e => setNewExam({...newExam, grade: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold"><option value="9. Sınıf">9. Sınıf</option><option value="10. Sınıf">10. Sınıf</option><option value="11. Sınıf">11. Sınıf</option><option value="12. Sınıf">12. Sınıf</option></select></div>
                                <div><label className="text-[10px] font-black text-slate-400 uppercase">Öğrenci Sayısı</label><input type="number" value={newExam.studentCount} onChange={e => setNewExam({...newExam, studentCount: e.target.value})} className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm font-bold" /></div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-blue-600 uppercase">Komisyon Üyeleri</span><input type="number" value={newExam.examinerCount} onChange={e => handleCountChange('examiner', e.target.value)} className="w-12 p-1 text-xs border rounded text-center font-bold" /></div>
                                {newExam.examiners.map((n: string, i: number) => (
                                    <select key={i} value={n} onChange={e => { const u = [...newExam.examiners]; u[i] = e.target.value; setNewExam({...newExam, examiners: u}) }} className="w-full p-2 bg-white border rounded-lg text-xs font-semibold">
                                        <option value="">Öğretmen Seçiniz...</option>
                                        {getAvailableTeachers(newExam.date, newExam.time, 'examiner', i).map(t => <option key={t.id} value={t.name}>{t.name} ({t.branch})</option>)}
                                    </select>
                                ))}
                                <div className="flex justify-between items-center"><span className="text-[10px] font-black text-emerald-600 uppercase">Gözetmen Sayısı</span><input type="number" value={newExam.proctorCount} onChange={e => handleCountChange('proctor', e.target.value)} className="w-12 p-1 text-xs border rounded text-center font-bold" /></div>
                                {newExam.proctors.map((n: string, i: number) => (
                                    <select key={i} value={n} onChange={e => { const u = [...newExam.proctors]; u[i] = e.target.value; setNewExam({...newExam, proctors: u}) }} className="w-full p-2 bg-white border rounded-lg text-xs font-semibold">
                                        <option value="">Öğretmen Seçiniz...</option>
                                        {getAvailableTeachers(newExam.date, newExam.time, 'proctor', i).map(t => <option key={t.id} value={t.name}>{t.name} ({t.branch})</option>)}
                                    </select>
                                ))}
                            </div>
                            <button className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all active:scale-95">{editingId ? 'Planlamayı Güncelle' : 'Planı Kaydet'}</button>
                            {editingId && <button type="button" onClick={() => { setEditingId(null); setNewExam({ grade: '9. Sınıf', subject: '', studentCount: '', date: '', time: '', proctorCount: 1, examinerCount: 1, proctors: [''], examiners: [''] }); }} className="w-full text-[10px] font-bold text-red-500 uppercase">Vazgeç</button>}
                        </form>
                    </div>
                    <div className="lg:col-span-8 space-y-4">
                        <div className="flex justify-end gap-3"><button onClick={() => runPrint('program_pdf')} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-red-700 transition"><Printer className="w-3.5 h-3.5" /> Programı Yazdır (PDF)</button></div>
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-xs font-bold">
                                <thead className="bg-slate-50 border-b uppercase font-black text-slate-400 text-[10px]"><tr><th className="p-4">Tarih/Saat</th><th className="p-4">Ders / Seviye</th><th className="p-4">Görevliler</th><th className="p-4 text-center">İşlem</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">{sortedExams.map(ex => (<tr key={ex.id} onClick={() => { setEditingId(ex.id); setNewExam({...ex}); }} className={`hover:bg-slate-50 cursor-pointer transition-colors ${editingId === ex.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}><td className="p-4"><b>{new Date(ex.date).toLocaleDateString('tr-TR')}</b><br/><span className="text-blue-600">{ex.time}</span></td><td className="p-4 uppercase">{ex.subject}<br/><span className="text-slate-400 text-[9px]">{ex.grade} • {ex.studentCount} Öğr.</span></td><td className="p-4"><div className="flex flex-wrap gap-1">{ex.examiners && ex.examiners.filter((n:any)=>n).map((n:any, i:any) => <span key={i} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[9px] border border-blue-100">A: {n}</span>)}{ex.proctors && ex.proctors.filter((n:any)=>n).map((n:any, i:any) => <span key={i} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-[9px] border border-emerald-100">G: {n}</span>)}</div></td><td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleMergeExams(ex.id); }} 
                                        className={`p-1.5 rounded-lg transition-all ${mergeSourceId === ex.id ? 'bg-blue-600 text-white shadow-lg scale-110' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                        title={mergeSourceId ? "Buraya Birleştir" : "Görevlileri Birleştir"}
                                    >
                                        <Users className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); if(confirm('Sınav kaydını silmek istediğinize emin misiniz?')) setExams(exams.filter(x => x.id !== ex.id)); if(editingId === ex.id) setEditingId(null); }} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td></tr>))}</tbody>
                            </table>
                            {sortedExams.length === 0 && <div className="p-10 text-center text-slate-300 uppercase font-black text-xs tracking-widest italic">Henüz sınav planlanmadı.</div>}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'stats' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden max-w-5xl mx-auto animate-in zoom-in duration-500">
                    <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                        <h2 className="text-xs font-black text-slate-800 uppercase">Öğretmen Görev Dağılım İstatistikleri</h2>
                        <button onClick={() => runPrint('stats_pdf')} className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-700 transition shadow-lg">
                            <Printer className="w-4 h-4" /> Çizelgeyi Yazdır (PDF)
                        </button>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr><th className="p-4">Öğretmen Adı Soyadı</th><th className="p-4 text-center">Komisyon Üyeliği</th><th className="p-4 text-center">Gözetmenlik</th><th className="p-4 text-center">Toplam Görev</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                            {teacherStats.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">{t.name} <span className="text-[10px] text-slate-300 ml-2 font-normal uppercase">{t.branch}</span></td>
                                    <td className="p-4 text-center text-blue-600 font-black">{t.examiner}</td>
                                    <td className="p-4 text-center text-emerald-600 font-black">{t.proctor}</td>
                                    <td className="p-4 text-center"><span className="bg-slate-100 text-slate-800 px-4 py-1 rounded-xl text-xs font-black shadow-sm">{t.total}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {teacherStats.length === 0 && <div className="p-12 text-center text-slate-300 uppercase font-black text-xs italic">Öğretmen listesi boş.</div>}
                </div>
            )}

            {activeTab === 'task_paper' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto animate-in fade-in duration-700">
                    <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                        <h2 className="text-xs font-black text-slate-800 uppercase">Resmi Görev Tebliğ Listesi</h2>
                        <button onClick={() => runPrint('all_tasks')} className="bg-red-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-red-700 transition flex items-center gap-2 shadow-xl active:scale-95">
                            <Printer className="w-4 h-4" /> TÜMÜNÜ TOPLU YAZDIR
                        </button>
                    </div>
                    <table className="w-full text-left text-sm font-bold">
                        <thead className="bg-white border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr><th className="p-4">Öğretmen Adı Soyadı</th><th className="p-4 text-center">Görev Durumu</th><th className="p-4 text-center">İşlem</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {teacherStats.filter(t => t.total > 0).map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">{t.name} <br/><span className="text-[10px] text-slate-400 normal-case font-medium">{t.branch}</span></td>
                                    <td className="p-4 text-center">
                                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-100">{t.total} ADET GÖREV</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => runPrint('single_task', t)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all mx-auto flex items-center gap-2 shadow-md active:scale-95">
                                            <Printer className="w-3 h-3" /> TEBLİĞ YAZDIR
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {teacherStats.filter(t => t.total > 0).length === 0 && (
                        <div className="p-16 text-center">
                            <Printer className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-300 uppercase font-black text-xs italic tracking-widest">Görev atanmış öğretmen bulunmuyor.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'support' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                            <div className="bg-emerald-50 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-sm"><Download className="text-emerald-600 w-8 h-8" /></div>
                            <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Verileri Yedekle</h3>
                            <p className="text-[10px] text-slate-400 mb-6 italic">Tüm sistemi bir .json dosyası olarak bilgisayarınıza indirin.</p>
                            <button onClick={() => {
                                const data = { exams, teachers, settings };
                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a'); a.href = url; a.download = `sinav_sistemi_yedek_${new Date().toISOString().split('T')[0]}.json`; a.click();
                                showNotification("Veriler yedeklendi.");
                            }} className="w-full bg-emerald-50 text-emerald-700 py-4 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-100 transition-all active:scale-95 shadow-sm">DOSYA İNDİR</button>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                            <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-sm"><Upload className="text-blue-600 w-8 h-8" /></div>
                            <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Yedekten Yükle</h3>
                            <p className="text-[10px] text-slate-400 mb-6 italic">Daha önce aldığınız bir yedek dosyasını sisteme geri yükleyin.</p>
                            <input type="file" accept=".json" ref={fileInputRef} onChange={(e) => {
                                const file = e.target.files?.[0]; if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    try {
                                        const data = JSON.parse(ev.target?.result as string);
                                        if (data.exams && data.teachers && data.settings) {
                                            setExams(data.exams); setTeachers(data.teachers); setSettings(data.settings);
                                            showNotification("Yedek başarıyla yüklendi.");
                                        } else { alert("Hatalı dosya formatı!"); }
                                    } catch(err) { alert("Dosya okunamadı!"); }
                                };
                                reader.readAsText(file);
                                if(fileInputRef.current) fileInputRef.current.value = '';
                            }} style={{ display: 'none' }} />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-50 text-blue-700 py-4 rounded-xl font-black text-[10px] uppercase hover:bg-blue-100 transition-all active:scale-95 shadow-sm">DOSYA SEÇ</button>
                        </div>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                            <div className="bg-red-50 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-sm"><Trash2 className="text-red-600 w-8 h-8" /></div>
                            <h3 className="font-black text-slate-800 uppercase text-xs mb-2">Sistemi Temizle</h3>
                            <p className="text-[10px] text-slate-400 mb-6 italic">Tüm öğretmen ve sınav kayıtlarını kalıcı olarak siler.</p>
                            <button onClick={() => { if(confirm("Tüm kayıtlar SİLİNECEKTİR! Geri dönüşü yoktur. Emin misiniz?")) { setExams([]); setTeachers([]); showNotification("Sistem tamamen sıfırlandı."); } }} className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-black text-[10px] uppercase hover:bg-red-100 transition-all active:scale-95 shadow-sm">SİSTEMİ SIFIRLA</button>
                        </div>
                    </div>
                </div>
            )}
        </main>

        <footer className="py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest border-t bg-white/50 no-print">
            &copy; {new Date().getFullYear()} {settings.schoolName} &bull; Sorumluluk Sınav Yönetim Paneli
        </footer>

        {/* --- YAZDIRMA ALANI (PRINT ONLY) --- */}
        <div className="print-only">
            {printMode === 'program_pdf' && (
                <div className="print-container p-4">
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-lg font-bold uppercase">{settings.schoolName}</h1>
                        <h2 className="text-md font-bold uppercase mt-1">{settings.examPeriod}</h2>
                        <h3 className="text-sm font-bold uppercase underline mt-4 tracking-widest">SORUMLULUK SINAV PROGRAMI</h3>
                    </div>
                    <table className="program-table-print">
                        <thead>
                            <tr>
                                <th className="text-center">Tarih</th>
                                <th className="text-center">Saat</th>
                                <th>Ders Adı ve Seviye</th>
                                <th className="text-center">Öğr.</th>
                                <th>Komisyon Üyeleri</th>
                                <th>Gözetmenler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedExams.map((ex, idx) => (
                                <tr key={idx}>
                                    <td className="text-center">{new Date(ex.date).toLocaleDateString('tr-TR')}</td>
                                    <td className="text-center font-bold">{ex.time}</td>
                                    <td className="uppercase font-bold">{ex.subject} ({ex.grade})</td>
                                    <td className="text-center">{ex.studentCount}</td>
                                    <td className="text-[8pt] italic font-bold">{(ex.examiners || []).filter((x:any)=>x).join(", ")}</td>
                                    <td className="text-[8pt] italic font-bold">{(ex.proctors || []).filter((x:any)=>x).join(", ")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-12 flex justify-end">
                        <div className="text-center min-w-64">
                            <p className="font-bold text-[11px] mb-12">{settings.principalName}</p>
                            <p className="font-bold text-[10px] border-t border-black pt-1">Okul Müdürü</p>
                        </div>
                    </div>
                </div>
            )}

            {printMode === 'teacher_list_pdf' && (
                <div className="print-container p-4">
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-lg font-bold uppercase">{settings.schoolName}</h1>
                        <h2 className="text-sm font-bold uppercase underline mt-4">ÖĞRETMEN LİSTESİ VE BRANŞ DAĞILIMI</h2>
                    </div>
                    <table className="program-table-print">
                        <thead><tr><th className="w-16 text-center">Sıra</th><th>Branşı</th><th>Öğretmen Adı Soyadı</th></tr></thead>
                        <tbody>{sortedTeachers.map((t, idx) => (<tr key={idx}><td className="text-center">{idx + 1}</td><td className="uppercase font-bold">{t.branch}</td><td className="uppercase font-bold">{t.name}</td></tr>))}</tbody>
                    </table>
                </div>
            )}

            {printMode === 'stats_pdf' && (
                <div className="print-container p-4">
                    <div className="text-center mb-8 border-b-2 border-black pb-4">
                        <h1 className="text-lg font-bold uppercase">{settings.schoolName}</h1>
                        <h2 className="text-md font-bold uppercase mt-2 underline">GÖREV DAĞILIM ÇİZELGESİ İSTATİSTİKLERİ</h2>
                    </div>
                    <table className="program-table-print">
                        <thead><tr><th>Öğretmen Adı Soyadı</th><th>Branş</th><th className="text-center">Komisyon</th><th className="text-center">Gözetmenlik</th><th className="text-center">Toplam</th></tr></thead>
                        <tbody>{teacherStats.map((t, idx) => (<tr key={idx}><td>{t.name}</td><td>{t.branch}</td><td className="text-center font-bold">{t.examiner}</td><td className="text-center font-bold">{t.proctor}</td><td className="text-center font-black">{t.total}</td></tr>))}</tbody>
                    </table>
                    <div className="mt-10 text-[9pt] italic text-slate-500">* Bu çizelge sadece planlanan görevleri göstermektedir.</div>
                </div>
            )}

            {(printMode === 'all_tasks' || printMode === 'single_task') && 
                (printMode === 'all_tasks' ? teacherStats.filter(t => t.total > 0) : [selectedTeacherForPaper])
                .filter(t => t)
                .map((t: any, index: number) => (
                    <div key={t.id} className={`print-container ${index !== 0 ? 'page-break' : ''}`}>
                        <TaskPaperTemplate teacher={t} />
                    </div>
                ))
            }
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @media print { 
                .no-print { display: none !important; } 
                .print-only { display: block !important; }
                body { background-color: white !important; margin: 0; padding: 0; color: black; }
                @page { margin: 1cm; size: portrait; }
                .task-card-full { height: 260mm; display: flex; flex-direction: column; padding: 5mm; }
                .program-table-print { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .program-table-print th, .program-table-print td { border: 1px solid black; padding: 6px; font-size: 9pt; text-align: left; }
                .program-table-print th { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
                .page-break { page-break-before: always; }
            }
            .print-only { display: none; }
        `}} />
    </div>
  );
};
