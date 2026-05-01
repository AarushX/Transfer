<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = 'Search...',
		fieldClass = 'rounded-md px-3 py-2',
		fieldStyle = ''
	}: {
		value?: string;
		placeholder?: string;
		fieldClass?: string;
		fieldStyle?: string;
	} = $props();
</script>

<label class="block w-full min-w-0">
	<span class="sr-only">{placeholder}</span>
	<div
		class={`search-field-control flex min-w-0 items-center gap-2 border focus-within:ring-2 focus-within:ring-offset-0 focus-within:outline-none ${fieldClass}`}
		style={`border-color: var(--app-border); background-color: var(--app-input-bg); --tw-ring-color: var(--app-focus-ring); ${fieldStyle}`}
	>
		<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 shrink-0" style="color: var(--app-text-muted);" aria-hidden="true">
			<path
				fill-rule="evenodd"
				d="M9 3.75a5.25 5.25 0 1 0 3.3 9.334l3.808 3.808a.75.75 0 0 0 1.06-1.06l-3.807-3.808A5.25 5.25 0 0 0 9 3.75Zm-3.75 5.25a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z"
				clip-rule="evenodd"
			/>
		</svg>
		<input
			bind:value
			{placeholder}
			class="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 focus:outline-none"
			style="color: var(--app-input-text); background-color: transparent !important; outline: none; box-shadow: none; appearance: none;"
		/>
	</div>
</label>
