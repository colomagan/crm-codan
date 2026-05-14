import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCheckIns } from '@/hooks/fitness/useCheckIns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import type { CheckInPhoto } from '@/types/fitness';

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

function isDriveUrl(url: string) {
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

function toDisplayUrl(url: string): string {
  return isDriveUrl(url) ? driveToImgUrl(url) : url;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photo, onClose, onSaveNotes }: {
  photo: CheckInPhoto;
  onClose: () => void;
  onSaveNotes: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(photo.notes ?? '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveNotes(notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{ display: 'flex', gap: 20, maxWidth: '90vw', maxHeight: '90vh', alignItems: 'flex-start' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div style={{ flex: '0 0 auto', maxHeight: '85vh', borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.borderStrong}` }}>
          <img
            src={toDisplayUrl(photo.photo_url)}
            alt={photo.label ?? 'check-in'}
            style={{ display: 'block', maxHeight: '85vh', maxWidth: '65vw', objectFit: 'contain' }}
          />
        </div>

        {/* Side panel */}
        <div style={{
          width: 260, background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, margin: '0 0 4px' }}>Fecha</p>
            <p style={{ fontSize: 13, color: T.text, margin: 0 }}>
              {format(parseISO(photo.folder_date), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          {photo.label && (
            <div>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, margin: '0 0 4px' }}>Ángulo</p>
              <p style={{ fontSize: 13, color: T.text, margin: 0, textTransform: 'capitalize' }}>{photo.label}</p>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.text3, margin: '0 0 6px' }}>Notas</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Agregar nota sobre esta imagen..."
              rows={5}
              style={{
                width: '100%', background: T.surface2, border: `1px solid ${T.border}`,
                borderRadius: 8, color: T.text, fontSize: 12, padding: '8px 10px',
                resize: 'none', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleSave}
            style={{
              background: saved ? T.good : T.accent, color: T.accentInk,
              border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', width: '100%', transition: 'background 0.2s',
            }}
          >
            {saved ? 'Guardado ✓' : 'Guardar nota'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: `1px solid ${T.border}`, color: T.text3,
              borderRadius: 8, padding: '7px 0', fontSize: 13, cursor: 'pointer', width: '100%',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Photo card ─────────────────────────────────────────────────────────────────
function PhotoCard({ photo, onClick, onDelete }: {
  photo: CheckInPhoto;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '3/4', background: T.surface3, cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <img
        src={toDisplayUrl(photo.photo_url)}
        alt={photo.label ?? 'check-in'}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
      />
      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
        opacity: hover ? 1 : 0, transition: 'opacity 0.15s',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {photo.label && (
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>
              {photo.label}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'rgba(255,93,93,0.2)', border: '1px solid rgba(255,93,93,0.4)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: T.danger, display: 'flex', alignItems: 'center' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>
        {photo.notes && (
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
            {photo.notes}
          </p>
        )}
      </div>
      {photo.notes && !hover && (
        <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: T.accent }} />
      )}
    </div>
  );
}

// ── Folder card ────────────────────────────────────────────────────────────────
function FolderCard({ folderDate, photos, notes, onAddPhoto, onUpdateNotes, onPhotoClick, onDeletePhoto }: {
  folderDate: string;
  photos: CheckInPhoto[];
  notes: string | null;
  onAddPhoto: () => void;
  onUpdateNotes: (notes: string) => void;
  onPhotoClick: (photo: CheckInPhoto) => void;
  onDeletePhoto: (photo: CheckInPhoto) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [folderNotes, setFolderNotes] = useState(notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);

  const displayDate = format(parseISO(folderDate), "d 'de' MMMM yyyy", { locale: es });

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Folder header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
        borderBottom: collapsed ? 'none' : `1px solid ${T.border}`,
        background: T.surface2,
      }}>
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.text3, display: 'flex', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Folder icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill={T.accent} stroke="none" style={{ flexShrink: 0 }}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{displayDate}</span>
          <span style={{ fontSize: 12, color: T.text4, marginLeft: 10, fontFamily: 'JetBrains Mono, monospace' }}>
            {photos.length} foto{photos.length !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          onClick={onAddPhoto}
          style={{
            background: T.accentDim, border: `1px solid ${T.accentLine}`, color: T.accent,
            borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Agregar foto
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Folder notes */}
          <div>
            {editingNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  value={folderNotes}
                  onChange={e => setFolderNotes(e.target.value)}
                  placeholder="Notas de esta sesión..."
                  rows={2}
                  autoFocus
                  style={{
                    width: '100%', background: T.surface2, border: `1px solid ${T.border}`,
                    borderRadius: 8, color: T.text, fontSize: 12, padding: '8px 10px',
                    resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { onUpdateNotes(folderNotes); setEditingNotes(false); }}
                    style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 7, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingNotes(false)}
                    style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text3, borderRadius: 7, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                style={{
                  background: 'transparent', border: `1px dashed ${T.border}`, borderRadius: 8,
                  padding: '8px 12px', width: '100%', textAlign: 'left', cursor: 'pointer',
                  color: folderNotes ? T.text2 : T.text4, fontSize: 12, fontFamily: 'inherit',
                }}
              >
                {folderNotes || '+ Agregar notas a esta sesión...'}
              </button>
            )}
          </div>

          {/* Photo grid */}
          {photos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: T.text4, fontSize: 13 }}>
              Sin fotos. Agregá una con el botón de arriba.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {photos.map(photo => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  onClick={() => onPhotoClick(photo)}
                  onDelete={() => onDeletePhoto(photo)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main tab ───────────────────────────────────────────────────────────────────
export function CheckInsTab({ clientId }: Props) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { photos, folders, loading, getFolderMeta, createFolder, updateFolderNotes, addPhoto, updatePhotoNotes, deletePhoto } = useCheckIns(clientId);

  // New folder dialog
  const [folderDialog, setFolderDialog] = useState(false);
  const [newFolderDate, setNewFolderDate] = useState('');

  // Add photo dialog
  const [photoDialog, setPhotoDialog] = useState<{ folderDate: string } | null>(null);
  const [photoTab, setPhotoTab] = useState<'file' | 'drive'>('file');
  const [driveUrl, setDriveUrl] = useState('');
  const [photoLabel, setPhotoLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<CheckInPhoto | null>(null);

  const handleCreateFolder = async () => {
    if (!newFolderDate) return;
    await createFolder(newFolderDate);
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
    setPhotoDialog(null);
    setPhotoLabel('');
    setUploading(false);
  };

  const handleAddDriveUrl = async () => {
    if (!driveUrl.trim() || !photoDialog) return;
    await addPhoto(photoDialog.folderDate, driveUrl.trim(), undefined, photoLabel || undefined);
    setPhotoDialog(null);
    setDriveUrl('');
    setPhotoLabel('');
  };

  const handleSavePhotoNotes = useCallback(async (photoId: string, notes: string) => {
    await updatePhotoNotes(photoId, notes);
    setLightboxPhoto(prev => prev?.id === photoId ? { ...prev, notes: notes || null } : prev);
  }, [updatePhotoNotes]);

  const inputStyle: React.CSSProperties = {
    background: T.surface2, border: `1px solid ${T.border}`,
    color: T.text, height: 36, borderRadius: 8, fontSize: 13,
    padding: '0 12px', width: '100%', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    color: T.text3, display: 'block', marginBottom: 5,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: T.text3, fontSize: 13 }}>
        Cargando...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', background: T.bg, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 28, fontWeight: 400, color: T.text, margin: 0, lineHeight: 1.2 }}>
            Check-ins
          </h2>
          <p style={{ fontSize: 13, color: T.text3, margin: '4px 0 0' }}>
            {folders.length} sesión{folders.length !== 1 ? 'es' : ''} · {photos.length} foto{photos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setNewFolderDate(''); setFolderDialog(true); }}
          style={{
            background: T.accent, color: T.accentInk, border: 'none',
            borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva carpeta
        </button>
      </div>

      {/* Empty state */}
      {folders.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={T.accent} stroke="none">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: '0 0 6px' }}>Sin check-ins</p>
            <p style={{ fontSize: 13, color: T.text3, margin: 0 }}>Creá una carpeta para empezar a registrar el progreso.</p>
          </div>
          <button
            onClick={() => { setNewFolderDate(''); setFolderDialog(true); }}
            style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Nueva carpeta
          </button>
        </div>
      )}

      {/* Folders list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {folders.map(folderDate => {
          const folderPhotos = photos.filter(p => p.folder_date === folderDate);
          const meta = getFolderMeta(folderDate);
          return (
            <FolderCard
              key={folderDate}
              folderDate={folderDate}
              photos={folderPhotos}
              notes={meta?.notes ?? null}
              onAddPhoto={() => { setPhotoLabel(''); setDriveUrl(''); setPhotoTab('file'); setPhotoDialog({ folderDate }); }}
              onUpdateNotes={notes => updateFolderNotes(folderDate, notes)}
              onPhotoClick={setLightboxPhoto}
              onDeletePhoto={photo => deletePhoto(photo.id, photo.storage_path)}
            />
          );
        })}
      </div>

      {/* New folder dialog */}
      <Dialog open={folderDialog} onOpenChange={setFolderDialog}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 340 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Nueva carpeta</DialogTitle>
          </DialogHeader>
          <div style={{ padding: '8px 0' }}>
            <label style={labelStyle}>Fecha del check-in</label>
            <input
              type="date"
              value={newFolderDate}
              onChange={e => setNewFolderDate(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>
          <DialogFooter>
            <button onClick={() => setFolderDialog(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderDate}
              style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !newFolderDate ? 0.5 : 1 }}
            >
              Crear
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add photo dialog */}
      <Dialog open={!!photoDialog} onOpenChange={o => { if (!o) setPhotoDialog(null); }}>
        <DialogContent style={{ background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.text, maxWidth: 380 }}>
          <DialogHeader>
            <DialogTitle style={{ color: T.text }}>Agregar foto</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            {/* Label */}
            <div>
              <label style={labelStyle}>Ángulo / etiqueta</label>
              <select
                value={photoLabel}
                onChange={e => setPhotoLabel(e.target.value)}
                style={{ ...inputStyle, height: 36 }}
              >
                <option value="">Sin etiqueta</option>
                <option value="frontal">Frontal</option>
                <option value="trasero">Trasero</option>
                <option value="lateral">Lateral</option>
              </select>
            </div>

            {/* Source tabs */}
            <div>
              <div style={{ display: 'inline-flex', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2, marginBottom: 12 }}>
                {(['file', 'drive'] as const).map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setPhotoTab(tab)}
                    style={{
                      padding: '5px 14px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer',
                      background: photoTab === tab ? T.surface3 : 'transparent',
                      color: photoTab === tab ? T.text : T.text3,
                      fontFamily: 'inherit',
                    }}
                  >
                    {['Subir archivo', 'Link de Drive'][i]}
                  </button>
                ))}
              </div>

              {photoTab === 'file' ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    width: '100%', padding: '20px', border: `2px dashed ${T.border}`,
                    borderRadius: 10, background: 'transparent', cursor: 'pointer',
                    color: T.text3, fontSize: 13, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8, opacity: uploading ? 0.5 : 1, fontFamily: 'inherit',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                  {uploading ? 'Subiendo...' : 'Hacer clic o arrastrar imagen'}
                  <span style={{ fontSize: 11, color: T.text4 }}>JPG, PNG, WEBP</span>
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    placeholder="https://drive.google.com/file/d/..."
                    value={driveUrl}
                    onChange={e => setDriveUrl(e.target.value)}
                    style={inputStyle}
                    autoFocus={photoTab === 'drive'}
                  />
                  <p style={{ fontSize: 11, color: T.text4, margin: 0 }}>
                    El archivo debe ser público o compartido con acceso de visualización.
                  </p>
                </div>
              )}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
          />

          <DialogFooter>
            <button
              onClick={() => setPhotoDialog(null)}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, borderRadius: 8, padding: '6px 16px', fontSize: 13, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            {photoTab === 'drive' && (
              <button
                onClick={handleAddDriveUrl}
                disabled={!driveUrl.trim()}
                style={{ background: T.accent, color: T.accentInk, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !driveUrl.trim() ? 0.5 : 1 }}
              >
                Agregar
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onSaveNotes={notes => handleSavePhotoNotes(lightboxPhoto.id, notes)}
        />
      )}
    </div>
  );
}
