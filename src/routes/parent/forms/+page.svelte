<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data } = $props();

	const gi = "rounded-lg border px-3 py-2 backdrop-blur-sm";
	const gs = "border-color: var(--app-glass-border); background: var(--app-glass-bg); color: var(--app-input-text);";
</script>

<section class="space-y-4">
	<header>
		<p class="text-xs font-medium uppercase tracking-wide" style="color: var(--app-text-muted);">Parent Portal</p>
		<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Forms</h1>
	</header>
	<form method="GET" class="rounded-xl border p-3 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
		<label class="text-sm">
			<span class="mb-1 block" style="color: var(--app-text);">Student</span>
			<select name="student" class={"w-full " + gi} style={gs} onchange={(event) => (event.currentTarget as HTMLSelectElement).form?.requestSubmit()}>
				{#each data.students as student}
					<option value={student.id} selected={student.id === data.selectedStudent?.id}>{student.full_name || student.email}</option>
				{/each}
			</select>
		</label>
	</form>
	{#if !data.selectedStudent}
		<p class="rounded-xl border p-4 text-sm" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted);">Link a student first in the parent portal home page.</p>
	{:else}
		<GlassCard>
			<p class="mb-2 text-sm" style="color: var(--app-text);">Managing forms for {data.selectedStudent.full_name || data.selectedStudent.email}</p>
			<ul class="space-y-2">
				{#each data.forms as form}
					<li class="rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="font-medium" style="color: var(--app-text);">{form.name}</p>
								<p class="text-xs" style="color: var(--app-text-muted);">{form.description}</p>
							</div>
							<Button variant="primary" size="sm" href={`/parent/forms/${form.slug}?student=${data.selectedStudent.id}`}>Open</Button>
						</div>
					</li>
				{/each}
			</ul>
		</GlassCard>
	{/if}
</section>
