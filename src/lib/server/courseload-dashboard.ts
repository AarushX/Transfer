import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	CourseloadCourseRow,
	CourseloadSummary,
	CoursesDashboardModel,
	TeamChip
} from '$lib/courseload-types';

export type { CoursesDashboardModel } from '$lib/courseload-types';

export async function loadStudentCoursesDashboard(
	supabase: SupabaseClient,
	userId: string
): Promise<CoursesDashboardModel> {
	await supabase.rpc('sync_profile_courseloads_for_user', { p_user_id: userId });

	const [{ data: ptRows }, { data: pcRows }, { data: statuses }, { data: teamSurvey }] =
		await Promise.all([
			supabase
				.from('profile_teams')
				.select('teams(slug,name), team_groups(slug,name)')
				.eq('user_id', userId),
			supabase
				.from('profile_courseloads')
				.select('courseload_id, courseloads(id,slug,title,description,sort_order)')
				.eq('user_id', userId),
			supabase.from('v_user_node_status').select('node_id,computed_status').eq('user_id', userId),
			supabase.from('surveys').select('id').eq('slug', 'team-path-selection').maybeSingle()
		]);

	const statusByNode = new Map(
		(statuses ?? []).map((r: any) => [String(r.node_id), String(r.computed_status)])
	);

	const teams: TeamChip[] = (ptRows ?? []).map((row: any) => {
		const t = row.teams;
		const g = row.team_groups;
		return {
			groupSlug: String(g?.slug ?? ''),
			groupName: String(g?.name ?? ''),
			teamSlug: String(t?.slug ?? ''),
			teamName: String(t?.name ?? '')
		};
	});

	let teamSurveySubmissionCount = 0;
	if (teamSurvey?.id) {
		const { count } = await supabase
			.from('survey_submissions')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', userId)
			.eq('survey_id', teamSurvey.id);
		teamSurveySubmissionCount = count ?? 0;
	}

	const sortedPc = [...(pcRows ?? [])].sort(
		(a: any, b: any) =>
			Number(a?.courseloads?.sort_order ?? 0) - Number(b?.courseloads?.sort_order ?? 0)
	);

	const courseloadIds = sortedPc.map((r: any) => String(r.courseload_id)).filter(Boolean);
	let ccRows: any[] = [];
	if (courseloadIds.length > 0) {
		const { data } = await supabase
			.from('courseload_courses')
			.select('courseload_id,sort_order,required,nodes(id,title,slug)')
			.in('courseload_id', courseloadIds)
			.order('sort_order', { ascending: true });
		ccRows = data ?? [];
	}

	const byCl = new Map<string, typeof ccRows>();
	for (const row of ccRows) {
		const id = String(row.courseload_id);
		const list = byCl.get(id) ?? [];
		list.push(row);
		byCl.set(id, list);
	}

	const courseloads: CourseloadSummary[] = sortedPc.map((pc: any) => {
		const cl = pc.courseloads;
		const id = String(cl?.id ?? '');
		const rows = byCl.get(id) ?? [];
		const courses: CourseloadCourseRow[] = rows.map((r: any) => {
			const n = r.nodes;
			const nodeId = String(n?.id ?? '');
			return {
				nodeId,
				title: String(n?.title ?? 'Course'),
				slug: String(n?.slug ?? ''),
				status: statusByNode.get(nodeId) ?? 'locked',
				href: `/learn/${String(n?.slug ?? '')}`,
				required: Boolean(r.required)
			};
		});
		const requiredCourses = courses.filter((c) => c.required);
		const denom = Math.max(requiredCourses.length, 1);
		const completedCount = requiredCourses.filter((c) => c.status === 'completed').length;
		const progressPct = Math.round((completedCount / denom) * 100);
		return {
			id,
			slug: String(cl?.slug ?? ''),
			title: String(cl?.title ?? 'Courseload'),
			description: String(cl?.description ?? ''),
			sortOrder: Number(cl?.sort_order ?? 0),
			courses,
			completedCount,
			totalCount: requiredCourses.length || courses.length,
			progressPct
		};
	});

	let nextCourse: CourseloadCourseRow | null = null;
	outer: for (const cl of courseloads.sort((a, b) => a.sortOrder - b.sortOrder)) {
		for (const c of cl.courses) {
			if (!c.required) continue;
			if (c.status !== 'completed') {
				nextCourse = c;
				break outer;
			}
		}
	}

	return {
		teams,
		courseloads,
		teamSurveySubmissionCount,
		nextCourse
	};
}
