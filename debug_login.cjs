const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load from .env manually if needed, or just hardcode for valid test
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://bjaygikarslawerrylpp.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYXlnaWthcnNsYXdlcnJ5bHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODkxOTQsImV4cCI6MjA4Njg2NTE5NH0.npGvEPpnYtcAppcrvC0GsbRqai9zHYvHutm_9wzVjAM";

console.log("Testing connection to:", SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLogin() {
    const email = "admin123@example.com";
    const password = "admin123";

    console.log(`Attempting login with: ${email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("LOGIN FAILED:", error.message);
        console.log("Possible causes: User not created, Wrong password, Email not confirmed.");
    } else {
        console.log("LOGIN SUCCESS!");
        console.log("User ID:", data.user.id);
        console.log("Email:", data.user.email);

        // Check Role
        const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', data.user.id);

        if (roleError) {
            console.error("Error fetching roles:", roleError.message);
        } else {
            console.log("User Roles:", roleData);
        }
    }
}

testLogin();
