<script lang="ts">
	let { data, form } = $props();
</script>

<section class="max-w-2xl space-y-4">
	<h1 class="text-2xl font-semibold">Workspace Settings</h1>
	<p class="text-sm text-slate-400">Controls workspace name plus global app theme colors.</p>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{/if}
	{#if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">
			Settings saved.
		</p>
	{/if}

	<form method="POST" action="?/save" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<label class="flex flex-col gap-1 text-sm">
			<span class="text-slate-300">Organization name</span>
			<input class="rounded bg-slate-800 px-2 py-2" name="name" required value={data.orgName} />
		</label>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
				<span>Background</span>
				<input type="color" name="color_background" value={data.colorBackground} />
			</label>
			<label class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
				<span>Surface</span>
				<input type="color" name="color_surface" value={data.colorSurface} />
			</label>
			<label class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
				<span>Surface Alt</span>
				<input type="color" name="color_surface_alt" value={data.colorSurfaceAlt} />
			</label>
			<label class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
				<span>Border</span>
				<input type="color" name="color_border" value={data.colorBorder} />
			</label>
			<label class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
				<span>Text</span>
				<input type="color" name="color_text" value={data.colorText} />
			</label>
			<label class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
				<span>Muted Text</span>
				<input type="color" name="color_text_muted" value={data.colorTextMuted} />
			</label>
			<label class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
				<span>Accent</span>
				<input type="color" name="color_accent" value={data.colorAccent} />
			</label>
			<label class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
				<span>Accent Text</span>
				<input type="color" name="color_accent_text" value={data.colorAccentText} />
			</label>
		</div>
		<div class="flex justify-end">
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
				Save
			</button>
		</div>
	</form>
</section>
