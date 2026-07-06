import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ezkiqfbnosiwqbjmdcys.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6a2lxZmJub3Npd3Fiam1kY3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzg0MjEsImV4cCI6MjA5ODg1NDQyMX0.Gf2BC74_qUYkypd2bqOQ1mlQ4x8lZn-IktVPmuvwrHA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
