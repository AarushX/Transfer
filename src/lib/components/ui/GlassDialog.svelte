<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	let {
		open = false,
		title = 'Confirm action',
		message = 'Are you sure?',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		danger = false,
		onConfirm,
		onCancel,
		children
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		danger?: boolean;
		onConfirm?: () => void;
		onCancel?: () => void;
		children?: Snippet;
	} = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
		style="background: color-mix(in srgb, var(--app-overlay-scrim) 60%, transparent);"
		role="button"
		tabindex="0"
		onclick={() => onCancel?.()}
		onkeydown={(e) => {
			if (e.key === 'Escape') onCancel?.();
		}}
	>
		<div
			class="w-full max-w-md overflow-hidden rounded-xl border backdrop-blur-xl"
			style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
		>
			<div class="relative p-5">
				<div class="pointer-events-none absolute inset-0 rounded-xl" style="background: var(--app-glass-shine);"></div>
				<h3 class="relative text-lg font-semibold" style="color: var(--app-text);">{title}</h3>
				{#if children}
					<div class="relative mt-3">
						{@render children()}
					</div>
				{:else}
					<p class="relative mt-2 text-sm" style="color: var(--app-text-muted);">{message}</p>
				{/if}
				<div class="relative mt-5 flex justify-end gap-2">
					<Button variant="secondary" size="sm" onclick={() => onCancel?.()}>
						{cancelLabel}
					</Button>
					<Button variant={danger ? 'danger' : 'primary'} size="sm" onclick={() => onConfirm?.()}>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
