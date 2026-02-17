import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { logAktivitas } from "@/hooks/useLogAktivitas";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowLeft, Folder, Layers, Package, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function KatalogPage() {
    const { user } = useAuth();
    const [view, setView] = useState<"kategori" | "subkategori" | "barang">("kategori");

    const [categories, setCategories] = useState<any[]>([]);
    const [subcategories, setSubcategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);

    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<any>(null);
    const [search, setSearch] = useState("");

    // Kategori dialog
    const [katOpen, setKatOpen] = useState(false);
    const [editingKat, setEditingKat] = useState<any>(null);
    const [katForm, setKatForm] = useState({ nama: "", deskripsi: "" });

    // Subkategori dialog
    const [subOpen, setSubOpen] = useState(false);
    const [editingSub, setEditingSub] = useState<any>(null);
    const [subForm, setSubForm] = useState({ nama: "" });

    // Confirm dialog state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<any>(null);

    // Barang dialog
    const [addOpen, setAddOpen] = useState(false);
    const [editingBarang, setEditingBarang] = useState<any>(null);
    const formDefault = { kode: "", nama: "", harga_beli: "0", harga_jual: "0", satuan: "pcs", tambah_stok: "0" };
    const [addForm, setAddForm] = useState(formDefault);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const { data } = await supabase.from("kategori").select("*").order("nama");
        setCategories(data ?? []);
    };

    const fetchSubcategories = async (kategoriId: string) => {
        const { data } = await supabase.from("subkategori").select("*").eq("kategori_id", kategoriId).order("nama");
        setSubcategories(data ?? []);
    };

    const fetchItems = async (subkategoriId: string) => {
        const { data } = await supabase
            .from("barang")
            .select("*, kategori(nama), subkategori(nama)")
            .eq("subkategori_id", subkategoriId)
            .order("kode");
        setItems(data ?? []);
    };

    const handleSelectCategory = (cat: any) => {
        setSelectedCategory(cat);
        fetchSubcategories(cat.id);
        setView("subkategori");
        setSearch("");
    };

    const handleSelectSubcategory = (sub: any) => {
        setSelectedSubcategory(sub);
        fetchItems(sub.id);
        setView("barang");
        setSearch("");
    };

    const handleBack = () => {
        if (view === "barang") {
            setView("subkategori");
            setSelectedSubcategory(null);
            setItems([]);
        } else if (view === "subkategori") {
            setView("kategori");
            setSelectedCategory(null);
            setSubcategories([]);
        }
        setSearch("");
    };

    // Filter Logic
    const filteredCategories = categories.filter(c => c.nama.toLowerCase().includes(search.toLowerCase()));
    const filteredSubcategories = subcategories.filter(s => s.nama.toLowerCase().includes(search.toLowerCase()));
    const filteredItems = items.filter(i => i.nama.toLowerCase().includes(search.toLowerCase()) || i.kode.toLowerCase().includes(search.toLowerCase()));

    // ========== KATEGORI CRUD ==========
    const openAddKat = () => { setEditingKat(null); setKatForm({ nama: "", deskripsi: "" }); setKatOpen(true); };
    const openEditKat = (e: React.MouseEvent, cat: any) => {
        e.stopPropagation();
        setEditingKat(cat);
        setKatForm({ nama: cat.nama, deskripsi: cat.deskripsi || "" });
        setKatOpen(true);
    };
    const handleSaveKat = async () => {
        if (!katForm.nama.trim()) { toast.error("Nama kategori wajib diisi"); return; }
        if (editingKat) {
            const { error } = await supabase.from("kategori").update({ nama: katForm.nama, deskripsi: katForm.deskripsi || null }).eq("id", editingKat.id);
            if (error) { toast.error(error.message); return; }
            toast.success("Kategori diperbarui");
            if (selectedCategory?.id === editingKat.id) setSelectedCategory({ ...selectedCategory, nama: katForm.nama, deskripsi: katForm.deskripsi });
        } else {
            const { error } = await supabase.from("kategori").insert({ nama: katForm.nama, deskripsi: katForm.deskripsi || null });
            if (error) { toast.error(error.message); return; }
            toast.success("Kategori ditambahkan");
        }
        setKatOpen(false);
        fetchCategories();
    };

    // ========== SUBKATEGORI CRUD ==========
    const openAddSub = () => { setEditingSub(null); setSubForm({ nama: "" }); setSubOpen(true); };
    const openEditSub = (e: React.MouseEvent, sub: any) => {
        e.stopPropagation();
        setEditingSub(sub);
        setSubForm({ nama: sub.nama });
        setSubOpen(true);
    };
    const handleSaveSub = async () => {
        if (!subForm.nama.trim()) { toast.error("Nama subkategori wajib diisi"); return; }
        if (editingSub) {
            const { error } = await supabase.from("subkategori").update({ nama: subForm.nama }).eq("id", editingSub.id);
            if (error) { toast.error(error.message); return; }
            toast.success("Subkategori diperbarui");
            if (selectedSubcategory?.id === editingSub.id) setSelectedSubcategory({ ...selectedSubcategory, nama: subForm.nama });
        } else {
            const { error } = await supabase.from("subkategori").insert({ nama: subForm.nama, kategori_id: selectedCategory.id });
            if (error) { toast.error(error.message); return; }
            toast.success("Subkategori ditambahkan");
        }
        setSubOpen(false);
        if (selectedCategory) fetchSubcategories(selectedCategory.id);
    };

    // ========== BARANG CRUD ==========
    const generatePrefix = (name: string) => {
        const upper = name.toUpperCase().replace(/[^A-Z]/g, "");
        const consonants = upper.replace(/[AIUEO]/g, "");
        if (consonants.length >= 3) return consonants.substring(0, 3);
        return upper.substring(0, 3).padEnd(3, "X");
    };

    const openAddBarang = async () => {
        setEditingBarang(null);
        const prefix = generatePrefix(selectedSubcategory?.nama || "BRG");
        const { data: existing } = await supabase
            .from("barang")
            .select("kode")
            .like("kode", `${prefix}-%`)
            .order("kode", { ascending: false })
            .limit(1);
        let nextNum = 1;
        if (existing && existing.length > 0) {
            const lastNum = parseInt(existing[0].kode.split("-")[1]) || 0;
            nextNum = lastNum + 1;
        }
        const autoCode = `${prefix}-${String(nextNum).padStart(3, "0")}`;
        setAddForm({ ...formDefault, kode: autoCode });
        setAddOpen(true);
    };

    const openEditBarang = (item: any) => {
        setEditingBarang(item);
        setAddForm({
            kode: item.kode,
            nama: item.nama,
            harga_beli: String(item.harga_beli || 0),
            harga_jual: String(item.harga_jual || 0),
            satuan: item.satuan,
            tambah_stok: "0", // Default 0 when editing
        });
        setAddOpen(true);
    };

    const handleSaveBarang = async () => {
        if (!addForm.kode.trim() || !addForm.nama.trim()) { toast.error("Kode dan Nama wajib diisi"); return; }

        const harga_beli = parseInt(addForm.harga_beli) || 0;
        const harga_jual = parseInt(addForm.harga_jual) || 0;
        const tambah_stok = parseInt(addForm.tambah_stok) || 0;

        if (editingBarang) {
            // --- EDIT BARANG ---
            // 1. Update detail barang
            const updatePayload: any = {
                kode: addForm.kode,
                nama: addForm.nama,
                harga_beli,
                harga_jual,
                kategori_id: selectedCategory?.id || null,
                subkategori_id: selectedSubcategory?.id || null,
                satuan: addForm.satuan,
            };

            const { error } = await supabase.from("barang").update(updatePayload).eq("id", editingBarang.id);
            if (error) { toast.error(error.message); return; }

            // 3. Jika ada tambah stok, catat ke stok_masuk & log
            if (tambah_stok > 0) {
                await supabase.from("stok_masuk").insert({
                    barang_id: editingBarang.id,
                    jumlah: tambah_stok,
                    tanggal: new Date().toISOString().split("T")[0],
                    keterangan: "Tambah Stok via Katalog",
                    user_id: user?.id ?? null,
                });
                await logAktivitas("Tambah Stok", `${addForm.nama} +${tambah_stok}`);
                toast.success(`Stok ${addForm.nama} bertambah +${tambah_stok}`);
            } else {
                await logAktivitas("Edit Barang", `${addForm.nama} diperbarui`);
                toast.success("Barang diperbarui");
            }

        } else {
            // --- TAMBAH BARANG BARU ---
            const { error } = await supabase.from("barang").insert({
                kode: addForm.kode,
                nama: addForm.nama,
                harga_beli,
                harga_jual,
                kategori_id: selectedCategory?.id || null,
                subkategori_id: selectedSubcategory?.id || null,
                satuan: addForm.satuan,
                stok: tambah_stok,
                stok_minimum: 0,
            });
            if (error) { toast.error(error.message); return; }
            await logAktivitas("Tambah Barang", `${addForm.kode} - ${addForm.nama} (Stok: ${tambah_stok})`);
            toast.success("Barang berhasil ditambahkan!");
        }
        setAddOpen(false);
        if (selectedSubcategory) fetchItems(selectedSubcategory.id);
    };

    const handleDeleteBarang = (item: any) => {
        setConfirmTarget(item);
        setConfirmOpen(true);
    };
    const executeDeleteBarang = async () => {
        const item = confirmTarget;
        setConfirmOpen(false);
        setConfirmTarget(null);
        if (!item) return;
        const { error } = await supabase.from("barang").delete().eq("id", item.id);
        if (error) { toast.error(error.message); return; }
        toast.success("Barang dihapus");
        if (selectedSubcategory) fetchItems(selectedSubcategory.id);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={view === "kategori" ? "font-bold text-primary" : ""}>Kategori</span>
                    {selectedCategory && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className={view === "subkategori" ? "font-bold text-primary" : ""}>{selectedCategory.nama}</span>
                        </>
                    )}
                    {selectedSubcategory && (
                        <>
                            <ChevronRight className="h-4 w-4" />
                            <span className={view === "barang" ? "font-bold text-primary" : ""}>{selectedSubcategory.nama}</span>
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {view !== "kategori" && (
                            <Button variant="outline" size="icon" onClick={handleBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <h1 className="text-2xl font-bold tracking-tight">
                            {view === "kategori" ? "Katalog Barang" :
                                view === "subkategori" ? `Subkategori: ${selectedCategory?.nama}` :
                                    `Daftar Barang: ${selectedSubcategory?.nama}`}
                        </h1>
                    </div>
                    <div className="flex gap-2">
                        {view === "kategori" && (
                            <Button size="sm" onClick={openAddKat}>
                                <Plus className="h-4 w-4 mr-1" />Tambah Kategori
                            </Button>
                        )}
                        {view === "subkategori" && (
                            <Button size="sm" onClick={openAddSub}>
                                <Plus className="h-4 w-4 mr-1" />Tambah Subkategori
                            </Button>
                        )}
                        {view === "barang" && (
                            <Button size="sm" onClick={openAddBarang}>
                                <Plus className="h-4 w-4 mr-1" />Tambah Barang
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={view === "barang" ? "Cari nama/kode barang..." : "Cari..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* VIEW: CATEGORIES */}
            {view === "kategori" && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredCategories.map((cat) => (
                        <Card
                            key={cat.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-primary/0 hover:border-l-primary group relative"
                            onClick={() => handleSelectCategory(cat)}
                        >
                            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-full text-primary">
                                    <Folder className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{cat.nama}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{cat.deskripsi || "Tidak ada deskripsi"}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                    onClick={(e) => openEditKat(e, cat)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredCategories.length === 0 && (
                        <div className="col-span-full text-center py-10 text-muted-foreground">Tidak ada kategori ditemukan.</div>
                    )}
                </div>
            )}

            {/* VIEW: SUBCATEGORIES */}
            {view === "subkategori" && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredSubcategories.map((sub) => (
                        <Card
                            key={sub.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-blue-500/0 hover:border-l-blue-500 group relative"
                            onClick={() => handleSelectSubcategory(sub)}
                        >
                            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                                <div className="p-3 bg-blue-500/10 rounded-full text-blue-600">
                                    <Layers className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{sub.nama}</h3>
                                    <p className="text-sm text-muted-foreground">Lihat Barang &rarr;</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                    onClick={(e) => openEditSub(e, sub)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredSubcategories.length === 0 && (
                        <div className="col-span-full flex flex-col items-center py-10 text-muted-foreground">
                            <Package className="h-10 w-10 mb-2 opacity-50" />
                            <p>Subkategori kosong.</p>
                            <Button variant="link" onClick={handleBack}>Kembali</Button>
                        </div>
                    )}
                </div>
            )}

            {/* VIEW: ITEMS (BARANG) */}
            {view === "barang" && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 text-center">No</TableHead>
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Nama Barang</TableHead>
                                    <TableHead className="text-right">H. Beli</TableHead>
                                    <TableHead className="text-right">H. Jual</TableHead>
                                    <TableHead className="text-right">Margin</TableHead>
                                    <TableHead>Satuan</TableHead>
                                    <TableHead className="text-right">Stok</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                    <TableHead className="w-20 text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Belum ada barang di sini.</TableCell>
                                    </TableRow>
                                ) : filteredItems.map((item, i) => {
                                    const beli = Number(item.harga_beli) || 0;
                                    const jual = Number(item.harga_jual) || 0;
                                    const profit = jual - beli;
                                    return (
                                        <TableRow key={item.id} className="hover:bg-muted/50">
                                            <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="font-mono font-medium text-primary">{item.kode}</TableCell>
                                            <TableCell className="font-medium text-base">{item.nama}</TableCell>
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
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditBarang(item)}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteBarang(item)}>
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

            {/* DIALOG KATEGORI */}
            <Dialog open={katOpen} onOpenChange={setKatOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editingKat ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Nama Kategori</Label>
                            <Input value={katForm.nama} onChange={e => setKatForm(p => ({ ...p, nama: e.target.value }))} placeholder="Nama kategori" />
                        </div>
                        <div>
                            <Label>Deskripsi</Label>
                            <Textarea value={katForm.deskripsi} onChange={e => setKatForm(p => ({ ...p, deskripsi: e.target.value }))} placeholder="Deskripsi (opsional)" rows={2} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveKat}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOG SUBKATEGORI */}
            <Dialog open={subOpen} onOpenChange={setSubOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editingSub ? "Edit Subkategori" : "Tambah Subkategori"}</DialogTitle>
                        <p className="text-sm text-muted-foreground">Kategori: {selectedCategory?.nama}</p>
                    </DialogHeader>
                    <div>
                        <Label>Nama Subkategori</Label>
                        <Input value={subForm.nama} onChange={e => setSubForm(p => ({ ...p, nama: e.target.value }))} placeholder="Nama subkategori" />
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveSub}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOG BARANG */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingBarang ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Kategori: {selectedCategory?.nama} → {selectedSubcategory?.nama}
                        </p>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Kode</Label>
                            <Input value={addForm.kode} onChange={e => setAddForm(p => ({ ...p, kode: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Satuan</Label>
                            <Select value={addForm.satuan} onValueChange={v => setAddForm(p => ({ ...p, satuan: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {["pcs", "kg", "meter", "liter", "batang", "lembar", "sak", "roll", "set", "dus", "kaleng", "galon"].map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label>Nama Barang</Label>
                            <Input value={addForm.nama} onChange={e => setAddForm(p => ({ ...p, nama: e.target.value }))} placeholder="Nama barang" />
                        </div>
                        <div>
                            <Label>Harga Beli</Label>
                            <Input type="number" value={addForm.harga_beli} onChange={e => setAddForm(p => ({ ...p, harga_beli: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Harga Jual</Label>
                            <Input type="number" value={addForm.harga_jual} onChange={e => setAddForm(p => ({ ...p, harga_jual: e.target.value }))} />
                        </div>
                        <div>
                            <Label>Tambah Stok</Label>
                            <Input type="number" value={addForm.tambah_stok} onChange={e => setAddForm(p => ({ ...p, tambah_stok: e.target.value }))} placeholder="0" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveBarang}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Hapus Barang"
                description={`Apakah Anda yakin ingin menghapus barang "${confirmTarget?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
                variant="danger"
                confirmLabel="Ya, Hapus"
                onConfirm={executeDeleteBarang}
            />
        </div>
    );
}
