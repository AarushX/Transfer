<script lang="ts">
	import type { TeamGroup } from './types';

	type Props = {
		selectedTeam: TeamGroup | null;
	};

	let { selectedTeam }: Props = $props();
</script>

<div class="crud-card">
	<!-- Header -->
	<div class="card-header">
		<p class="eyebrow-label" style="margin: 0;">
			{selectedTeam ? 'EDIT MAIN TEAM' : 'NEW MAIN TEAM'}
		</p>
		{#if selectedTeam}
			<span class="header-sub">{selectedTeam.name}</span>
		{/if}
	</div>

	<!-- Create / Edit form (same fields, different action + hidden id) -->
	<form method="POST" action={selectedTeam ? '?/updateTeam' : '?/createTeam'} class="form-body">
		{#if selectedTeam}
			<input type="hidden" name="team_group_id" value={selectedTeam.id} />
		{/if}

		<label class="field">
			<span class="field-label">Name</span>
			<input
				class="input"
				name="team_name"
				placeholder="e.g. FTC 1002"
				value={selectedTeam?.name ?? ''}
				required
			/>
		</label>

		<label class="field">
			<span class="field-label">Slug</span>
			<input
				class="input"
				name="team_slug"
				placeholder="auto-generated if blank"
				value={selectedTeam?.slug ?? ''}
			/>
		</label>

		<div class="field row-field">
			<span class="field-label">Color</span>
			<input
				type="color"
				name="team_color_hex"
				value={selectedTeam?.color_hex ?? '#475569'}
				class="color-input"
			/>
		</div>

		<label class="field">
			<span class="field-label">Sort order</span>
			<input
				class="input"
				type="number"
				name="team_sort_order"
				placeholder="0"
				value={selectedTeam?.sort_order ?? ''}
			/>
		</label>

		<div class="form-footer">
			<button class="btn-primary">
				{selectedTeam ? 'Save changes' : 'Create main team'}
			</button>
		</div>
	</form>

	<!-- Danger zone — edit mode only -->
	{#if selectedTeam}
		{@const team = selectedTeam}
		<div class="danger-zone">
			<form
				method="POST"
				action="?/deleteTeam"
				onsubmit={(e) => {
					if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) e.preventDefault();
				}}
			>
				<input type="hidden" name="team_group_id" value={team.id} />
				<div class="danger-row">
					<div>
						<p class="danger-title">Delete main team</p>
						<p class="danger-note">Only available when no primary subteams belong to it.</p>
					</div>
					<button class="btn-danger">Delete</button>
				</div>
			</form>
		</div>
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

	.form-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.row-field {
		flex-direction: row;
		align-items: center;
		gap: 0.625rem;
	}

	.field-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--app-text-muted);
	}

	.input {
		width: 100%;
		border-radius: 0.5rem;
		border: 1px solid var(--app-border);
		background: var(--app-input-bg);
		color: var(--app-input-text);
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.input:focus {
		border-color: var(--app-accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 15%, transparent);
	}

	.color-input {
		height: 2rem;
		width: 3rem;
		border-radius: 0.375rem;
		border: 1px solid var(--app-border);
		background: var(--app-input-bg);
		padding: 0.125rem;
		cursor: pointer;
	}

	.form-footer {
		padding-top: 0.25rem;
	}

	.btn-primary {
		border-radius: 0.5rem;
		background: var(--app-accent);
		color: white;
		padding: 0.5rem 1.125rem;
		font-size: 0.875rem;
		font-weight: 600;
		transition: opacity 0.15s;
	}

	.btn-primary:hover {
		opacity: 0.85;
	}

	.danger-zone {
		border-top: 1px solid color-mix(in srgb, var(--app-danger) 25%, var(--app-border));
		padding: 0.875rem 1rem;
		background: color-mix(in srgb, var(--app-danger) 4%, transparent);
	}

	.danger-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.danger-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--app-danger);
		margin-bottom: 0.2rem;
	}

	.danger-note {
		font-size: 0.75rem;
		color: color-mix(in srgb, var(--app-danger) 55%, var(--app-text-muted));
	}

	.btn-danger {
		flex-shrink: 0;
		border-radius: 0.5rem;
		background: var(--app-danger);
		color: white;
		padding: 0.4rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 600;
		transition: opacity 0.15s;
	}

	.btn-danger:hover {
		opacity: 0.85;
	}
</style>
