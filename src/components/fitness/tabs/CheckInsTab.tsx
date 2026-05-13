import { useState, useRef } from 'react';
import { Plus, Trash2, Upload, Link, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCheckIns } from '@/hooks/fitness/useCheckIns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props { clientId: string; }

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = value >= 8 ? '#10b981' : value >= 5 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}/10</span>
      </div>
      <input type="range" min="1" max="10" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: color }} />
    </div>
  );
}

export function CheckInsTab({ clientId }: Props) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { photos, checkins, folders, loading, addPhoto, deletePhoto, saveCheckin } = useCheckIns(clientId);

  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [photoDialog, setPhotoDialog] = useState(false);
  const [photoDate, setPhotoDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoLabel, setPhotoLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [checkinDialog, setCheckinDialog] = useState(false);
  const [checkinForm, setCheckinForm] = useState({ week_date: '', sleep_score: 7, hunger_score: 6, stress_score: 4, adherence_score: 8, notes: '' });

  // Slider state
  const [sliderBefore, setSliderBefore] = useState<string>('');
  const [sliderAfter, setSliderAfter] = useState<string>('');
  const [sliderPct, setSliderPct] = useState(50);

  const getFirstPhoto = (folderDate: string) => photos.find(p => p.folder_date === folderDate);

  const handleUpload = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    const path = `${userId}/${clientId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('checkin-photos').upload(path, file);
    if (error) { toast.error('Error al subir la foto.'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('checkin-photos').getPublicUrl(path);
    await addPhoto(photoDate, publicUrl, path, photoLabel || 'front');
    setPhotoDialog(false);
    setUploading(false);
  };

  const handleAddByUrl = async () => {
    if (!photoDate || !photoUrl) return;
    await addPhoto(photoDate, photoUrl, undefined, photoLabel || 'front');
    setPhotoDialog(false);
    setPhotoUrl('');
  };

  const handleSaveCheckin = async () => {
    await saveCheckin({
      week_date: checkinForm.week_date || format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      sleep_score: checkinForm.sleep_score,
      hunger_score: checkinForm.hunger_score,
      stress_score: checkinForm.stress_score,
      adherence_score: checkinForm.adherence_score,
      notes: checkinForm.notes || null,
    });
    setCheckinDialog(false);
  };

  const beforePhoto = sliderBefore ? getFirstPhoto(sliderBefore) : null;
  const afterPhoto = sliderAfter ? getFirstPhoto(sliderAfter) : null;

  return (
    <div className="p-5 grid grid-cols-2 gap-6">
      {/* LEFT: PHOTOS */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">Fotos de Check-in</p>
          <Button size="sm" onClick={() => setPhotoDialog(true)}
            className="h-7 text-xs gap-1 bg-pink-600 hover:bg-pink-700 text-white">
            <Plus className="w-3 h-3" /> Agregar foto
          </Button>
        </div>

        {/* Folders */}
        <div className="flex flex-col gap-1.5">
          {loading ? <p className="text-xs text-slate-500">Cargando...</p>
            : folders.length === 0 ? <p className="text-xs text-slate-500">Sin fotos aún.</p>
            : folders.map(fd => {
              const folderPhotos = photos.filter(p => p.folder_date === fd);
              const isOpen = openFolder === fd;
              return (
                <div key={fd} className="rounded-lg bg-slate-800 overflow-hidden">
                  <button className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700 transition-colors"
                    onClick={() => setOpenFolder(isOpen ? null : fd)}>
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <span className="text-xs font-medium text-slate-200">📁 {format(parseISO(fd), 'dd MMM yyyy')}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{folderPhotos.length} foto{folderPhotos.length !== 1 ? 's' : ''}</span>
                  </button>
                  {isOpen && (
                    <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
                      {folderPhotos.map(ph => (
                        <div key={ph.id} className="relative group rounded-md overflow-hidden bg-slate-700" style={{ aspectRatio: '3/4' }}>
                          <img src={ph.photo_url} alt={ph.label ?? 'check-in'} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => deletePhoto(ph.id, ph.storage_path)} className="text-white hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {ph.label && <span className="absolute bottom-1 left-1 text-[9px] bg-black/70 text-white px-1 rounded">{ph.label}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Slider Antes/Después */}
        {folders.length >= 2 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-slate-300 mb-2">Antes vs Después</p>
            <div className="flex gap-2 mb-2">
              <select value={sliderBefore} onChange={e => setSliderBefore(e.target.value)}
                className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300">
                <option value="">Antes...</option>
                {folders.map(f => <option key={f} value={f}>{format(parseISO(f), 'dd MMM yyyy')}</option>)}
              </select>
              <select value={sliderAfter} onChange={e => setSliderAfter(e.target.value)}
                className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300">
                <option value="">Después...</option>
                {folders.map(f => <option key={f} value={f}>{format(parseISO(f), 'dd MMM yyyy')}</option>)}
              </select>
            </div>
            {beforePhoto && afterPhoto ? (
              <div className="relative rounded-xl overflow-hidden bg-slate-800" style={{ aspectRatio: '3/4', userSelect: 'none' }}>
                <img src={afterPhoto.photo_url} alt="después" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPct}%` }}>
                  <img src={beforePhoto.photo_url} alt="antes" className="absolute inset-0 w-full h-full object-cover" style={{ minWidth: `${10000 / sliderPct}%` }} />
                </div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${sliderPct}%`, transform: 'translateX(-50%)' }}>
                  <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white flex items-center justify-center text-slate-800 text-xs font-bold cursor-ew-resize shadow-xl">⟺</div>
                </div>
                <input type="range" min="0" max="100" value={sliderPct}
                  onChange={e => setSliderPct(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" />
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 text-center py-4">Seleccioná dos fechas para comparar</p>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: WEEKLY CHECK-IN */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">Check-in Semanal</p>
          <Button size="sm" onClick={() => setCheckinDialog(true)}
            className="h-7 text-xs gap-1 bg-pink-600 hover:bg-pink-700 text-white">
            <Plus className="w-3 h-3" /> Nuevo
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {loading ? <p className="text-xs text-slate-500">Cargando...</p>
            : checkins.length === 0 ? <p className="text-xs text-slate-500">Sin check-ins aún.</p>
            : checkins.slice(0, 6).map(c => {
              const avg = ((c.sleep_score + c.adherence_score - c.stress_score + 10) / 3).toFixed(1);
              return (
                <div key={c.id} className="rounded-xl bg-slate-800 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-200">
                      Semana {format(parseISO(c.week_date), "d MMM", { locale: es })}
                    </p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${parseFloat(avg) >= 7 ? 'bg-emerald-500/20 text-emerald-400' : parseFloat(avg) >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      ~{avg}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {[
                      { label: '😴 Sueño', value: c.sleep_score },
                      { label: '🍽️ Hambre', value: c.hunger_score },
                      { label: '😤 Estrés', value: c.stress_score },
                      { label: '✅ Cumpl.', value: c.adherence_score },
                    ].map(s => (
                      <div key={s.label}>
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[10px] text-slate-500">{s.label}</span>
                          <span className="text-[10px] text-slate-300 font-medium">{s.value}</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full">
                          <div className="h-1 rounded-full" style={{ width: `${s.value * 10}%`, background: s.value >= 7 ? '#10b981' : s.value >= 5 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {c.notes && <p className="text-[10px] text-slate-500 mt-2 italic">"{c.notes}"</p>}
                </div>
              );
            })}
        </div>
      </div>

      {/* Photo dialog */}
      <Dialog open={photoDialog} onOpenChange={setPhotoDialog}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Agregar foto</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Fecha del check-in *</Label>
              <Input type="date" value={photoDate} onChange={e => setPhotoDate(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Etiqueta</Label>
              <select value={photoLabel} onChange={e => setPhotoLabel(e.target.value)}
                className="w-full text-sm bg-slate-800 border border-slate-600 rounded px-3 h-8 text-white">
                <option value="front">Frontal</option>
                <option value="back">Trasero</option>
                <option value="side">Lateral</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!photoDate || uploading}
                className="flex-1 text-xs h-8 border-slate-600 text-slate-300 gap-1">
                <Upload className="w-3.5 h-3.5" /> Subir archivo
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700" /></div>
              <div className="relative flex justify-center"><span className="text-[10px] text-slate-500 bg-slate-900 px-2">o URL externa</span></div>
            </div>
            <div className="flex gap-2">
              <Input placeholder="https://..." value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
                className="flex-1 bg-slate-800 border-slate-600 text-white h-8 text-sm" />
              <Button onClick={handleAddByUrl} disabled={!photoDate || !photoUrl}
                className="bg-pink-600 hover:bg-pink-700 text-white h-8 text-xs gap-1">
                <Link className="w-3 h-3" /> Añadir
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoDialog(false)} className="border-slate-600 text-slate-300">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkin dialog */}
      <Dialog open={checkinDialog} onOpenChange={setCheckinDialog}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="text-white">Nuevo Check-in Semanal</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Semana (lunes)</Label>
              <Input type="date" value={checkinForm.week_date}
                onChange={e => setCheckinForm(p => ({ ...p, week_date: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
            <div className="space-y-3">
              <ScoreSlider label="😴 Sueño" value={checkinForm.sleep_score} onChange={v => setCheckinForm(p => ({ ...p, sleep_score: v }))} />
              <ScoreSlider label="🍽️ Hambre" value={checkinForm.hunger_score} onChange={v => setCheckinForm(p => ({ ...p, hunger_score: v }))} />
              <ScoreSlider label="😤 Estrés" value={checkinForm.stress_score} onChange={v => setCheckinForm(p => ({ ...p, stress_score: v }))} />
              <ScoreSlider label="✅ Cumplimiento del plan" value={checkinForm.adherence_score} onChange={v => setCheckinForm(p => ({ ...p, adherence_score: v }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Notas</Label>
              <Input value={checkinForm.notes} onChange={e => setCheckinForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Opcional..." className="bg-slate-800 border-slate-600 text-white h-8 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckinDialog(false)} className="border-slate-600 text-slate-300">Cancelar</Button>
            <Button onClick={handleSaveCheckin} className="bg-pink-600 hover:bg-pink-700 text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
