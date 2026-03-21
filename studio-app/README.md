# Studio Delivery — Setup Guide

## Paso 1: Sube esto a GitHub
1. Ve a github.com → New repository → Nombre: "studio-delivery"
2. Sube todos estos archivos

## Paso 2: Deploy en Vercel
1. Ve a vercel.com → "Add New Project"
2. Importa tu repo de GitHub
3. En "Environment Variables" agrega:
   - VITE_SUPABASE_URL = https://pebpadjvwqsblsafdacg.supabase.co
   - VITE_SUPABASE_ANON_KEY = tu-anon-key
4. Click "Deploy" ✓

## Paso 3: Crea tu cuenta de artista
1. Abre tu web en Vercel
2. Crea una cuenta normal
3. En Supabase → Table Editor → profiles → busca tu usuario → cambia role a "artist"

¡Listo! 🎉
