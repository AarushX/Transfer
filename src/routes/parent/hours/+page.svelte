<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();

	const totalHours = $derived(
		(data.myHours ?? []).reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0)
	);
	const verifiedHours = $derived(
		(data.myHours ?? []).filter((h: any) => h.verification_status === 'verified').reduce((sum: number, h: any) => sum + (Number(h.hours) || 0), 0)
	);

	const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '';
</script>

<section class="space-y-5">
	<header>
		<p class="text-xs font-medium uppercase tracking-wide" style="color: var(--app-text-muted);">Parent Portal</p>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Volunteer Hours</h1>
		{#if data.season}
			<p class="text-sm" style="color: var(--app-text-muted);">{data.season.label}</p>
		{/if}
	</header>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Hours logged successfully.</p>
	{/if}

	{#if !data.season}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">No active season. Hours logging is currently unavailable.</p>
		</GlassCard>
	{:else if (data.students ?? []).length === 0}
		<GlassCard>
			<p class="text-sm" style="color: var(--app-text-muted);">Link a student first from the <a href="/parent/dashboard" class="underline" style="color: var(--app-accent);">Parent Dashboard</a> before logging hours.</p>
		</GlassCard>
	{:else}
		<!-- Summary -->
		<div class="grid gap-3 sm:grid-cols-2">
			<GlassCard compact>
				<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Total Logged</p>
				<p class="mt-1 text-xl font-semibold" style="color: var(--app-text);">{totalHours} <span class="text-sm font-normal" style="color: var(--app-text-muted);">hours</span></p>
			</GlassCard>
			<GlassCard compact>
				<p class="text-xs uppercase tracking-wide" style="color: var(--app-text-muted);">Verified</p>
				<p class="mt-1 text-xl font-semibold" style="color: var(--app-success);">{verifiedHours} <span class="text-sm font-normal" style="color: var(--app-text-muted);">hours</span></p>
			</GlassCard>
		</div>

		<!-- Log Hours Form -->
		<GlassCard title="Log Hours">
			<form method="POST" action="?/logHours" class="space-y-3">
				<div>
					<label for="student_user_id" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Student</label>
					<select
						name="student_user_id"
						id="student_user_id"
						required
						class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
					>
						{#each data.students as student (student.id)}
							<option value={student.id}>{student.full_name || student.email}</option>
						{/each}
					</select>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label for="hours" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Hours</label>
						<input
							type="number"
							name="hours"
							id="hours"
							step="0.5"
							min="0.5"
							required
							placeholder="e.g. 2"
							class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
						/>
					</div>
					<div>
						<label for="activity_date" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Date</label>
						<input
							type="date"
							name="activity_date"
							id="activity_date"
							required
							class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
							style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
						/>
					</div>
				</div>
				<div>
					<label for="description" class="mb-1 block text-xs font-medium" style="color: var(--app-text-muted);">Description</label>
					<textarea
						name="description"
						id="description"
						required
						rows="3"
						placeholder="Describe the volunteer activity..."
						class="w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
					></textarea>
				</div>
				<Button variant="primary" type="submit">Log Hours</Button>
			</form>
		</GlassCard>

		<!-- My Hours List -->
		{#if (data.myHours ?? []).length > 0}
			<h2 class="text-sm font-semibold uppercase tracking-wide" style="color: var(--app-text-muted);">My Hours</h2>
			<div class="space-y-2">
				{#each data.myHours as entry (entry.id)}
					<GlassCard compact>
						<div class="flex items-center justify-between gap-3">
							<div class="flex-1 space-y-0.5">
								<p class="text-sm font-medium" style="color: var(--app-text);">
									{entry.hours} hour{entry.hours !== 1 ? 's' : ''}
									<span class="font-normal text-xs" style="color: var(--app-text-muted);">&middot; {entry.studentName} &middot; {fmtDate(entry.activity_date)}</span>
								</p>
								{#if entry.description}
									<p class="text-xs" style="color: var(--app-text);">{entry.description}</p>
								{/if}
								{#if entry.rejection_reason}
									<p class="text-xs" style="color: var(--app-danger);">Reason: {entry.rejection_reason}</p>
								{/if}
							</div>
							{#if entry.verification_status === 'pending'}
								<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-warning) 15%, transparent); color: var(--app-warning);">pending</span>
							{:else if entry.verification_status === 'verified'}
								<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success);">verified</span>
							{:else}
								<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); color: var(--app-danger);">rejected</span>
							{/if}
						</div>
					</GlassCard>
				{/each}
			</div>
		{/if}
	{/if}
</section>
