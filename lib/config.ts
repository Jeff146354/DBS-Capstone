/**
 * Centralized API base URLs.
 * Set NEXT_PUBLIC_API_BASE and NEXT_PUBLIC_ML_BASE in your .env.local (local)
 * or in Vercel / Railway environment variables (production).
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001/api'
export const ML_BASE  = process.env.NEXT_PUBLIC_ML_BASE  ?? 'http://localhost:8000'
