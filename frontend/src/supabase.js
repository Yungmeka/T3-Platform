import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pssxbzgrfcnxttwonouj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3hiemdyZmNueHR0d29ub3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjc1OTksImV4cCI6MjA4ODkwMzU5OX0.eE65NfgeciQG-xYJcoNVk5EkoWQeCoeLcAx9NijtuAM';

export const supabase = createClient(supabaseUrl, supabaseKey);
