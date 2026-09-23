const URL = "https://bjaygikarslawerrylpp.supabase.co/auth/v1/signup";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYXlnaWthcnNsYXdlcnJ5bHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODkxOTQsImV4cCI6MjA4Njg2NTE5NH0.npGvEPpnYtcAppcrvC0GsbRqai9zHYvHutm_9wzVjAM";

async function run() {
    console.log("Mencoba membuat user lewat API...");
    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": KEY,
                "Authorization": `Bearer ${KEY}`
            },
            body: JSON.stringify({
                email: "admin123@gmail.com",
                password: "AdminGia123!",
                data: {}
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Gagal membuat user:", data.msg || data.message || JSON.stringify(data));
            return;
        }

        console.log("==========================================");
        console.log("✅ USER BERHASIL DIBUAT!");
        console.log("Email    : admin123@gmail.com");
        console.log("Password : AdminGia123!");
        console.log("User UID :", data.id || (data.user && data.user.id));
        console.log("==========================================");
        console.log("Silakan jalankan SQL Query berikut di Supabase SQL Editor:");
        console.log("");
        console.log(`INSERT INTO public.user_roles (user_id, role) VALUES ('${data.id || (data.user && data.user.id)}', 'admin');`);
        console.log("");

    } catch (e) {
        console.error("Terjadi kesalahan sistem:", e.message);
    }
}

run();
