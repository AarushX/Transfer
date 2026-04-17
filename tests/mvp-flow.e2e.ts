import { expect, test } from '@playwright/test';

test('shows LMS landing and login entrypoint', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('FRC Team Training & Certification LMS')).toBeVisible();
	await page.getByRole('link', { name: 'Login with Google' }).click();
	await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
