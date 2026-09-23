/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAktivitas } from "@/hooks/useLogAktivitas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowUpDown, RotateCcw, Layers } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function BarangPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [subkategoriList, setSubkategoriList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSubkategori, setSelectedSubkategori] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"huruf" | "huruf_desc" | "tanggal">("huruf");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const formDefault = { kode: "", nama: "", harga_beli: "", harga_jual: "", kategori_id: "", subkategori_id: "", satuan: "pcs", tambah_stok: "", stok_minimum: "" };
  const [form, setForm] = useState(formDefault);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; description: string; variant: "danger" | "warning"; onConfirm: () => void }>({ open: false, title: "", description: "", variant: "danger", onConfirm: () => { } });

  const fetchData = async () => {
    const [brgRes, katRes, subRes] = await Promise.all([
      supabase.from("barang").select("*, kategori(nama), subkategori(nama)"),
      supabase.from("kategori").select("*").order("nama"),
      supabase.from("subkategori").select("*").order("nama"),
    ]);
    const sortedItems = (brgRes.data ?? []).sort((a, b) => {
      const subA = a.subkategori?.nama || "";
      const subB = b.subkategori?.nama || "";
      if (subA < subB) return -1;
      if (subA > subB) return 1;
      return a.kode.localeCompare(b.kode);
    });
    setData(sortedItems);
    setKategoriList(katRes.data ?? []);
    setSubkategoriList(subRes.data ?? []);
  };
  useEffect(() => { fetchData(); }, []);

  const filteredSub = subkategoriList.filter(s => s.kategori_id === form.kategori_id);
  const filtered = data
    .filter(d => {
      const matchSearch =
        d.nama.toLowerCase().includes(search.toLowerCase()) ||
        d.kode.toLowerCase().includes(search.toLowerCase());

      const matchSub =
        selectedSubkategori === "all" ||
        d.subkategori_id === selectedSubkategori ||
        d.subkategori?.nama === selectedSubkategori;

      return matchSearch && matchSub;
    })
    .sort((a, b) => {
      if (sortBy === "tanggal") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "huruf_desc") {
        return b.nama.localeCompare(a.nama);
      }
      // default: huruf (A - Z)
      return a.nama.localeCompare(b.nama);
    });

  const openAdd = () => {
    setEditing(null);
    const autoCode = `BRG-${Math.floor(1000 + Math.random() * 9000)}`;
    setForm({ ...formDefault, kode: autoCode });
    setOpen(true);
  };

  const openEdit = (b: any) => {
    setEditing(b);
    setForm({
      kode: b.kode,
      nama: b.nama,
      harga_beli: b.harga_beli ? String(b.harga_beli) : "",
      harga_jual: b.harga_jual ? String(b.harga_jual) : "",
      kategori_id: b.kategori_id ?? "",
      subkategori_id: b.subkategori_id ?? "",
      satuan: b.satuan,
      tambah_stok: "",
      stok_minimum: b.stok_minimum ? String(b.stok_minimum) : "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.kode.trim() || !form.nama.trim()) { toast.error("Kode dan Nama wajib diisi"); return; }

    const harga_beli = parseInt(form.harga_beli) || 0;
    const harga_jual = parseInt(form.harga_jual) || 0;
    const tambah_stok = parseInt(form.tambah_stok) || 0;
    const stok_minimum = parseInt(form.stok_minimum) || 0;

    if (editing) {
      // --- EDIT BARANG ---
      const updatePayload: any = {
        kode: form.kode,
        nama: form.nama,
        harga_beli,
        harga_jual,
        kategori_id: form.kategori_id || null,
        subkategori_id: form.subkategori_id || null,
        satuan: form.satuan,
        stok_minimum,
      };

      const { error } = await supabase.from("barang").update(updatePayload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }

      // Catat ke stok_masuk & log aktivitas
      if (tambah_stok > 0) {
        await supabase.from("stok_masuk").insert({
          barang_id: editing.id,
          jumlah: tambah_stok,
          tanggal: new Date().toISOString().split("T")[0],
          keterangan: "Tambah Stok via Data Barang",
          user_id: user?.id ?? null,
        });
        // Ambil stok terbaru untuk log
        const { data: freshData } = await supabase.from("barang").select("stok").eq("id", editing.id).single();
        const newTotal = freshData?.stok ?? tambah_stok;
        await logAktivitas("Tambah Stok", `${form.nama} +${tambah_stok} (Total: ${newTotal})`);
        toast.success(`Stok ${form.nama} bertambah +${tambah_stok} (Total: ${newTotal})`);
      } else {
        await logAktivitas("Edit Barang", `${form.nama} diperbarui`);
        toast.success("Barang diperbarui");
      }

    } else {
      // --- TAMBAH BARANG BARU ---
      const { error } = await supabase.from("barang").insert({
        kode: form.kode,
        nama: form.nama,
        harga_beli,
        harga_jual,
        kategori_id: form.kategori_id || null,
        subkategori_id: form.subkategori_id || null,
        satuan: form.satuan,
        stok: tambah_stok,
        stok_minimum,
      });
      if (error) { toast.error(error.message); return; }
      await logAktivitas("Tambah Barang", `${form.kode} - ${form.nama} (Stok: ${tambah_stok})`);
      toast.success("Barang ditambahkan");
    }
    setOpen(false);
    fetchData();
  };

  const handleDelete = async (b: any) => {
    setConfirmState({
      open: true,
      title: "Hapus Barang",
      description: `Apakah Anda yakin ingin menghapus barang "${b.nama}"? Tindakan ini tidak dapat dibatalkan.`,
      variant: "danger",
      onConfirm: async () => {
        setConfirmState(p => ({ ...p, open: false }));
        const { error } = await supabase.from("barang").delete().eq("id", b.id);
        if (error) { toast.error(error.message); return; }
        toast.success("Barang dihapus");
        fetchData();
      },
    });
  };

  const handleResetStok = async (b: any) => {
    setConfirmState({
      open: true,
      title: "Reset Stok",
      description: `Apakah Anda yakin ingin mereset stok "${b.nama}" menjadi 0? Stok saat ini: ${b.stok}.`,
      variant: "warning",
      onConfirm: async () => {
        setConfirmState(p => ({ ...p, open: false }));
        const { error } = await supabase.from("barang").update({ stok: 0 }).eq("id", b.id);
        if (error) { toast.error(error.message); return; }
        await logAktivitas("Reset Stok", `${b.nama} stok direset ke 0 (sebelumnya: ${b.stok})`);
        toast.success(`Stok ${b.nama} direset ke 0`);
        fetchData();
      },
    });
  };

  // Profit calculation for form preview
  const formBeli = parseInt(form.harga_beli) || 0;
  const formJual = parseInt(form.harga_jual) || 0;
  const formProfit = formJual - formBeli;
  const formMargin = formBeli > 0 ? Math.round((formProfit / formBeli) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Data Barang</h1>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      {/* Search, Filter Subkategori, & Sorting */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari kode/nama..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-8 bg-white border-slate-200" 
          />
        </div>

        {/* Filter Subkategori */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          <Select value={selectedSubkategori} onValueChange={setSelectedSubkategori}>
            <SelectTrigger className="w-[210px] bg-white border-slate-200">
              <SelectValue placeholder="Pilih Subkategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Subkategori ({data.length})</SelectItem>
              {subkategoriList.map(s => {
                const count = data.filter(d => d.subkategori_id === s.id).length;
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nama} ({count})
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

        {/* Tombol Reset jika filter subkategori aktif */}
        {selectedSubkategori !== "all" && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedSubkategori("all")}
            className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 h-9 px-2.5"
          >
            Tampilkan Semua ✕
          </Button>
        )}
      </div>

      {/* Tabel Data Barang */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/90 border-b-2 border-blue-500">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-center font-bold text-slate-500 text-xs">#</TableHead>
                <TableHead className="font-bold text-blue-900 text-xs tracking-wider uppercase">Kode</TableHead>
                <TableHead className="font-bold text-slate-800 text-xs tracking-wider uppercase">Nama</TableHead>
                <TableHead className="font-bold text-blue-700 text-xs tracking-wider uppercase">Subkategori</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs tracking-wider uppercase">Satuan</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-xs tracking-wider uppercase">H. Beli</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-xs tracking-wider uppercase">H. Jual</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-xs tracking-wider uppercase">Margin</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-xs tracking-wider uppercase">Stok</TableHead>
                <TableHead className="w-28 text-center font-bold text-slate-700 text-xs tracking-wider uppercase">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    Tidak ada barang yang sesuai kriteria pencarian/filter.
                  </TableCell>
                </TableRow>
              ) : filtered.map((b, i) => {
                const beli = Number(b.harga_beli) || 0;
                const jual = Number(b.harga_jual) || 0;
                const profit = jual - beli;
                return (
                  <TableRow key={b.id} className="hover:bg-blue-50/40 transition-colors">
                    <TableCell className="text-center text-muted-foreground text-xs">{i + 1}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80 inline-block">
                        {b.kode}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800 text-sm">{b.nama}</TableCell>
                    <TableCell>
                      {b.subkategori?.nama ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {b.subkategori.nama}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs font-medium">{b.satuan}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-slate-600">
                      {beli ? fmt(beli) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-slate-800">
                      {jual ? fmt(jual) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {profit > 0 ? (
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 font-mono text-xs">
                          +{fmt(profit)}
                        </Badge>
                      ) : profit < 0 ? (
                        <Badge variant="destructive" className="font-mono text-xs">
                          {fmt(profit)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {b.stok <= b.stok_minimum ? (
                        <Badge variant="destructive" className="font-bold">{b.stok}</Badge>
                      ) : (
                        <Badge variant="outline" className="font-bold border-slate-300 text-slate-700">{b.stok}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEdit(b)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-500 hover:text-orange-600 hover:bg-orange-50" onClick={() => handleResetStok(b)} title="Reset Stok">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(b)} title="Hapus">
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Barang</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Kode (Otomatis)</Label><Input value={form.kode} readOnly className="bg-muted" /></div>
            <div className="col-span-2"><Label>Nama Barang</Label><Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} /></div>

            <div>
              <Label>Kategori</Label>
              <Select value={form.kategori_id} onValueChange={v => setForm(p => ({ ...p, kategori_id: v, subkategori_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                <SelectContent>{kategoriList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subkategori</Label>
              <Select value={form.subkategori_id} onValueChange={v => setForm(p => ({ ...p, subkategori_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih Sub" /></SelectTrigger>
                <SelectContent>{filteredSub.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label>Harga Beli (Rp)</Label>
              <Input type="number" value={form.harga_beli} onChange={e => setForm(p => ({ ...p, harga_beli: e.target.value }))} placeholder="Harga modal" />
            </div>
            <div>
              <Label>Harga Jual (Rp)</Label>
              <Input type="number" value={form.harga_jual} onChange={e => setForm(p => ({ ...p, harga_jual: e.target.value }))} placeholder="Harga jual" />
            </div>

            {/* Live profit preview */}
            {(formBeli > 0 || formJual > 0) && (
              <div className="col-span-2 rounded-lg bg-muted/50 p-3 flex items-center gap-3">
                <TrendingUp className={`h-5 w-5 ${formProfit >= 0 ? "text-green-600" : "text-red-500"}`} />
                <div className="text-sm">
                  <span className="text-muted-foreground">Keuntungan: </span>
                  <span className={`font-bold ${formProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {formProfit >= 0 ? "+" : ""}{fmt(formProfit)}
                  </span>
                  {formBeli > 0 && (
                    <span className="text-muted-foreground ml-2">({formMargin}%)</span>
                  )}
                </div>
              </div>
            )}

            <div><Label>Satuan</Label><Input value={form.satuan} onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))} /></div>
            <div><Label>Tambah Stok</Label><Input type="number" value={form.tambah_stok} onChange={e => setForm(p => ({ ...p, tambah_stok: e.target.value }))} placeholder="0" /></div>
            <div><Label>Stok Minimum</Label><Input type="number" value={form.stok_minimum} onChange={e => setForm(p => ({ ...p, stok_minimum: e.target.value }))} placeholder="0" /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? "Simpan" : "Tambah"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(o) => setConfirmState(p => ({ ...p, open: o }))}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        confirmLabel={confirmState.variant === "danger" ? "Ya, Hapus" : "Ya, Reset"}
        onConfirm={confirmState.onConfirm}
      />
    </div>
  );
}
