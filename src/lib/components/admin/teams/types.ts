export type TeamGroup = {
	id: string;
	name: string;
	slug: string;
	color_hex: string;
	sort_order: number;
};

export type Subteam = {
	id: string;
	name: string;
	slug: string;
	color_hex: string;
	category_slug: string | null;
	team_group_id: string;
	sort_order: number;
	lead_user_id: string | null;
};

export type SubteamMember = {
	id: string;
	name: string;
};

export type Category = {
	slug: string;
	name: string;
	sort_order: number;
	is_required_onboarding: boolean;
};

export type Link = {
	team_group_id: string;
	team_id: string;
};

export type CourseNode = {
	id: string;
	title: string;
	slug: string;
};
