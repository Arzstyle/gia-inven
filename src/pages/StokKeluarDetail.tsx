import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Printer, TrendingUp, Package, CalendarDays, DollarSign } from "lucide-react";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function StokKeluarDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const bonRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [stokKeluar, setStokKeluar] = useState<any>(null);
    const [bonDetail, setBonDetail] = useState<any>(null);
    const [isBon, setIsBon] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchDetail = async () => {
            setLoading(true);

            // Fetch the stok_keluar record
            const { data: sk } = await supabase
                .from("stok_keluar")
                .select("*, barang(kode, nama, harga_beli, harga_jual, satuan, stok, kategori_id, subkategori_id)")
                .eq("id", id)
                .single();

            if (!sk) {
                toast.error("Data tidak ditemukan");
                navigate("/stok-keluar");
                return;
            }
            setStokKeluar(sk);

            // Check if from Penjualan
            if (sk.keterangan?.startsWith("Penjualan: ")) {
                setIsBon(true);
                const bonCode = sk.keterangan.replace("Penjualan: ", "");
                const { data: penjualan } = await supabase
                    .from("penjualan")
                    .select("*")
                    .eq("nomor_bon", bonCode)
                    .single();

                if (penjualan) {
                    const { data: items } = await supabase
                        .from("penjualan_item")
                        .select("*, barang(kode, nama, harga_beli)")
                        .eq("penjualan_id", (penjualan as any).id);

                    setBonDetail({
                        nomor_bon: (penjualan as any).nomor_bon,
                        tanggal: new Date((penjualan as any).tanggal),
                        pembeli: (penjualan as any).pembeli,
                        items: (items ?? []).map((it: any) => ({
                            nama: it.barang?.nama ?? "-",
                            kode: it.barang?.kode ?? "-",
                            jumlah: it.jumlah,
                            harga_beli: Number(it.barang?.harga_beli) || 0,
                            harga_jual: Number(it.harga_jual),
                            subtotal: Number(it.subtotal),
                            keuntungan: (Number(it.harga_jual) - (Number(it.barang?.harga_beli) || 0)) * it.jumlah,
                        })),
                        total: Number((penjualan as any).total),
                        bayar: Number((penjualan as any).bayar),
                        kembali: Number((penjualan as any).kembali),
                    });
                }
            } else {
                setIsBon(false);
            }

            setLoading(false);
        };
        fetchDetail();
    }, [id]);

    const handlePrintBon = () => {
        const content = bonRef.current;
        if (!content) return;
        const printWindow = window.open("", "_blank", "width=400,height=600");
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>Bon - ${bonDetail?.nomor_bon}</title><style>body{margin:0;padding:10px;font-family:'Courier New',monospace;font-size:12px;}@media print{body{margin:0;}}</style></head><body>${content.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 300);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!stokKeluar) return null;

    const beli = Number(stokKeluar.barang?.harga_beli) || 0;
    const jual = Number(stokKeluar.barang?.harga_jual) || 0;
    const profit = (jual - beli) * stokKeluar.jumlah;
    const bonTotalKeuntungan = bonDetail?.items?.reduce((s: number, it: any) => s + it.keuntungan, 0) || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/stok-keluar")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">Detail Stok Keluar</h1>
                    <p className="text-sm text-muted-foreground">
                        {isBon ? `Penjualan: ${bonDetail?.nomor_bon}` : `Manual: ${stokKeluar.barang?.nama}`}
                    </p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-bold">{new Date(stokKeluar.tanggal).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                            <p className="text-xs text-muted-foreground">Tanggal</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Package className="h-5 w-5 text-destructive" />
                        <div>
                            <p className="text-lg font-bold">{isBon ? bonDetail?.items?.reduce((s: number, it: any) => s + it.jumlah, 0) : stokKeluar.jumlah} item</p>
                            <p className="text-xs text-muted-foreground">Total Qty Keluar</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <div>
                            <p className="text-sm font-bold">{fmt(isBon ? bonDetail?.total ?? 0 : jual * stokKeluar.jumlah)}</p>
                            <p className="text-xs text-muted-foreground">Total Pendapatan</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
                    <CardContent className="p-4 flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <div>
                            <p className="text-sm font-bold text-green-700 dark:text-green-400">{fmt(isBon ? bonTotalKeuntungan : profit)}</p>
                            <p className="text-xs text-muted-foreground">Total Keuntungan</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isBon && bonDetail ? (
                <>
                    {/* Bon / Struk */}
                    <Card>
                        <CardHeader className="py-3 px-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">🧾 Struk / Bon Penjualan</CardTitle>
                                <Button size="sm" onClick={handlePrintBon}><Printer className="h-4 w-4 mr-1" />Cetak Bon</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="max-w-md mx-auto border rounded-lg p-4 bg-white dark:bg-gray-950" ref={bonRef} style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", lineHeight: "1.4", color: "#000", background: "#fff" }}>
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
                                <div style={{ marginBottom: "8px" }}>
                                    <div>Nota No. : {bonDetail.nomor_bon}</div>
                                    <div>Tanggal : {bonDetail.tanggal ? new Date(bonDetail.tanggal).toLocaleDateString("id-ID") : "-"}</div>
                                    {bonDetail.pembeli && <div>Kepada Yth. : {bonDetail.pembeli}</div>}
                                </div>
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
                                        {bonDetail.items?.map((item: any, i: number) => (
                                            <tr key={i} style={{ borderBottom: "1px dotted #ccc" }}>
                                                <td style={{ padding: "3px 2px" }}>{item.jumlah}</td>
                                                <td style={{ padding: "3px 2px" }}>{item.nama}</td>
                                                <td style={{ textAlign: "right", padding: "3px 2px" }}>{item.harga_jual.toLocaleString("id-ID")}</td>
                                                <td style={{ textAlign: "right", padding: "3px 2px" }}>{item.subtotal.toLocaleString("id-ID")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ borderTop: "2px solid #000", marginTop: "4px", paddingTop: "4px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "13px" }}>
                                        <span>Jumlah Rp.</span><span>{bonDetail.total?.toLocaleString("id-ID")}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>Bayar</span><span>{bonDetail.bayar?.toLocaleString("id-ID")}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                                        <span>Kembali</span><span>{bonDetail.kembali?.toLocaleString("id-ID")}</span>
                                    </div>
                                </div>
                                <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                    <div style={{ textAlign: "center" }}><div>Tanda terima,</div><div style={{ marginTop: "40px" }}>____________</div></div>
                                    <div style={{ textAlign: "center" }}><div>Hormat kami,</div><div style={{ marginTop: "40px" }}>____________</div></div>
                                </div>
                                <div style={{ textAlign: "center", marginTop: "12px", fontSize: "9px", fontStyle: "italic", borderTop: "1px solid #000", paddingTop: "4px" }}>
                                    Perhatian !!! Barang yang sudah dibeli tidak dapat ditukar / dikembalikan
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Profit Breakdown Table */}
                    <Card className="border-green-200">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm text-green-700">💰 Rincian Keuntungan per Barang</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-8">#</TableHead>
                                            <TableHead>Kode</TableHead>
                                            <TableHead>Nama Barang</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">H. Beli</TableHead>
                                            <TableHead className="text-right">H. Jual</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                            <TableHead className="text-right">Keuntungan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bonDetail.items?.map((it: any, i: number) => (
                                            <TableRow key={i}>
                                                <TableCell>{i + 1}</TableCell>
                                                <TableCell className="font-mono text-xs">{it.kode}</TableCell>
                                                <TableCell className="font-medium">{it.nama}</TableCell>
                                                <TableCell className="text-right">{it.jumlah}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{fmt(it.harga_beli)}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{fmt(it.harga_jual)}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{fmt(it.subtotal)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline" className={it.keuntungan >= 0 ? "text-green-600 border-green-600 font-mono text-xs" : "text-red-600 border-red-600 font-mono text-xs"}>
                                                        {it.keuntungan >= 0 ? "+" : ""}{fmt(it.keuntungan)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/50 font-bold border-t-2">
                                            <TableCell colSpan={3} className="text-right">TOTAL</TableCell>
                                            <TableCell className="text-right">{bonDetail.items?.reduce((s: number, it: any) => s + it.jumlah, 0)}</TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell className="text-right font-mono">{fmt(bonDetail.total)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge className="bg-green-600 font-mono text-xs">{fmt(bonTotalKeuntungan)}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                /* Non-bon detail */
                <Card>
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">📦 Detail Barang Keluar</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Kode</TableHead>
                                        <TableHead>Nama Barang</TableHead>
                                        <TableHead>Satuan</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Harga Beli</TableHead>
                                        <TableHead className="text-right">Harga Jual</TableHead>
                                        <TableHead className="text-right">Total Modal</TableHead>
                                        <TableHead className="text-right">Total Pendapatan</TableHead>
                                        <TableHead className="text-right">Keuntungan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-mono text-xs">{stokKeluar.barang?.kode}</TableCell>
                                        <TableCell className="font-medium">{stokKeluar.barang?.nama}</TableCell>
                                        <TableCell>{stokKeluar.barang?.satuan}</TableCell>
                                        <TableCell className="text-right font-medium">{stokKeluar.jumlah}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{fmt(beli)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{fmt(jual)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{fmt(beli * stokKeluar.jumlah)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{fmt(jual * stokKeluar.jumlah)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className={profit >= 0 ? "text-green-600 border-green-600 font-mono text-xs" : "text-red-600 border-red-600 font-mono text-xs"}>
                                                {profit >= 0 ? "+" : ""}{fmt(profit)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    {stokKeluar.keterangan && (
                        <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground">
                            <strong>Keterangan:</strong> {stokKeluar.keterangan}
                        </div>
                    )}
                </Card>
            )}

            {/* Back Button */}
            <div className="flex justify-start">
                <Button variant="outline" onClick={() => navigate("/stok-keluar")}>
                    <ArrowLeft className="h-4 w-4 mr-1" />Kembali ke Stok Keluar
                </Button>
            </div>
        </div>
    );
}
