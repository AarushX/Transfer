import { describe, it, expect, vi } from 'vitest';
import { updateMemberAccess } from './actions';

describe('updateMemberAccess', () => {
	function buildSupabase() {
		const updateMock = vi.fn().mockReturnThis();
		const eqMock = vi.fn().mockResolvedValue({ error: null });
		const fromMock = vi.fn().mockReturnValue({ update: updateMock, eq: eqMock });
		return { client: { from: fromMock }, mocks: { updateMock, eqMock, fromMock } };
	}

	it('rejects non-admins with 403', async () => {
		const { client, mocks } = buildSupabase();
		const result = await updateMemberAccess({
			supabase: client as any,
			isAdminViewer: false,
			formData: new FormData()
		});
		expect('status' in result && result.status).toBe(403);
		expect(mocks.fromMock).not.toHaveBeenCalled();
	});

	it('returns 400 when user_id missing', async () => {
		const { client } = buildSupabase();
		const result = await updateMemberAccess({
			supabase: client as any,
			isAdminViewer: true,
			formData: new FormData()
		});
		expect('status' in result && result.status).toBe(400);
	});

	it('builds a partial patch from form fields when admin', async () => {
		const { client, mocks } = buildSupabase();
		const fd = new FormData();
		fd.set('user_id', 'u123');
		fd.set('base_role', 'member');
		fd.set('is_mentor', 'on');
		fd.set('is_lead', 'on');
		fd.set('lead_team_group_id', 'tg9');
		fd.set('lead_subteam_id', '');
		const result = await updateMemberAccess({
			supabase: client as any,
			isAdminViewer: true,
			formData: fd
		});
		expect('ok' in result && result.ok).toBe(true);
		expect(mocks.fromMock).toHaveBeenCalledWith('profiles');
		expect(mocks.updateMock).toHaveBeenCalledWith({
			base_role: 'member',
			is_mentor: true,
			is_lead: true,
			lead_team_group_id: 'tg9',
			lead_subteam_id: null
		});
		expect(mocks.eqMock).toHaveBeenCalledWith('id', 'u123');
	});

	it('reports DB errors with status 400', async () => {
		const updateMock = vi.fn().mockReturnThis();
		const eqMock = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
		const supabase = { from: vi.fn().mockReturnValue({ update: updateMock, eq: eqMock }) };
		const fd = new FormData();
		fd.set('user_id', 'u123');
		const result = await updateMemberAccess({
			supabase: supabase as any,
			isAdminViewer: true,
			formData: fd
		});
		expect('status' in result && result.status).toBe(400);
		expect('error' in result && result.error).toBe('boom');
	});
});
