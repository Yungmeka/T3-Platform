import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pssxbzgrfcnxttwonouj.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzc3hiemdyZmNueHR0d29ub3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjc1OTksImV4cCI6MjA4ODkwMzU5OX0.eE65NfgeciQG-xYJcoNVk5EkoWQeCoeLcAx9NijtuAM")


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)
