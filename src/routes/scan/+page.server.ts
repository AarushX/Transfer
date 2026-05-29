import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isAdmin, isMentor } from '$lib/roles';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user) throw redirect(303, '/login');
	const canManageAttendance = isMentor(profile) || isAdmin(profile);
	const { data: members } = canManageAttendance
		? await locals.supabase
				.from('profiles')
				.select('id,full_name,email,role,base_role')
				.order('full_name', { ascending: true })
				.limit(1000)
		: { data: [] as any[] };
	return {
		machineToken: url.searchParams.get('machine') ?? '',
		canManageAttendance,
		members:
			(members ?? [])
				.filter((row: any) => !isAdmin(row))
				.map((row: any) => ({
					id: String(row.id),
					label: String(row.full_name || row.email || row.id)
				})) ?? []
	};
};
