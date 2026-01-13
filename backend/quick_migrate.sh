#!/bin/bash
# Quick migration helper - displays the SQL to copy-paste

echo "============================================================"
echo "🚀 AI Study Companion - Quick Migration Helper"
echo "============================================================"
echo ""
echo "📋 Copy the SQL below and paste into Supabase SQL Editor:"
echo ""
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Click 'SQL Editor' → 'New query'"
echo "4. Copy the SQL below (between the markers)"
echo "5. Paste and click 'Run'"
echo ""
echo "============================================================"
echo "START COPYING BELOW THIS LINE"
echo "============================================================"
echo ""

cat "$(dirname "$0")/migrations/000_complete_setup.sql"

echo ""
echo "============================================================"
echo "STOP COPYING ABOVE THIS LINE"
echo "============================================================"
echo ""
echo "✨ After running, restart your backend:"
echo "   cd backend && source venv/bin/activate && python main.py"
echo ""

