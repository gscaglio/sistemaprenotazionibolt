import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wppyqwlbnbuvnhxsrzdz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcHlxd2xibmJ1dm5oeHNyemR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDQ0NTksImV4cCI6MjA2MzkyMDQ1OX0.KIlN0eoyGTTdPiPSVG9nkcOpivOCTIHa5iBdToyUUOI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);