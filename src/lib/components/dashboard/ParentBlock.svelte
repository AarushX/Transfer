<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	let { data, form }: { data: any; form: any } = $props();

	// --- Helper: Get initials from name ---
	const initials = (name: string) =>
		(name ?? '')
			.split(' ')
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase() || '?';

	// --- Helper: Avatar color based on name hash ---
	const avatarHue = (name: string) => {
		let h = 0;
		for (const c of name ?? '') h = (h * 31 + c.charCodeAt(0)) & 0xffff;
		return h % 360;
	};

	// --- Helper: Format duration and times ---
	const fmtTime = (t: string | null) => {
		if (!t) return '';
		const [h, m] = t.split(':').map(Number);
		return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
	};

	const fmtDate = (d: string | null) =>
		d
			? new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				})
			: '';

	// --- Calculations for Volunteer Category Progress ---
	const categoryProgress = $derived.by(() => {
		const categories = data.parentCategories ?? [];
		const commitments = data.parentCommitments ?? [];
		const signups = data.parentSignups ?? [];

		const comMap = new Map(commitments.map((c: any) => [c.category_id, c]));

		return categories.map((cat: any) => {
			const pledge = comMap.get(cat.id);
			const response = pledge?.response ?? 'no';
			const notes = pledge?.notes ?? '';
			const target = Number(cat.target_value ?? 0);

			// Filter signups for this category
			const catSignups = signups.filter((s: any) => s.opportunity?.category_id === cat.id);

			let verified = 0;
			let confirmed = 0;
			let pending = 0;

			for (const s of catSignups) {
				const opp = s.opportunity;
				if (!opp) continue;

				// Calculate amount/duration
				let amount = 1;
				if (cat.unit === 'hours') {
					amount = 4; // standard default
					if (opp.start_time && opp.end_time) {
						const [sh, sm] = opp.start_time.split(':').map(Number);
						const [eh, em] = opp.end_time.split(':').map(Number);
						const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
						if (diff > 0) amount = diff;
					}
				}

				if (s.status === 'verified') {
					verified += amount;
				} else if (s.status === 'confirmed') {
					confirmed += amount;
				} else if (s.status === 'pending') {
					pending += amount;
				}
			}

			// Clean decimal representations
			verified = Math.round(verified * 10) / 10;
			confirmed = Math.round(confirmed * 10) / 10;
			pending = Math.round(pending * 10) / 10;

			// Determine category commitment status
			let status: 'met' | 'in_progress' | 'unfulfilled' | 'not_pledged' = 'not_pledged';
			if (response === 'yes') {
				if (verified >= target) {
					status = 'met';
				} else if (verified > 0 || confirmed > 0 || pending > 0) {
					status = 'in_progress';
				} else {
					status = 'unfulfilled';
				}
			}

			return {
				id: cat.id,
				name: cat.name,
				unit: cat.unit,
				target,
				response,
				notes,
				verified,
				confirmed,
				pending,
				status
			};
		});
	});

	// --- Overall Pledges and Volunteer Stats ---
	const volunteerStats = $derived.by(() => {
		const activePledges = categoryProgress.filter((cp) => cp.response === 'yes');
		const completedPledges = activePledges.filter((cp) => cp.verified >= cp.target);
		
		const totalVerified = categoryProgress.reduce((sum, cp) => sum + cp.verified, 0);
		const totalPending = categoryProgress.reduce((sum, cp) => sum + cp.pending + cp.confirmed, 0);

		return {
			pledgedCount: activePledges.length,
			completedCount: completedPledges.length,
			totalVerified,
			totalPending
		};
	});

	// --- Helper: Format elapsed time in live check-in ---
	function formatElapsed(iso: string): string {
		const ms = Date.now() - new Date(iso).getTime();
		const h = Math.floor(ms / 3_600_000);
		const m = Math.floor((ms % 3_600_000) / 60_000);
		return `${h}h ${m.toString().padStart(2, '0')}m`;
	}
</script>

