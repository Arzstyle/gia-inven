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
import { Plus, Pencil, Trash2, Search, ArrowUpDown, Package, Eye, Folder } from "lucide-react";

export default function SubkategoriPage() {
  const [data, setData] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedKategori, setSelectedKategori] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"huruf" | "huruf_desc" | "tanggal">("huruf");
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
    .filter(d => {
      const matchSearch =
        d.nama.toLowerCase().includes(search.toLowerCase()) ||
        (d.kategori?.nama || "").toLowerCase().includes(search.toLowerCase());

      const matchKat =
        selectedKategori === "all" ||
        d.kategori_id === selectedKategori ||
        d.kategori?.id === selectedKategori;

      return matchSearch && matchKat;
    })
    .sort((a, b) => {
      if (sortBy === "tanggal") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (sortBy === "huruf_desc") {
        return b.nama.localeCompare(a.nama);
      }
      // default: A-Z
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
    setConfirmState({ open: true, target: s });
  };
  const executeDelete = async () => {
    const s = confirmState.target;
    setConfirmState({ open: false, target: null });
    if (!s) return;
    try {
      const count = itemCounts[s.id] || 0;
      // 1. Hapus semua barang di subkategori ini
      if (count > 0) {
        await supabase.from("barang").delete().eq("subkategori_id", s.id);
      }
      // 2. Hapus subkategori
      const { error } = await supabase.from("subkategori").delete().eq("id", s.id);
      if (error) { toast.error(error.message); return; }
      await logAktivitas("Hapus Subkategori", `Menghapus subkategori: ${s.nama}${count > 0 ? ` (${count} barang ikut dihapus)` : ""}`);
      toast.success(`Subkategori "${s.nama}" berhasil dihapus`);
      fetchData();
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    }
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

      {/* Search, Filter Kategori, & Sorting */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari subkategori..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-8 bg-white border-slate-200" 
          />
        </div>

        {/* Filter Kategori */}
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-blue-600" />
          <Select value={selectedKategori} onValueChange={setSelectedKategori}>
            <SelectTrigger className="w-[210px] bg-white border-slate-200">
              <SelectValue placeholder="Pilih Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori ({data.length})</SelectItem>
              {kategoriList.map(k => {
                const count = data.filter(d => d.kategori_id === k.id).length;
                return (
                  <SelectItem key={k.id} value={k.id}>
                    {k.nama} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Sorting A-Z / Tanggal */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-slate-500" />
          <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="huruf">Nama (A - Z)</SelectItem>
              <SelectItem value="huruf_desc">Nama (Z - A)</SelectItem>
              <SelectItem value="tanggal">Terbaru Ditambahkan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filter jika kategori dipilih */}
        {selectedKategori !== "all" && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedKategori("all")}
            className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 h-9 px-2.5"
          >
            Tampilkan Semua ✕
          </Button>
        )}
      </div>

      {/* Tabel Subkategori */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/90 border-b-2 border-blue-500">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center font-bold text-slate-500 text-xs">#</TableHead>
                <TableHead className="font-bold text-blue-900 text-xs tracking-wider uppercase">Nama Subkategori</TableHead>
                <TableHead className="font-bold text-blue-700 text-xs tracking-wider uppercase">Kategori Induk</TableHead>
                <TableHead className="text-center font-bold text-slate-700 text-xs tracking-wider uppercase">Jumlah Barang</TableHead>
                <TableHead className="w-32 text-center font-bold text-slate-700 text-xs tracking-wider uppercase">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Tidak ada subkategori yang sesuai kriteria pencarian/filter.
                  </TableCell>
                </TableRow>
              ) : filtered.map((s, i) => {
                const count = itemCounts[s.id] || 0;
                return (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-blue-50/40 transition-colors" onClick={() => openPreview(s)}>
                    <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                    <TableCell className="font-semibold text-slate-800 text-sm">{s.nama}</TableCell>
                    <TableCell>
                      {s.kategori?.nama ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {s.kategori.nama}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {count > 0 ? (
                        <Badge variant="outline" className="font-mono bg-blue-50/70 text-blue-700 border-blue-200 font-semibold">
                          {count} item
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground text-xs">
                          Kosong
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openPreview(s)} title="Lihat Isi">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEdit(s)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s)} title="Hapus">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
        description={(() => {
          const count = confirmState.target ? (itemCounts[confirmState.target.id] || 0) : 0;
          return count > 0
            ? `Apakah Anda yakin ingin menghapus subkategori "${confirmState.target?.nama}"? ${count} barang di dalamnya juga akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.`
            : `Apakah Anda yakin ingin menghapus subkategori "${confirmState.target?.nama}"? Tindakan ini tidak dapat dibatalkan.`;
        })()}
        variant="danger"
        confirmLabel={confirmState.target && (itemCounts[confirmState.target.id] || 0) > 0 ? "Ya, Hapus Semua" : "Ya, Hapus"}
        onConfirm={executeDelete}
      />
    </div>
  );
}
