import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ImageUploader from '../../components/admin/ImageUploader';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Plus, Trash2, ChevronDown, ChevronUp, ArrowLeft, Image, Languages, LayoutTemplate } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const ICON_OPTIONS = ['Syringe', 'Droplets', 'Sparkles', 'Smile', 'Users', 'Zap', 'UserSearch', 'Heart', 'Star', 'Shield', 'Sun', 'Moon', 'Activity', 'Eye', 'Scissors'];



interface Treatment {
  name: string;
  name_lv?: string;
  description: string;
  description_lv?: string;
  price: string;
  indications: string[];
  indications_lv?: string[];
  results: string[];
  results_lv?: string[];
  detailedDescription: string;
  detailedDescription_lv?: string;
  image?: string;
}

interface Service {
  id: string;
  title: string;
  title_lv?: string;
  description: string;
  description_lv?: string;
  iconName: string;
  image: string;
  seoTitle: string;
  seoDescription: string;
  fullDescription?: string;
  fullDescription_lv?: string;
  shortDescription?: string;
  shortDescription_lv?: string;
  showInHero?: boolean;
  heroOrder?: number;
  treatments: Treatment[];
}

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

/** Dual-language text field with RU/LV inputs */
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

function TagsInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-xl min-h-[44px]">
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-primary/15 text-primary border border-primary/20 rounded-lg px-2.5 py-1 text-xs">
            {tag}
            <button onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-red-300 ml-1">×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Добавить → Enter"
          className="flex-1 min-w-[120px] bg-transparent text-white text-xs placeholder:text-slate-600 focus:outline-none"
        />
      </div>
    </div>
  );
}

function TagsInputLv({ label, tags, onChange, borderColor }: { label: string; tags: string[]; onChange: (tags: string[]) => void; borderColor?: string }) {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-emerald-500/60 uppercase tracking-wider">{label}</label>
      <div className={`flex flex-wrap gap-2 p-3 bg-white/5 border border-emerald-500/20 rounded-xl min-h-[44px]`}>
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-lg px-2.5 py-1 text-xs">
            {tag}
            <button onClick={() => onChange(tags.filter((t) => t !== tag))} className="hover:text-red-300 ml-1">×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Pievienot → Enter"
          className="flex-1 min-w-[120px] bg-transparent text-white text-xs placeholder:text-emerald-700 focus:outline-none"
        />
      </div>
    </div>
  );
}

