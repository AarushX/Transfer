<script lang="ts">
	import type { Category } from './types';

	type Props = {
		categories: Category[];
	};

	let { categories }: Props = $props();
</script>

<div class="crud-card">
	<!-- Header -->
	<div class="card-header">
		<p class="eyebrow-label" style="margin: 0;">SUBTEAM CATEGORIES</p>
		<span class="header-sub">{categories.length} total</span>
	</div>

	<!-- Add new category -->
	<div class="add-section">
		<p class="section-label">Add category</p>
		<form method="POST" action="?/createCategory" class="add-form">
			<input class="input" name="category_name" placeholder="Category name" required />
			<input class="input" name="category_slug" placeholder="Slug (optional)" />
			<input
				class="input w-24"
				type="number"
				name="category_sort_order"
				placeholder="Order"
			/>
			<button class="btn-primary">Add</button>
		</form>
	</div>

	<!-- Existing categories -->
	{#if categories.length > 0}
		<div class="list-section">
			<p class="section-label">Existing categories</p>
			<div class="category-list">
				{#each categories as category (category.slug)}
					<div class="category-row">
						<form
							method="POST"
							action="?/updateCategory"
							class="edit-form"
						>
							<input type="hidden" name="category_slug" value={category.slug} />
							<input
								class="input flex-1"
								name="category_name"
								value={category.name}
								required
							/>
							<input
								class="input w-20"
								type="number"
								name="category_sort_order"
								value={category.sort_order}
							/>
							<label class="req-check">
								<input
									type="checkbox"
									name="is_required_onboarding"
									checked={category.is_required_onboarding}
								/>
								<span>Required</span>
							</label>
							<button class="btn-save">Save</button>
						</form>
						<form
							method="POST"
							action="?/deleteCategory"
							onsubmit={(e) => {
								if (!confirm(`Delete category "${category.name}"?`)) e.preventDefault();
							}}
						>
							<input type="hidden" name="category_slug" value={category.slug} />
							<button class="btn-delete" aria-label="Delete {category.name}">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="h-3.5 w-3.5"
								>
									<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
								</svg>
							</button>
						</form>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<p class="empty-note">No categories yet. Add one above.</p>
	{/if}
</div>

<style>
	.crud-card {
		border-radius: 1rem;
		border: 1px solid var(--app-border);
		background: var(--app-surface);
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--app-border);
		background: var(--app-surface-alt);
	}

	.header-sub {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--app-text-muted);
	}

	.add-section {
		padding: 1rem;
		border-bottom: 1px solid var(--app-border);
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--app-text-muted);
		margin-bottom: 0.5rem;
	}

	.add-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.list-section {
		padding: 1rem;
	}

	.category-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.category-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		border-radius: 0.625rem;
		border: 1px solid var(--app-border);
		background: var(--app-surface-alt);
	}

	.edit-form {
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.input {
		border-radius: 0.5rem;
		border: 1px solid var(--app-border);
		background: var(--app-input-bg);
		color: var(--app-input-text);
		padding: 0.4rem 0.625rem;
		font-size: 0.8125rem;
		outline: none;
		transition: border-color 0.15s;
		min-width: 0;
	}

	.input.flex-1 {
		flex: 1;
	}

	.input.w-24 {
		width: 6rem;
	}

	.input.w-20 {
		width: 5rem;
	}

	.input:focus {
		border-color: var(--app-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 15%, transparent);
	}

	.req-check {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--app-text-muted);
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-primary {
		border-radius: 0.5rem;
		background: var(--app-accent);
		color: white;
		padding: 0.45rem 0.875rem;
		font-size: 0.875rem;
		font-weight: 600;
		white-space: nowrap;
		transition: opacity 0.15s;
	}

	.btn-primary:hover {
		opacity: 0.85;
	}

	.btn-save {
		border-radius: 0.5rem;
		background: var(--app-button-secondary-bg);
		border: 1px solid var(--app-button-secondary-border);
		color: var(--app-button-secondary-text);
		padding: 0.35rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 600;
		white-space: nowrap;
		transition: border-color 0.15s;
	}

	.btn-save:hover {
		border-color: var(--app-accent);
		color: var(--app-accent);
	}

	.btn-delete {
		display: grid;
		place-items: center;
		border-radius: 0.375rem;
		padding: 0.4rem;
		color: var(--app-text-dim);
		transition: background 0.15s, color 0.15s;
	}

	.btn-delete:hover {
		background: color-mix(in srgb, var(--app-danger) 10%, transparent);
		color: var(--app-danger);
	}

	.empty-note {
		padding: 1.25rem 1rem;
		font-size: 0.875rem;
		color: var(--app-text-muted);
	}
</style>
