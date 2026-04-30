<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = 'Search...',
		fieldClass = 'rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2'
	}: {
		value?: string;
		placeholder?: string;
		fieldClass?: string;
	} = $props();
</script>

<label class="block w-full">
	<span class="sr-only">{placeholder}</span>
	<div class={`flex items-center gap-2 ${fieldClass}`}>
		<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 text-slate-500" aria-hidden="true">
			<path
				fill-rule="evenodd"
				d="M9 3.75a5.25 5.25 0 1 0 3.3 9.334l3.808 3.808a.75.75 0 0 0 1.06-1.06l-3.807-3.808A5.25 5.25 0 0 0 9 3.75Zm-3.75 5.25a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z"
				clip-rule="evenodd"
			/>
		</svg>
		<input
			bind:value
			{placeholder}
			class="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
		/>
	</div>
</label>
