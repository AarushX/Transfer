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
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="button"
		tabindex="0"
		onclick={() => onCancel?.()}
		onkeydown={(event) => {
			if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') onCancel?.();
		}}
	>
		<div
			class="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4"
			onclick={(event) => event.stopPropagation()}
		>
			<h3 class="text-lg font-semibold text-slate-100">{title}</h3>
			<p class="mt-2 text-sm text-slate-300">{message}</p>
			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					class="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
					onclick={() => onCancel?.()}
				>
					{cancelLabel}
				</button>
				<button
					type="button"
					class={`rounded px-3 py-1.5 text-sm font-semibold ${
						danger ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-sky-600 text-white hover:bg-sky-500'
					}`}
					onclick={() => onConfirm?.()}
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
