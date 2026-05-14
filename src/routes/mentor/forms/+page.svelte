<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';
	let { data, form } = $props();
	let query = $state('');
	let selectedType = $state('');
	let groupedByStudent = $state(false);
	let selected = $state<Record<string, boolean>>({});

	const formById = new Map((data.forms ?? []).map((t: any) => [String(t.id), t]));
	const filteredSubmissions = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return (data.submissions ?? []).filter((row: any) => {
			if (selectedType && String(row.form_type_id) !== selectedType) return false;
			if (!needle) return true;
			const who = `${row.user?.full_name ?? ''} ${row.user?.email ?? ''}`.toLowerCase();
			const typeName = String(formById.get(String(row.form_type_id))?.name ?? '').toLowerCase();
			const file = String(row.file_name ?? '').toLowerCase();
			return who.includes(needle) || typeName.includes(needle) || file.includes(needle);
		});
	});
	const grouped = $derived.by(() => {
		const map = new Map<string, any[]>();
		for (const row of filteredSubmissions) {
			const key = String(row.user_id);
			const list = map.get(key) ?? [];
			list.push(row);
			map.set(key, list);
		}
		return Array.from(map.entries()).map(([userId, rows]) => ({
			userId,
			user: rows[0]?.user,
			rows
		}));
	});
	const toggleAll = (checked: boolean) => {
		const next: Record<string, boolean> = {};
		for (const row of filteredSubmissions as any[]) next[String(row.id)] = checked;
		selected = next;
	};
	const bulkDownload = () => {
		for (const row of filteredSubmissions as any[]) {
			if (!selected[String(row.id)]) continue;
			const a = document.createElement('a');
			a.href = row.file_data_url;
			a.download = row.file_name || `submission-${row.id}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	};

	const gi = "rounded-lg border px-2 py-2 backdrop-blur-sm";
	const gs = "background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-input-text);";
</script>

<section class="space-y-5">
	<div class="flex items-center justify-between">
		<div>
			<a href="/mentor" class="text-xs" style="color: var(--app-text-muted);">← Mentor home</a>
			<h1 class="text-2xl font-semibold" style="color: var(--app-text);">Forms Management</h1>
			<p class="text-sm" style="color: var(--app-text-muted);">Create forms and manage student submissions in one place.</p>
		</div>
	</div>

	{#if form?.error}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-danger); background: color-mix(in srgb, var(--app-danger) 10%, transparent); color: color-mix(in srgb, var(--app-danger) 80%, white);">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded-xl border p-2 text-sm" style="border-color: var(--app-success); background: color-mix(in srgb, var(--app-success) 10%, transparent); color: color-mix(in srgb, var(--app-success) 80%, white);">Saved.</p>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		<form method="POST" action="?/createForm" enctype="multipart/form-data" class="space-y-3 rounded-xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<h2 class="text-lg font-semibold" style="color: var(--app-text);">Create Form</h2>
			<label class="flex flex-col gap-1 text-sm"><span style="color: var(--app-text);">Name</span><input name="name" class={gi} style={gs} required /></label>
			<label class="flex flex-col gap-1 text-sm"><span style="color: var(--app-text);">Slug (optional)</span><input name="slug" class={gi} style={gs} /></label>
			<label class="flex flex-col gap-1 text-sm"><span style="color: var(--app-text);">Description</span><textarea name="description" rows="3" class={gi} style={gs}></textarea></label>
			<label class="flex flex-col gap-1 text-sm">
				<span style="color: var(--app-text);">Template Google Drive link (PDF/doc)</span>
				<input type="url" name="template_drive_link" class={gi} style={gs} placeholder="https://drive.google.com/file/d/.../view" />
			</label>
			<div class="flex flex-wrap gap-3 text-sm" style="color: var(--app-text);">
				<label class="inline-flex items-center gap-2"><input type="checkbox" name="is_active" checked />Active</label>
				<label class="inline-flex items-center gap-2"><input type="checkbox" name="allow_student_view_submissions" checked />Allow students to view submissions</label>
			</div>
			<Button variant="primary" type="submit">Create form</Button>
		</form>

		<div class="rounded-xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
			<h2 class="mb-2 text-lg font-semibold" style="color: var(--app-text);">Forms</h2>
			<div class="space-y-2">
				{#each data.forms as type (type.id)}
					<form method="POST" action="?/updateForm" class="space-y-2 rounded-xl border p-3 text-sm" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
						<input type="hidden" name="form_id" value={type.id} />
						<div class="grid gap-2 md:grid-cols-2">
							<label class="flex flex-col gap-1 text-xs"><span style="color: var(--app-text-muted);">Name</span><input name="name" class={gi + " py-1"} style={gs} value={type.name} required /></label>
							<label class="flex flex-col gap-1 text-xs"><span style="color: var(--app-text-muted);">Slug</span><input name="slug" class={gi + " py-1"} style={gs} value={type.slug} required /></label>
						</div>
						<label class="flex flex-col gap-1 text-xs"><span style="color: var(--app-text-muted);">Description</span><textarea name="description" rows="2" class={gi + " py-1"} style={gs}>{type.description ?? ''}</textarea></label>
						<label class="flex flex-col gap-1 text-xs"><span style="color: var(--app-text-muted);">Template Google Drive link</span><input name="template_drive_link" type="url" class={gi + " py-1"} style={gs} value={type.template_drive_link ?? ''} /></label>
						<div class="flex flex-wrap gap-3 text-xs" style="color: var(--app-text);">
							<label class="inline-flex items-center gap-2"><input type="checkbox" name="is_active" checked={Boolean(type.is_active)} />Active</label>
							<label class="inline-flex items-center gap-2"><input type="checkbox" name="allow_student_view_submissions" checked={Boolean(type.allow_student_view_submissions)} />Allow students to view submissions</label>
						</div>
						<div class="flex items-center gap-2">
							<Button variant="secondary" size="sm" type="submit">Save form</Button>
							<button type="submit" formmethod="POST" formaction="?/deleteForm" class="inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium" style="background: color-mix(in srgb, var(--app-danger) 85%, transparent); color: white; border: 1px solid color-mix(in srgb, var(--app-danger) 50%, transparent);">Delete form</button>
						</div>
					</form>
				{:else}
					<p class="text-sm" style="color: var(--app-text-muted);">No forms yet.</p>
				{/each}
			</div>
		</div>
	</div>

	<GlassCard>
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="mr-auto text-lg font-semibold" style="color: var(--app-text);">Submissions</h2>
			<input class={gi + " text-sm"} style={gs} placeholder="Search student/type/file..." bind:value={query} />
			<select class={gi + " text-sm"} style={gs} bind:value={selectedType}>
				<option value="">All forms</option>
				{#each data.forms as type (type.id)}
					<option value={type.id}>{type.name}</option>
				{/each}
			</select>
			<label class="inline-flex items-center gap-2 text-sm" style="color: var(--app-text);"><input type="checkbox" bind:checked={groupedByStudent} />Group by student</label>
			<Button variant="ghost" size="sm" onclick={() => toggleAll(true)}>Select all</Button>
			<Button variant="ghost" size="sm" onclick={() => toggleAll(false)}>Clear</Button>
			<Button variant="secondary" size="sm" onclick={bulkDownload}>Bulk download selected</Button>
		</div>

		{#if groupedByStudent}
			<div class="mt-3 space-y-3">
				{#each grouped as group (group.userId)}
					<div class="rounded-lg border p-3" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
						<p class="mb-2 font-medium" style="color: var(--app-text);">{group.user?.full_name || group.user?.email || group.userId}</p>
						<div class="space-y-2">
							{#each group.rows as row (row.id)}
								<div class="rounded-lg border p-2 text-sm" style="border-color: var(--app-glass-border); background: color-mix(in srgb, var(--app-glass-bg) 60%, transparent);">
									<div class="flex flex-wrap items-center gap-2">
										<input type="checkbox" checked={Boolean(selected[String(row.id)])} onchange={(e) => (selected[String(row.id)] = (e.currentTarget as HTMLInputElement).checked)} />
										<p class="font-medium" style="color: var(--app-text);">{formById.get(String(row.form_type_id))?.name || row.form_type_id}</p>
										<span class="rounded-lg px-2 py-0.5 text-xs" style="background: var(--app-surface-alt); color: var(--app-text);">{row.status}</span>
										<span class="text-xs" style="color: var(--app-text-muted);">{new Date(row.created_at).toLocaleString()}</span>
									</div>
									<div class="mt-1 flex flex-wrap items-center gap-2">
										<a href={row.file_data_url} download={row.file_name} class="glass-link rounded-lg border px-2 py-1 text-xs" style="border-color: var(--app-glass-border);">{row.file_name}</a>
										<form method="POST" action="?/updateSubmission" class="flex flex-wrap items-center gap-2">
											<input type="hidden" name="submission_id" value={row.id} />
											<select name="status" class={gi + " py-1 text-xs"} style={gs}>
												<option value="submitted" selected={row.status === 'submitted'}>submitted</option>
												<option value="reviewed" selected={row.status === 'reviewed'}>reviewed</option>
												<option value="approved" selected={row.status === 'approved'}>approved</option>
												<option value="rejected" selected={row.status === 'rejected'}>rejected</option>
											</select>
											<input name="review_notes" class={gi + " py-1 text-xs"} style={gs} value={row.review_notes ?? ''} placeholder="Review notes" />
											<Button variant="secondary" size="sm" type="submit">Save</Button>
										</form>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-sm" style="color: var(--app-text-muted);">No submissions.</p>
				{/each}
			</div>
		{:else}
			<div class="mt-3 space-y-2">
				{#each filteredSubmissions as row (row.id)}
					<div class="rounded-lg border p-3 text-sm" style="border-color: var(--app-glass-border); background: var(--app-surface-alt);">
						<div class="flex flex-wrap items-center gap-2">
							<input type="checkbox" checked={Boolean(selected[String(row.id)])} onchange={(e) => (selected[String(row.id)] = (e.currentTarget as HTMLInputElement).checked)} />
							<p class="font-medium" style="color: var(--app-text);">{row.user?.full_name || row.user?.email || row.user_id}</p>
							<span style="color: var(--app-text-muted);">·</span>
							<p style="color: var(--app-text);">{formById.get(String(row.form_type_id))?.name || row.form_type_id}</p>
							<span class="rounded-lg px-2 py-0.5 text-xs" style="background: var(--app-surface-alt); color: var(--app-text);">{row.status}</span>
							<span class="text-xs" style="color: var(--app-text-muted);">{new Date(row.created_at).toLocaleString()}</span>
						</div>
						<div class="mt-1 flex flex-wrap items-center gap-2">
							<a href={row.file_data_url} download={row.file_name} class="glass-link rounded-lg border px-2 py-1 text-xs" style="border-color: var(--app-glass-border);">{row.file_name}</a>
							<form method="POST" action="?/updateSubmission" class="flex flex-wrap items-center gap-2">
								<input type="hidden" name="submission_id" value={row.id} />
								<select name="status" class={gi + " py-1 text-xs"} style={gs}>
									<option value="submitted" selected={row.status === 'submitted'}>submitted</option>
									<option value="reviewed" selected={row.status === 'reviewed'}>reviewed</option>
									<option value="approved" selected={row.status === 'approved'}>approved</option>
									<option value="rejected" selected={row.status === 'rejected'}>rejected</option>
								</select>
								<input name="review_notes" class={gi + " py-1 text-xs"} style={gs} value={row.review_notes ?? ''} placeholder="Review notes" />
								<Button variant="secondary" size="sm" type="submit">Save</Button>
							</form>
						</div>
					</div>
				{:else}
					<p class="text-sm" style="color: var(--app-text-muted);">No submissions.</p>
				{/each}
			</div>
		{/if}
	</GlassCard>
</section>

<style>
	.glass-link {
		transition: background 0.15s ease, border-color 0.15s ease;
	}
	.glass-link:hover {
		background: var(--app-glass-bg-hover);
		border-color: var(--app-glass-border-hover);
	}
</style>
