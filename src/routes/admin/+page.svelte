<section class="space-y-6">
	<div class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Administration</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Admin Portal</span></h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">Manage workspace settings, people, and operations tools.</p>
	</div>

	<div class="fade-up grid gap-4 md:grid-cols-3" style="animation-delay: 0.05s;">
		<a href="/admin/settings" class="glass-nav-card rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<h2 class="font-semibold" style="color: var(--app-text);">Workspace Settings</h2>
			<p class="mt-1 text-xs" style="color: var(--app-text-muted);">Org name shown under app title.</p>
		</a>
	</div>
</section>

<style>
	.glass-nav-card {
		transition: background 0.25s ease, border-color 0.25s ease, transform 0.25s ease;
	}
	.glass-nav-card:hover {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
		transform: translateY(-2px);
	}
</style>
