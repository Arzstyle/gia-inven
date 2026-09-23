import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { getUserDisplayName } from "@/hooks/useLogAktivitas";
import { Outlet, Navigate } from "react-router-dom";

export default function AppLayout() {
  const { user, loading, role } = useAuth();
  const userName = getUserDisplayName(user);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground animate-pulse">Memuat sistem...</p>
        <p className="text-xs text-muted-foreground/60">Mohon tunggu sebentar</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4 bg-card">
            <div className="flex items-center">
              <SidebarTrigger />
              <span className="ml-3 text-sm font-semibold text-slate-700 hidden sm:inline">
                Sistem Manajemen Inventory
              </span>
            </div>

            {/* Profil User di Kanan Ujung Atas */}
            {(() => {
              const isOwner = userName.toLowerCase().includes("giffary") || (user?.email?.toLowerCase().includes("giffary") ?? false);
              const displayRole = isOwner ? "Owner" : (role ? (role.charAt(0).toUpperCase() + role.slice(1)) : "Admin");

              return (
                <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border shadow-sm transition-all ${
                  isOwner ? "bg-amber-50/80 border-amber-200" : "bg-slate-50 border-slate-200/90"
                }`}>
                  <div className={`h-7 w-7 rounded-full text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                    isOwner ? "bg-gradient-to-tr from-amber-600 to-amber-500" : "bg-blue-900"
                  }`}>
                    {userName.charAt(0)}
                  </div>
                  <div className="flex flex-col text-left pr-1">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {userName}
                    </span>
                    <span className={`text-[10px] font-semibold leading-tight ${
                      isOwner ? "text-amber-700 font-bold" : "text-blue-600"
                    }`}>
                      {displayRole}
                    </span>
                  </div>
                </div>
              );
            })()}
          </header>
          <div className="flex-1 p-4 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
