<section class="space-y-4">
	<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Admin Portal</h1>
	<p class="text-sm" style="color: var(--app-text-muted);">Manage workspace settings, people, and operations tools.</p>

	<div class="grid gap-3 md:grid-cols-3">
		<a href="/admin/settings" class="glass-nav-card rounded-xl border p-4 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
			<h2 class="font-semibold" style="color: var(--app-text);">Workspace Settings</h2>
			<p class="mt-1 text-xs" style="color: var(--app-text-muted);">Org name shown under app title.</p>
		</a>
	</div>
</section>

<style>
	.glass-nav-card {
		transition: background 0.2s ease, border-color 0.2s ease;
	}
	.glass-nav-card:hover {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
	}
</style>
