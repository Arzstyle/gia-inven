import { supabase } from "@/integrations/supabase/client";

export function getUserDisplayName(user: { email?: string; user_metadata?: any } | null): string {
  if (!user) return "Sistem";
  if (user.user_metadata?.name) return user.user_metadata.name;
  if (user.user_metadata?.full_name) return user.user_metadata.full_name;
  if (user.email) {
    const raw = user.email.split("@")[0];
    const cleaned = raw.replace(/\d+$/, "");
    const base = cleaned.length >= 2 ? cleaned : raw;
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  return "User";
}

export async function logAktivitas(aksi: string, detail?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const userName = getUserDisplayName(user);
  const formattedDetail = detail ? `[${userName}] ${detail}` : `[${userName}]`;

  await supabase.from("log_aktivitas").insert({
    user_id: user.id,
    aksi,
    detail: formattedDetail,
  });
}

