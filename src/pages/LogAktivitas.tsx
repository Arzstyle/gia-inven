import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getUserDisplayName } from "@/hooks/useLogAktivitas";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User as UserIcon } from "lucide-react";

export default function LogAktivitas() {
  const { user } = useAuth();
  const currentUserName = getUserDisplayName(user);
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("log_aktivitas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setData(data ?? []);
    };
    fetch();
  }, []);

  // Bangun kamus user_id -> Nama User agar log lama teridentifikasi
  const userIdMap: Record<string, string> = {};

  // 1. Catat user yang sedang login saat ini
  if (user?.id) {
    userIdMap[user.id] = currentUserName;
  }

  // 2. Scan semua log yang memiliki prefix [Nama] untuk mencocokkan user_id ke Nama
  data.forEach((item) => {
    const rawDetail = item.detail ?? "";
    const match = rawDetail.match(/^\[(.*?)\]/);
    if (match && item.user_id) {
      userIdMap[item.user_id] = match[1];
    }
  });

  const parseLog = (item: any) => {
    const rawDetail = item.detail ?? "";
    const match = rawDetail.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      return {
        userName: match[1],
        detailText: match[2] || "-",
      };
    }

    // Jika log lama (sebelum ada prefix [Nama]):
    // 1. Cek di kamus userIdMap yang berhasil dipetakan
    if (item.user_id && userIdMap[item.user_id]) {
      return {
        userName: userIdMap[item.user_id],
        detailText: rawDetail || "-",
      };
    }

    // 2. Jika user_id sama dengan user login saat ini
    if (item.user_id && item.user_id === user?.id) {
      return {
        userName: currentUserName,
        detailText: rawDetail || "-",
      };
    }

    // 3. Fallback untuk data inputan kemarin (dibuat oleh akun Akbar)
    return {
      userName: item.user_id ? "Akbar" : "Sistem",
      detailText: rawDetail || "-",
    };
  };

  const parsedList = data.map(d => ({
    ...d,
    ...parseLog(d),
  }));

  const filtered = parsedList.filter(d =>
    d.aksi.toLowerCase().includes(search.toLowerCase()) ||
    d.userName.toLowerCase().includes(search.toLowerCase()) ||
    d.detailText.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold">Log Aktivitas</h1>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari aktivitas atau user..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-8" 
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="w-40">Waktu</TableHead>
              <TableHead className="w-32">Pengguna</TableHead>
              <TableHead className="w-36">Aksi</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Tidak ada data aktivitas
                </TableCell>
              </TableRow>
            ) : filtered.map((l, i) => (
              <TableRow key={l.id} className="hover:bg-muted/40">
                <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {new Date(l.created_at).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  {l.userName.toLowerCase().includes("giffary") ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      <UserIcon className="h-3 w-3 text-amber-600" />
                      {l.userName} (Owner)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <UserIcon className="h-3 w-3 text-blue-500" />
                      {l.userName}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-medium text-xs">
                    {l.aksi}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-foreground/80 font-mono">
                  {l.detailText}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
