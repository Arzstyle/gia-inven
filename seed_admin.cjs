const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://zvtytgbcizsmanybqbsg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2dHl0Z2JjaXpzbWFueWJxYnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjgzMTYsImV4cCI6MjA4Njg0NDMxNn0.MRZCtXC0N0ZuZ7qoTocntEgZUbrF1mr7XPLbt1gd4_o";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedAdmin() {
    const email = "admin123@gia.local";
    const password = "admin123";

    console.log(`Attempting to register user: ${email}`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error("Error creating user:", error.message);
    } else {
        console.log("User created successfully!");
        console.log("User ID:", data.user?.id);
        if (!data.session) {
            console.log("Note: Session not created. Email confirmation might be required.");
        }
    }
}

seedAdmin();
