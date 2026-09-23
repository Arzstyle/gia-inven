import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, LogIn, KeyRound } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cleanUsername = username.trim();
    const emailToUse = cleanUsername.includes("@") ? cleanUsername : `${cleanUsername}@gmail.com`;

    const slowTimer = setTimeout(() => {
      toast.info("Menghubungkan ke server...", { duration: 5000 });
    }, 3000);

    try {
      console.log("Mencoba login dengan email:", emailToUse);
      const result = await Promise.race([
        signIn(emailToUse, password),
        new Promise<{ error: string }>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), 15000)
        ),
      ]);

      clearTimeout(slowTimer);
      setLoading(false);

      if (result.error) {
        console.error("Detail error login Supabase:", result.error);
        toast.error(`Gagal masuk: ${result.error}`);
      } else {
        toast.success("Berhasil masuk!");
        navigate("/");
      }
    } catch (err: any) {
      clearTimeout(slowTimer);
      setLoading(false);
      console.error("Catch error login:", err);
      toast.error(err?.message === "TIMEOUT" ? "Waktu koneksi habis (Timeout)" : "Koneksi bermasalah. Silakan coba lagi.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-blue-900/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[50%] rounded-full bg-red-600/10 blur-[100px]" />

      <div className="relative w-full max-w-[900px] bg-white shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row border border-slate-100 z-10 mx-4">
        
        {/* Left Side - Brand & Info */}
        <div className="w-full md:w-5/12 bg-blue-900 text-white p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[80px] opacity-20 -mr-20 -mt-20"></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-wide text-white/90">GIA SYSTEM</span>
          </div>

          <div className="relative z-10 mt-16 mb-8 md:my-0">
            <h1 className="text-3xl font-bold leading-tight mb-4">
              Manajemen <br />
              <span className="text-blue-300">Stok & Penjualan</span>
            </h1>
            <p className="text-blue-100/80 text-sm leading-relaxed max-w-[250px]">
              Platform terintegrasi untuk mengelola inventaris, transaksi, dan memantau performa toko bangunan Anda.
            </p>
          </div>

          <div className="relative z-10 text-xs text-blue-300/60 font-medium">
            &copy; {new Date().getFullYear()} GIA Toko Bangunan
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-7/12 p-8 md:p-14 flex flex-col justify-center bg-white">
          <div className="flex justify-center mb-8">
            {/* Logo goes here */}
            <img 
              src="/logo-gia.jpeg" 
              alt="GIA Logo" 
              className="h-[70px] w-auto object-contain drop-shadow-sm" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="text-3xl font-bold text-blue-900">GIA <span class="text-red-600">APP</span></div>';
              }}
            />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Selamat Datang</h2>
            <p className="text-slate-500 text-sm mt-1">Silakan masuk menggunakan akun Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-sm">@</span>
                </div>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin123"
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-all"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-all"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium h-11 mt-4 transition-all shadow-md shadow-blue-900/20" 
              disabled={loading}
            >
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  Masuk Sistem <LogIn className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
