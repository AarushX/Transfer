export type WorkflowKind = 'leadership' | 'school' | 'carpool' | 'custom';

export type SurveyTemplateQuestion = {
	id: string;
	prompt: string;
	type: 'mc' | 'ms' | 'tf' | 'short';
	options?: string[];
	correct?: string | string[];
	max_select?: number;
	randomize_options?: boolean;
	short_ignore_case?: boolean;
	short_ignore_punctuation?: boolean;
};

export const WORKFLOW_META: Record<Exclude<WorkflowKind, 'custom'>, { label: string; description: string; slugPrefix: string }> = {
	leadership: {
		label: 'Leadership Application',
		description: 'Use for captain/lead applications with reviewable responses.',
		slugPrefix: 'leadership'
	},
	school: {
		label: 'School Form Intake',
		description: 'Use for required school acknowledgements and logistics.',
		slugPrefix: 'school-form'
	},
	carpool: {
		label: 'Carpool Volunteer Signup',
		description: 'Use for ride coordination, availability, and capacity.',
		slugPrefix: 'carpool'
	}
};

export const inferWorkflowKindFromSlug = (slug: string | null | undefined): WorkflowKind => {
	const value = String(slug ?? '').trim().toLowerCase();
	if (!value) return 'custom';
	if (value.startsWith(`${WORKFLOW_META.leadership.slugPrefix}-`)) return 'leadership';
	if (value.startsWith(`${WORKFLOW_META.school.slugPrefix}-`)) return 'school';
	if (value.startsWith(`${WORKFLOW_META.carpool.slugPrefix}-`)) return 'carpool';
	return 'custom';
};

export const applyWorkflowPrefixToSlug = (workflow: WorkflowKind, slug: string): string => {
	if (workflow === 'custom') return slug;
	const prefix = WORKFLOW_META[workflow].slugPrefix;
	return slug.startsWith(`${prefix}-`) ? slug : `${prefix}-${slug}`;
};

export const TEMPLATE_QUESTIONS: Record<Exclude<WorkflowKind, 'custom'>, SurveyTemplateQuestion[]> = {
	leadership: [
		{ id: 'motivation', prompt: 'Why do you want this leadership role?', type: 'short', correct: '' },
		{ id: 'experience', prompt: 'Describe a time you helped the team succeed.', type: 'short', correct: '' },
		{
			id: 'availability',
			prompt: 'How consistently can you attend meetings and events?',
			type: 'mc',
			options: ['Always', 'Most weeks', 'Occasionally'],
			correct: 'Always'
		}
	],
	school: [
		{
			id: 'guardian_ack',
			prompt: 'Parent/guardian has reviewed the school robotics expectations.',
			type: 'tf',
			correct: 'true'
		},
		{
			id: 'transport_ack',
			prompt: 'Student has reliable transport plan for after-school build sessions.',
			type: 'tf',
			correct: 'true'
		},
		{ id: 'notes', prompt: 'Anything the school/mentors should know?', type: 'short', correct: '' }
	],
	carpool: [
		{
			id: 'can_drive',
			prompt: 'Can you volunteer to drive students for events?',
			type: 'mc',
			options: ['Yes', 'Maybe', 'No'],
			correct: 'Yes'
		},
		{
			id: 'days',
			prompt: 'Which days are you usually available?',
			type: 'ms',
			options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend'],
			correct: ['Weekend'],
			max_select: 3
		},
		{ id: 'capacity', prompt: 'How many students can you transport?', type: 'short', correct: '' }
	]
};
