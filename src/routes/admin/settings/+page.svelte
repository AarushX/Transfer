<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	let { data, form } = $props();
	let iconDataUrl = $state(String(data.iconDataUrl ?? ''));
	let settingsForm = $state<HTMLFormElement | null>(null);

	const defaults = {
		name: 'Workspace',
		color_background: '#0b1220',
		color_surface: '#121a2b',
		color_surface_alt: '#1a2438',
		color_border: '#2a3754',
		color_text: '#e6edf7',
		color_text_muted: '#9fb0cc',
		color_accent: '#8b5cf6',
		color_accent_text: '#ffffff',
		color_success: '#22c55e',
		color_warning: '#f59e0b',
		color_danger: '#f43f5e',
		color_info: '#06b6d4',
		color_link: '#60a5fa',
		color_link_hover: '#3b82f6',
		color_input_bg: '#111a2e',
		color_input_text: '#e6edf7',
		color_table_header_bg: '#1a2438',
		color_table_row_hover: '#182136',
		color_overlay_scrim: '#020617',
		color_focus_ring: '#a78bfa',
		color_button_secondary_bg: '#1a2438',
		color_button_secondary_text: '#d6e2f5',
		color_button_secondary_border: '#334766'
	};

	const colorFields: Array<{ label: string; name: keyof typeof defaults; value: string }> = [
		{ label: 'Background', name: 'color_background', value: data.colorBackground },
		{ label: 'Surface', name: 'color_surface', value: data.colorSurface },
		{ label: 'Surface Alt', name: 'color_surface_alt', value: data.colorSurfaceAlt },
		{ label: 'Border', name: 'color_border', value: data.colorBorder },
		{ label: 'Text', name: 'color_text', value: data.colorText },
		{ label: 'Muted Text', name: 'color_text_muted', value: data.colorTextMuted },
		{ label: 'Accent', name: 'color_accent', value: data.colorAccent },
		{ label: 'Accent Text', name: 'color_accent_text', value: data.colorAccentText },
		{ label: 'Success', name: 'color_success', value: data.colorSuccess },
		{ label: 'Warning', name: 'color_warning', value: data.colorWarning },
		{ label: 'Danger', name: 'color_danger', value: data.colorDanger },
		{ label: 'Info', name: 'color_info', value: data.colorInfo },
		{ label: 'Link', name: 'color_link', value: data.colorLink },
		{ label: 'Link Hover', name: 'color_link_hover', value: data.colorLinkHover },
		{ label: 'Input Background', name: 'color_input_bg', value: data.colorInputBg },
		{ label: 'Input Text', name: 'color_input_text', value: data.colorInputText },
		{ label: 'Table Header', name: 'color_table_header_bg', value: data.colorTableHeaderBg },
		{ label: 'Table Row Hover', name: 'color_table_row_hover', value: data.colorTableRowHover },
		{ label: 'Overlay Scrim', name: 'color_overlay_scrim', value: data.colorOverlayScrim },
		{ label: 'Focus Ring', name: 'color_focus_ring', value: data.colorFocusRing },
		{
			label: 'Secondary Button Bg',
			name: 'color_button_secondary_bg',
			value: data.colorButtonSecondaryBg
		},
		{
			label: 'Secondary Button Text',
			name: 'color_button_secondary_text',
			value: data.colorButtonSecondaryText
		},
		{
			label: 'Secondary Button Border',
			name: 'color_button_secondary_border',
			value: data.colorButtonSecondaryBorder
		}
	];

	const setFieldValue = (name: string, value: string) => {
		const el = settingsForm?.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
		if (el) el.value = value;
	};
	const resetField = (name: keyof typeof defaults) => {
		setFieldValue(name, defaults[name]);
	};
	const resetAllDefaults = () => {
		setFieldValue('name', defaults.name);
		for (const field of colorFields) setFieldValue(field.name, defaults[field.name]);
		iconDataUrl = '';
		const clearIconEl = settingsForm?.querySelector(
			'[name="clear_icon"]'
		) as HTMLInputElement | null;
		if (clearIconEl) clearIconEl.checked = true;
	};

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
			Controls workspace name plus global app theme colors.
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
			<span class="flex items-center justify-between" style="color: var(--app-text);">
				<span>Organization name</span>
				<button
					type="button"
					class="glass-reset-btn rounded-lg border px-1.5 py-0.5 text-[11px]"
					style="border-color: var(--app-glass-border); color: var(--app-text);"
					onclick={() => resetField('name')}
					title="Reset to default">↺</button
				>
			</span>
			<input class={gi} style={gs} name="name" required value={data.orgName} />
		</label>
		<div class="flex justify-end">
			<button
				type="button"
				class="glass-reset-btn rounded-lg border px-3 py-1 text-xs"
				style="border-color: var(--app-glass-border); color: var(--app-text);"
				onclick={resetAllDefaults}>Reset all defaults</button
			>
		</div>
		<div class="grid gap-3 md:grid-cols-2">
			{#each colorFields as field}
				<label
					class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
					style="border-color: var(--app-glass-border); background: var(--app-surface-alt); color: var(--app-text);"
				>
					<span>{field.label}</span>
					<div class="flex items-center gap-2">
						<input type="color" name={field.name} value={field.value} />
						<button
							type="button"
							class="glass-reset-btn rounded-lg border px-1.5 py-0.5 text-[11px]"
							style="border-color: var(--app-glass-border); color: var(--app-text);"
							onclick={() => resetField(field.name)}
							title="Reset to default">↺</button
						>
					</div>
				</label>
			{/each}
		</div>
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
