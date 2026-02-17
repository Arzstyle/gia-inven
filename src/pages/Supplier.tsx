import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAktivitas } from "@/hooks/useLogAktivitas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export default function SupplierPage() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nama: "", kontak: "", alamat: "" });

  const fetch = async () => {
    const { data } = await supabase.from("supplier").select("*").order("nama");
    setData(data ?? []);
  };
  useEffect(() => { fetch(); }, []);

  const filtered = data.filter(d => d.nama.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm({ nama: "", kontak: "", alamat: "" }); setOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ nama: s.nama, kontak: s.kontak ?? "", alamat: s.alamat ?? "" }); setOpen(true); };

  const handleSave = async () => {
    if (!form.nama.trim()) { toast.error("Nama wajib diisi"); return; }
    const payload = { nama: form.nama, kontak: form.kontak || null, alamat: form.alamat || null };
    if (editing) {
      const { error } = await supabase.from("supplier").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await logAktivitas("Edit Supplier", `Mengubah supplier: ${form.nama}`);
      toast.success("Supplier diperbarui");
    } else {
      const { error } = await supabase.from("supplier").insert(payload);
      if (error) { toast.error(error.message); return; }
      await logAktivitas("Tambah Supplier", `Menambahkan supplier: ${form.nama}`);
      toast.success("Supplier ditambahkan");
    }
    setOpen(false);
    fetch();
  };

  const handleDelete = async (s: any) => {
    if (!confirm(`Hapus supplier "${s.nama}"?`)) return;
    const { error } = await supabase.from("supplier").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    await logAktivitas("Hapus Supplier", `Menghapus supplier: ${s.nama}`);
    toast.success("Supplier dihapus");
    fetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Supplier</h1>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari supplier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead className="w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
            ) : filtered.map((s, i) => (
              <TableRow key={s.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{s.nama}</TableCell>
                <TableCell className="text-sm">{s.kontak ?? "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.alamat ?? "-"}</TableCell>
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
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama</Label><Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} /></div>
            <div><Label>Kontak</Label><Input value={form.kontak} onChange={e => setForm(p => ({ ...p, kontak: e.target.value }))} /></div>
            <div><Label>Alamat</Label><Textarea value={form.alamat} onChange={e => setForm(p => ({ ...p, alamat: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? "Simpan" : "Tambah"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
