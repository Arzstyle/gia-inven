import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowLeft, Folder, Layers, Package, ChevronRight, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function KatalogPage() {
    const [view, setView] = useState<"kategori" | "subkategori" | "barang">("kategori");

    const [categories, setCategories] = useState<any[]>([]);
    const [subcategories, setSubcategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);

    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<any>(null);
    const [search, setSearch] = useState("");

    // Tambah Barang dialog
    const [addOpen, setAddOpen] = useState(false);
    const formDefault = { kode: "", nama: "", harga_beli: "0", harga_jual: "0", satuan: "pcs", stok_minimum: "0" };
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

    const generatePrefix = (name: string) => {
        const upper = name.toUpperCase().replace(/[^A-Z]/g, "");
        const consonants = upper.replace(/[AIUEO]/g, "");
        if (consonants.length >= 3) return consonants.substring(0, 3);
        return upper.substring(0, 3).padEnd(3, "X");
    };

    const openAddBarang = async () => {
        const prefix = generatePrefix(selectedSubcategory?.nama || "BRG");
        // Find next available number for this prefix
        const { data: existing } = await supabase
            .from("barang")
            .select("kode")
            .like("kode", `${prefix}-%`)
            .order("kode", { ascending: false })
            .limit(1);
        let nextNum = 1;
        if (existing && existing.length > 0) {
            const lastCode = existing[0].kode;
            const lastNum = parseInt(lastCode.split("-")[1]) || 0;
            nextNum = lastNum + 1;
        }
        const autoCode = `${prefix}-${String(nextNum).padStart(3, "0")}`;
        setAddForm({ ...formDefault, kode: autoCode });
        setAddOpen(true);
    };

    const handleSaveBarang = async () => {
        if (!addForm.kode.trim() || !addForm.nama.trim()) { toast.error("Kode dan Nama wajib diisi"); return; }
        const { error } = await supabase.from("barang").insert({
            kode: addForm.kode,
            nama: addForm.nama,
            harga_beli: parseInt(addForm.harga_beli) || 0,
            harga_jual: parseInt(addForm.harga_jual) || 0,
            kategori_id: selectedCategory?.id || null,
            subkategori_id: selectedSubcategory?.id || null,
            satuan: addForm.satuan,
            stok_minimum: parseInt(addForm.stok_minimum) || 0,
        });
        if (error) { toast.error(error.message); return; }
        toast.success("Barang berhasil ditambahkan!");
        setAddOpen(false);
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
                    {view === "barang" && (
                        <Button size="sm" onClick={openAddBarang}>
                            <Plus className="h-4 w-4 mr-1" />Tambah Barang
                        </Button>
                    )}
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
                            className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-primary/0 hover:border-l-primary"
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
                            className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-blue-500/0 hover:border-l-blue-500"
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Belum ada barang di sini.</TableCell>
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
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}

            {/* DIALOG TAMBAH BARANG */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Barang Baru</DialogTitle>
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
                            <Label>Stok Minimum</Label>
                            <Input type="number" value={addForm.stok_minimum} onChange={e => setAddForm(p => ({ ...p, stok_minimum: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveBarang}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
