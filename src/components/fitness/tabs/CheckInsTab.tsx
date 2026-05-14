import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCheckIns } from '@/hooks/fitness/useCheckIns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import type { CheckInPhoto, WeeklyCheckin } from '@/types/fitness';

const T = {
  bg: '#0a0b0d', surface: '#111215', surface2: '#16181c', surface3: '#1c1f24',
  border: '#23262d', borderStrong: '#2e323a',
  text: '#f3f4f6', text2: '#b6b9c2', text3: '#7a7e88', text4: '#50545d',
  accent: '#c8ff3d', accentInk: '#0a0b0d', accentDim: 'rgba(200,255,61,0.12)', accentLine: 'rgba(200,255,61,0.35)',
  danger: '#ff5d5d', warning: '#ffb547', info: '#6ea8ff', good: '#51e2a8',
};

interface Props { clientId: string; }

function driveToImgUrl(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  const ucMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return `https://drive.google.com/uc?export=view&id=${ucMatch[1]}`;
  return url;
}
function isDriveUrl(url: string) { return url.includes('drive.google.com') || url.includes('docs.google.com'); }
function toDisplayUrl(url: string) { return isDriveUrl(url) ? driveToImgUrl(url) : url; }

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photo, onClose, onSaveNotes }: { photo: CheckInPhoto; onClose: () => void; onSaveNotes: (n: string) => void }) {
  const [notes, setNotes] = useState(photo.notes ?? '');
  const [saved, setSaved] = useState(false);
  const handleSave = () => { onSaveNotes(notes); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ display: 'flex', gap: 20, maxWidth: '90vw', maxHeight: '90vh', alignItems: 'flex-start' }} onClick={e => e.stopPropagation()}>
        <div style={{ flex: '0 0 auto', maxHeight: '85vh', borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.borderStrong}` }}>
          <img src={toDisplayUrl(photo.photo_url)} alt={photo.label ?? 'check-in'} style={{ display: 'block', maxHeight: '85vh', maxWidth: '65vw', objectFit: 'contain' }} />
        </div>
        <div style={{ width: 260, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, margin: '0 0 4px' }}>Fecha</p>
            <p style={{ fontSize: 13, color: T.text, margin: 0 }}>{format(parseISO(photo.folder_date), "d 'de' MMMM yyyy", { locale: es })}</p>
          </div>
          {photo.label && <div><p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, margin: '0 0 4px' }}>Ángulo</p><p style={{ fontSize: 13, color: T.text, margin: 0, textTransform: 'capitalize' }}>{photo.label}</p></div>}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, margin: '0 0 6px' }}>Notas</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Agregar nota..." rows={5} style={{ width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, padding: '8px 10px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleSave} style={{ background: saved ? T.good : T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }}>{saved ? 'Guardado ✓' : 'Guardar nota'}</button>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text3, borderRadius: 8, padding: '7px 0', fontSize: 13, cursor: 'pointer', width: '100%' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Photo thumb ───────────────────────────────────────────────────────────────
function PhotoThumb({ photo, onClick, onDelete }: { photo: CheckInPhoto; onClick: () => void; onDelete: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '3/4', background: T.surface3, cursor: 'pointer' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}>
      <img src={toDisplayUrl(photo.photo_url)} alt={photo.label ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)', opacity: hover ? 1 : 0, transition: 'opacity 0.15s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {photo.label && <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>{photo.label}</span>}
          <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: 'rgba(255,93,93,0.2)', border: '1px solid rgba(255,93,93,0.4)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: T.danger, display: 'flex', alignItems: 'center' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
          </button>
        </div>
      </div>
      {photo.label && !hover && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 6px 5px', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}><span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.05em' }}>{photo.label}</span></div>}
      {photo.notes && !hover && <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: T.accent }} />}
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max, color, unit }: { label: string; value: number | null; max: number; color: string; unit?: string }) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: T.text3 }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: T.text2 }}>{value != null ? `${value}${unit ?? (!unit ? ` / ${max}` : '')}` : '—'}</span>
      </div>
      <div style={{ height: 8, background: T.surface3, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

// ── Folder card ───────────────────────────────────────────────────────────────
function FolderCard({ folderDate, photos, checkin, notes, onAddPhoto, onUpdateNotes, onPhotoClick, onDeletePhoto, onDeleteFolder, onEditCheckin, onRegisterCheckin }: {
  folderDate: string;
  photos: CheckInPhoto[];
  checkin: WeeklyCheckin | null;
  notes: string | null;
  onAddPhoto: () => void;
  onUpdateNotes: (n: string) => void;
  onPhotoClick: (p: CheckInPhoto) => void;
  onDeletePhoto: (p: CheckInPhoto) => void;
  onDeleteFolder: () => void;
  onEditCheckin: () => void;
  onRegisterCheckin: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [folderNotes, setFolderNotes] = useState(notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const displayDate = format(parseISO(folderDate), "d 'de' MMMM yyyy", { locale: es });

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: collapsed ? 'none' : `1px solid ${T.border}`, background: T.surface2 }}>
        <button onClick={() => setCollapsed(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.text3, display: 'flex', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={T.accent} stroke="none" style={{ flexShrink: 0 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{displayDate}</span>
          <span style={{ fontSize: 12, color: T.text4, marginLeft: 10, fontFamily: 'JetBrains Mono, monospace' }}>{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
          {checkin && <span style={{ fontSize: 10, marginLeft: 8, background: T.accentDim, border: `1px solid ${T.accentLine}`, color: T.accent, borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>Check-in</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onAddPhoto} style={{ background: T.accentDim, border: `1px solid ${T.accentLine}`, color: T.accent, borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Foto</button>
          <button onClick={checkin ? onEditCheckin : onRegisterCheckin} style={{ background: T.surface3, border: `1px solid ${T.border}`, color: T.text3, borderRadius: 8, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>{checkin ? 'Check-in ✎' : '+ Check-in'}</button>
          {confirmDelete ? (
            <>
              <button onClick={() => { onDeleteFolder(); setConfirmDelete(false); }} style={{ background: 'rgba(255,93,93,0.15)', border: '1px solid rgba(255,93,93,0.4)', color: T.danger, borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Confirmar</button>
              <button onClick={() => setConfirmDelete(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text3, borderRadius: 8, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text4, borderRadius: 8, padding: '5px 8px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: checkin ? '1fr 220px' : '1fr', gap: 16 }}>
            {/* Left: photos + notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Folder notes */}
              {editingNotes ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea value={folderNotes} onChange={e => setFolderNotes(e.target.value)} placeholder="Notas de esta sesión..." rows={2} autoFocus style={{ width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, padding: '8px 10px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { onUpdateNotes(folderNotes); setEditingNotes(false); }} style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 7, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
                    <button onClick={() => setEditingNotes(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text3, borderRadius: 7, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingNotes(true)} style={{ background: 'transparent', border: `1px dashed ${T.border}`, borderRadius: 8, padding: '7px 12px', width: '100%', textAlign: 'left', cursor: 'pointer', color: folderNotes ? T.text2 : T.text4, fontSize: 12, fontFamily: 'inherit' }}>
                  {folderNotes || '+ Agregar notas a esta sesión...'}
                </button>
              )}
              {/* Photos grid */}
              {photos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: T.text4, fontSize: 13 }}>Sin fotos. Usá "+ Foto" para agregar.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                  {photos.map(photo => (
                    <PhotoThumb key={photo.id} photo={photo} onClick={() => onPhotoClick(photo)} onDelete={() => onDeletePhoto(photo)} />
                  ))}
                </div>
              )}
            </div>

            {/* Right: check-in scores */}
            {checkin && (
              <div style={{ background: T.surface2, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'start' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>
                  {checkin.week_label ?? 'Check-in'}
                </div>
                <ScoreBar label="Energía" value={checkin.energy_score} max={10} color={T.accent} />
                <ScoreBar label="Sueño" value={checkin.sleep_score} max={10} color={T.info} unit="h" />
                <ScoreBar label="Estrés" value={checkin.stress_score} max={10} color={T.warning} />
                <ScoreBar label="Hambre" value={checkin.hunger_score} max={10} color='#a78bff' />
                <ScoreBar label="Adherencia" value={checkin.adherence_score} max={10} color={T.good} />
                {checkin.notes && (
                  <p style={{ fontSize: 11, color: T.text2, lineHeight: 1.55, margin: '4px 0 0', fontStyle: 'italic', borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>"{checkin.notes}"</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main tab ───────────────────────────────────────────────────────────────────
export function CheckInsTab({ clientId }: Props) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { photos, folders, checkins, loading, getFolderMeta, createFolder, updateFolderNotes, deleteFolder, addPhoto, updatePhotoNotes, deletePhoto, saveCheckin } = useCheckIns(clientId);

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const [folderDialog, setFolderDialog] = useState(false);
  const [newFolderDate, setNewFolderDate] = useState('');

  const [photoDialog, setPhotoDialog] = useState<{ folderDate: string } | null>(null);
  const [photoTab, setPhotoTab] = useState<'file' | 'drive'>('file');
  const [driveUrl, setDriveUrl] = useState('');
  const [photoLabel, setPhotoLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [lightboxPhoto, setLightboxPhoto] = useState<CheckInPhoto | null>(null);

  const [ciDialog, setCiDialog] = useState(false);
  const [editingCi, setEditingCi] = useState<WeeklyCheckin | null>(null);
  const [ciDate, setCiDate] = useState('');
  const [ciLabel, setCiLabel] = useState('');
  const [ciEnergy, setCiEnergy] = useState('');
  const [ciSleep, setCiSleep] = useState('');
  const [ciStress, setCiStress] = useState('');
  const [ciHunger, setCiHunger] = useState('');
  const [ciAdherence, setCiAdherence] = useState('');
  const [ciNotes, setCiNotes] = useState('');

  const activeFolder = selectedFolder ?? folders[0] ?? null;
  const activeFolderPhotos = activeFolder ? photos.filter(p => p.folder_date === activeFolder) : [];
  const activeCi = activeFolder ? checkins.find(c => c.week_date === activeFolder) ?? null : null;

  const handleCreateFolder = async () => {
    if (!newFolderDate) return;
    await createFolder(newFolderDate);
    setSelectedFolder(newFolderDate);
    setFolderDialog(false);
    setNewFolderDate('');
  };

  const handleUpload = async (file: File) => {
    if (!userId || !photoDialog) return;
    setUploading(true);
    const path = `${userId}/${clientId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('checkin-photos').upload(path, file);
    if (error) { toast.error('Error al subir la foto.'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('checkin-photos').getPublicUrl(path);
    await addPhoto(photoDialog.folderDate, publicUrl, path, photoLabel || undefined);
    setPhotoDialog(null); setPhotoLabel(''); setUploading(false);
  };

  const handleAddDriveUrl = async () => {
    if (!driveUrl.trim() || !photoDialog) return;
    await addPhoto(photoDialog.folderDate, driveUrl.trim(), undefined, photoLabel || undefined);
    setPhotoDialog(null); setDriveUrl(''); setPhotoLabel('');
  };

  const handleSavePhotoNotes = useCallback(async (photoId: string, notes: string) => {
    await updatePhotoNotes(photoId, notes);
    setLightboxPhoto(prev => prev?.id === photoId ? { ...prev, notes: notes || null } : prev);
  }, [updatePhotoNotes]);

  const openCiDialog = (forDate: string, existing: WeeklyCheckin | null) => {
    setEditingCi(existing);
    setCiDate(forDate);
    const folderIdx = folders.indexOf(forDate);
    setCiLabel(existing?.week_label ?? `Semana ${folders.length - folderIdx}`);
    setCiEnergy(existing?.energy_score != null ? String(existing.energy_score) : '');
    setCiSleep(existing?.sleep_score != null ? String(existing.sleep_score) : '');
    setCiStress(existing?.stress_score != null ? String(existing.stress_score) : '');
    setCiHunger(existing?.hunger_score != null ? String(existing.hunger_score) : '');
    setCiAdherence(existing?.adherence_score != null ? String(existing.adherence_score) : '');
    setCiNotes(existing?.notes ?? '');
    setCiDialog(true);
  };

  const handleSaveCi = async () => {
    if (!ciDate) return;
    await saveCheckin({
      week_date: ciDate,
      week_label: ciLabel || null,
      energy_score: ciEnergy !== '' ? parseFloat(ciEnergy) : null,
      sleep_score: ciSleep !== '' ? parseFloat(ciSleep) : null,
      stress_score: ciStress !== '' ? parseFloat(ciStress) : null,
      hunger_score: ciHunger !== '' ? parseFloat(ciHunger) : null,
      adherence_score: ciAdherence !== '' ? parseFloat(ciAdherence) : null,
      notes: ciNotes || null,
    });
    setCiDialog(false);
  };

  const inputStyle: React.CSSProperties = {
    background: T.surface2, border: `1px solid ${T.border}`,
    color: T.text, height: 36, borderRadius: 8, fontSize: 13,
    padding: '0 12px', width: '100%', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    color: T.text3, display: 'block', marginBottom: 5,
  };
  const cardStyle: React.CSSProperties = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px' };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: T.text3, fontSize: 13 }}>Cargando...</div>;

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 28, fontWeight: 400, color: T.text, margin: 0, lineHeight: 1.2 }}>Check-ins semanales</h2>
          <p style={{ fontSize: 13, color: T.text3, margin: '4px 0 0' }}>Fotos de progreso + cuestionario semanal</p>
        </div>
        <button
          onClick={() => { setNewFolderDate(''); setFolderDialog(true); }}
          style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nueva carpeta
        </button>
      </div>

      {folders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={T.accent} stroke="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>Sin check-ins</p>
            <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>Creá una carpeta para empezar a registrar el progreso.</p>
          </div>
          <button onClick={() => { setNewFolderDate(''); setFolderDialog(true); }} style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Nueva carpeta
          </button>
        </div>
      ) : (
        <>
          {/* ── Top preview cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

            {/* Fotos de progreso */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Fotos de progreso</div>
                  <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>
                    {activeFolder ? format(parseISO(activeFolder), "d MMM yyyy", { locale: es }) : '—'} · {activeFolderPhotos.length} foto{activeFolderPhotos.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {/* Folder selector */}
                <select
                  value={activeFolder ?? ''}
                  onChange={e => setSelectedFolder(e.target.value)}
                  style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '4px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                >
                  {folders.map((fd, i) => (
                    <option key={fd} value={fd}>
                      S{folders.length - i} · {format(parseISO(fd), "d MMM", { locale: es })}
                    </option>
                  ))}
                </select>
              </div>

              {activeFolderPhotos.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                  {activeFolderPhotos.map(photo => (
                    <PhotoThumb key={photo.id} photo={photo} onClick={() => setLightboxPhoto(photo)} onDelete={() => deletePhoto(photo.id, photo.storage_path)} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0', color: T.text4, fontSize: 13 }}>Sin fotos en esta sesión.</div>
              )}
            </div>

            {/* Tendencia subjetiva */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Tendencia subjetiva</div>
                  <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>
                    {activeCi ? (activeCi.week_label ?? activeFolder) : 'Sin check-in para esta sesión'}
                  </div>
                </div>
                {/* Same selector mirrored */}
                <select
                  value={activeFolder ?? ''}
                  onChange={e => setSelectedFolder(e.target.value)}
                  style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '4px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
                >
                  {folders.map((fd, i) => (
                    <option key={fd} value={fd}>
                      S{folders.length - i} · {format(parseISO(fd), "d MMM", { locale: es })}
                    </option>
                  ))}
                </select>
              </div>

              {!activeCi ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: T.text4, fontSize: 13 }}>
                  Sin datos para esta sesión.
                  <div style={{ marginTop: 12 }}>
                    <button onClick={() => openCiDialog(activeFolder!, null)} style={{ background: T.accentDim, border: `1px solid ${T.accentLine}`, color: T.accent, borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Registrar check-in</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ScoreBar label="Energía" value={activeCi.energy_score} max={10} color={T.accent} />
                  <ScoreBar label="Sueño" value={activeCi.sleep_score} max={10} color={T.info} unit="h" />
                  <ScoreBar label="Estrés" value={activeCi.stress_score} max={10} color={T.warning} />
                  <ScoreBar label="Hambre" value={activeCi.hunger_score} max={10} color='#a78bff' />
                  <ScoreBar label="Adherencia" value={activeCi.adherence_score} max={10} color={T.good} />
                  {activeCi.notes && <p style={{ fontSize: 11, color: T.text2, lineHeight: 1.55, margin: '4px 0 0', fontStyle: 'italic', borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>"{activeCi.notes}"</p>}
                </div>
              )}
            </div>
          </div>

          {/* ── Folder list ── */}
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text4, margin: '0 0 10px' }}>
            Carpetas · {folders.length}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {folders.map((folderDate, i) => {
              const folderPhotos = photos.filter(p => p.folder_date === folderDate);
              const meta = getFolderMeta(folderDate);
              const ci = checkins.find(c => c.week_date === folderDate) ?? null;
              return (
                <FolderCard
                  key={folderDate}
                  folderDate={folderDate}
                  photos={folderPhotos}
                  checkin={ci}
                  notes={meta?.notes ?? null}
                  onAddPhoto={() => { setPhotoLabel(''); setDriveUrl(''); setPhotoTab('file'); setPhotoDialog({ folderDate }); setSelectedFolder(folderDate); }}
                  onUpdateNotes={n => updateFolderNotes(folderDate, n)}
                  onPhotoClick={setLightboxPhoto}
                  onDeletePhoto={p => deletePhoto(p.id, p.storage_path)}
                  onDeleteFolder={() => { deleteFolder(folderDate); if (activeFolder === folderDate) setSelectedFolder(null); }}
                  onEditCheckin={() => openCiDialog(folderDate, ci)}
                  onRegisterCheckin={() => openCiDialog(folderDate, null)}
                />
              );
            })}
          </div>
        </>
      )}

      {/* New folder dialog */}
      <Dialog open={folderDialog} onOpenChange={setFolderDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 340 }}>
          <DialogHeader><DialogTitle style={{ color: T.text }}>Nueva carpeta</DialogTitle></DialogHeader>
          <div style={{ padding: '8px 0' }}>
            <label style={labelStyle}>Fecha del check-in</label>
            <input type="date" value={newFolderDate} onChange={e => setNewFolderDate(e.target.value)} style={inputStyle} autoFocus />
          </div>
          <DialogFooter>
            <button onClick={() => setFolderDialog(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleCreateFolder} disabled={!newFolderDate} style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !newFolderDate ? 0.5 : 1 }}>Crear</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add photo dialog */}
      <Dialog open={!!photoDialog} onOpenChange={o => { if (!o) setPhotoDialog(null); }}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 380 }}>
          <DialogHeader><DialogTitle style={{ color: T.text }}>Agregar foto</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <div>
              <label style={labelStyle}>Ángulo / etiqueta</label>
              <select value={photoLabel} onChange={e => setPhotoLabel(e.target.value)} style={{ ...inputStyle, height: 36 }}>
                <option value="">Sin etiqueta</option>
                <option value="frontal">Frontal</option>
                <option value="trasero">Trasero</option>
                <option value="lateral izq">Lateral izquierdo</option>
                <option value="lateral der">Lateral derecho</option>
              </select>
            </div>
            <div>
              <div style={{ display: 'inline-flex', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2, marginBottom: 12 }}>
                {(['file', 'drive'] as const).map((tab, i) => (
                  <button key={tab} onClick={() => setPhotoTab(tab)} style={{ padding: '5px 14px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', background: photoTab === tab ? T.surface3 : 'transparent', color: photoTab === tab ? T.text : T.text3, fontFamily: 'inherit' }}>
                    {['Subir archivo', 'Link de Drive'][i]}
                  </button>
                ))}
              </div>
              {photoTab === 'file' ? (
                <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: '100%', padding: '20px', border: `2px dashed ${T.border}`, borderRadius: 10, background: 'transparent', cursor: 'pointer', color: T.text3, fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: uploading ? 0.5 : 1, fontFamily: 'inherit' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                  {uploading ? 'Subiendo...' : 'Hacer clic o arrastrar imagen'}
                  <span style={{ fontSize: 11, color: T.text4 }}>JPG, PNG, WEBP</span>
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input placeholder="https://drive.google.com/file/d/..." value={driveUrl} onChange={e => setDriveUrl(e.target.value)} style={inputStyle} autoFocus={photoTab === 'drive'} />
                  <p style={{ fontSize: 11, color: T.text4, margin: 0 }}>El archivo debe ser público o compartido con acceso de visualización.</p>
                </div>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
          <DialogFooter>
            <button onClick={() => setPhotoDialog(null)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            {photoTab === 'drive' && (
              <button onClick={handleAddDriveUrl} disabled={!driveUrl.trim()} style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !driveUrl.trim() ? 0.5 : 1 }}>Agregar</button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in dialog */}
      <Dialog open={ciDialog} onOpenChange={o => { if (!o) setCiDialog(false); }}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 420 }}>
          <DialogHeader><DialogTitle style={{ color: T.text }}>{editingCi ? 'Editar check-in' : 'Nuevo check-in'}</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={labelStyle}>Etiqueta</label><input value={ciLabel} onChange={e => setCiLabel(e.target.value)} placeholder="Semana 1" style={inputStyle} /></div>
              <div><label style={labelStyle}>Fecha</label><input type="date" value={ciDate} onChange={e => setCiDate(e.target.value)} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Energía (0–10)', val: ciEnergy, set: setCiEnergy },
                { label: 'Sueño (horas)', val: ciSleep, set: setCiSleep },
                { label: 'Estrés (0–10)', val: ciStress, set: setCiStress },
                { label: 'Hambre (0–10)', val: ciHunger, set: setCiHunger },
                { label: 'Adherencia (0–10)', val: ciAdherence, set: setCiAdherence },
              ].map(({ label, val, set }) => (
                <div key={label}><label style={labelStyle}>{label}</label><input type="number" min="0" max="24" step="0.5" value={val} onChange={e => set(e.target.value)} style={inputStyle} placeholder="—" /></div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Notas</label>
              <textarea value={ciNotes} onChange={e => setCiNotes(e.target.value)} placeholder="Cómo fue la semana..." rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'none' as const, lineHeight: 1.5 }} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCiDialog(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSaveCi} disabled={!ciDate} style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !ciDate ? 0.5 : 1 }}>{editingCi ? 'Guardar cambios' : 'Registrar'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxPhoto && (
        <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} onSaveNotes={n => handleSavePhotoNotes(lightboxPhoto.id, n)} />
      )}
    </div>
  );
}