export default function ServicesEditor() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [expandedTreatment, setExpandedTreatment] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newServiceId, setNewServiceId] = useState('');
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showLv, setShowLv] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    const snap = await getDocs(collection(db, 'services'));
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Service))
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru'));
    setServices(list);
    setLoading(false);
  }

  async function saveService() {
    if (!selectedService) return;
    setSaving(true);
    try {
      const { id, ...data } = selectedService;
      await setDoc(doc(db, 'services', id), data, { merge: true });
      setServices((prev) => prev.map((s) => (s.id === id ? selectedService : s)));
      setSaveMsg('Сохранено ✓');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: any) {
      setSaveMsg(`Ошибка: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function createService() {
    const id = newServiceId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const title = newServiceTitle.trim();
    if (!id || !title) return;
    setCreating(true);
    try {
      const newService: Omit<Service, 'id'> = {
        title,
        description: '',
        iconName: 'Sparkles',
        image: '',
        seoTitle: title,
        seoDescription: '',
        treatments: [],
      };
      await setDoc(doc(db, 'services', id), newService);
      setServices((prev) => [...prev, { id, ...newService }].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru')));
      setShowNewForm(false);
      setNewServiceId('');
      setNewServiceTitle('');
      setSelectedService({ id, ...newService });
    } catch (e: any) {
      alert(`Ошибка создания: ${e.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteService(id: string) {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'services', id));
      setServices((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirm(null);
    } catch (e: any) {
      alert(`Ошибка удаления: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  }

  function updateTreatment(index: number, field: keyof Treatment, value: any) {
    if (!selectedService) return;
    const updated = selectedService.treatments.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    setSelectedService({ ...selectedService, treatments: updated });
  }

  function addTreatment() {
    if (!selectedService) return;
    setSelectedService({
      ...selectedService,
      treatments: [
        ...selectedService.treatments,
        { name: 'Новая процедура', description: '', price: '', indications: [], results: [], detailedDescription: '', image: '' },
      ],
    });
    setExpandedTreatment(selectedService.treatments.length);
  }

  function removeTreatment(index: number) {
    if (!selectedService) return;
    setSelectedService({
      ...selectedService,
      treatments: selectedService.treatments.filter((_, i) => i !== index),
    });
  }

  if (selectedService) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedService(null)} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{selectedService.title}</h1>
              <p className="text-slate-400 text-sm mt-1">ID: {selectedService.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language toggle */}
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
            <button onClick={saveService} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 disabled:opacity-50">
              <Save size={14} />
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {/* Hero toggle */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              selectedService.showInHero
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-white/5 border-white/10 text-slate-500'
            }`}>
              <LayoutTemplate size={16} />
            </div>
            <div>
              <div className="text-white text-sm font-medium">Показывать в Hero-слайдере</div>
              <div className="text-slate-500 text-xs mt-0.5">Эта услуга будет отображаться на главной странице</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {selectedService.showInHero && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider">Порядок</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  className="w-16 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-primary/50"
                  value={selectedService.heroOrder ?? 1}
                  onChange={(e) => setSelectedService({ ...selectedService, heroOrder: Number(e.target.value) })}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedService({ ...selectedService, showInHero: !selectedService.showInHero })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                selectedService.showInHero ? 'bg-primary' : 'bg-white/15'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                selectedService.showInHero ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Service info */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-5">
          <h2 className="text-white font-semibold text-sm mb-5">Основная информация</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-4">
              <LangField label="Название" value={selectedService.title} valueLv={selectedService.title_lv} onChange={(v) => setSelectedService({ ...selectedService, title: v })} onChangeLv={(v) => setSelectedService({ ...selectedService, title_lv: v })} showLv={showLv} />
              <LangField label="Описание" value={selectedService.description} valueLv={selectedService.description_lv} onChange={(v) => setSelectedService({ ...selectedService, description: v })} onChangeLv={(v) => setSelectedService({ ...selectedService, description_lv: v })} showLv={showLv} multiline rows={3} />
              <LangField label="Полное описание" value={selectedService.fullDescription || ''} valueLv={selectedService.fullDescription_lv} onChange={(v) => setSelectedService({ ...selectedService, fullDescription: v })} onChangeLv={(v) => setSelectedService({ ...selectedService, fullDescription_lv: v })} showLv={showLv} multiline rows={4} />
              <LangField label="Краткое описание" value={selectedService.shortDescription || ''} valueLv={selectedService.shortDescription_lv} onChange={(v) => setSelectedService({ ...selectedService, shortDescription: v })} onChangeLv={(v) => setSelectedService({ ...selectedService, shortDescription_lv: v })} showLv={showLv} multiline rows={2} />
              <Field label="SEO Title">
                <input className={inputClass} value={selectedService.seoTitle} onChange={(e) => setSelectedService({ ...selectedService, seoTitle: e.target.value })} />
              </Field>
              <Field label="SEO Description">
                <textarea rows={2} className={textareaClass} value={selectedService.seoDescription} onChange={(e) => setSelectedService({ ...selectedService, seoDescription: e.target.value })} />
              </Field>
              <Field label="Иконка">
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((name) => {
                    const Ic = (LucideIcons as any)[name];
                    if (!Ic) return null;
                    const isActive = selectedService.iconName === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedService({ ...selectedService, iconName: name })}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                          isActive ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                        title={name}
                      >
                        <Ic size={18} />
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
            <Field label="Изображение категории">
              <ImageUploader
                currentUrl={selectedService.image}
                storagePath={`services/${selectedService.id}`}
                onUpload={(url) => setSelectedService({ ...selectedService, image: url })}
              />
            </Field>
          </div>
        </div>

        {/* Treatments */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Процедуры ({selectedService.treatments.length})</h2>
            <button onClick={addTreatment} className="flex items-center gap-2 text-primary text-xs hover:underline">
              <Plus size={13} /> Добавить процедуру
            </button>
          </div>

          {selectedService.treatments.map((t, i) => (
            <div key={i} className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedTreatment(expandedTreatment === i ? null : i)}
                className="flex items-center justify-between w-full px-5 py-4 hover:bg-white/2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 text-xs w-5 text-right">{i + 1}</span>
                  <span className="text-white text-sm font-medium">{t.name || 'Без названия'}</span>
                  <span className="text-primary text-xs">{t.price}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); removeTreatment(i); }} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  {expandedTreatment === i ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </div>
              </button>

              <AnimatePresence>
                {expandedTreatment === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 flex flex-col gap-4 border-t border-white/5 pt-5">
                      <div className="grid grid-cols-2 gap-4">
                        <LangField label="Название" value={t.name} valueLv={t.name_lv} onChange={(v) => updateTreatment(i, 'name', v)} onChangeLv={(v) => updateTreatment(i, 'name_lv', v)} showLv={showLv} />
                        <Field label="Цена">
                          <input className={inputClass} placeholder="120 €" value={t.price} onChange={(e) => updateTreatment(i, 'price', e.target.value)} />
                        </Field>
                      </div>
                      <LangField label="Краткое описание" value={t.description} valueLv={t.description_lv} onChange={(v) => updateTreatment(i, 'description', v)} onChangeLv={(v) => updateTreatment(i, 'description_lv', v)} showLv={showLv} multiline rows={2} />
                      <LangField label="Подробное описание" value={t.detailedDescription} valueLv={t.detailedDescription_lv} onChange={(v) => updateTreatment(i, 'detailedDescription', v)} onChangeLv={(v) => updateTreatment(i, 'detailedDescription_lv', v)} showLv={showLv} multiline rows={4} />
                      
                      <TagsInput label="Показания (RU)" tags={t.indications || []} onChange={(v) => updateTreatment(i, 'indications', v)} />
                      {showLv && <TagsInputLv label="Показания (LV)" tags={t.indications_lv || []} onChange={(v) => updateTreatment(i, 'indications_lv', v)} />}
                      
                      <TagsInput label="Результаты (RU)" tags={t.results || []} onChange={(v) => updateTreatment(i, 'results', v)} />
                      {showLv && <TagsInputLv label="Результаты (LV)" tags={t.results_lv || []} onChange={(v) => updateTreatment(i, 'results_lv', v)} />}

                      {/* Image Uploader */}
                      <div className="flex flex-col gap-3">
                        <Field label="Изображение">
                          <ImageUploader
                            currentUrl={t.image || ''}
                            storagePath={`services/${selectedService.id}/treatments/${i}`}
                            onUpload={(url) => updateTreatment(i, 'image', url)}
                          />
                        </Field>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Service list view
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Услуги</h1>
          <p className="text-slate-400 text-sm mt-1">Управляйте категориями и процедурами</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 transition-all"
        >
          <Plus size={16} />
          Новая услуга
        </button>
      </div>

      {/* New service form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
              <h3 className="text-white font-semibold text-sm mb-4">Создать новую услугу</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Field label="Название услуги">
                  <input
                    className={inputClass}
                    placeholder="Например: Лазерная терапия"
                    value={newServiceTitle}
                    onChange={(e) => {
                      setNewServiceTitle(e.target.value);
                      // Auto-generate ID from title (transliterate)
                      const auto = e.target.value
                        .toLowerCase()
                        .replace(/[а-яё]/g, (c) => {
                          const map: Record<string, string> = { а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'yo', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya' };
                          return map[c] || c;
                        })
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');
                      setNewServiceId(auto);
                    }}
                  />
                </Field>
                <Field label="ID (латиница, для URL)">
                  <input
                    className={inputClass}
                    placeholder="laser-therapy"
                    value={newServiceId}
                    onChange={(e) => setNewServiceId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={createService}
                  disabled={creating || !newServiceId.trim() || !newServiceTitle.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 disabled:opacity-40 transition-all"
                >
                  <Plus size={14} />
                  {creating ? 'Создаём...' : 'Создать'}
                </button>
                <button
                  onClick={() => { setShowNewForm(false); setNewServiceId(''); setNewServiceTitle(''); }}
                  className="px-4 py-2.5 rounded-xl text-slate-400 text-sm hover:text-white hover:bg-white/5 transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation dialog */}
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
                  <h3 className="text-white font-semibold text-sm">Удалить услугу?</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    «{services.find(s => s.id === deleteConfirm)?.title}»
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-5">
                Услуга и все её процедуры будут удалены безвозвратно. Это действие нельзя отменить.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeleteService(deleteConfirm)}
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
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Plus size={24} className="text-slate-600" />
          </div>
          <p className="text-slate-400 text-sm">Пока нет услуг</p>
          <p className="text-slate-600 text-xs mt-1">Нажмите «Новая услуга» чтобы создать первую</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center gap-2 group"
            >
              <button
                onClick={() => setSelectedService(service)}
                className="flex-1 flex items-center justify-between bg-white/3 border border-white/8 rounded-2xl p-5 hover:bg-white/5 hover:border-white/15 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  {service.image ? (
                    <img src={service.image} alt={service.title} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {(() => { const Ic = (LucideIcons as any)[service.iconName]; return Ic ? <Ic size={20} className="text-slate-500" /> : null; })()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{service.title}</span>
                      {service.showInHero && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                          <LayoutTemplate size={10} /> Hero
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">{service.treatments?.length || 0} процедур · ID: {service.id}</div>
                  </div>
                </div>
                <ChevronDown size={16} className="text-slate-500 -rotate-90 group-hover:text-white transition-colors" />
              </button>
              <button
                onClick={() => setDeleteConfirm(service.id)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                title="Удалить услугу"
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
