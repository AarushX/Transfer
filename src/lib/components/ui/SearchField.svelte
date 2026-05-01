<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = 'Search...',
		fieldClass = 'rounded-md border px-3 py-2',
		fieldStyle = ''
	}: {
		value?: string;
		placeholder?: string;
		fieldClass?: string;
		fieldStyle?: string;
	} = $props();
</script>

<label class="block w-full">
	<span class="sr-only">{placeholder}</span>
	<div
		class={`flex items-center gap-2 focus-within:ring-2 ${fieldClass}`}
		style={`border-color: var(--app-border); background: color-mix(in srgb, var(--app-input-bg) 80%, transparent); --tw-ring-color: var(--app-focus-ring); ${fieldStyle}`}
	>
		<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" style="color: var(--app-text-muted);" aria-hidden="true">
			<path
				fill-rule="evenodd"
				d="M9 3.75a5.25 5.25 0 1 0 3.3 9.334l3.808 3.808a.75.75 0 0 0 1.06-1.06l-3.807-3.808A5.25 5.25 0 0 0 9 3.75Zm-3.75 5.25a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z"
				clip-rule="evenodd"
			/>
		</svg>
		<input
			bind:value
			{placeholder}
			class="w-full bg-transparent text-sm focus:outline-none"
			style="color: var(--app-input-text); outline: none;"
		/>
	</div>
</label>
