<script lang="ts">
	import type { Category, Subteam, SubteamMember, TeamGroup } from './types';

	type Props = {
		teamGroups: TeamGroup[];
		categories: Category[];
		selectedSubteam: Subteam | null;
		linkedGroupIdsBySubteam: Map<string, Set<string>>;
		selectedTeamId: string;
		subteamMembers: Record<string, SubteamMember[]>;
	};

	let {
		teamGroups,
		categories,
		selectedSubteam,
		linkedGroupIdsBySubteam,
		selectedTeamId,
		subteamMembers
	}: Props = $props();

	const leadCandidates = $derived(
		selectedSubteam ? (subteamMembers[String(selectedSubteam.id)] ?? []) : []
	);
</script>

<div class="crud-card">
	<!-- Header -->
	<div class="card-header">
		<p class="eyebrow-label" style="margin: 0;">
			{selectedSubteam ? 'EDIT SUBTEAM' : 'NEW SUBTEAM'}
		</p>
		{#if selectedSubteam}
			<span class="header-sub">{selectedSubteam.name}</span>
		{/if}
	</div>

	<!-- Create / Edit form -->
	<form
		method="POST"
		action={selectedSubteam ? '?/updateSubteam' : '?/createSubteam'}
		class="form-body"
	>
		{#if selectedSubteam}
			<input type="hidden" name="subteam_id" value={selectedSubteam.id} />
			<input type="hidden" name="team_group_id" value={selectedTeamId} />
		{/if}

		<!-- Primary team — only shown in create mode -->
		{#if !selectedSubteam}
			<label class="field">
				<span class="field-label">Primary main team</span>
				<select class="input" name="team_group_id" value={selectedTeamId} required>
					<option value="">Select main team…</option>
					{#each teamGroups as team}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
			</label>
		{/if}

		<label class="field">
			<span class="field-label">Name</span>
			<input
				class="input"
				name="subteam_name"
				placeholder="Subteam name"
				value={selectedSubteam?.name ?? ''}
				required
			/>
		</label>

		<label class="field">
			<span class="field-label">Slug</span>
			<input
				class="input"
				name="subteam_slug"
				placeholder="auto-generated if blank"
				value={selectedSubteam?.slug ?? ''}
			/>
		</label>

		<label class="field">
			<span class="field-label">Category</span>
			<select
				class="input"
				name="subteam_category_slug"
				value={selectedSubteam?.category_slug ?? ''}
				required
			>
				<option value="">Select category…</option>
				{#each categories as category}
					<option value={category.slug}>{category.name}</option>
				{/each}
			</select>
		</label>

		<div class="field row-field">
			<span class="field-label">Color</span>
			<input
				type="color"
				name="subteam_color_hex"
				value={selectedSubteam?.color_hex ?? '#334155'}
				class="color-input"
			/>
		</div>

		{#if selectedSubteam}
			<label class="field">
				<span class="field-label">Sort order</span>
				<input
					class="input"
					type="number"
					name="subteam_sort_order"
					value={selectedSubteam.sort_order ?? ''}
				/>
			</label>

			<label class="field">
				<span class="field-label">Subteam lead</span>
				<select class="input" name="lead_user_id" value={selectedSubteam.lead_user_id ?? ''}>
					<option value="">— No lead —</option>
					{#each leadCandidates as member (member.id)}
						<option value={member.id}>{member.name}</option>
					{/each}
				</select>
				{#if leadCandidates.length === 0}
					<span class="hint">No members assigned to this subteam yet.</span>
				{/if}
			</label>
		{/if}

		<!-- Linked main teams (multi-select via checkboxes) -->
		<div class="field">
			<span class="field-label">{selectedSubteam ? 'Linked main teams' : 'Also link to'}</span>
			<div class="check-list">
				{#each teamGroups as team}
					<label class="check-row">
						<input
							type="checkbox"
							name="linked_team_group_ids"
							value={team.id}
							checked={selectedSubteam
								? (linkedGroupIdsBySubteam.get(String(selectedSubteam.id))?.has(String(team.id)) ??
									false)
								: false}
						/>
						<span>{team.name}</span>
					</label>
				{/each}
			</div>
		</div>

		<div class="form-footer">
			<button class="btn-primary">
				{selectedSubteam ? 'Save changes' : 'Create subteam'}
			</button>
		</div>
	</form>

	<!-- Danger zone — edit mode only -->
	{#if selectedSubteam}
		{@const sub = selectedSubteam}
		<div class="danger-zone">
			<form
				method="POST"
				action="?/deleteSubteam"
				onsubmit={(e) => {
					if (!confirm(`Delete "${sub.name}"? This removes all assignments and mappings.`))
						e.preventDefault();
				}}
			>
				<input type="hidden" name="subteam_id" value={sub.id} />
				<div class="danger-row">
					<div>
						<p class="danger-title">Delete subteam</p>
						<p class="danger-note">Removes assignments and course mappings that depend on it.</p>
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

	.check-list {
		border-radius: 0.5rem;
		border: 1px solid var(--app-border);
		background: var(--app-surface-alt);
		padding: 0.5rem 0.625rem;
		max-height: 7rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.check-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--app-text);
		padding: 0.2rem 0;
		cursor: pointer;
	}

	.hint {
		font-size: 0.6875rem;
		color: var(--app-text-dim);
		margin-top: 0.125rem;
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
