const { createClient } = require('@supabase/supabase-js');

// Load env directly (hardcoded for test script to avoid dotenv dependency)
const SUPABASE_URL = "https://bjaygikarslawerrylpp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYXlnaWthcnNsYXdlcnJ5bHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODkxOTQsImV4cCI6MjA4Njg2NTE5NH0.npGvEPpnYtcAppcrvC0GsbRqai9zHYvHutm_9wzVjAM";

console.log("Testing connection to:", SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    const start = Date.now();
    console.log("Attempting database query...");

    try {
        const { data, error } = await supabase.from('kategori').select('count', { count: 'exact', head: true });

        if (error) {
            console.error("❌ Connection Failed:", error.message);
            if (error.code) console.error("Error Code:", error.code);
        } else {
            console.log("✅ Connection Successful!");
            console.log(`Latency: ${Date.now() - start}ms`);
            console.log("Database seems responsive.");
        }

    } catch (err) {
        console.error("❌ Network Error / Exception:", err.message);
    }
}

testConnection();
