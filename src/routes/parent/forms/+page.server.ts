import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireApprovedParentPortal, resolveParentStudentContext } from '$lib/server/parent-access';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await requireApprovedParentPortal(locals);
	const { students, selectedStudent } = await resolveParentStudentContext(
		locals.supabase,
		user.id,
		String(url.searchParams.get('student') ?? '')
	);
	if (!selectedStudent) return { students: [], selectedStudent: null, forms: [] };

	const [{ data: formTypes }, { data: submissions }] = await Promise.all([
		locals.supabase
			.from('form_types')
			.select('id,name,slug,description,template_drive_link')
			.eq('is_active', true)
			.order('name'),
		locals.supabase
			.from('form_submissions')
			.select('id,form_type_id,status,created_at')
			.eq('user_id', selectedStudent.id)
			.order('created_at', { ascending: false })
	]);
	const latestByForm = new Map<string, any>();
	for (const row of submissions ?? []) {
		const key = String((row as any).form_type_id);
		if (!latestByForm.has(key)) latestByForm.set(key, row);
	}
	return {
		students,
		selectedStudent,
		forms: (formTypes ?? []).map((form: any) => ({
			...form,
			latestSubmission: latestByForm.get(String(form.id)) ?? null
		}))
	};
};
