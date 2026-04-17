<script lang="ts">
	let { data, form } = $props();
</script>

<section class="mx-auto max-w-3xl space-y-4">
	<div>
		<h1 class="text-2xl font-semibold">Profile customization</h1>
		<p class="text-sm text-slate-400">
			Set the name and short bio mentors and teammates should see.
		</p>
	</div>

	{#if form?.error}
		<div class="rounded border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">{form.error}</div>
	{/if}
	{#if form?.ok}
		<div class="rounded border border-emerald-700 bg-emerald-900/30 p-3 text-sm text-emerald-200">
			Profile updated.
		</div>
	{/if}

	<form method="POST" action="?/save" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Display name</span>
			<input
				name="full_name"
				required
				class="rounded bg-slate-800 px-2 py-2"
				value={data.profile?.full_name ?? ''}
				placeholder="Your name"
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Bio (optional)</span>
			<textarea
				name="bio"
				rows="4"
				maxlength="500"
				class="rounded bg-slate-800 px-2 py-2"
				placeholder="A short intro, interests, or what you're focusing on this season."
			>{data.profile?.bio ?? ''}</textarea>
		</label>
		<div class="flex justify-end">
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
				Save profile
			</button>
		</div>
	</form>
</section>
