<script lang="ts">
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
</script>

<section class="space-y-5">
	<div class="flex items-center justify-between">
		<div>
			<a href="/mentor" class="text-xs text-slate-400">← Mentor home</a>
			<h1 class="text-2xl font-semibold">Forms Management</h1>
			<p class="text-sm text-slate-400">Create forms and manage student submissions in one place.</p>
		</div>
	</div>

	{#if form?.error}
		<p class="rounded border border-red-700 bg-red-900/30 p-2 text-sm text-red-200">{form.error}</p>
	{:else if form?.ok}
		<p class="rounded border border-emerald-700 bg-emerald-900/30 p-2 text-sm text-emerald-200">Saved.</p>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		<form method="POST" action="?/createForm" enctype="multipart/form-data" class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
			<h2 class="text-lg font-semibold">Create Form</h2>
			<label class="flex flex-col gap-1 text-sm"><span>Name</span><input name="name" class="rounded bg-slate-800 px-2 py-2" required /></label>
			<label class="flex flex-col gap-1 text-sm"><span>Slug (optional)</span><input name="slug" class="rounded bg-slate-800 px-2 py-2" /></label>
			<label class="flex flex-col gap-1 text-sm"><span>Description</span><textarea name="description" rows="3" class="rounded bg-slate-800 px-2 py-2"></textarea></label>
			<label class="flex flex-col gap-1 text-sm">
				<span>Template Google Drive link (PDF/doc)</span>
				<input
					type="url"
					name="template_drive_link"
					class="rounded bg-slate-800 px-2 py-2"
					placeholder="https://drive.google.com/file/d/.../view"
				/>
			</label>
			<div class="flex flex-wrap gap-3 text-sm">
				<label class="inline-flex items-center gap-2"><input type="checkbox" name="is_active" checked />Active</label>
				<label class="inline-flex items-center gap-2"><input type="checkbox" name="allow_student_view_submissions" checked />Allow students to view submissions</label>
			</div>
			<button class="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">Create form</button>
		</form>

		<div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
			<h2 class="mb-2 text-lg font-semibold">Forms</h2>
			<div class="space-y-2">
				{#each data.forms as type (type.id)}
					<form method="POST" action="?/updateForm" class="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
						<input type="hidden" name="form_id" value={type.id} />
						<div class="grid gap-2 md:grid-cols-2">
							<label class="flex flex-col gap-1 text-xs">
								<span>Name</span>
								<input name="name" class="rounded bg-slate-800 px-2 py-1" value={type.name} required />
							</label>
							<label class="flex flex-col gap-1 text-xs">
								<span>Slug</span>
								<input name="slug" class="rounded bg-slate-800 px-2 py-1" value={type.slug} required />
							</label>
						</div>
						<label class="flex flex-col gap-1 text-xs">
							<span>Description</span>
							<textarea name="description" rows="2" class="rounded bg-slate-800 px-2 py-1">{type.description ?? ''}</textarea>
						</label>
						<label class="flex flex-col gap-1 text-xs">
							<span>Template Google Drive link</span>
							<input name="template_drive_link" type="url" class="rounded bg-slate-800 px-2 py-1" value={type.template_drive_link ?? ''} />
						</label>
						<div class="flex flex-wrap gap-3 text-xs">
							<label class="inline-flex items-center gap-2"><input type="checkbox" name="is_active" checked={Boolean(type.is_active)} />Active</label>
							<label class="inline-flex items-center gap-2"><input type="checkbox" name="allow_student_view_submissions" checked={Boolean(type.allow_student_view_submissions)} />Allow students to view submissions</label>
						</div>
						<div class="flex items-center gap-2">
							<button class="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">Save form</button>
							<button formmethod="POST" formaction="?/deleteForm" class="rounded border border-red-700 px-2 py-1 text-xs text-red-200">Delete form</button>
						</div>
					</form>
				{:else}
					<p class="text-sm text-slate-400">No forms yet.</p>
				{/each}
			</div>
		</div>
	</div>

	<div class="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
		<div class="flex flex-wrap items-center gap-2">
			<h2 class="mr-auto text-lg font-semibold">Submissions</h2>
			<input class="rounded bg-slate-800 px-2 py-2 text-sm" placeholder="Search student/type/file..." bind:value={query} />
			<select class="rounded bg-slate-800 px-2 py-2 text-sm" bind:value={selectedType}>
				<option value="">All forms</option>
				{#each data.forms as type (type.id)}
					<option value={type.id}>{type.name}</option>
				{/each}
			</select>
			<label class="inline-flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={groupedByStudent} />Group by student</label>
			<button type="button" class="rounded border border-slate-700 px-2 py-2 text-xs" onclick={() => toggleAll(true)}>Select all</button>
			<button type="button" class="rounded border border-slate-700 px-2 py-2 text-xs" onclick={() => toggleAll(false)}>Clear</button>
			<button type="button" class="rounded bg-slate-700 px-3 py-2 text-xs hover:bg-slate-600" onclick={bulkDownload}>Bulk download selected</button>
		</div>

		{#if groupedByStudent}
			<div class="space-y-3">
				{#each grouped as group (group.userId)}
					<div class="rounded border border-slate-800 bg-slate-950/60 p-3">
						<p class="mb-2 font-medium">{group.user?.full_name || group.user?.email || group.userId}</p>
						<div class="space-y-2">
							{#each group.rows as row (row.id)}
								<div class="rounded border border-slate-800 bg-slate-900/60 p-2 text-sm">
									<div class="flex flex-wrap items-center gap-2">
										<input type="checkbox" checked={Boolean(selected[String(row.id)])} onchange={(e) => (selected[String(row.id)] = (e.currentTarget as HTMLInputElement).checked)} />
										<p class="font-medium">{formById.get(String(row.form_type_id))?.name || row.form_type_id}</p>
										<span class="rounded bg-slate-800 px-2 py-0.5 text-xs">{row.status}</span>
										<span class="text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</span>
									</div>
									<div class="mt-1 flex flex-wrap items-center gap-2">
										<a href={row.file_data_url} download={row.file_name} class="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800">{row.file_name}</a>
										<form method="POST" action="?/updateSubmission" class="flex flex-wrap items-center gap-2">
											<input type="hidden" name="submission_id" value={row.id} />
											<select name="status" class="rounded bg-slate-800 px-2 py-1 text-xs">
												<option value="submitted" selected={row.status === 'submitted'}>submitted</option>
												<option value="reviewed" selected={row.status === 'reviewed'}>reviewed</option>
												<option value="approved" selected={row.status === 'approved'}>approved</option>
												<option value="rejected" selected={row.status === 'rejected'}>rejected</option>
											</select>
											<input name="review_notes" class="rounded bg-slate-800 px-2 py-1 text-xs" value={row.review_notes ?? ''} placeholder="Review notes" />
											<button class="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">Save</button>
										</form>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-sm text-slate-400">No submissions.</p>
				{/each}
			</div>
		{:else}
			<div class="space-y-2">
				{#each filteredSubmissions as row (row.id)}
					<div class="rounded border border-slate-800 bg-slate-950/60 p-3 text-sm">
						<div class="flex flex-wrap items-center gap-2">
							<input type="checkbox" checked={Boolean(selected[String(row.id)])} onchange={(e) => (selected[String(row.id)] = (e.currentTarget as HTMLInputElement).checked)} />
							<p class="font-medium">{row.user?.full_name || row.user?.email || row.user_id}</p>
							<span>·</span>
							<p>{formById.get(String(row.form_type_id))?.name || row.form_type_id}</p>
							<span class="rounded bg-slate-800 px-2 py-0.5 text-xs">{row.status}</span>
							<span class="text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</span>
						</div>
						<div class="mt-1 flex flex-wrap items-center gap-2">
							<a href={row.file_data_url} download={row.file_name} class="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800">{row.file_name}</a>
							<form method="POST" action="?/updateSubmission" class="flex flex-wrap items-center gap-2">
								<input type="hidden" name="submission_id" value={row.id} />
								<select name="status" class="rounded bg-slate-800 px-2 py-1 text-xs">
									<option value="submitted" selected={row.status === 'submitted'}>submitted</option>
									<option value="reviewed" selected={row.status === 'reviewed'}>reviewed</option>
									<option value="approved" selected={row.status === 'approved'}>approved</option>
									<option value="rejected" selected={row.status === 'rejected'}>rejected</option>
								</select>
								<input name="review_notes" class="rounded bg-slate-800 px-2 py-1 text-xs" value={row.review_notes ?? ''} placeholder="Review notes" />
								<button class="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">Save</button>
							</form>
						</div>
					</div>
				{:else}
					<p class="text-sm text-slate-400">No submissions.</p>
				{/each}
			</div>
		{/if}
	</div>
</section>
