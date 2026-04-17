import { browser } from '$app/environment';
import { createBrowserClient, isBrowser } from '@supabase/ssr';
import { env as publicEnv } from '$env/dynamic/public';

const PUBLIC_SUPABASE_URL = publicEnv.PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co';
const PUBLIC_SUPABASE_ANON_KEY = publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key';

export const createBrowserSupabaseClient = () =>
	createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export const getOptionalBrowserSupabaseClient = () =>
	browser ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY) : null;

export const canUseBrowserSupabase = isBrowser();
