// Test: Insert directly into Supabase to check if it's a code issue or network issue
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://bjaygikarslawerrylpp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYXlnaWthcnNsYXdlcnJ5bHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODkxOTQsImV4cCI6MjA4Njg2NTE5NH0.npGvEPpnYtcAppcrvC0GsbRqai9zHYvHutm_9wzVjAM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
    console.log("1. Testing LOGIN...");
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: "admin123@gmail.com",
        password: "admin123"
    });

    if (authErr) {
        console.error("❌ Login failed:", authErr.message);
        return;
    }
    console.log("✅ Login OK, user:", authData.user.id);

    console.log("\n2. Testing SELECT kategori...");
    const { data: selectData, error: selectErr } = await supabase.from("kategori").select("*");
    if (selectErr) {
        console.error("❌ SELECT failed:", selectErr.message);
    } else {
        console.log("✅ SELECT OK, rows:", selectData.length);
    }

    console.log("\n3. Testing INSERT kategori...");
    const { data: insertData, error: insertErr } = await supabase.from("kategori").insert({ nama: "Test Insert", deskripsi: "Testing from Node.js" }).select();
    if (insertErr) {
        console.error("❌ INSERT failed:", insertErr.message);
        console.error("   Code:", insertErr.code);
        console.error("   Details:", insertErr.details);
    } else {
        console.log("✅ INSERT OK:", insertData);

        // Clean up
        if (insertData?.[0]?.id) {
            await supabase.from("kategori").delete().eq("id", insertData[0].id);
            console.log("   (cleaned up test row)");
        }
    }
}

testInsert();
