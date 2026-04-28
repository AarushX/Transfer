export type AppRole = 'student' | 'student_lead' | 'mentor' | 'admin';
export type BaseRole = 'member' | 'admin';

export type CertificationStatus =
	| 'locked'
	| 'available'
	| 'video_pending'
	| 'quiz_pending'
	| 'mentor_checkoff_pending'
	| 'completed';

export type Profile = {
	id: string;
	email: string;
	full_name: string;
	role: AppRole;
	base_role: BaseRole;
	is_mentor: boolean;
	is_lead: boolean;
	subteam_id: string | null;
};

export type AssessmentQuestion = {
	id: string;
	prompt: string;
	type: 'mc' | 'ms' | 'tf' | 'short';
	options?: string[];
	correct: string | string[];
	randomize_options?: boolean;
	max_select?: number;
	short_ignore_punctuation?: boolean;
	short_ignore_case?: boolean;
};
