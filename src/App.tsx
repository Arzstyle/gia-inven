import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Katalog from "@/pages/Katalog";
import Penjualan from "@/pages/Penjualan";
import Kategori from "@/pages/Kategori";
import Subkategori from "@/pages/Subkategori";
import Barang from "@/pages/Barang";
import Supplier from "@/pages/Supplier";
import StokMasuk from "@/pages/StokMasuk";
import StokKeluar from "@/pages/StokKeluar";
import Laporan from "@/pages/Laporan";
import LogAktivitas from "@/pages/LogAktivitas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="katalog" element={<Katalog />} />
              <Route path="penjualan" element={<Penjualan />} />
              <Route path="kategori" element={<Kategori />} />
              <Route path="subkategori" element={<Subkategori />} />
              <Route path="barang" element={<Barang />} />
              <Route path="supplier" element={<Supplier />} />
              <Route path="stok-masuk" element={<StokMasuk />} />
              <Route path="stok-keluar" element={<StokKeluar />} />
              <Route path="laporan" element={<Laporan />} />
              <Route path="log-aktivitas" element={<LogAktivitas />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
