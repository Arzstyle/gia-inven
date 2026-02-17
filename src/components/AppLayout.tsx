import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Outlet, Navigate } from "react-router-dom";

export default function AppLayout() {
  const { user, loading } = useAuth();

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
          <header className="h-12 border-b flex items-center px-4 bg-card">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-medium text-muted-foreground">
              Sistem Manajemen Inventory
            </span>
          </header>
          <div className="flex-1 p-4 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
