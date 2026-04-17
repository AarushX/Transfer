<script lang="ts">
	import QRScanner from '$lib/components/QRScanner.svelte';
	let result = $state<any>(null);
	let error = $state('');
	let attendanceUrl = $state('');
	let attendanceError = $state('');

	const onDecoded = async (token: string) => {
		const res = await fetch('/api/mentor/resolve-qr', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token })
		});
		const data = await res.json();
		if (!res.ok) {
			error = data.error ?? 'Failed to decode QR';
			return;
		}
		result = data;
		error = '';
		attendanceUrl = '';
		attendanceError = '';
	};

	const startAttendanceDisplay = async () => {
		const token = String((result as any)?.token ?? '').trim();
		if (!token) {
			attendanceError = 'Scan a passport QR first.';
			return;
		}
		const res = await fetch('/api/attendance/start', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ passportToken: token })
		});
		const body = await res.json().catch(() => null);
		if (!res.ok) {
			attendanceError = body?.error ?? 'Could not create attendance display link.';
			return;
		}
		attendanceUrl = String(body?.attendanceUrl ?? '');
		attendanceError = '';
	};
</script>

<section class="space-y-4">
	<h1 class="text-2xl font-semibold">QR Scanner</h1>
	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<QRScanner {onDecoded} />
	</div>
	{#if error}<p class="text-red-300">{error}</p>{/if}
	{#if result}
		<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<p class="font-semibold">{result.profile?.full_name || result.profile?.email}</p>
			<div class="mt-3">
				<button
					type="button"
					class="rounded-md border border-sky-600 bg-sky-900/20 px-3 py-1.5 text-sm text-sky-200 hover:bg-sky-900/30"
					onclick={startAttendanceDisplay}
				>
					Create attendance display link
				</button>
				{#if attendanceUrl}
					<p class="mt-2 break-all text-sm text-emerald-300">{attendanceUrl}</p>
				{/if}
				{#if attendanceError}
					<p class="mt-2 text-sm text-red-300">{attendanceError}</p>
				{/if}
			</div>
			<ul class="mt-2 list-disc pl-5 text-sm text-slate-300">
				{#each result.certifications ?? [] as cert}
					<li>{cert.nodes?.title}</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
