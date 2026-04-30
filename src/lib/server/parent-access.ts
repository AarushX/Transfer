import { error } from '@sveltejs/kit';

type SupabaseLike = App.Locals['supabase'];

export const requireParentPortal = async (locals: App.Locals) => {
	const { user, profile } = await locals.safeGetSession();
	if (!user || !profile) throw error(401, 'Unauthorized');
	if (!profile.is_parent_guardian) throw error(403, 'Parent access only.');
	return { user, profile };
};

export const requireApprovedParentPortal = async (locals: App.Locals) => {
	const { user, profile } = await requireParentPortal(locals);
	const { data: application, error: appError } = await locals.supabase
		.from('parent_applications')
		.select('status')
		.eq('parent_user_id', user.id)
		.maybeSingle();
	if (appError) throw error(400, appError.message);
	if (!application || application.status !== 'approved') {
		throw error(403, 'Your parent application must be approved by admin before using this feature.');
	}
	return { user, profile, application };
};

export const listActiveLinkedStudents = async (supabase: SupabaseLike, parentUserId: string) => {
	const { data: links, error: linksError } = await supabase
		.from('parent_student_links')
		.select('student_user_id,status')
		.eq('parent_user_id', parentUserId)
		.eq('status', 'active');
	if (linksError) throw error(400, linksError.message);
	const studentIds = (links ?? []).map((row: any) => String(row.student_user_id));
	if (studentIds.length === 0) return [];
	const { data: students, error: studentsError } = await supabase
		.from('profiles')
		.select('id,full_name,email')
		.in('id', studentIds)
		.order('full_name');
	if (studentsError) throw error(400, studentsError.message);
	return (students ?? []).map((row: any) => ({
		id: String(row.id),
		full_name: String(row.full_name ?? ''),
		email: String(row.email ?? '')
	}));
};

export const resolveParentStudentContext = async (
	supabase: SupabaseLike,
	parentUserId: string,
	requestedStudentId: string
) => {
	const students = await listActiveLinkedStudents(supabase, parentUserId);
	const selected =
		(requestedStudentId && students.find((row) => row.id === requestedStudentId)) ||
		students[0] ||
		null;
	return { students, selectedStudent: selected };
};
