import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function LogAktivitas() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("log_aktivitas").select("*").order("created_at", { ascending: false }).limit(200);
      setData(data ?? []);
    };
    fetch();
  }, []);

  const filtered = data.filter(d =>
    d.aksi.toLowerCase().includes(search.toLowerCase()) ||
    (d.detail ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Log Aktivitas</h1>
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari aktivitas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
            ) : filtered.map((l, i) => (
              <TableRow key={l.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString("id-ID")}</TableCell>
                <TableCell><Badge variant="secondary">{l.aksi}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{l.detail ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
