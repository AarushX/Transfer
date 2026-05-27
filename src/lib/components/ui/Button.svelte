<script lang="ts">
	import type { Snippet } from 'svelte';
	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'lg';
	let {
		variant = 'secondary',
		size = 'md',
		disabled = false,
		type = 'button',
		href = '',
		class: className = '',
		onclick,
		children
	}: {
		variant?: Variant;
		size?: Size;
		disabled?: boolean;
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();

	const sizeClass = $derived(
		size === 'sm'
			? 'px-3 py-1.5 text-xs rounded-lg'
			: size === 'lg'
				? 'px-6 py-3 text-sm rounded-xl'
				: 'px-4 py-2 text-sm rounded-xl'
	);
</script>

{#if href}
	<a
		{href}
		class={`btn btn-${variant} inline-flex items-center justify-center gap-1.5 font-medium ${sizeClass} ${disabled ? 'pointer-events-none opacity-40' : ''} ${className}`}
	>
		{@render children()}
	</a>
{:else}
	<button
		{type}
		{disabled}
		{onclick}
		class={`btn btn-${variant} inline-flex items-center justify-center gap-1.5 font-medium ${sizeClass} ${disabled ? 'opacity-40' : ''} ${className}`}
	>
		{@render children()}
	</button>
{/if}

<style>
	.btn {
		cursor: pointer;
		border: none;
		transition: all 0.2s ease;
		position: relative;
	}
	.btn:active:not(:disabled) {
		transform: scale(0.97);
	}
	.btn-primary {
		background: var(--aurora);
		color: white;
		box-shadow:
			0 4px 24px -6px color-mix(in srgb, var(--app-accent) 60%, transparent),
			inset 0 1px 0 0 color-mix(in srgb, white 25%, transparent);
	}
	.btn-primary:hover:not(:disabled) {
		box-shadow:
			0 8px 32px -6px color-mix(in srgb, var(--app-accent) 80%, transparent),
			inset 0 1px 0 0 color-mix(in srgb, white 25%, transparent);
		filter: brightness(1.08);
	}
	.btn-secondary {
		background: var(--app-glass-bg);
		color: var(--app-button-secondary-text);
		border: 1px solid var(--app-glass-border);
		backdrop-filter: blur(12px);
	}
	.btn-secondary:hover:not(:disabled) {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
	}
	.btn-ghost {
		background: transparent;
		color: var(--app-text-muted);
	}
	.btn-ghost:hover:not(:disabled) {
		background: var(--app-glass-bg);
		color: var(--app-text);
	}
	.btn-danger {
		background: color-mix(in srgb, var(--app-danger) 80%, transparent);
		color: white;
		border: 1px solid color-mix(in srgb, var(--app-danger) 40%, transparent);
		box-shadow: 0 2px 12px -2px color-mix(in srgb, var(--app-danger) 25%, transparent);
	}
	.btn-danger:hover:not(:disabled) {
		background: var(--app-danger);
		box-shadow: 0 4px 20px -2px color-mix(in srgb, var(--app-danger) 45%, transparent);
	}
</style>
