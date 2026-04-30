<script lang="ts">
	import type { Category } from './types';

	type Props = {
		categories: Category[];
	};

	let { categories }: Props = $props();
</script>

<div class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
	<h3 class="font-semibold">Subteam Categories (CRUD)</h3>
	<form method="POST" action="?/createCategory" class="grid gap-2 md:grid-cols-4">
		<input class="rounded bg-slate-800 px-2 py-2 text-sm" name="category_name" placeholder="Category name" required />
		<input class="rounded bg-slate-800 px-2 py-2 text-sm" name="category_slug" placeholder="Slug (optional)" />
		<input class="rounded bg-slate-800 px-2 py-2 text-sm" type="number" name="category_sort_order" placeholder="Sort order" />
		<button class="rounded bg-yellow-400 px-3 py-2 text-sm font-semibold text-slate-900">Add</button>
	</form>
	<div class="grid gap-2">
		{#each categories as category}
			<div class="grid gap-2 rounded border border-slate-800 bg-slate-950/40 p-2 lg:grid-cols-[1fr_auto]">
				<form method="POST" action="?/updateCategory" class="grid gap-2 md:grid-cols-[1fr_120px_180px_100px]">
					<input type="hidden" name="category_slug" value={category.slug} />
					<input class="rounded bg-slate-800 px-2 py-2 text-sm" name="category_name" value={category.name} required />
					<input class="rounded bg-slate-800 px-2 py-2 text-sm" type="number" name="category_sort_order" value={category.sort_order} />
					<label class="flex items-center gap-2 rounded border border-slate-700 px-2 py-2 text-xs">
						<input type="checkbox" name="is_required_onboarding" checked={category.is_required_onboarding} />Required
					</label>
					<button class="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">Save</button>
				</form>
				<form method="POST" action="?/deleteCategory">
					<input type="hidden" name="category_slug" value={category.slug} />
					<button class="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500">Delete</button>
				</form>
			</div>
		{:else}
			<p class="text-xs text-slate-500">No categories yet.</p>
		{/each}
	</div>
</div>
