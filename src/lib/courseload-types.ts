export type TeamChip = {
	groupSlug: string;
	groupName: string;
	teamSlug: string;
	teamName: string;
};

export type CourseloadCourseRow = {
	nodeId: string;
	title: string;
	slug: string;
	status: string;
	href: string;
	required: boolean;
};

export type CourseloadSummary = {
	id: string;
	slug: string;
	title: string;
	description: string;
	sortOrder: number;
	courses: CourseloadCourseRow[];
	completedCount: number;
	totalCount: number;
	progressPct: number;
};

export type CoursesDashboardModel = {
	teams: TeamChip[];
	courseloads: CourseloadSummary[];
	teamSurveySubmissionCount: number;
	nextCourse: CourseloadCourseRow | null;
};
