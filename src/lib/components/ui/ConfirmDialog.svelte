<script lang="ts">
	let {
		open = false,
		title = 'Confirm action',
		message = 'Are you sure?',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		danger = false,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		danger?: boolean;
		onConfirm?: () => void;
		onCancel?: () => void;
	} = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background: color-mix(in srgb, var(--app-overlay-scrim) 70%, transparent);"
		role="button"
		tabindex="0"
		onclick={() => onCancel?.()}
		onkeydown={(event) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') onCancel?.();
		}}
	>
		<div
			class="w-full max-w-md rounded-xl border p-4"
			style="border-color: var(--app-border); background: var(--app-surface); color: var(--app-text);"
			onclick={(event) => event.stopPropagation()}
		>
			<h3 class="text-lg font-semibold">{title}</h3>
			<p class="mt-2 text-sm" style="color: var(--app-text-muted);">{message}</p>
			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					class="rounded border px-3 py-1.5 text-sm"
					style="border-color: var(--app-button-secondary-border); background: var(--app-button-secondary-bg); color: var(--app-button-secondary-text);"
					onclick={() => onCancel?.()}
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					class={`rounded px-3 py-1.5 text-sm font-semibold ${
						danger ? '' : ''
					}`}
					style={
						danger
							? 'background: var(--app-danger); color: white;'
							: 'background: var(--app-info); color: white;'
					}
					onclick={() => onConfirm?.()}
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
