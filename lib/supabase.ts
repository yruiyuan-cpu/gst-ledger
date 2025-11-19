import { createClient } from "@supabase/supabase-js";
// TODO: 以后可以再改回从 process.env 读取
const SUPABASE_URL = "https://qgbjcirukrsuhiodwtks.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYmpjaXJ1a3JzdWhpb2R3dGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzExODIsImV4cCI6MjA3OTEwNzE4Mn0.e-mdqYb3Uc-fz2HS_vmAySumvjbBCHFINXYg5BZZ96k";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
