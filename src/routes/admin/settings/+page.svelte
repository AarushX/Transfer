<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
	let iconDataUrl = $state(String(data.iconDataUrl ?? ''));
	let settingsForm = $state<HTMLFormElement | null>(null);

	const fileToImageDataUrl = (file: File) =>
		new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onerror = () => reject(new Error('Could not read file.'));
			reader.onload = () => resolve(String(reader.result ?? ''));
			reader.readAsDataURL(file);
		});
	const convertImageToPngDataUrl = (source: string, size = 256) =>
		new Promise<string>((resolve, reject) => {
			const img = new Image();
			img.onerror = () => reject(new Error('Invalid image file.'));
			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = size;
				canvas.height = size;
				const ctx = canvas.getContext('2d');
				if (!ctx) return reject(new Error('Canvas unavailable.'));
				ctx.clearRect(0, 0, size, size);
				const scale = Math.min(size / img.width, size / img.height);
				const w = img.width * scale;
				const h = img.height * scale;
				const x = (size - w) / 2;
				const y = (size - h) / 2;
				ctx.drawImage(img, x, y, w, h);
				resolve(canvas.toDataURL('image/png'));
			};
			img.src = source;
		});
	const onIconFileChange = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const rawDataUrl = await fileToImageDataUrl(file);
			iconDataUrl = await convertImageToPngDataUrl(rawDataUrl, 256);
		} catch {
			/* keep previous icon */
		}
	};

	const gi = 'rounded-lg border px-2 py-2 backdrop-blur-sm';
	const gs =
		'background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);';
</script>

<section class="max-w-2xl space-y-5">
	<div class="fade-up">
		<p class="eyebrow-label" style="margin-bottom: 4px;">Settings</p>
		<h1 class="text-2xl font-bold tracking-tight">
			<span class="gradient-text">Workspace Settings</span>
		</h1>
		<p class="mt-1 text-sm" style="color: var(--app-text-muted);">
			Controls the workspace name and icon.
		</p>
	</div>

	{#if form?.error}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);"
		>
			{form.error}
		</p>
	{/if}
	{#if form?.ok}
		<p
			class="rounded-xl border p-2 text-sm"
			style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);"
		>
			Settings saved.
		</p>
	{/if}

	<form
		bind:this={settingsForm}
		method="POST"
		action="?/save"
		class="fade-up space-y-3 rounded-2xl border p-5 backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); animation-delay: 0.05s;"
	>
		<label class="flex flex-col gap-1 text-sm">
			<span style="color: var(--app-text);">Organization name</span>
			<input class={gi} style={gs} name="name" required value={data.orgName} />
		</label>
		<div
			class="space-y-2 rounded-lg border p-3"
			style="border-color: var(--app-glass-border); background: var(--app-surface-alt);"
		>
			<p class="text-sm font-semibold" style="color: var(--app-text);">Workspace icon</p>
			<p class="text-xs" style="color: var(--app-text-muted);">
				Upload any image. It is auto-converted to PNG favicon format.
			</p>
			<div class="flex flex-wrap items-center gap-3">
				<input
					type="file"
					accept="image/*"
					onchange={onIconFileChange}
					class="text-xs"
					style="color: var(--app-text);"
				/>
				<label class="inline-flex items-center gap-2 text-xs" style="color: var(--app-text);"
					><input type="checkbox" name="clear_icon" /> Clear icon</label
				>
				<button
					type="button"
					class="glass-reset-btn rounded-lg border px-1.5 py-0.5 text-[11px]"
					style="border-color: var(--app-glass-border); color: var(--app-text);"
					onclick={() => {
						iconDataUrl = '';
						const clearIconEl = settingsForm?.querySelector(
							'[name="clear_icon"]'
						) as HTMLInputElement | null;
						if (clearIconEl) clearIconEl.checked = true;
					}}
					title="Reset icon">↺</button
				>
			</div>
			<input type="hidden" name="icon_data_url" value={iconDataUrl} />
			{#if iconDataUrl}
				<div
					class="inline-flex rounded-lg border p-2"
					style="border-color: var(--app-glass-border); background: var(--app-surface);"
				>
					<img
						src={iconDataUrl}
						alt="Workspace icon preview"
						class="h-10 w-10 rounded object-contain"
					/>
				</div>
			{/if}
		</div>
		<div class="flex justify-end">
			<Button variant="primary" type="submit">Save</Button>
		</div>
	</form>
</section>

<style>
	.glass-reset-btn {
		transition: background 0.15s ease;
	}
	.glass-reset-btn:hover {
		background: var(--app-glass-bg-hover);
	}
</style>
