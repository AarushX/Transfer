/**
 * Resolve the single display avatar URL written to profiles.avatar_url.
 * Precedence: ClickUp avatar (when the account is linked) → uploaded photo →
 * empty string (Avatar.svelte falls back to initials on a falsy url).
 */
export const resolveAvatarUrl = (
	clickupAvatarUrl: string | null | undefined,
	uploadedPublicUrl: string | null | undefined
): string => {
	const clickup = String(clickupAvatarUrl ?? '').trim();
	if (clickup) return clickup;
	const uploaded = String(uploadedPublicUrl ?? '').trim();
	if (uploaded) return uploaded;
	return '';
};
