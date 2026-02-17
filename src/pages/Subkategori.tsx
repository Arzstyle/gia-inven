import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAktivitas } from "@/hooks/useLogAktivitas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowUpDown, Package, Eye } from "lucide-react";

export default function SubkategoriPage() {
  const [data, setData] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"huruf" | "kategori" | "tanggal">("huruf");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ nama: "", kategori_id: "" });

  // Item preview popup
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSub, setPreviewSub] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [confirmState, setConfirmState] = useState<{ open: boolean; target: any }>({ open: false, target: null });
  const [previewLoading, setPreviewLoading] = useState(false);

  // Item counts per subcategory
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  const fetchData = async () => {
    const [subRes, katRes] = await Promise.all([
      supabase.from("subkategori").select("*, kategori(nama)").order("nama"),
      supabase.from("kategori").select("*").order("nama"),
    ]);
    setData(subRes.data ?? []);
    setKategoriList(katRes.data ?? []);

    // Fetch item counts
    const { data: barangData } = await supabase.from("barang").select("subkategori_id");
    if (barangData) {
      const counts: Record<string, number> = {};
      barangData.forEach((b: any) => {
        if (b.subkategori_id) {
          counts[b.subkategori_id] = (counts[b.subkategori_id] || 0) + 1;
        }
      });
      setItemCounts(counts);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = data
    .filter(d => d.nama.toLowerCase().includes(search.toLowerCase()) || (d.kategori?.nama || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "kategori") {
        const katA = a.kategori?.nama || "";
        const katB = b.kategori?.nama || "";
        if (katA !== katB) return katA.localeCompare(katB);
        return a.nama.localeCompare(b.nama);
      }
      if (sortBy === "tanggal") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      return a.nama.localeCompare(b.nama);
    });

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
    fetchData();
  };

  const handleDelete = async (s: any) => {
    const count = itemCounts[s.id] || 0;
    if (count > 0) {
      toast.error(`Tidak bisa hapus: masih ada ${count} barang di subkategori ini`);
      return;
    }
    setConfirmState({ open: true, target: s });
  };
  const executeDelete = async () => {
    const s = confirmState.target;
    setConfirmState({ open: false, target: null });
    if (!s) return;
    const { error } = await supabase.from("subkategori").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    await logAktivitas("Hapus Subkategori", `Menghapus subkategori: ${s.nama}`);
    toast.success("Subkategori dihapus");
    fetchData();
  };

  const openPreview = async (s: any) => {
    setPreviewSub(s);
    setPreviewLoading(true);
    setPreviewOpen(true);
    const { data: items } = await supabase
      .from("barang")
      .select("id, kode, nama, stok, satuan, harga_jual")
      .eq("subkategori_id", s.id)
      .order("nama");
    setPreviewItems(items ?? []);
    setPreviewLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Subkategori</h1>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari subkategori..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="huruf">Nama (A-Z)</SelectItem>
              <SelectItem value="kategori">Kategori</SelectItem>
              <SelectItem value="tanggal">Terbaru Ditambahkan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Jumlah Barang</TableHead>
              <TableHead className="w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
            ) : filtered.map((s, i) => {
              const count = itemCounts[s.id] || 0;
              return (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openPreview(s)}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.nama}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.kategori?.nama ?? "-"}</TableCell>
                  <TableCell className="text-center">
                    {count > 0 ? (
                      <Badge variant="outline" className="font-mono">{count} item</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground">Kosong</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPreview(s)} title="Lihat Isi"><Eye className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)} title="Edit"><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s)} title="Hapus"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
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

      {/* Preview Items Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Isi Subkategori: {previewSub?.nama}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Kategori: {previewSub?.kategori?.nama ?? "-"}</p>
          </DialogHeader>

          {previewLoading ? (
            <div className="py-8 text-center text-muted-foreground">Memuat...</div>
          ) : previewItems.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">Subkategori ini kosong — tidak ada barang.</p>
              <p className="text-xs text-muted-foreground mt-1">Aman untuk dihapus jika duplikat.</p>
            </div>
          ) : (
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewItems.map((item, i) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{item.kode}</TableCell>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell>{item.satuan}</TableCell>
                      <TableCell className="text-right font-bold">{item.stok}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            {previewItems.length === 0 && previewSub && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  const { error } = await supabase.from("subkategori").delete().eq("id", previewSub.id);
                  if (error) { toast.error(error.message); return; }
                  await logAktivitas("Hapus Subkategori", `Menghapus subkategori kosong: ${previewSub.nama}`);
                  toast.success(`Subkategori "${previewSub.nama}" dihapus`);
                  setPreviewOpen(false);
                  fetchData();
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />Hapus Subkategori Ini
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(o) => setConfirmState(p => ({ ...p, open: o }))}
        title="Hapus Subkategori"
        description={`Apakah Anda yakin ingin menghapus subkategori "${confirmState.target?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        variant="danger"
        confirmLabel="Ya, Hapus"
        onConfirm={executeDelete}
      />
    </div>
  );
}
