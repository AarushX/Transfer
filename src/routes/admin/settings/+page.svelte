<script lang="ts">
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
		{ label: 'Secondary Button Bg', name: 'color_button_secondary_bg', value: data.colorButtonSecondaryBg },
		{ label: 'Secondary Button Text', name: 'color_button_secondary_text', value: data.colorButtonSecondaryText },
		{ label: 'Secondary Button Border', name: 'color_button_secondary_border', value: data.colorButtonSecondaryBorder }
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
		const clearIconEl = settingsForm?.querySelector('[name="clear_icon"]') as HTMLInputElement | null;
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
			// keep previous icon if conversion fails
		}
	};
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

	<form bind:this={settingsForm} method="POST" action="?/save" class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<label class="flex flex-col gap-1 text-sm">
			<span class="flex items-center justify-between text-slate-300">
				<span>Organization name</span>
				<button
					type="button"
					class="rounded border border-slate-700 px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800"
					onclick={() => resetField('name')}
					title="Reset to default"
				>
					↺
				</button>
			</span>
			<input class="rounded bg-slate-800 px-2 py-2" name="name" required value={data.orgName} />
		</label>
		<div class="flex justify-end">
			<button
				type="button"
				class="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
				onclick={resetAllDefaults}
			>
				Reset all defaults
			</button>
		</div>
		<div class="grid gap-3 md:grid-cols-2">
			{#each colorFields as field}
				<label class="flex items-center justify-between rounded border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
					<span>{field.label}</span>
					<div class="flex items-center gap-2">
						<input type="color" name={field.name} value={field.value} />
						<button
							type="button"
							class="rounded border border-slate-700 px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800"
							onclick={() => resetField(field.name)}
							title="Reset to default"
						>
							↺
						</button>
					</div>
				</label>
			{/each}
		</div>
		<div class="space-y-2 rounded border border-slate-800 bg-slate-950/40 p-3">
			<p class="text-sm font-semibold text-slate-200">Workspace icon</p>
			<p class="text-xs text-slate-400">Upload any image. It is auto-converted to PNG favicon format.</p>
			<div class="flex flex-wrap items-center gap-3">
				<input type="file" accept="image/*" onchange={onIconFileChange} class="text-xs text-slate-300" />
				<label class="inline-flex items-center gap-2 text-xs text-slate-300">
					<input type="checkbox" name="clear_icon" />
					Clear icon
				</label>
				<button
					type="button"
					class="rounded border border-slate-700 px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800"
					onclick={() => {
						iconDataUrl = '';
						const clearIconEl = settingsForm?.querySelector('[name="clear_icon"]') as HTMLInputElement | null;
						if (clearIconEl) clearIconEl.checked = true;
					}}
					title="Reset icon"
				>
					↺
				</button>
			</div>
			<input type="hidden" name="icon_data_url" value={iconDataUrl} />
			{#if iconDataUrl}
				<div class="inline-flex rounded border border-slate-700 bg-slate-900 p-2">
					<img src={iconDataUrl} alt="Workspace icon preview" class="h-10 w-10 rounded object-contain" />
				</div>
			{/if}
		</div>
		<div class="flex justify-end">
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
				Save
			</button>
		</div>
	</form>
</section>
