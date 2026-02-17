import { supabase } from "@/integrations/supabase/client";

export async function logAktivitas(aksi: string, detail?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("log_aktivitas").insert({
    user_id: user.id,
    aksi,
    detail: detail ?? null,
  });
}
