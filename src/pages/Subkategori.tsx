import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAktivitas } from "@/hooks/useLogAktivitas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export default function SubkategoriPage() {
  const [data, setData] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nama: "", kategori_id: "" });

  const fetch = async () => {
    const [subRes, katRes] = await Promise.all([
      supabase.from("subkategori").select("*, kategori(nama)").order("nama"),
      supabase.from("kategori").select("*").order("nama"),
    ]);
    setData(subRes.data ?? []);
    setKategoriList(katRes.data ?? []);
  };
  useEffect(() => { fetch(); }, []);

  const filtered = data.filter(d => d.nama.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm({ nama: "", kategori_id: "" }); setOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ nama: s.nama, kategori_id: s.kategori_id }); setOpen(true); };

  const handleSave = async () => {
    if (!form.nama.trim() || !form.kategori_id) { toast.error("Semua field wajib diisi"); return; }
    if (editing) {
      const { error } = await supabase.from("subkategori").update({ nama: form.nama, kategori_id: form.kategori_id }).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await logAktivitas("Edit Subkategori", `Mengubah subkategori: ${form.nama}`);
      toast.success("Subkategori diperbarui");
    } else {
      const { error } = await supabase.from("subkategori").insert({ nama: form.nama, kategori_id: form.kategori_id });
      if (error) { toast.error(error.message); return; }
      await logAktivitas("Tambah Subkategori", `Menambahkan subkategori: ${form.nama}`);
      toast.success("Subkategori ditambahkan");
    }
    setOpen(false);
    fetch();
  };

  const handleDelete = async (s: any) => {
    if (!confirm(`Hapus subkategori "${s.nama}"?`)) return;
    const { error } = await supabase.from("subkategori").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    await logAktivitas("Hapus Subkategori", `Menghapus subkategori: ${s.nama}`);
    toast.success("Subkategori dihapus");
    fetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Subkategori</h1>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari subkategori..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
            ) : filtered.map((s, i) => (
              <TableRow key={s.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{s.nama}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.kategori?.nama ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Subkategori</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Kategori</Label>
              <Select value={form.kategori_id} onValueChange={v => setForm(p => ({ ...p, kategori_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {kategoriList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nama</Label><Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? "Simpan" : "Tambah"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
