import { json, type RequestHandler } from '@sveltejs/kit';
import { buildPassportQrDataUrl } from '$lib/server/passport-qr';

export const POST: RequestHandler = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { data: current, error: readError } = await locals.supabase
		.from('profiles')
		.select('passport_qr_version')
		.eq('id', user.id)
		.single();
	if (readError) return json({ error: readError.message }, { status: 400 });
	const nextVersion = Number(current?.passport_qr_version ?? 0) + 1;

	const { data, error } = await locals.supabase
		.from('profiles')
		.update({ passport_qr_version: nextVersion })
		.eq('id', user.id)
		.select('passport_qr_version')
		.single();
	if (error) return json({ error: error.message }, { status: 400 });

	const qrVersion = Number(data?.passport_qr_version ?? 0);
	const qrDataUrl = await buildPassportQrDataUrl(user.id, qrVersion);
	return json({ ok: true, qrDataUrl });
};
