import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAktivitas } from "@/hooks/useLogAktivitas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, ArrowLeft, Folder, Layers, Package, ChevronRight, Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Kategori = { id: string; nama: string; deskripsi: string | null; created_at: string };
type Subkategori = { id: string; nama: string; kategori_id: string };
type Barang = { id: string; kode: string; nama: string; harga_beli: number; harga_jual: number; satuan: string; stok: number; stok_minimum: number; subkategori?: { nama: string } };

type View = "kategori" | "subkategori" | "barang";

export default function KategoriPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("kategori");
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [subcategories, setSubcategories] = useState<Subkategori[]>([]);
  const [items, setItems] = useState<Barang[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Kategori | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subkategori | null>(null);
  const [search, setSearch] = useState("");

  // Dialog state for Add/Edit Kategori
  const [openKat, setOpenKat] = useState(false);
  const [editingKat, setEditingKat] = useState<Kategori | null>(null);
  const [formKat, setFormKat] = useState({ nama: "", deskripsi: "" });

  // Dialog state for Add/Edit Subkategori
  const [openSub, setOpenSub] = useState(false);
  const [editingSub, setEditingSub] = useState<Subkategori | null>(null);
  const [formSub, setFormSub] = useState({ nama: "" });

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; description: string; variant: "danger" | "warning"; confirmLabel: string; onConfirm: () => void }>({ open: false, title: "", description: "", variant: "danger", confirmLabel: "Ya, Hapus", onConfirm: () => { } });

  // Dialog state for Add/Edit Barang
  const [openBrg, setOpenBrg] = useState(false);
  const [editingBrg, setEditingBrg] = useState<any>(null);
  const brgDefault = { kode: "", nama: "", harga_beli: "0", harga_jual: "0", satuan: "pcs", tambah_stok: "0" };
  const [formBrg, setFormBrg] = useState(brgDefault);

  // Fetch
  const fetchCategories = async () => {
    const { data } = await supabase.from("kategori").select("*").order("nama");
    setCategories(data ?? []);
  };
  const fetchSubcategories = async (katId: string) => {
    const { data } = await supabase.from("subkategori").select("*").eq("kategori_id", katId).order("nama");
    setSubcategories(data ?? []);
  };
  const fetchItems = async (subId: string) => {
    const { data } = await supabase.from("barang").select("*, subkategori(nama)").eq("subkategori_id", subId).order("kode");
    setItems((data as any[]) ?? []);
  };

  useEffect(() => { fetchCategories(); }, []);

  // Navigation
  const goToSubkategori = (cat: Kategori) => {
    setSelectedCategory(cat);
    fetchSubcategories(cat.id);
    setView("subkategori");
    setSearch("");
  };
  const goToBarang = (sub: Subkategori) => {
    setSelectedSubcategory(sub);
    fetchItems(sub.id);
    setView("barang");
    setSearch("");
  };
  const goBack = () => {
    if (view === "barang") { setView("subkategori"); setSelectedSubcategory(null); setItems([]); }
    else if (view === "subkategori") { setView("kategori"); setSelectedCategory(null); setSubcategories([]); }
    setSearch("");
  };

  // Kategori CRUD
  const openAddKat = () => { setEditingKat(null); setFormKat({ nama: "", deskripsi: "" }); setOpenKat(true); };
  const openEditKat = (k: Kategori, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingKat(k); setFormKat({ nama: k.nama, deskripsi: k.deskripsi ?? "" }); setOpenKat(true);
  };
  const handleSaveKat = async () => {
    if (!formKat.nama.trim()) { toast.error("Nama wajib diisi"); return; }
    try {
      const payload = { nama: formKat.nama, deskripsi: formKat.deskripsi || null };
      const result = editingKat
        ? await supabase.from("kategori").update(payload).eq("id", editingKat.id)
        : await supabase.from("kategori").insert(payload);
      if (result.error) throw result.error;
      toast.success(editingKat ? "Kategori diperbarui" : "Kategori ditambahkan");
      setOpenKat(false);
      fetchCategories();
    } catch (err: any) {
      toast.error("Gagal: " + err.message);
    }
  };
  const handleDeleteKat = async (k: Kategori, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmState({
      open: true,
      title: "Hapus Kategori",
      description: `Apakah Anda yakin ingin menghapus kategori "${k.nama}"? Semua subkategori di dalamnya juga akan terhapus.`,
      variant: "danger",
      confirmLabel: "Ya, Hapus",
      onConfirm: async () => {
        setConfirmState(p => ({ ...p, open: false }));
        const { error } = await supabase.from("kategori").delete().eq("id", k.id);
        if (error) { toast.error(error.message); return; }
        toast.success("Kategori dihapus");
        fetchCategories();
      },
    });
  };

  // Subkategori CRUD
  const openAddSub = () => { setEditingSub(null); setFormSub({ nama: "" }); setOpenSub(true); };
  const openEditSub = (sub: Subkategori, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSub(sub); setFormSub({ nama: sub.nama }); setOpenSub(true);
  };
  const handleSaveSub = async () => {
    if (!formSub.nama.trim()) { toast.error("Nama wajib diisi"); return; }
    if (editingSub) {
      const { error } = await supabase.from("subkategori").update({ nama: formSub.nama }).eq("id", editingSub.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Subkategori diperbarui");
      if (selectedSubcategory?.id === editingSub.id) setSelectedSubcategory({ ...selectedSubcategory, nama: formSub.nama } as any);
    } else {
      const { error } = await supabase.from("subkategori").insert({ nama: formSub.nama, kategori_id: selectedCategory!.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Subkategori ditambahkan");
    }
    setOpenSub(false);
    if (selectedCategory) fetchSubcategories(selectedCategory.id);
  };

  // Barang CRUD
  const generatePrefix = (name: string) => {
    const upper = name.toUpperCase().replace(/[^A-Z]/g, "");
    const consonants = upper.replace(/[AIUEO]/g, "");
    if (consonants.length >= 3) return consonants.substring(0, 3);
    return upper.substring(0, 3).padEnd(3, "X");
  };
  const openAddBrg = async () => {
    setEditingBrg(null);
    const prefix = generatePrefix(selectedSubcategory?.nama || "BRG");
    const { data: existing } = await supabase.from("barang").select("kode").like("kode", `${prefix}-%`).order("kode", { ascending: false }).limit(1);
    let nextNum = 1;
    if (existing && existing.length > 0) { nextNum = (parseInt(existing[0].kode.split("-")[1]) || 0) + 1; }
    setFormBrg({ ...brgDefault, kode: `${prefix}-${String(nextNum).padStart(3, "0")}` });
    setOpenBrg(true);
  };
  const openEditBrg = (item: any) => {
    setEditingBrg(item);
    setFormBrg({ kode: item.kode, nama: item.nama, harga_beli: String(item.harga_beli || 0), harga_jual: String(item.harga_jual || 0), satuan: item.satuan, tambah_stok: "0" });
    setOpenBrg(true);
  };
  const handleSaveBrg = async () => {
    if (!formBrg.kode.trim() || !formBrg.nama.trim()) { toast.error("Kode dan Nama wajib diisi"); return; }

    const harga_beli = parseInt(formBrg.harga_beli) || 0;
    const harga_jual = parseInt(formBrg.harga_jual) || 0;
    const tambah_stok = parseInt(formBrg.tambah_stok) || 0;

    if (editingBrg) {
      // --- EDIT BARANG ---
      const updatePayload: any = {
        kode: formBrg.kode,
        nama: formBrg.nama,
        harga_beli,
        harga_jual,
        satuan: formBrg.satuan,
        kategori_id: selectedCategory?.id || null,
        subkategori_id: selectedSubcategory?.id || null,
      };

      const { error } = await supabase.from("barang").update(updatePayload).eq("id", editingBrg.id);
      if (error) { toast.error(error.message); return; }

      if (tambah_stok > 0) {
        await supabase.from("stok_masuk").insert({
          barang_id: editingBrg.id,
          jumlah: tambah_stok,
          tanggal: new Date().toISOString().split("T")[0],
          keterangan: "Tambah Stok via Kategori",
          user_id: user?.id ?? null,
        });
        await logAktivitas("Tambah Stok", `${formBrg.nama} +${tambah_stok}`);
        toast.success(`Stok ${formBrg.nama} bertambah +${tambah_stok}`);
      } else {
        await logAktivitas("Edit Barang", `${formBrg.nama} diperbarui`);
        toast.success("Barang diperbarui");
      }

    } else {
      // --- TAMBAH BARANG BARU ---
      const { error } = await supabase.from("barang").insert({
        kode: formBrg.kode,
        nama: formBrg.nama,
        harga_beli,
        harga_jual,
        satuan: formBrg.satuan,
        kategori_id: selectedCategory?.id || null,
        subkategori_id: selectedSubcategory?.id || null,
        stok: tambah_stok,
        stok_minimum: 0,
      });
      if (error) { toast.error(error.message); return; }
      await logAktivitas("Tambah Barang", `${formBrg.kode} - ${formBrg.nama} (Stok: ${tambah_stok})`);
      toast.success("Barang ditambahkan");
    }
    setOpenBrg(false);
    if (selectedSubcategory) fetchItems(selectedSubcategory.id);
  };
  const handleDeleteBrg = async (item: any) => {
    setConfirmState({
      open: true,
      title: "Hapus Barang",
      description: `Apakah Anda yakin ingin menghapus barang "${item.nama}"? Tindakan ini tidak dapat dibatalkan.`,
      variant: "danger",
      confirmLabel: "Ya, Hapus",
      onConfirm: async () => {
        setConfirmState(p => ({ ...p, open: false }));
        const { error } = await supabase.from("barang").delete().eq("id", item.id);
        if (error) { toast.error(error.message); return; }
        toast.success("Barang dihapus");
        if (selectedSubcategory) fetchItems(selectedSubcategory.id);
      },
    });
  };
  const handleResetStokBrg = async (item: any) => {
    setConfirmState({
      open: true,
      title: "Reset Stok",
      description: `Apakah Anda yakin ingin mereset stok "${item.nama}" menjadi 0? Stok saat ini: ${item.stok}.`,
      variant: "warning",
      confirmLabel: "Ya, Reset",
      onConfirm: async () => {
        setConfirmState(p => ({ ...p, open: false }));
        const { error } = await supabase.from("barang").update({ stok: 0 }).eq("id", item.id);
        if (error) { toast.error(error.message); return; }
        await logAktivitas("Reset Stok", `${item.nama} stok direset ke 0 (sebelumnya: ${item.stok})`);
        toast.success(`Stok ${item.nama} direset ke 0`);
        if (selectedSubcategory) fetchItems(selectedSubcategory.id);
      },
    });
  };

  // Filters
  const filteredCat = categories.filter(c => c.nama.toLowerCase().includes(search.toLowerCase()));
  const filteredSub = subcategories.filter(s => s.nama.toLowerCase().includes(search.toLowerCase()));
  const filteredItems = items.filter(i => i.nama.toLowerCase().includes(search.toLowerCase()) || i.kode.toLowerCase().includes(search.toLowerCase()));

  // Count subcategories per category (for display)
  const [subCounts, setSubCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase.from("subkategori").select("kategori_id").then(({ data }) => {
      if (!data) return;
      const counts: Record<string, number> = {};
      data.forEach(s => { counts[s.kategori_id] = (counts[s.kategori_id] || 0) + 1; });
      setSubCounts(counts);
    });
  }, [categories]);

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => { setView("kategori"); setSelectedCategory(null); setSelectedSubcategory(null); setSearch(""); }} className={`hover:underline ${view === "kategori" ? "font-bold text-primary" : ""}`}>Kategori</button>
        {selectedCategory && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => { setView("subkategori"); setSelectedSubcategory(null); setSearch(""); }} className={`hover:underline ${view === "subkategori" ? "font-bold text-primary" : ""}`}>{selectedCategory.nama}</button>
          </>
        )}
        {selectedSubcategory && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className="font-bold text-primary">{selectedSubcategory.nama}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== "kategori" && (
            <Button variant="outline" size="icon" onClick={goBack}><ArrowLeft className="h-4 w-4" /></Button>
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            {view === "kategori" ? "Kategori" :
              view === "subkategori" ? selectedCategory?.nama :
                selectedSubcategory?.nama}
          </h1>
        </div>
        <div className="flex gap-2">
          {view === "kategori" && (
            <Button size="sm" onClick={openAddKat}><Plus className="h-4 w-4 mr-1" />Tambah Kategori</Button>
          )}
          {view === "subkategori" && (
            <Button size="sm" onClick={openAddSub}><Plus className="h-4 w-4 mr-1" />Tambah Subkategori</Button>
          )}
          {view === "barang" && (
            <Button size="sm" onClick={openAddBrg}><Plus className="h-4 w-4 mr-1" />Tambah Barang</Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* === VIEW: CATEGORIES (Cards) === */}
      {view === "kategori" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCat.map(cat => (
            <Card
              key={cat.id}
              className="cursor-pointer group hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary"
              onClick={() => goToSubkategori(cat)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Folder className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate">{cat.nama}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cat.deskripsi || "Tidak ada deskripsi"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">{subCounts[cat.id] || 0} subkategori</Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
                {/* Admin actions */}
                <div className="flex gap-1 mt-3 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => openEditKat(cat, e)}>
                    <Pencil className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={(e) => handleDeleteKat(cat, e)}>
                    <Trash2 className="h-3 w-3 mr-1" />Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredCat.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Tidak ada kategori ditemukan.</p>
            </div>
          )}
        </div>
      )}

      {/* === VIEW: SUBCATEGORIES (Cards) === */}
      {view === "subkategori" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSub.map(sub => (
            <Card
              key={sub.id}
              className="cursor-pointer group hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500"
              onClick={() => goToBarang(sub)}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Layers className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{sub.nama}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Lihat barang →</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => openEditSub(sub, e)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          ))}
          {filteredSub.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada subkategori.</p>
            </div>
          )}
        </div>
      )}

      {/* === VIEW: ITEMS TABLE === */}
      {view === "barang" && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="text-right">H. Beli</TableHead>
                  <TableHead className="text-right">H. Jual</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="w-28 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      Belum ada barang di subkategori ini.
                    </TableCell>
                  </TableRow>
                ) : filteredItems.map((item, i) => {
                  const beli = Number(item.harga_beli) || 0;
                  const jual = Number(item.harga_jual) || 0;
                  const profit = jual - beli;
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono font-medium text-primary">{item.kode}</TableCell>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {beli ? `Rp ${beli.toLocaleString("id-ID")}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {jual ? `Rp ${jual.toLocaleString("id-ID")}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {profit > 0 ? (
                          <Badge variant="outline" className="text-green-600 border-green-600 font-mono text-xs">
                            +Rp {profit.toLocaleString("id-ID")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>{item.satuan}</TableCell>
                      <TableCell className="text-right font-bold">{item.stok}</TableCell>
                      <TableCell className="text-right">
                        {item.stok <= item.stok_minimum ? (
                          <Badge variant="destructive">Menipis</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">Aman</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditBrg(item)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-500" onClick={() => handleResetStokBrg(item)} title="Reset Stok">
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteBrg(item)} title="Hapus">
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
        </Card>
      )}

      {/* Add/Edit Kategori Dialog */}
      <Dialog open={openKat} onOpenChange={setOpenKat}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingKat ? "Edit" : "Tambah"} Kategori</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama</Label><Input value={formKat.nama} onChange={e => setFormKat(p => ({ ...p, nama: e.target.value }))} /></div>
            <div><Label>Deskripsi</Label><Textarea value={formKat.deskripsi} onChange={e => setFormKat(p => ({ ...p, deskripsi: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveKat}>{editingKat ? "Simpan" : "Tambah"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Subkategori Dialog */}
      <Dialog open={openSub} onOpenChange={setOpenSub}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSub ? "Edit" : "Tambah"} Subkategori</DialogTitle>
            <p className="text-sm text-muted-foreground">Kategori: {selectedCategory?.nama}</p>
          </DialogHeader>
          <div>
            <Label>Nama Subkategori</Label>
            <Input value={formSub.nama} onChange={e => setFormSub(p => ({ ...p, nama: e.target.value }))} placeholder="Nama subkategori" />
          </div>
          <DialogFooter><Button onClick={handleSaveSub}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Barang Dialog */}
      <Dialog open={openBrg} onOpenChange={setOpenBrg}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBrg ? "Edit" : "Tambah"} Barang</DialogTitle>
            <p className="text-sm text-muted-foreground">Kategori: {selectedCategory?.nama} → {selectedSubcategory?.nama}</p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Kode</Label><Input value={formBrg.kode} onChange={e => setFormBrg(p => ({ ...p, kode: e.target.value }))} /></div>
            <div>
              <Label>Satuan</Label>
              <Select value={formBrg.satuan} onValueChange={v => setFormBrg(p => ({ ...p, satuan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pcs", "kg", "meter", "liter", "batang", "lembar", "sak", "roll", "set", "dus", "kaleng", "galon"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Nama Barang</Label><Input value={formBrg.nama} onChange={e => setFormBrg(p => ({ ...p, nama: e.target.value }))} placeholder="Nama barang" /></div>
            <div><Label>Harga Beli</Label><Input type="number" value={formBrg.harga_beli} onChange={e => setFormBrg(p => ({ ...p, harga_beli: e.target.value }))} /></div>
            <div><Label>Harga Jual</Label><Input type="number" value={formBrg.harga_jual} onChange={e => setFormBrg(p => ({ ...p, harga_jual: e.target.value }))} /></div>
            <div><Label>Tambah Stok</Label><Input type="number" value={formBrg.tambah_stok} onChange={e => setFormBrg(p => ({ ...p, tambah_stok: e.target.value }))} placeholder="0" /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveBrg}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(o) => setConfirmState(p => ({ ...p, open: o }))}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
      />
    </div>
  );
}
