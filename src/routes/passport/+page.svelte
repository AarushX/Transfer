<script lang="ts">
	import PassportQR from '$lib/components/PassportQR.svelte';
	let { data } = $props();
</script>

<section class="grid gap-4 md:grid-cols-2">
	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h1 class="text-2xl font-semibold">Digital Passport</h1>
		<p class="text-slate-300">{data.profile?.full_name || data.profile?.email}</p>
		<p class="mt-2 rounded bg-slate-800 px-2 py-1 text-sm">{data.progressSummary}</p>
		<h2 class="mt-4 font-semibold">Badges</h2>
		<ul class="mt-2 list-disc pl-5 text-sm text-slate-300">
			{#each data.badges as badge}
				<li>{badge}</li>
			{/each}
		</ul>
	</div>
	<div class="rounded-xl border border-slate-800 bg-slate-900 p-4">
		<h2 class="mb-3 text-lg font-semibold">QR Identity</h2>
		<PassportQR qrDataUrl={data.qrDataUrl} />
	</div>
</section>
