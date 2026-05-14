import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CheckInPhoto, CheckInFolder, WeeklyCheckin } from '@/types/fitness';

export function useCheckIns(clientId: string) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [photos, setPhotos] = useState<CheckInPhoto[]>([]);
  const [folderMeta, setFolderMeta] = useState<CheckInFolder[]>([]);
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [p, f, c] = await Promise.all([
      supabase.from('check_in_photos').select('*').eq('client_id', clientId).order('folder_date', { ascending: false }).order('created_at', { ascending: true }),
      supabase.from('check_in_folders').select('*').eq('client_id', clientId).order('folder_date', { ascending: false }),
      supabase.from('weekly_checkins').select('*').eq('client_id', clientId).order('week_date', { ascending: false }),
    ]);
    setPhotos((p.data as CheckInPhoto[]) ?? []);
    setFolderMeta((f.data as CheckInFolder[]) ?? []);
    setCheckins((c.data as WeeklyCheckin[]) ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Derived list of all folder dates (union of folders table + photos)
  const allFolderDates = [...new Set([
    ...folderMeta.map(f => f.folder_date),
    ...photos.map(p => p.folder_date),
  ])].sort((a, b) => b.localeCompare(a));

  const getFolderMeta = (date: string) => folderMeta.find(f => f.folder_date === date) ?? null;

  const createFolder = async (folderDate: string) => {
    if (!userId) return;
    const { error } = await supabase.from('check_in_folders').upsert(
      { client_id: clientId, user_id: userId, folder_date: folderDate },
      { onConflict: 'client_id,folder_date' }
    );
    if (error) { toast.error('No se pudo crear la carpeta.'); return; }
    fetch();
  };

  const updateFolderNotes = async (folderDate: string, notes: string) => {
    if (!userId) return;
    await supabase.from('check_in_folders').upsert(
      { client_id: clientId, user_id: userId, folder_date: folderDate, notes: notes || null },
      { onConflict: 'client_id,folder_date' }
    );
    fetch();
  };

  const addPhoto = async (folderDate: string, photoUrl: string, storagePath?: string, label?: string) => {
    if (!userId) return;
    // Ensure folder exists
    await supabase.from('check_in_folders').upsert(
      { client_id: clientId, user_id: userId, folder_date: folderDate },
      { onConflict: 'client_id,folder_date' }
    );
    const { error } = await supabase.from('check_in_photos').insert({
      client_id: clientId, user_id: userId,
      folder_date: folderDate, photo_url: photoUrl,
      storage_path: storagePath ?? null, label: label ?? null, notes: null,
    });
    if (error) { toast.error('No se pudo agregar la foto.'); return; }
    toast.success('Foto agregada.');
    fetch();
  };

  const updatePhotoNotes = async (photoId: string, notes: string) => {
    await supabase.from('check_in_photos').update({ notes: notes || null }).eq('id', photoId);
    fetch();
  };

  const updatePhotoLabel = async (photoId: string, label: string) => {
    await supabase.from('check_in_photos').update({ label: label || null }).eq('id', photoId);
    fetch();
  };

  const deletePhoto = async (id: string, storagePath?: string | null) => {
    if (storagePath) {
      await supabase.storage.from('checkin-photos').remove([storagePath]);
    }
    const { error } = await supabase.from('check_in_photos').delete().eq('id', id);
    if (error) { toast.error('No se pudo eliminar la foto.'); return; }
    fetch();
  };

  const saveCheckin = async (entry: Omit<WeeklyCheckin, 'id' | 'client_id' | 'user_id' | 'created_at'>) => {
    if (!userId) return;
    const { error } = await supabase.from('weekly_checkins').upsert(
      { ...entry, client_id: clientId, user_id: userId },
      { onConflict: 'client_id,week_date' }
    );
    if (error) { toast.error('No se pudo guardar el check-in.'); return; }
    toast.success('Check-in guardado.');
    fetch();
  };

  return {
    photos, folderMeta, checkins, folders: allFolderDates, loading,
    refetch: fetch, getFolderMeta,
    createFolder, updateFolderNotes,
    addPhoto, updatePhotoNotes, updatePhotoLabel, deletePhoto,
    saveCheckin,
  };
}
