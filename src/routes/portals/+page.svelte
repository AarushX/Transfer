<script lang="ts">
	let { data } = $props();
	const role = $derived(data.profile?.role ?? 'student');
	const canMentor = $derived(role === 'mentor' || role === 'admin');
	const canAdmin = $derived(role === 'admin');

	const basePortals = [
		{
			title: 'Dashboard',
			description: 'Skill tree, module list, and training progress.',
			href: '/dashboard'
		},
		{
			title: 'Teams',
			description: 'Pick your primary team and manage mentor team preferences.',
			href: '/teams'
		},
		{
			title: 'Passport',
			description: 'Digital passport, badges, and QR identity.',
			href: '/passport'
		}
	];

	const mentorPortals = [
		{
			title: 'Mentor Queue',
			description: 'Approve or send back pending student checkoffs.',
			href: '/mentor'
		},
		{
			title: 'Mentor QR Scan',
			description: 'Resolve and check student passports from QR scans.',
			href: '/mentor/scan'
		},
		{
			title: 'Course Manager',
			description: 'Create/edit courses, quizzes, and prerequisites.',
			href: '/mentor/courses'
		}
	];

	const adminPortals = [
		{
			title: 'Roster Dashboard',
			description: 'View member progress and certification bottlenecks.',
			href: '/roster'
		},
		{
			title: 'Admin Content',
			description: 'Legacy admin content tooling and direct node creation.',
			href: '/admin/content'
		},
		{
			title: 'Audit Log',
			description: 'Review mentor actions and certification decisions.',
			href: '/admin/audit'
		}
	];
</script>

<section class="space-y-6">
	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h1 class="text-2xl font-semibold">Portals</h1>
		<p class="text-sm text-slate-300">
			Central navigation for every implemented area in the LMS.
		</p>
	</div>

	<div class="grid gap-3 md:grid-cols-2">
		{#each basePortals as portal}
			<a href={portal.href} class="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800/60">
				<h2 class="font-semibold">{portal.title}</h2>
				<p class="mt-1 text-sm text-slate-300">{portal.description}</p>
				<p class="mt-2 text-xs text-yellow-300">{portal.href}</p>
			</a>
		{/each}

		{#if canMentor}
			{#each mentorPortals as portal}
				<a
					href={portal.href}
					class="rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800/60"
				>
					<h2 class="font-semibold">{portal.title}</h2>
					<p class="mt-1 text-sm text-slate-300">{portal.description}</p>
					<p class="mt-2 text-xs text-yellow-300">{portal.href}</p>
				</a>
			{/each}
		{/if}

		{#if canAdmin}
			{#each adminPortals as portal}
				<a
					href={portal.href}
					class="rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800/60"
				>
					<h2 class="font-semibold">{portal.title}</h2>
					<p class="mt-1 text-sm text-slate-300">{portal.description}</p>
					<p class="mt-2 text-xs text-yellow-300">{portal.href}</p>
				</a>
			{/each}
		{/if}
	</div>
</section>
