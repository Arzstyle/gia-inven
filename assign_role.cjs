const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://zvtytgbcizsmanybqbsg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2dHl0Z2JjaXpzbWFueWJxYnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjgzMTYsImV4cCI6MjA4Njg0NDMxNn0.MRZCtXC0N0ZuZ7qoTocntEgZUbrF1mr7XPLbt1gd4_o";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function assignRole() {
    const userId = "8b418d64-82b4-4de6-8b17-1fa3da19e6a1"; // ID from previous step
    const role = "admin";

    console.log(`Assigning role '${role}' to user '${userId}'...`);

    // Check if role exists
    const { data: existing } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (existing) {
        console.log("User already has a role:", existing);
        return;
    }

    const { data, error } = await supabase
        .from("user_roles")
        .insert({
            user_id: userId,
            role: role,
        })
        .select();

    if (error) {
        console.error("Error assigning role:", error.message);
    } else {
        console.log("Role assigned successfully:", data);
    }
}

assignRole();
