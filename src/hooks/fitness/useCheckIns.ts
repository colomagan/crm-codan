import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CheckInPhoto, WeeklyCheckin } from '@/types/fitness';

export function useCheckIns(clientId: string) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [photos, setPhotos] = useState<CheckInPhoto[]>([]);
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [p, c] = await Promise.all([
      supabase.from('check_in_photos').select('*').eq('client_id', clientId).order('folder_date', { ascending: false }).order('created_at', { ascending: true }),
      supabase.from('weekly_checkins').select('*').eq('client_id', clientId).order('week_date', { ascending: false }),
    ]);
    setPhotos((p.data as CheckInPhoto[]) ?? []);
    setCheckins((c.data as WeeklyCheckin[]) ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addPhoto = async (folderDate: string, photoUrl: string, storagePath?: string, label?: string) => {
    if (!userId) return;
    const { error } = await supabase.from('check_in_photos').insert({
      client_id: clientId, user_id: userId,
      folder_date: folderDate, photo_url: photoUrl,
      storage_path: storagePath ?? null, label: label ?? null,
    });
    if (error) { toast.error('No se pudo agregar la foto.'); return; }
    toast.success('Foto agregada.');
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
    const { error } = await supabase.from('weekly_checkins').upsert({
      ...entry, client_id: clientId, user_id: userId,
    }, { onConflict: 'client_id,week_date' });
    if (error) { toast.error('No se pudo guardar el check-in.'); return; }
    toast.success('Check-in guardado.');
    fetch();
  };

  const folders = [...new Set(photos.map(p => p.folder_date))].sort((a, b) => b.localeCompare(a));

  return { photos, checkins, folders, loading, refetch: fetch, addPhoto, deletePhoto, saveCheckin };
}
