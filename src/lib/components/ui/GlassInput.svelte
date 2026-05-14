<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = '',
		type = 'text',
		name = '',
		required = false,
		disabled = false,
		class: className = '',
		oninput,
		onchange
	}: {
		value?: string;
		placeholder?: string;
		type?: string;
		name?: string;
		required?: boolean;
		disabled?: boolean;
		class?: string;
		oninput?: (e: Event) => void;
		onchange?: (e: Event) => void;
	} = $props();
</script>

<input
	bind:value
	{placeholder}
	{type}
	{name}
	{required}
	{disabled}
	{oninput}
	{onchange}
	class={`glass-input w-full rounded-lg border px-3 py-2 text-sm backdrop-blur-sm transition-colors ${disabled ? 'opacity-50' : ''} ${className}`}
	style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
/>

<style>
	.glass-input::placeholder {
		color: var(--app-text-muted);
		opacity: 0.6;
	}
	.glass-input:focus {
		outline: none;
		border-color: var(--app-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 20%, transparent);
	}
	.glass-input:hover:not(:focus):not(:disabled) {
		border-color: var(--app-glass-border-hover);
	}
</style>