<div class="space-y-6">
	<!-- ════════ Welcome Header ════════ -->
	<div class="fade-up flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="eyebrow-label" style="margin-bottom: 4px;">Parent Command Center</p>
			<h1 class="text-3xl font-extrabold tracking-tight">
				Hi, <span class="gradient-text">{(data.profile?.full_name ?? '').split(' ')[0] || 'there'}</span>
			</h1>
			<p class="text-xs" style="color: var(--app-text-muted);">
				{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
				{#if data.parentFamily} · <span class="font-medium" style="color: var(--app-text);">{data.parentFamily.name}</span>{/if}
			</p>
		</div>
		<div class="flex gap-2">
			<a
				href="/parent/volunteer"
				class="rounded-full px-4 py-1.5 text-xs font-semibold transition-all hover:scale-105"
				style="background: var(--aurora); color: white; box-shadow: var(--app-glass-shadow);"
			>
				Volunteer Portal
			</a>
		</div>
	</div>

	<!-- ════════ Linked Students Grid ════════ -->
	<div class="fade-up space-y-3">
		<h2 class="text-sm font-bold uppercase tracking-wider" style="color: var(--app-text-muted);">
			My Students
		</h2>
		
		{#if (data.linkedStudents ?? []).length === 0}
			<div class="rounded-2xl border p-6 text-center backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
				<span class="mb-2 block text-2xl opacity-40">🎒</span>
				<p class="text-sm font-medium" style="color: var(--app-text-muted);">No students linked to your account yet.</p>
				<p class="mt-1 text-xs" style="color: var(--app-text-dim);">Use the linking code from your child's profile below to connect.</p>
			</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2">
				{#each data.linkedStudents as student}
					{@const hue = avatarHue(student.full_name)}
					<div class="group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30 backdrop-blur-xl"
						style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
						
						<!-- Card header (avatar, name, live status) -->
						<div class="flex items-start justify-between gap-3">
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold shadow-inner"
									style="background: hsl({hue}, 60%, 25%); border-color: hsl({hue}, 50%, 40%); color: hsl({hue}, 80%, 90%);">
									{initials(student.full_name)}
								</div>
								<div class="min-w-0">
									<h3 class="font-bold tracking-tight group-hover:text-cyan-400 transition-colors" style="color: var(--app-text);">
										{student.full_name}
									</h3>
									<p class="text-[11px]" style="color: var(--app-text-dim);">{student.email}</p>
								</div>
							</div>

							<!-- Live check-in status -->
							<div>
								{#if student.checkedIn}
									<span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold animate-pulse"
										style="background: color-mix(in srgb, var(--app-success) 15%, transparent); color: var(--app-success); border: 1px solid color-mix(in srgb, var(--app-success) 35%, transparent);">
										<span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
										In Shop ({formatElapsed(student.checkedInSince)})
									</span>
								{:else}
									<span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
										style="background: color-mix(in srgb, var(--app-text-dim) 8%, transparent); color: var(--app-text-dim); border: 1px solid var(--app-glass-border);">
										Offline
									</span>
								{/if}
							</div>
						</div>

						<!-- Course & Lettering metrics -->
						<div class="mt-5 space-y-3.5 border-t pt-4" style="border-color: color-mix(in srgb, var(--app-glass-border) 50%, transparent);">
							<!-- Training completion -->
							<div class="flex items-center justify-between text-xs">
								<span style="color: var(--app-text-muted);">Training Progress</span>
								<span class="font-bold" style="color: var(--app-text);">
									{student.completedNodes} checkoff{student.completedNodes === 1 ? '' : 's'} completed
								</span>
							</div>

							<!-- Lettering Progress bar -->
							<div class="space-y-1">
								<div class="flex items-center justify-between text-[11px]">
									<span style="color: var(--app-text-dim);">Varsity Letter Status</span>
									<span class="font-mono font-bold" style="color: var(--app-accent);">
										{student.lettering.pct}% ({student.lettering.completedCount}/{student.lettering.totalRequired} reqs)
									</span>
								</div>
								<div class="relative overflow-hidden rounded-full" style="height: 6px; background: color-mix(in srgb, var(--app-text) 8%, transparent);">
									<div class="h-full rounded-full transition-all duration-700"
										style="width: {student.lettering.pct}%; background: var(--aurora); box-shadow: 0 0 8px var(--app-accent)50;">
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- ════════ Grid: Volunteer & Announcements ════════ -->
	<div class="grid gap-6 md:grid-cols-[1.2fr_1fr]">
		<!-- Left: Volunteering Checklist Widget -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-bold uppercase tracking-wider" style="color: var(--app-text-muted);">
					Family Volunteering progress
				</h2>
				<a href="/parent/volunteer" class="text-xs font-semibold hover:underline" style="color: var(--app-accent);">
					Manage pledges & sign up →
				</a>
			</div>

			{#if !data.parentFamily}
				<div class="rounded-2xl border p-6 text-center backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
					<p class="text-xs" style="color: var(--app-text-muted);">Please link a student to activate family volunteering tracking.</p>
				</div>
			{:else}
				<div class="rounded-2xl border p-5 space-y-4 backdrop-blur-xl"
					style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
					
					<!-- Overall commitments banner -->
					<div class="grid grid-cols-2 gap-3 rounded-xl border p-3"
						style="background: color-mix(in srgb, var(--app-surface) 30%, transparent); border-color: var(--app-glass-border);">
						<div class="text-center border-r" style="border-color: var(--app-glass-border);">
							<span class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--app-text-dim);">Pledges Met</span>
							<p class="mt-0.5 text-xl font-extrabold" style="color: var(--app-text);">
								{volunteerStats.completedCount} <span class="text-xs font-normal" style="color: var(--app-text-dim);">/ {volunteerStats.pledgedCount} pledged</span>
							</p>
						</div>
						<div class="text-center">
							<span class="text-[10px] font-semibold uppercase tracking-wider" style="color: var(--app-text-dim);">Verified Hours</span>
							<p class="mt-0.5 text-xl font-extrabold" style="color: var(--app-success);">
								{volunteerStats.totalVerified} <span class="text-xs font-normal" style="color: var(--app-text-dim);">hrs</span>
							</p>
						</div>
					</div>

					<!-- Category checklist -->
					<div class="space-y-3">
						{#each categoryProgress as cp}
							{@const ratio = cp.target > 0 ? Math.min(100, Math.round((cp.verified / cp.target) * 100)) : 0}
							
							<div class="space-y-1.5 border-b pb-3 last:border-b-0 last:pb-0"
								style="border-color: color-mix(in srgb, var(--app-glass-border) 40%, transparent); opacity: {cp.response === 'no' ? '0.45' : '1'};">
								
								<div class="flex items-start justify-between gap-2">
									<div>
										<p class="text-xs font-bold" style="color: var(--app-text);">{cp.name}</p>
										<p class="text-[10px] font-medium" style="color: var(--app-text-dim);">
											Target: {cp.target} {cp.unit}
											{#if cp.confirmed > 0} · <span style="color: var(--app-accent);">{cp.confirmed} upcoming</span>{/if}
											{#if cp.pending > 0} · <span style="color: var(--app-warning);">{cp.pending} pending approval</span>{/if}
										</p>
									</div>

									<!-- Status Badges -->
									<div>
										{#if cp.status === 'met'}
											<span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
												style="background: color-mix(in srgb, var(--app-success) 12%, transparent); color: var(--app-success); border: 1px solid color-mix(in srgb, var(--app-success) 22%, transparent);">
												Target Met
											</span>
										{:else if cp.status === 'in_progress'}
											<span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
												style="background: color-mix(in srgb, var(--app-accent) 12%, transparent); color: var(--app-accent); border: 1px solid color-mix(in srgb, var(--app-accent) 22%, transparent);">
												In Progress
											</span>
										{:else if cp.status === 'unfulfilled'}
											<span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
												style="background: color-mix(in srgb, var(--app-warning) 12%, transparent); color: var(--app-warning); border: 1px solid color-mix(in srgb, var(--app-warning) 22%, transparent);">
												Unfulfilled
											</span>
										{:else}
											<span class="inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
												style="background: color-mix(in srgb, var(--app-text-dim) 8%, transparent); color: var(--app-text-dim); border: 1px solid var(--app-glass-border);">
												Not Pledged
											</span>
										{/if}
									</div>
								</div>

								{#if cp.response === 'yes'}
									<!-- Progress bar -->
									<div class="relative overflow-hidden rounded-full" style="height: 5px; background: color-mix(in srgb, var(--app-text) 6%, transparent);">
										<div class="h-full rounded-full transition-all duration-500"
											style="width: {ratio}%; background: {cp.status === 'met' ? 'var(--app-success)' : 'var(--app-accent)'};">
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Right: Parent scoped announcements & upcoming timeline -->
		<div class="space-y-5">
			<!-- Parent Scoped Announcements -->
			<div class="space-y-3">
				<h2 class="text-sm font-bold uppercase tracking-wider" style="color: var(--app-text-muted);">
					Parent announcements
				</h2>
				
				{#if (data.parentAnnouncements ?? []).length === 0}
					<div class="rounded-2xl border p-5 text-center backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border);">
						<p class="text-xs" style="color: var(--app-text-dim);">No announcements for parents at this time.</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each data.parentAnnouncements as ann}
							<div class="rounded-xl border p-4 transition-all hover:scale-[1.01]"
								style="border-color: {ann.is_pinned ? 'color-mix(in srgb, var(--app-warning) 30%, transparent)' : 'var(--app-glass-border)'}; 
									background: {ann.is_pinned ? 'color-mix(in srgb, var(--app-warning) 4%, var(--app-glass-bg))' : 'var(--app-glass-bg)'};
									box-shadow: var(--app-glass-shadow);">
								
								<div class="flex items-start gap-2.5">
									{#if ann.is_pinned}
										<span class="mt-0.5 text-amber-400 text-xs shrink-0" title="Pinned Announcement">📌</span>
									{/if}
									<div class="min-w-0 flex-1">
										<p class="text-xs font-bold leading-tight" style="color: var(--app-text);">{ann.title}</p>
										<p class="mt-1 text-[11px] whitespace-pre-wrap leading-relaxed" style="color: var(--app-text-muted);">{ann.body}</p>
										<div class="mt-2 flex items-center justify-between text-[9px]" style="color: var(--app-text-dim);">
											<span>By {ann.author?.full_name ?? 'Coordinator'}</span>
											<span>{new Date(ann.created_at).toLocaleDateString()}</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Upcoming timeline (if any upcoming family signups) -->
			{@const upcomingSignups = (data.parentSignups ?? []).filter((s: any) => s.status !== 'cancelled' && s.opportunity && new Date(s.opportunity.event_date + 'T23:59:59') >= new Date()).sort((a: any, b: any) => new Date(a.opportunity.event_date).getTime() - new Date(b.opportunity.event_date).getTime()).slice(0, 3)}
			{#if upcomingSignups.length > 0}
				<div class="space-y-3">
					<h2 class="text-sm font-bold uppercase tracking-wider" style="color: var(--app-text-muted);">
						Upcoming Commitments
					</h2>
					<div class="space-y-2">
						{#each upcomingSignups as signup}
							{@const opp = signup.opportunity}
							<div class="rounded-xl border p-3 backdrop-blur-xl"
								style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<p class="text-xs font-bold" style="color: var(--app-text);">{opp.title}</p>
										<div class="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px]" style="color: var(--app-text-dim);">
											<span>{fmtDate(opp.event_date)}</span>
											{#if opp.start_time}<span>{fmtTime(opp.start_time)}</span>{/if}
											{#if opp.location}<span>· {opp.location}</span>{/if}
										</div>
									</div>
									<div>
										<span class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
											style={signup.status === 'verified' || signup.status === 'confirmed'
												? 'background: color-mix(in srgb, var(--app-success) 12%, transparent); color: var(--app-success); border: 1px solid color-mix(in srgb, var(--app-success) 22%, transparent);'
												: 'background: color-mix(in srgb, var(--app-warning) 12%, transparent); color: var(--app-warning); border: 1px solid color-mix(in srgb, var(--app-warning) 22%, transparent);'}>
											{signup.status}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- ════════ Account Student-Linking Widget ════════ -->
	<div class="fade-up rounded-2xl border p-5 backdrop-blur-xl" 
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow);">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<h3 class="text-xs font-bold uppercase tracking-wider" style="color: var(--app-text-muted); margin-bottom: 2px;">
					Link Student Account
				</h3>
				<p class="text-[11px]" style="color: var(--app-text-dim);">
					Enter the temporary student-generated link code (available on the student's dashboard settings) to connect.
				</p>
			</div>
		</div>

		{#if form?.error}
			<p class="mt-2 rounded-xl border p-2 text-xs font-medium" 
				style="background: color-mix(in srgb, var(--app-danger) 15%, transparent); border-color: color-mix(in srgb, var(--app-danger) 40%, transparent); color: color-mix(in srgb, var(--app-danger) 60%, white);">
				{form.error}
			</p>
		{:else if form?.ok && form?.section === 'parent-link'}
			<p class="mt-2 rounded-xl border p-2 text-xs font-medium" 
				style="background: color-mix(in srgb, var(--app-success) 15%, transparent); border-color: color-mix(in srgb, var(--app-success) 40%, transparent); color: color-mix(in srgb, var(--app-success) 60%, white);">
				Student linked successfully.
			</p>
		{/if}

		<form method="POST" action="?/linkStudentByCode" class="mt-3 flex flex-wrap items-center gap-2">
			<input
				name="code"
				required
				class="rounded-xl border px-3 py-2 text-xs uppercase tracking-widest font-mono backdrop-blur-sm focus:outline-none focus:border-cyan-500/50"
				style="background: var(--app-input-bg); border-color: var(--app-glass-border); color: var(--app-input-text);"
				placeholder="AB12CD34"
			/>
			<Button variant="primary" size="sm" type="submit">Connect child</Button>
		</form>
	</div>
</div>
