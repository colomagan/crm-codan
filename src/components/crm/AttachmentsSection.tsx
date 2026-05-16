import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Folder, FolderOpen, FolderPlus, Upload, Trash2, Download,
  FileText, FileImage, File, ChevronRight, X, Loader2, ExternalLink,
} from 'lucide-react';

const BUCKET = 'crm-attachments';

interface AttFolder {
  id: string;
  name: string;
  created_at: string;
}

interface Attachment {
  id: string;
  folder_id: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  file_url: string;
  created_at: string;
}

interface Props {
  entityType: 'lead' | 'contact';
  entityId: string;
  userId: string;
  brand: string;
}

function formatBytes(b: number | null) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type, url, name }: { type: string | null; url: string; name: string }) {
  const isImage = type?.startsWith('image/');
  const isPdf = type === 'application/pdf';
  if (isImage) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        <img src={url} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center">
      {isPdf
        ? <FileText className="w-10 h-10 text-red-400" />
        : type?.startsWith('video/')
          ? <File className="w-10 h-10 text-purple-400" />
          : <FileImage className="w-10 h-10 text-muted-foreground" />}
    </div>
  );
}

export function AttachmentsSection({ entityType, entityId, userId, brand }: Props) {
  const [folders, setFolders] = useState<AttFolder[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [currentFolder, setCurrentFolder] = useState<AttFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [deleteFile, setDeleteFile] = useState<Attachment | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<AttFolder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const [{ data: folds }, { data: atts }] = await Promise.all([
      supabase.from('crm_attachment_folders')
        .select('*').eq('entity_type', entityType).eq('entity_id', entityId)
        .order('created_at'),
      supabase.from('crm_attachments')
        .select('*').eq('entity_type', entityType).eq('entity_id', entityId)
        .order('created_at'),
    ]);
    setFolders((folds as AttFolder[]) ?? []);
    setFiles((atts as Attachment[]) ?? []);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { fetch(); }, [fetch]);

  const visibleFolders = currentFolder ? [] : folders;
  const visibleFiles = files.filter(f =>
    currentFolder ? f.folder_id === currentFolder.id : f.folder_id === null
  );

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const { error } = await supabase.from('crm_attachment_folders').insert({
      user_id: userId, entity_type: entityType, entity_id: entityId, name,
    });
    if (error) { toast.error('No se pudo crear la carpeta.'); return; }
    toast.success(`Carpeta "${name}" creada.`);
    setNewFolderName('');
    setNewFolderOpen(false);
    fetch();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${userId}/${entityType}/${entityId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (upErr) { toast.error('Error al subir el archivo.'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { error: dbErr } = await supabase.from('crm_attachments').insert({
      user_id: userId, entity_type: entityType, entity_id: entityId,
      folder_id: currentFolder?.id ?? null,
      file_name: file.name, file_type: file.type,
      file_size: file.size, storage_path: path, file_url: publicUrl,
    });
    if (dbErr) { toast.error('Error al guardar el archivo.'); }
    else { toast.success(`"${file.name}" subido.`); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetch();
  };

  const handleDeleteFile = async () => {
    if (!deleteFile) return;
    await supabase.storage.from(BUCKET).remove([deleteFile.storage_path]);
    await supabase.from('crm_attachments').delete().eq('id', deleteFile.id);
    toast.success('Archivo eliminado.');
    setDeleteFile(null);
    fetch();
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolder) return;
    const folderFiles = files.filter(f => f.folder_id === deleteFolder.id);
    if (folderFiles.length > 0) {
      await supabase.storage.from(BUCKET).remove(folderFiles.map(f => f.storage_path));
      await supabase.from('crm_attachments').delete().eq('folder_id', deleteFolder.id);
    }
    await supabase.from('crm_attachment_folders').delete().eq('id', deleteFolder.id);
    toast.success(`Carpeta "${deleteFolder.name}" eliminada.`);
    setDeleteFolder(null);
    if (currentFolder?.id === deleteFolder.id) setCurrentFolder(null);
    fetch();
  };

  const isEmpty = visibleFolders.length === 0 && visibleFiles.length === 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-1">
          <button
            className="font-medium hover:underline"
            style={{ color: brand }}
            onClick={() => setCurrentFolder(null)}
          >
            Archivos
          </button>
          {currentFolder && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{currentFolder.name}</span>
            </>
          )}
        </div>

        {!currentFolder && (
          <Button
            variant="outline" size="sm" className="h-8 gap-1.5"
            onClick={() => setNewFolderOpen(true)}
          >
            <FolderPlus className="w-3.5 h-3.5" /> Nueva carpeta
          </Button>
        )}

        <Button
          size="sm" className="h-8 gap-1.5 text-white"
          style={{ backgroundColor: brand }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Subiendo...' : 'Subir archivo'}
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {/* New folder input */}
      <AnimatePresence>
        {newFolderOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-hidden"
          >
            <Input
              autoFocus
              placeholder="Nombre de la carpeta..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setNewFolderOpen(false); }}
              className="h-8"
            />
            <Button size="sm" className="h-8" style={{ backgroundColor: brand }} onClick={handleCreateFolder}>
              Crear
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setNewFolderOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <Folder className="w-10 h-10 opacity-30" />
          <p className="text-sm">{currentFolder ? 'Carpeta vacía' : 'Sin archivos'}</p>
          <p className="text-xs">Subí un archivo o creá una carpeta para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Folders */}
          {visibleFolders.map(folder => {
            const count = files.filter(f => f.folder_id === folder.id).length;
            return (
              <motion.div
                key={folder.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative rounded-xl border bg-card p-4 cursor-pointer hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all"
                onClick={() => setCurrentFolder(folder)}
              >
                <button
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive"
                  onClick={e => { e.stopPropagation(); setDeleteFolder(folder); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <FolderOpen className="w-8 h-8 mb-2 text-amber-400" />
                <p className="text-sm font-medium leading-tight truncate">{folder.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{count} archivo{count !== 1 ? 's' : ''}</p>
              </motion.div>
            );
          })}

          {/* Files */}
          {visibleFiles.map(file => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative rounded-xl border bg-card p-3 space-y-2 hover:shadow-md transition-all"
            >
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={file.file_url} target="_blank" rel="noreferrer"
                  className="p-1 rounded hover:bg-muted transition-colors" title="Abrir">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
                <a href={file.file_url} download={file.file_name}
                  className="p-1 rounded hover:bg-muted transition-colors" title="Descargar">
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
                <button
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => setDeleteFile(file)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <FileIcon type={file.file_type} url={file.file_url} name={file.file_name} />
              <div>
                <p className="text-xs font-medium leading-tight truncate" title={file.file_name}>{file.file_name}</p>
                {file.file_size && (
                  <p className="text-xs text-muted-foreground">{formatBytes(file.file_size)}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete file confirm */}
      <AlertDialog open={!!deleteFile} onOpenChange={o => { if (!o) setDeleteFile(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteFile?.file_name}</strong> se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete folder confirm */}
      <AlertDialog open={!!deleteFolder} onOpenChange={o => { if (!o) setDeleteFolder(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar carpeta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la carpeta <strong>"{deleteFolder?.name}"</strong> y todos sus archivos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive">Eliminar todo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
