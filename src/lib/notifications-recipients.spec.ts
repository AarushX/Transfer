import { describe, expect, it } from 'vitest';
import { resolveMentorRecipients } from './notifications-recipients';

const mentors = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('resolveMentorRecipients', () => {
	it('includes all mentors when nobody has preferences', () => {
		expect(resolveMentorRecipients(mentors, [], 'st-1')).toEqual(['a', 'b', 'c']);
	});

	it('scopes mentors with preferences to matching subteams', () => {
		const prefs = [
			{ mentor_id: 'a', subteam_id: 'st-1' },
			{ mentor_id: 'b', subteam_id: 'st-2' }
		];
		expect(resolveMentorRecipients(mentors, prefs, 'st-1')).toEqual(['a', 'c']);
	});

	it('includes preference-scoped mentors when the node has no subteam', () => {
		const prefs = [{ mentor_id: 'a', subteam_id: 'st-1' }];
		expect(resolveMentorRecipients(mentors, prefs, null)).toEqual(['a', 'b', 'c']);
	});

	it('handles a mentor with multiple preferences', () => {
		const prefs = [
			{ mentor_id: 'a', subteam_id: 'st-1' },
			{ mentor_id: 'a', subteam_id: 'st-2' }
		];
		expect(resolveMentorRecipients(mentors, prefs, 'st-2')).toEqual(['a', 'b', 'c']);
	});

	it('returns empty for no mentors', () => {
		expect(resolveMentorRecipients([], [], 'st-1')).toEqual([]);
	});
});
