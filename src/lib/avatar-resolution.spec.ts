import { describe, expect, it } from 'vitest';
import { resolveAvatarUrl } from './avatar-resolution';

describe('resolveAvatarUrl', () => {
	it('prefers the ClickUp avatar when linked', () => {
		expect(resolveAvatarUrl('https://cu.example/a.png', 'https://sb.example/b.png')).toBe(
			'https://cu.example/a.png'
		);
	});

	it('falls back to the uploaded photo without ClickUp', () => {
		expect(resolveAvatarUrl(null, 'https://sb.example/b.png')).toBe('https://sb.example/b.png');
		expect(resolveAvatarUrl('  ', 'https://sb.example/b.png')).toBe('https://sb.example/b.png');
	});

	it('returns empty string when neither exists (initials fallback)', () => {
		expect(resolveAvatarUrl(null, null)).toBe('');
		expect(resolveAvatarUrl(undefined, '')).toBe('');
	});
});
