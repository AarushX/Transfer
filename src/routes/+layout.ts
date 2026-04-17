export const load = async ({ data, depends }) => {
	depends('supabase:auth');
	return { ...data };
};
