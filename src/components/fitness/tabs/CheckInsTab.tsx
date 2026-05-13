import { useState, useRef } from 'react';
import { Plus, Trash2, Upload, Link, ChevronDown, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCheckIns } from '@/hooks/fitness/useCheckIns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const T = {
  bg: '#0a0b0d', surface: '#111215', surface2: '#16181c', surface3: '#1c1f24',
  border: '#23262d', borderStrong: '#2e323a',
  text: '#f3f4f6', text2: '#b6b9c2', text3: '#7a7e88', text4: '#50545d',
  accent: '#c8ff3d', accentInk: '#0a0b0d', accentDim: 'rgba(200,255,61,0.12)', accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d', warning: '#ffb547', info: '#6ea8ff', good: '#51e2a8',
};

interface Props { clientId: string; }

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: T.text3 }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: T.accent }}>{value}/10</span>
      </div>
      <input
        type="range" min="1" max="10" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%', cursor: 'pointer', accentColor: T.accent, height: 2 }}
      />
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

  const [sliderBefore, setSliderBefore] = useState<string>('');
  const [sliderAfter, setSliderAfter] = useState<string>('');
  const [sliderPct, setSliderPct] = useState(50);
  const [activePhotoTab, setActivePhotoTab] = useState<'last' | 'vs' | 'all'>('last');

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

  // Averages
  const avg4 = checkins.slice(0, 4);
  const avgSleep = avg4.length ? avg4.reduce((s, c) => s + c.sleep_score, 0) / avg4.length : 0;
  const avgHunger = avg4.length ? avg4.reduce((s, c) => s + c.hunger_score, 0) / avg4.length : 0;
  const avgStress = avg4.length ? avg4.reduce((s, c) => s + c.stress_score, 0) / avg4.length : 0;
  const avgAdherence = avg4.length ? avg4.reduce((s, c) => s + c.adherence_score, 0) / avg4.length : 0;

  const trendBars = [
    { label: 'SUEÑO', value: avgSleep, color: T.info },
    { label: 'ESTRÉS', value: avgStress, color: T.warning },
    { label: 'HAMBRE', value: avgHunger, color: '#a78bff' },
    { label: 'ADHERENCIA PLAN', value: avgAdherence, color: T.good },
  ];

  const card: React.CSSProperties = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 14,
    padding: 20,
  };

  const inputStyle: React.CSSProperties = {
    background: T.surface2,
    border: `1px solid ${T.border}`,
    color: T.text,
    height: 32,
    borderRadius: 8,
    fontSize: 13,
    padding: '0 10px',
    width: '100%',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    color: T.text3,
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: 4,
    fontFamily: "'JetBrains Mono', monospace",
  };

  const accentBtn: React.CSSProperties = {
    background: T.accent,
    color: T.accentInk,
    border: 'none',
    borderRadius: 8,
    padding: '5px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: 'inherit',
  };

  const ghostBtn: React.CSSProperties = {
    background: 'transparent',
    color: T.text2,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: '5px 12px',
    fontSize: 12,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: 'inherit',
  };

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: T.text, margin: 0, lineHeight: 1.2 }}>
            Check-ins semanales
          </h2>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 4 }}>Fotos de progreso + cuestionario semanal</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={ghostBtn}>Plantilla</button>
          <button style={accentBtn} onClick={() => setCheckinDialog(true)}>
            <Plus size={13} /> Nuevo check-in
          </button>
        </div>
      </div>

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* LEFT: Photos card */}
        <div style={card}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>Fotos de progreso</p>
              <p style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>Ordenadas por fecha</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Subtabs */}
              <div style={{ display: 'inline-flex', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2 }}>
                {(['last', 'vs', 'all'] as const).map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActivePhotoTab(tab)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: activePhotoTab === tab ? T.surface3 : 'transparent',
                      color: activePhotoTab === tab ? T.text : T.text3,
                      transition: 'all 0.15s',
                    }}
                  >
                    {['Última', 'vs S1', 'Todas'][i]}
                  </button>
                ))}
              </div>
              <button style={accentBtn} onClick={() => setPhotoDialog(true)}>
                <Plus size={13} /> Agregar foto
              </button>
            </div>
          </div>

          {/* Folders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading ? (
              <p style={{ fontSize: 12, color: T.text3 }}>Cargando...</p>
            ) : folders.length === 0 ? (
              <p style={{ fontSize: 12, color: T.text3 }}>Sin fotos aún.</p>
            ) : folders.map(fd => {
              const folderPhotos = photos.filter(p => p.folder_date === fd);
              const isOpen = openFolder === fd;
              return (
                <div key={fd} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  <button
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: T.text2 }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.surface3)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setOpenFolder(isOpen ? null : fd)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isOpen
                        ? <ChevronDown size={13} style={{ color: T.text3 }} />
                        : <ChevronRight size={13} style={{ color: T.text3 }} />}
                      <span style={{ fontSize: 12, color: T.text2 }}>📁 {format(parseISO(fd), 'dd MMM yyyy')}</span>
                    </div>
                    <span style={{ fontSize: 10, color: T.text4, fontFamily: "'JetBrains Mono', monospace" }}>
                      {folderPhotos.length} foto{folderPhotos.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '0 12px 12px' }}>
                      {folderPhotos.map(ph => (
                        <div key={ph.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '3/4', background: T.surface3 }}
                          className="group">
                          <img src={ph.photo_url} alt={ph.label ?? 'check-in'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <div className="group-hover-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', opacity: 0, transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                            <button onClick={() => deletePhoto(ph.id, ph.storage_path)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.danger }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {ph.label && (
                            <span style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', background: 'rgba(10,11,13,0.75)', color: T.text2, padding: '2px 6px', borderRadius: 4 }}>
                              {ph.label}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Before/After slider */}
          {folders.length >= 2 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 10 }}>Antes vs Después</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select value={sliderBefore} onChange={e => setSliderBefore(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}>
                  <option value="">Antes...</option>
                  {folders.map(f => <option key={f} value={f}>{format(parseISO(f), 'dd MMM yyyy')}</option>)}
                </select>
                <select value={sliderAfter} onChange={e => setSliderAfter(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}>
                  <option value="">Después...</option>
                  {folders.map(f => <option key={f} value={f}>{format(parseISO(f), 'dd MMM yyyy')}</option>)}
                </select>
              </div>
              {beforePhoto && afterPhoto ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '3/4', userSelect: 'none' }}>
                  <img src={afterPhoto.photo_url} alt="después" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${sliderPct}%` }}>
                    <img src={beforePhoto.photo_url} alt="antes" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', minWidth: `${10000 / sliderPct}%` }} />
                  </div>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1, background: 'white', left: `${sliderPct}%`, transform: 'translateX(-50%)' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 28, height: 28, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#333', cursor: 'ew-resize' }}>⟺</div>
                  </div>
                  <input type="range" min="0" max="100" value={sliderPct}
                    onChange={e => setSliderPct(parseInt(e.target.value))}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize' }} />
                </div>
              ) : (
                <p style={{ fontSize: 11, color: T.text4, textAlign: 'center', padding: '16px 0' }}>Seleccioná dos fechas para comparar</p>
              )}

              {/* Separator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                <span style={{ fontSize: 10, color: T.text4, background: T.surface, padding: '0 4px' }}>o</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>
            </div>
          )}

          {/* Week pills */}
          {folders.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: folders.length >= 2 ? 0 : 16 }}>
              {folders.map((fd, i) => {
                const isLatest = i === 0;
                return (
                  <span key={fd} style={{
                    padding: '3px 8px',
                    borderRadius: 999,
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    background: isLatest ? T.accentDim : T.surface3,
                    color: isLatest ? T.accent : T.text2,
                    border: `1px solid ${isLatest ? T.accentLine : T.border}`,
                  }}>
                    {format(parseISO(fd), 'dd MMM yyyy')}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Trend card */}
        <div style={card}>
          {/* Card header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>Tendencia subjetiva</p>
              <p style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>Promedio últimos 4 check-ins</p>
            </div>
            <button style={accentBtn} onClick={() => setCheckinDialog(true)}>
              <Plus size={13} /> Nuevo
            </button>
          </div>

          {/* Trend bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {trendBars.map(bar => (
              <div key={bar.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', color: T.text3, letterSpacing: '0.05em' }}>{bar.label}</span>
                  <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: T.text2 }}>{bar.value.toFixed(1)} / 10</span>
                </div>
                <div style={{ height: 8, background: T.surface3, borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ height: '100%', borderRadius: 4, background: bar.color, width: `${(bar.value / 10) * 100}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Check-in history */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {loading ? (
              <p style={{ fontSize: 12, color: T.text3 }}>Cargando...</p>
            ) : checkins.length === 0 ? (
              <p style={{ fontSize: 12, color: T.text3 }}>Sin check-ins aún.</p>
            ) : checkins.slice(0, 6).map((c, idx) => (
              <div key={c.id} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                      Semana {format(parseISO(c.week_date), 'd MMM', { locale: es })}
                    </span>
                    {idx === 0 && (
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", background: T.accentDim, color: T.accent, border: `1px solid ${T.accentLine}`, borderRadius: 999, padding: '2px 8px' }}>
                        Actual
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: T.text3 }}>
                    {format(parseISO(c.week_date), "d MMM yyyy", { locale: es })}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Sueño', value: c.sleep_score },
                    { label: 'Hambre', value: c.hunger_score },
                    { label: 'Estrés', value: c.stress_score },
                    { label: 'Adherencia', value: c.adherence_score },
                  ].map(s => (
                    <div key={s.label} style={{ background: T.surface3, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', color: T.text3, letterSpacing: '0.04em' }}>{s.label}</span>
                      <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: T.text }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                {c.notes && (
                  <p style={{ fontSize: 12, color: T.text2, fontStyle: 'italic', lineHeight: 1.55, marginTop: 10 }}>"{c.notes}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Photo dialog */}
      <Dialog open={photoDialog} onOpenChange={setPhotoDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 360 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Agregar foto</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
            <div>
              <label style={labelStyle}>Fecha del check-in *</label>
              <input type="date" value={photoDate} onChange={e => setPhotoDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Etiqueta</label>
              <select value={photoLabel} onChange={e => setPhotoLabel(e.target.value)} style={inputStyle}>
                <option value="front">Frontal</option>
                <option value="back">Trasero</option>
                <option value="side">Lateral</option>
              </select>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!photoDate || uploading}
              style={{ ...ghostBtn, justifyContent: 'center', opacity: (!photoDate || uploading) ? 0.5 : 1 }}
            >
              <Upload size={14} /> Subir archivo
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />

            {/* Separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ fontSize: 10, color: T.text4, background: T.surface, padding: '0 4px' }}>o URL externa</span>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="https://..."
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleAddByUrl}
                disabled={!photoDate || !photoUrl}
                style={{ ...accentBtn, opacity: (!photoDate || !photoUrl) ? 0.5 : 1 }}
              >
                <Link size={13} /> Añadir
              </button>
            </div>
          </div>
          <DialogFooter style={{ marginTop: 8 }}>
            <button onClick={() => setPhotoDialog(false)} style={ghostBtn}>Cerrar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkin dialog */}
      <Dialog open={checkinDialog} onOpenChange={setCheckinDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 360 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Nuevo Check-in Semanal</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div>
              <label style={labelStyle}>Semana (lunes)</label>
              <input type="date" value={checkinForm.week_date}
                onChange={e => setCheckinForm(p => ({ ...p, week_date: e.target.value }))}
                style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ScoreSlider label="Sueño" value={checkinForm.sleep_score} onChange={v => setCheckinForm(p => ({ ...p, sleep_score: v }))} />
              <ScoreSlider label="Hambre" value={checkinForm.hunger_score} onChange={v => setCheckinForm(p => ({ ...p, hunger_score: v }))} />
              <ScoreSlider label="Estrés" value={checkinForm.stress_score} onChange={v => setCheckinForm(p => ({ ...p, stress_score: v }))} />
              <ScoreSlider label="Cumplimiento del plan" value={checkinForm.adherence_score} onChange={v => setCheckinForm(p => ({ ...p, adherence_score: v }))} />
            </div>
            <div>
              <label style={labelStyle}>Notas</label>
              <input value={checkinForm.notes} onChange={e => setCheckinForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Opcional..." style={inputStyle} />
            </div>
          </div>
          <DialogFooter style={{ marginTop: 8 }}>
            <button onClick={() => setCheckinDialog(false)} style={ghostBtn}>Cancelar</button>
            <button onClick={handleSaveCheckin} style={accentBtn}>Guardar</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
