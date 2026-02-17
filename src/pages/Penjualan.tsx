import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAktivitas } from "@/hooks/useLogAktivitas";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, Printer, Check, ChevronsUpDown, Save, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

type CartItem = {
    barang_id: string;
    kode: string;
    nama: string;
    harga_jual: number;
    satuan: string;
    stok: number;
    jumlah: number;
    subtotal: number;
};

export default function Penjualan() {
    const { user } = useAuth();
    const [barangList, setBarangList] = useState<any[]>([]);
    const [kategoriList, setKategoriList] = useState<any[]>([]);
    const [subkategoriList, setSubkategoriList] = useState<any[]>([]);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [pembeli, setPembeli] = useState("");
    const [bayar, setBayar] = useState("");

    // Combobox
    const [comboOpen, setComboOpen] = useState(false);
    const [filterKat, setFilterKat] = useState("all");
    const [filterSub, setFilterSub] = useState("all");

    // Bon preview
    const [bonOpen, setBonOpen] = useState(false);
    const [savedBon, setSavedBon] = useState<any>(null);
    const bonRef = useRef<HTMLDivElement>(null);

    // Riwayat
    const [riwayat, setRiwayat] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [brgRes, katRes, subRes, riwRes] = await Promise.all([
            supabase.from("barang").select("id, kode, nama, harga_jual, satuan, stok, kategori_id, subkategori_id").order("nama"),
            supabase.from("kategori").select("*").order("nama"),
            supabase.from("subkategori").select("*").order("nama"),
            supabase.from("penjualan").select("*").order("created_at", { ascending: false }).limit(10),
        ]);
        setBarangList(brgRes.data ?? []);
        setKategoriList(katRes.data ?? []);
        setSubkategoriList(subRes.data ?? []);
        setRiwayat(riwRes.data ?? []);
    };

    const filteredBarang = barangList.filter(b => {
        const matchKat = filterKat === "all" || b.kategori_id === filterKat;
        const matchSub = filterSub === "all" || b.subkategori_id === filterSub;
        return matchKat && matchSub;
    });

    const filteredSubForDialog = filterKat === "all"
        ? subkategoriList
        : subkategoriList.filter(s => s.kategori_id === filterKat);

    const addToCart = (barang: any) => {
        const existing = cart.find(c => c.barang_id === barang.id);
        if (existing) {
            if (existing.jumlah >= barang.stok) {
                toast.error(`Stok ${barang.nama} tidak cukup (tersedia: ${barang.stok})`);
                return;
            }
            setCart(cart.map(c =>
                c.barang_id === barang.id
                    ? { ...c, jumlah: c.jumlah + 1, subtotal: (c.jumlah + 1) * c.harga_jual }
                    : c
            ));
        } else {
            if (barang.stok <= 0) {
                toast.error(`Stok ${barang.nama} habis!`);
                return;
            }
            setCart([...cart, {
                barang_id: barang.id,
                kode: barang.kode,
                nama: barang.nama,
                harga_jual: Number(barang.harga_jual) || 0,
                satuan: barang.satuan,
                stok: barang.stok,
                jumlah: 1,
                subtotal: Number(barang.harga_jual) || 0,
            }]);
        }
        setComboOpen(false);
        toast.success(`${barang.nama} ditambahkan`);
    };

    const updateQty = (barangId: string, qty: number) => {
        if (qty <= 0) {
            setCart(cart.filter(c => c.barang_id !== barangId));
            return;
        }
        const item = cart.find(c => c.barang_id === barangId);
        if (item && qty > item.stok) {
            toast.error(`Stok tersedia: ${item.stok}`);
            return;
        }
        setCart(cart.map(c =>
            c.barang_id === barangId
                ? { ...c, jumlah: qty, subtotal: qty * c.harga_jual }
                : c
        ));
    };

    const removeItem = (barangId: string) => {
        setCart(cart.filter(c => c.barang_id !== barangId));
    };

    const total = cart.reduce((s, c) => s + c.subtotal, 0);
    const bayarNum = Number(bayar) || 0;
    const kembali = bayarNum - total;

    const generateBonNumber = () => {
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        const timeStr = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
        return `BON-${dateStr}-${timeStr}`;
    };

    const handleSave = async () => {
        if (cart.length === 0) { toast.error("Keranjang masih kosong"); return; }
        if (bayarNum < total) { toast.error("Jumlah bayar kurang dari total"); return; }

        const nomorBon = generateBonNumber();

        // Insert penjualan header
        const { data: penjualanData, error: penjualanErr } = await supabase.from("penjualan").insert({
            nomor_bon: nomorBon,
            tanggal: new Date().toISOString().split("T")[0],
            pembeli: pembeli || null,
            total,
            bayar: bayarNum,
            kembali,
            user_id: user!.id,
        }).select().single();

        if (penjualanErr) { toast.error(penjualanErr.message); return; }

        // Insert penjualan items (trigger will auto-insert stok_keluar)
        const items = cart.map(c => ({
            penjualan_id: penjualanData.id,
            barang_id: c.barang_id,
            jumlah: c.jumlah,
            harga_jual: c.harga_jual,
            subtotal: c.subtotal,
        }));

        const { error: itemsErr } = await supabase.from("penjualan_item").insert(items);
        if (itemsErr) { toast.error(itemsErr.message); return; }

        await logAktivitas("Penjualan", `${nomorBon} - ${cart.length} item - ${fmt(total)}`);

        setSavedBon({
            nomor_bon: nomorBon,
            tanggal: new Date(),
            pembeli,
            items: [...cart],
            total,
            bayar: bayarNum,
            kembali,
        });
        setBonOpen(true);
        toast.success("Penjualan berhasil disimpan!");
    };

    const handlePrint = () => {
        const content = bonRef.current;
        if (!content) return;
        const printWindow = window.open("", "_blank", "width=400,height=600");
        if (!printWindow) return;
        printWindow.document.write(`
      <html>
        <head>
          <title>Bon - ${savedBon?.nomor_bon}</title>
          <style>
            body { margin: 0; padding: 10px; font-family: 'Courier New', monospace; font-size: 12px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 300);
    };

    const handleNewTransaction = () => {
        setCart([]);
        setPembeli("");
        setBayar("");
        setBonOpen(false);
        setSavedBon(null);
        fetchData();
    };

    const viewBon = async (penjualan: any) => {
        const { data: items } = await supabase
            .from("penjualan_item")
            .select("*, barang(kode, nama)")
            .eq("penjualan_id", penjualan.id);
        setSavedBon({
            nomor_bon: penjualan.nomor_bon,
            tanggal: new Date(penjualan.tanggal),
            pembeli: penjualan.pembeli,
            items: (items ?? []).map((it: any) => ({
                barang_id: it.barang_id,
                kode: it.barang?.kode ?? "-",
                nama: it.barang?.nama ?? "-",
                harga_jual: Number(it.harga_jual),
                satuan: "",
                stok: 0,
                jumlah: it.jumlah,
                subtotal: Number(it.subtotal),
            })),
            total: Number(penjualan.total),
            bayar: Number(penjualan.bayar),
            kembali: Number(penjualan.kembali),
        });
        setBonOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" /> Penjualan
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* LEFT: Item Picker + Cart */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filter + Combobox */}
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <Label className="text-sm font-medium">➕ Tambah Barang ke Keranjang</Label>
                            <div className="flex gap-2">
                                <Select value={filterKat} onValueChange={v => { setFilterKat(v); setFilterSub("all"); }}>
                                    <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Kategori" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Kategori</SelectItem>
                                        {kategoriList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={filterSub} onValueChange={setFilterSub}>
                                    <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Sub" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Sub</SelectItem>
                                        {filteredSubForDialog.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Popover open={comboOpen} onOpenChange={setComboOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                                        <span className="text-muted-foreground">Ketik untuk cari barang...</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Cari nama/kode barang..." />
                                        <CommandList>
                                            <CommandEmpty>Barang tidak ditemukan.</CommandEmpty>
                                            <CommandGroup>
                                                {filteredBarang.map(b => {
                                                    const inCart = cart.find(c => c.barang_id === b.id);
                                                    return (
                                                        <CommandItem
                                                            key={b.id}
                                                            value={`${b.kode} ${b.nama}`}
                                                            onSelect={() => addToCart(b)}
                                                        >
                                                            <Plus className="mr-2 h-4 w-4 text-green-600" />
                                                            <span className="font-mono text-xs mr-2 text-muted-foreground">[{b.kode}]</span>
                                                            <span className="flex-1 truncate">{b.nama}</span>
                                                            <span className="text-xs text-muted-foreground ml-2">
                                                                {fmt(Number(b.harga_jual) || 0)} · stok:{b.stok}
                                                            </span>
                                                            {inCart && (
                                                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                                                                    {inCart.jumlah}x
                                                                </span>
                                                            )}
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </CardContent>
                    </Card>

                    {/* Cart Table */}
                    <Card>
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm">🛒 Keranjang ({cart.length} item)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-8">#</TableHead>
                                        <TableHead>Kode</TableHead>
                                        <TableHead>Nama Barang</TableHead>
                                        <TableHead className="text-right">Harga</TableHead>
                                        <TableHead className="text-center w-24">Qty</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                Belum ada barang. Cari dan tambahkan barang di atas ☝️
                                            </TableCell>
                                        </TableRow>
                                    ) : cart.map((item, i) => (
                                        <TableRow key={item.barang_id}>
                                            <TableCell>{i + 1}</TableCell>
                                            <TableCell className="font-mono text-xs">{item.kode}</TableCell>
                                            <TableCell className="font-medium">{item.nama}</TableCell>
                                            <TableCell className="text-right font-mono text-sm">{fmt(item.harga_jual)}</TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    value={item.jumlah}
                                                    onChange={e => updateQty(item.barang_id, parseInt(e.target.value) || 0)}
                                                    className="w-20 h-8 text-center mx-auto"
                                                    min={0}
                                                    max={item.stok}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">{fmt(item.subtotal)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.barang_id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: Summary + Pay */}
                <div className="space-y-4">
                    <Card className="border-primary/30">
                        <CardHeader className="py-3 px-4 bg-primary/5">
                            <CardTitle className="text-sm">💰 Ringkasan</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">Kepada / Pembeli</Label>
                                <Input placeholder="Nama pembeli (opsional)" value={pembeli} onChange={e => setPembeli(e.target.value)} className="h-9" />
                            </div>

                            <div className="border-t pt-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Item</span>
                                    <span className="font-medium">{cart.reduce((s, c) => s + c.jumlah, 0)} pcs</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-primary">{fmt(total)}</span>
                                </div>
                            </div>

                            <div className="border-t pt-3 space-y-2">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Bayar</Label>
                                    <Input
                                        type="number"
                                        placeholder="Jumlah bayar"
                                        value={bayar}
                                        onChange={e => setBayar(e.target.value)}
                                        className="h-10 text-lg font-bold"
                                    />
                                </div>
                                {bayarNum > 0 && (
                                    <div className={`flex justify-between text-lg font-bold p-2 rounded ${kembali >= 0 ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"}`}>
                                        <span>Kembali</span>
                                        <span>{fmt(kembali)}</span>
                                    </div>
                                )}
                            </div>

                            <Button className="w-full h-12 text-lg" onClick={handleSave} disabled={cart.length === 0 || bayarNum < total}>
                                <Save className="h-5 w-5 mr-2" />
                                Simpan & Cetak Bon
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Riwayat Penjualan */}
                    <Card>
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm">📋 Riwayat Terakhir</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {riwayat.length === 0 ? (
                                <p className="text-center text-muted-foreground text-sm py-4">Belum ada riwayat</p>
                            ) : (
                                <div className="divide-y">
                                    {riwayat.map(r => (
                                        <div key={r.id} className="px-4 py-2 text-sm flex justify-between items-center hover:bg-muted/50 cursor-pointer" onClick={() => viewBon(r)}>
                                            <div>
                                                <p className="font-mono text-xs text-muted-foreground">{r.nomor_bon}</p>
                                                <p className="text-xs">{new Date(r.tanggal).toLocaleDateString("id-ID")} {r.pembeli ? `· ${r.pembeli}` : ""}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm">{fmt(Number(r.total))}</span>
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* BON PREVIEW DIALOG */}
            <Dialog open={bonOpen} onOpenChange={setBonOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Bon Penjualan</DialogTitle></DialogHeader>

                    {/* Printable Bon */}
                    <div ref={bonRef} style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", lineHeight: "1.4", color: "#000", background: "#fff", padding: "16px" }}>
                        {/* Header */}
                        <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "8px" }}>
                            <div style={{ fontSize: "18px", fontWeight: "bold" }}>GIA MULYA</div>
                            <div style={{ fontSize: "10px" }}>KONSTRUKSI & PEMASANGAN</div>
                            <div style={{ fontSize: "10px" }}>BENGKEL LAS · TOKO BANGUNAN</div>
                            <div style={{ fontSize: "9px", marginTop: "4px" }}>MENERIMA PESANAN:</div>
                            <div style={{ fontSize: "9px" }}>PAGAR - TERALIS - STAINLESS - KANOPI - GALVALUM - PLAT BAJA</div>
                            <div style={{ fontSize: "9px" }}>ALAT-ALAT LISTRIK</div>
                            <div style={{ fontSize: "10px", marginTop: "4px", fontWeight: "bold" }}>JL. NAGRAK CISAAT NO. 45 SUKABUMI</div>
                            <div style={{ fontSize: "10px", fontWeight: "bold" }}>HP/WA: 085217147864 / 082111648392</div>
                        </div>

                        {/* Info */}
                        <div style={{ marginBottom: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Nota No. : {savedBon?.nomor_bon}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Tanggal : {savedBon?.tanggal ? new Date(savedBon.tanggal).toLocaleDateString("id-ID") : "-"}</span>
                            </div>
                            {savedBon?.pembeli && (
                                <div>Kepada Yth. : {savedBon.pembeli}</div>
                            )}
                        </div>

                        {/* Table */}
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                            <thead>
                                <tr style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                                    <th style={{ textAlign: "left", padding: "4px 2px" }}>Banyak</th>
                                    <th style={{ textAlign: "left", padding: "4px 2px" }}>Nama Barang</th>
                                    <th style={{ textAlign: "right", padding: "4px 2px" }}>Harga</th>
                                    <th style={{ textAlign: "right", padding: "4px 2px" }}>Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {savedBon?.items?.map((item: CartItem, i: number) => (
                                    <tr key={i} style={{ borderBottom: "1px dotted #ccc" }}>
                                        <td style={{ padding: "3px 2px" }}>{item.jumlah}</td>
                                        <td style={{ padding: "3px 2px" }}>{item.nama}</td>
                                        <td style={{ textAlign: "right", padding: "3px 2px" }}>{item.harga_jual.toLocaleString("id-ID")}</td>
                                        <td style={{ textAlign: "right", padding: "3px 2px" }}>{item.subtotal.toLocaleString("id-ID")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Total */}
                        <div style={{ borderTop: "2px solid #000", marginTop: "4px", paddingTop: "4px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "13px" }}>
                                <span>Jumlah Rp.</span>
                                <span>{savedBon?.total?.toLocaleString("id-ID")}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Bayar</span>
                                <span>{savedBon?.bayar?.toLocaleString("id-ID")}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                                <span>Kembali</span>
                                <span>{savedBon?.kembali?.toLocaleString("id-ID")}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                            <div style={{ textAlign: "center" }}>
                                <div>Tanda terima,</div>
                                <div style={{ marginTop: "40px" }}>____________</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <div>Hormat kami,</div>
                                <div style={{ marginTop: "40px" }}>____________</div>
                            </div>
                        </div>

                        <div style={{ textAlign: "center", marginTop: "12px", fontSize: "9px", fontStyle: "italic", borderTop: "1px solid #000", paddingTop: "4px" }}>
                            Perhatian !!! Barang yang sudah dibeli tidak dapat ditukar / dikembalikan
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        {cart.length > 0 && <Button variant="outline" onClick={handleNewTransaction}>Transaksi Baru</Button>}
                        <Button variant="outline" onClick={() => setBonOpen(false)}>Tutup</Button>
                        <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Cetak Bon</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
