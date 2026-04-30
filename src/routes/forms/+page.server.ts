import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return { forms: [] };
	const [{ data: formTypes }, { data: submissions }] = await Promise.all([
		locals.supabase
			.from('form_types')
			.select(
				'id,name,slug,description,template_drive_link'
			)
			.eq('is_active', true)
			.order('name'),
		locals.supabase
			.from('form_submissions')
			.select(
				'id,form_type_id,status,created_at'
			)
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
	]);

	const latestByForm = new Map<string, any>();
	for (const row of submissions ?? []) {
		const key = String((row as any).form_type_id);
		if (!latestByForm.has(key)) latestByForm.set(key, row);
	}

	return {
		forms: (formTypes ?? []).map((form: any) => {
			const latest = latestByForm.get(String(form.id)) ?? null;
			return {
				...form,
				latestSubmission: latest
			};
		})
	};
};
