const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://bjaygikarslawerrylpp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqYXlnaWthcnNsYXdlcnJ5bHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODkxOTQsImV4cCI6MjA4Njg2NTE5NH0.npGvEPpnYtcAppcrvC0GsbRqai9zHYvHutm_9wzVjAM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedAdmin() {
    const email = "admin123@gmail.com";
    const password = "admin123";

    console.log(`Attempting to register user: ${email} to new DB...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error("Error creating user:", error.message);
    } else {
        console.log("User created successfully!");
        console.log("User ID:", data.user?.id);
    }
}

seedAdmin();
