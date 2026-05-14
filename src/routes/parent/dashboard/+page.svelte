<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();
	const status = $derived(String(data.application?.status ?? 'not_started'));

	const gi = "rounded-lg border px-3 py-2 backdrop-blur-sm";
	const gs = "border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);";
</script>

<section class="space-y-4">
	<header class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Portal</p>
		<h1 class="text-2xl font-bold tracking-tight"><span class="gradient-text">Parent Dashboard</span></h1>
	</header>
	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}
	<div class="fade-up grid gap-4 md:grid-cols-3" style="animation-delay: 0.05s;">
		<GlassCard>
			<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Parent Course</p>
			<p class="mt-2 text-sm" style="color: var(--app-text);">WRT 2026-27 Parent Application Course</p>
			<p class="mt-2 text-xs" style="color: var(--app-text-muted);">Status: {status.replaceAll('_', ' ')}</p>
			<div class="mt-3"><Button variant="primary" href="/parent/course">Open Course</Button></div>
		</GlassCard>
		<GlassCard class="md:col-span-2">
			<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Link Student Account</p>
			<p class="mt-2 text-sm" style="color: var(--app-text);">Enter the link code from your student's profile to connect accounts.</p>
			<form method="POST" action="?/linkStudentByCode" class="mt-3 flex flex-wrap items-center gap-2">
				<input name="code" required class={gi + " text-sm uppercase"} style={gs} placeholder="AB12CD34" />
				<button class="rounded-lg px-3 py-2 text-sm font-semibold" style="background: var(--app-button-secondary-bg); color: var(--app-button-secondary-text); border: 1px solid var(--app-button-secondary-border);">Link student</button>
			</form>
			<ul class="mt-3 space-y-1 text-sm" style="color: var(--app-text);">
				{#each data.linkedStudents as student}
					<li>{student.full_name || student.email}</li>
				{:else}
					<li style="color: var(--app-text-muted);">No linked students yet.</li>
				{/each}
			</ul>
		</GlassCard>
	</div>
</section>
