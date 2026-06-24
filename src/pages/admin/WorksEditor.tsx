import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ImageUploader from '../../components/admin/ImageUploader';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Plus, Trash2, ArrowLeft, Languages } from 'lucide-react';
import { FirestoreWork } from '../../hooks/useWorks';

const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all text-sm';
const textareaClass = inputClass + ' resize-none leading-relaxed';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function LangField({ 
  label, value, valueLv, onChange, onChangeLv, showLv, 
  multiline = false, rows = 3, placeholder,
}: { 
  label: string; value: string; valueLv?: string; 
  onChange: (v: string) => void; onChangeLv: (v: string) => void; 
  showLv: boolean; multiline?: boolean; rows?: number; placeholder?: string;
}) {
  if (!showLv) {
    return (
      <Field label={label}>
        {multiline ? (
          <textarea rows={rows} className={textareaClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        ) : (
          <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        )}
      </Field>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-600 uppercase pointer-events-none">RU</span>
          {multiline ? (
            <textarea rows={rows} className={textareaClass + ' pr-10'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
          ) : (
            <input className={inputClass + ' pr-10'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
          )}
        </div>
        <div className="relative">
          <span className="absolute right-3 top-3 text-[10px] font-bold text-emerald-500/60 uppercase pointer-events-none">LV</span>
          {multiline ? (
            <textarea rows={rows} className={textareaClass + ' pr-10 border-emerald-500/20'} value={valueLv || ''} onChange={(e) => onChangeLv(e.target.value)} placeholder={`${placeholder || label} (latviski)`} />
          ) : (
            <input className={inputClass + ' pr-10 border-emerald-500/20'} value={valueLv || ''} onChange={(e) => onChangeLv(e.target.value)} placeholder={`${placeholder || label} (latviski)`} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorksEditor() {
  const [works, setWorks] = useState<FirestoreWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState<FirestoreWork | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newWorkId, setNewWorkId] = useState('');
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showLv, setShowLv] = useState(false);

  useEffect(() => {
    loadWorks();
  }, []);

  async function loadWorks() {
    const snap = await getDocs(collection(db, 'works'));
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FirestoreWork))
      .sort((a, b) => (typeof a.order === 'number' ? a.order : 999) - (typeof b.order === 'number' ? b.order : 999));
    setWorks(list);
    setLoading(false);
  }

  async function saveWork() {
    if (!selectedWork) return;
    setSaving(true);
    try {
      const { id, ...data } = selectedWork;
      await setDoc(doc(db, 'works', id), data, { merge: true });
      setWorks((prev) => prev.map((w) => (w.id === id ? selectedWork : w)));
      setSaveMsg('Сохранено ✓');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: any) {
      setSaveMsg(`Ошибка: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function createWork() {
    const id = newWorkId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const title = newWorkTitle.trim();
    if (!id || !title) return;
    setCreating(true);
    try {
      const newWork: Omit<FirestoreWork, 'id'> = {
        title,
        description: '',
        image: '',
        order: works.length + 1,
      };
      await setDoc(doc(db, 'works', id), newWork);
      const fullWork = { id, ...newWork };
      setWorks((prev) => [...prev, fullWork]);
      setShowNewForm(false);
      setNewWorkId('');
      setNewWorkTitle('');
      setSelectedWork(fullWork);
    } catch (e: any) {
      alert(`Ошибка создания: ${e.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteWork(id: string) {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'works', id));
      setWorks((prev) => prev.filter((w) => w.id !== id));
      setDeleteConfirm(null);
    } catch (e: any) {
      alert(`Ошибка удаления: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  }

  if (selectedWork) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedWork(null)} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{selectedWork.title || 'Редактировать работу'}</h1>
              <p className="text-slate-400 text-sm mt-1">ID: {selectedWork.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLv(!showLv)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                showLv
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Languages size={14} />
              {showLv ? 'RU + LV' : 'Только RU'}
            </button>
            {saveMsg && <span className={`text-sm ${saveMsg.startsWith('Ошибка') ? 'text-red-400' : 'text-green-400'}`}>{saveMsg}</span>}
            <button onClick={saveWork} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 disabled:opacity-50">
              <Save size={14} />
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-5">
          <h2 className="text-white font-semibold text-sm mb-5">Основная информация</h2>
          <div className="flex flex-col gap-5">
            <LangField label="Заголовок" value={selectedWork.title} valueLv={selectedWork.title_lv} onChange={(v) => setSelectedWork({ ...selectedWork, title: v })} onChangeLv={(v) => setSelectedWork({ ...selectedWork, title_lv: v })} showLv={showLv} />
            <LangField label="Тег / Категория (напр. ИНЪЕКЦИИ)" value={selectedWork.tag || ''} valueLv={selectedWork.tag_lv} onChange={(v) => setSelectedWork({ ...selectedWork, tag: v })} onChangeLv={(v) => setSelectedWork({ ...selectedWork, tag_lv: v })} showLv={showLv} />
            <LangField label="Описание" value={selectedWork.description} valueLv={selectedWork.description_lv} onChange={(v) => setSelectedWork({ ...selectedWork, description: v })} onChangeLv={(v) => setSelectedWork({ ...selectedWork, description_lv: v })} showLv={showLv} multiline rows={3} />
            
            <div className="mt-4">
              <Field label="Изображение">
                <ImageUploader
                  currentUrl={selectedWork.image}
                  storagePath={`works/${selectedWork.id}/image`}
                  onUpload={(url) => setSelectedWork({ ...selectedWork, image: url })}
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Порядок сортировки (меньше = выше)">
                <input
                  type="number"
                  className={inputClass}
                  value={selectedWork.order ?? 99}
                  onChange={(e) => setSelectedWork({ ...selectedWork, order: Number(e.target.value) })}
                />
              </Field>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Наши работы</h1>
          <p className="text-slate-400 text-sm mt-1">Управление портфолио работ</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 transition-all"
        >
          <Plus size={16} />
          Добавить работу
        </button>
      </div>

      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
              <h3 className="text-white font-semibold text-sm mb-4">Создать новую работу</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Field label="Название работы">
                  <input
                    className={inputClass}
                    placeholder="Например: Биоревитализация губ"
                    value={newWorkTitle}
                    onChange={(e) => {
                      setNewWorkTitle(e.target.value);
                      const auto = e.target.value
                        .toLowerCase()
                        .replace(/[а-яё]/g, (c) => {
                          const map: Record<string, string> = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya' };
                          return map[c] || c;
                        })
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');
                      setNewWorkId(auto);
                    }}
                  />
                </Field>
                <Field label="ID (латиница, для URL/БД)">
                  <input
                    className={inputClass}
                    placeholder="lip-biorevitalization"
                    value={newWorkId}
                    onChange={(e) => setNewWorkId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={createWork}
                  disabled={creating || !newWorkId.trim() || !newWorkTitle.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 disabled:opacity-40 transition-all"
                >
                  <Plus size={14} />
                  {creating ? 'Создаём...' : 'Создать'}
                </button>
                <button
                  onClick={() => { setShowNewForm(false); setNewWorkId(''); setNewWorkTitle(''); }}
                  className="px-4 py-2.5 rounded-xl text-slate-400 text-sm hover:text-white hover:bg-white/5 transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !deleting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Удалить работу?</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    «{works.find(w => w.id === deleteConfirm)?.title}»
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-5">
                Эта запись будет удалена безвозвратно. Изображения в хранилище останутся.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteWork(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/25 disabled:opacity-50 transition-all"
                >
                  <Trash2 size={14} />
                  {deleting ? 'Удаляем...' : 'Удалить'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-slate-400 text-sm hover:text-white hover:bg-white/5 transition-all"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : works.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Plus size={24} className="text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm">Пока нет работ</p>
          <p className="text-slate-600 text-xs mt-1">Добавьте первую работу в портфолио</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {works.map((work) => (
            <div key={work.id} className="flex items-center gap-2 group">
              <button
                onClick={() => setSelectedWork(work)}
                className="flex-1 flex items-center justify-between bg-white/3 border border-white/8 rounded-2xl p-5 hover:bg-white/5 hover:border-white/15 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  {work.image ? (
                    <img src={work.image} alt={work.title} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs text-slate-500">
                      Нет фото
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{work.title}</span>
                      {work.tag && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                          {work.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">Порядок: {work.order ?? 99} · ID: {work.id}</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setDeleteConfirm(work.id)}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
