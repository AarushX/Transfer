<script lang="ts">
	let {
		nodes = [],
		statuses = [],
		prerequisites = []
	}: {
		nodes: Array<{ id: string; title: string; slug: string }>;
		statuses: Array<{ node_id: string; computed_status: string }>;
		prerequisites: Array<{ node_id: string; prerequisite_node_id: string }>;
	} = $props();

	const hasGraphData = $derived((nodes?.length ?? 0) > 0 && (prerequisites?.length ?? 0) > 0);

	const NODE_R = 26;

	const STATE_COLOR: Record<string, string> = {
		completed: '#34d399',
		in_progress: '#06b6d4',
		mentor_checkoff_pending: '#fbbf24',
		video_pending: '#06b6d4',
		quiz_pending: '#06b6d4',
		available: '#8b5cf6',
		locked: '#475569'
	};

	const statusMap = $derived(
		new Map(statuses.map((s) => [s.node_id, s.computed_status]))
	);

	const moduleState = (id: string) => statusMap.get(id) ?? 'locked';

	type LayoutNode = {
		id: string;
		title: string;
		slug: string;
		x: number;
		y: number;
		state: string;
	};

	const layoutNodes = $derived.by((): LayoutNode[] => {
		const incoming = new Map<string, number>();
		const children = new Map<string, string[]>();
		for (const n of nodes) {
			incoming.set(n.id, 0);
			children.set(n.id, []);
		}
		for (const edge of prerequisites) {
			if (!incoming.has(edge.node_id) || !children.has(edge.prerequisite_node_id)) continue;
			incoming.set(edge.node_id, (incoming.get(edge.node_id) ?? 0) + 1);
			children.get(edge.prerequisite_node_id)?.push(edge.node_id);
		}

		const queue: string[] = [];
		const layer = new Map<string, number>();
		for (const [id, deg] of incoming.entries()) {
			if (deg === 0) {
				queue.push(id);
				layer.set(id, 0);
			}
		}
		while (queue.length > 0) {
			const cur = queue.shift()!;
			const curLayer = layer.get(cur) ?? 0;
			for (const next of children.get(cur) ?? []) {
				layer.set(next, Math.max(layer.get(next) ?? 0, curLayer + 1));
				incoming.set(next, (incoming.get(next) ?? 1) - 1);
				if (incoming.get(next) === 0) queue.push(next);
			}
		}

		const perLayerNodes = new Map<number, string[]>();
		for (const n of nodes) {
			const l = layer.get(n.id) ?? 0;
			const arr = perLayerNodes.get(l) ?? [];
			arr.push(n.id);
			perLayerNodes.set(l, arr);
		}

		const maxLayer = Math.max(0, ...[...perLayerNodes.keys()]);
		const hSpacing = 200;
		const vSpacing = 100;
		const padX = 120;
		const padY = 80;

		const nodeById = new Map(nodes.map((n) => [n.id, n]));
		const result: LayoutNode[] = [];
		for (const n of nodes) {
			const l = layer.get(n.id) ?? 0;
			const layerArr = perLayerNodes.get(l) ?? [n.id];
			const idx = layerArr.indexOf(n.id);
			const layerSize = layerArr.length;
			const totalH = (layerSize - 1) * vSpacing;
			const x = padX + l * hSpacing;
			const y = padY + (totalH > 0 ? idx * vSpacing : 0) + (400 - totalH) / 2;
			result.push({
				id: n.id,
				title: n.title,
				slug: n.slug,
				x,
				y,
				state: moduleState(n.id)
			});
		}
		return result;
	});

	const viewBoxWidth = $derived(Math.max(800, ...layoutNodes.map((n) => n.x + 120)));
	const viewBoxHeight = $derived(Math.max(600, ...layoutNodes.map((n) => n.y + 100)));
	const nodeMap = $derived(new Map(layoutNodes.map((n) => [n.id, n])));

	const edges = $derived.by(() => {
		return prerequisites
			.map((p) => {
				const from = nodeMap.get(p.prerequisite_node_id);
				const to = nodeMap.get(p.node_id);
				if (!from || !to) return null;
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const dist = Math.hypot(dx, dy);
				if (dist === 0) return null;
				const ux = dx / dist, uy = dy / dist;
				return {
					key: `${p.prerequisite_node_id}->${p.node_id}`,
					x1: from.x + ux * NODE_R,
					y1: from.y + uy * NODE_R,
					x2: to.x - ux * NODE_R,
					y2: to.y - uy * NODE_R,
					isActive: from.state === 'completed' && to.state !== 'locked'
				};
			})
			.filter(Boolean) as Array<{ key: string; x1: number; y1: number; x2: number; y2: number; isActive: boolean }>;
	});

	let selected = $state<LayoutNode | null>(null);
	let hovered = $state<LayoutNode | null>(null);
	const active = $derived(hovered ?? selected);

	const stateLabel = (state: string) =>
		({
			completed: 'Completed',
			in_progress: 'In progress',
			mentor_checkoff_pending: 'Awaiting mentor',
			video_pending: 'Watching video',
			quiz_pending: 'Quiz pending',
			available: 'Available',
			locked: 'Locked'
		})[state] ?? state;
</script>

{#if hasGraphData}
	<div class="relative overflow-hidden rounded-2xl border backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); height: 640px;">
		<svg viewBox="0 0 {viewBoxWidth} {viewBoxHeight}" style="width: 100%; height: 100%;">
			<defs>
				{#each Object.entries(STATE_COLOR) as [key, color]}
					<radialGradient id="fill-{key}">
						<stop offset="0%" stop-color={color} stop-opacity="0.9" />
						<stop offset="100%" stop-color={color} stop-opacity="0.4" />
					</radialGradient>
					<radialGradient id="halo-{key}">
						<stop offset="0%" stop-color={color} stop-opacity="0.5" />
						<stop offset="60%" stop-color={color} stop-opacity="0.1" />
						<stop offset="100%" stop-color={color} stop-opacity="0" />
					</radialGradient>
				{/each}
				<linearGradient id="edge-active-grad" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stop-color="#34d399" />
					<stop offset="100%" stop-color="#06b6d4" />
				</linearGradient>
				<pattern id="dotgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
					<circle cx="2" cy="2" r="1" fill="#1e293b" />
				</pattern>
			</defs>

			<rect width={viewBoxWidth} height={viewBoxHeight} fill="url(#dotgrid)" />

			<!-- Edges -->
			{#each edges as edge (edge.key)}
				<g>
					<path
						d="M {edge.x1} {edge.y1} L {edge.x2} {edge.y2}"
						stroke={edge.isActive ? 'url(#edge-active-grad)' : '#1e293b'}
						stroke-width={edge.isActive ? 1.5 : 1}
						fill="none"
						stroke-dasharray={edge.isActive ? '0' : '4 4'}
					/>
					{#if edge.isActive}
						<circle r="2" fill="#06b6d4">
							<animateMotion dur="3s" repeatCount="indefinite" path="M {edge.x1} {edge.y1} L {edge.x2} {edge.y2}" />
						</circle>
					{/if}
				</g>
			{/each}

			<!-- Nodes -->
			{#each layoutNodes as node (node.id)}
				{@const color = STATE_COLOR[node.state] ?? '#475569'}
				{@const isLocked = node.state === 'locked'}
				{@const isSelected = selected?.id === node.id}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<g
					style="cursor: pointer;"
					onclick={() => (selected = isSelected ? null : node)}
					onmouseenter={() => (hovered = node)}
					onmouseleave={() => (hovered = null)}
				>
					{#if !isLocked}
						<circle cx={node.x} cy={node.y} r={NODE_R + 10}
							fill="url(#halo-{node.state})"
							opacity={node.state === 'in_progress' || node.state === 'video_pending' || node.state === 'quiz_pending' ? 0.9 : 0.5} />
					{/if}
					{#if isSelected}
						<circle cx={node.x} cy={node.y} r={NODE_R + 6}
							fill="none" stroke={color} stroke-width="1.5" opacity="0.6"
							stroke-dasharray="3 4" />
					{/if}
					<circle cx={node.x} cy={node.y} r={NODE_R}
						fill={isLocked ? '#0f1729' : `url(#fill-${node.state})`}
						stroke={color}
						stroke-width={node.state === 'in_progress' || node.state === 'video_pending' || node.state === 'quiz_pending' ? 2 : 1.2}
						opacity={isLocked ? 0.5 : 1} />
					<foreignObject x={node.x - NODE_R} y={node.y - NODE_R} width={NODE_R * 2} height={NODE_R * 2}>
						<div style="width: 100%; height: 100%; display: grid; place-items: center; color: {isLocked ? '#475569' : 'white'};">
							{#if node.state === 'completed'}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;"><polyline points="4 12 10 18 20 6"/></svg>
							{:else if node.state === 'in_progress' || node.state === 'video_pending' || node.state === 'quiz_pending'}
								<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="width: 18px; height: 18px;"><polygon points="6 4 20 12 6 20 6 4"/></svg>
							{:else if node.state === 'mentor_checkoff_pending'}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
							{:else if node.state === 'available'}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
							{:else}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
							{/if}
						</div>
					</foreignObject>
					<text x={node.x} y={node.y + NODE_R + 18} text-anchor="middle"
						fill={isLocked ? '#475569' : '#e6edf7'} font-size="11" font-weight="600" style="font-family: Inter, sans-serif;">
						{node.title}
					</text>
				</g>
			{/each}
		</svg>

		<!-- Legend -->
		<div class="absolute left-4 bottom-4 rounded-2xl border p-3 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); z-index: 5;">
			<p class="eyebrow-label mb-2">Legend</p>
			<div class="flex flex-col gap-1.5">
				{#each [['completed','Completed'], ['in_progress','In progress'], ['mentor_checkoff_pending','Awaiting mentor'], ['available','Available'], ['locked','Locked']] as [key, label]}
					<div class="flex items-center gap-2 text-[11px]">
						<span class="h-2.5 w-2.5 rounded-full" style="background: {STATE_COLOR[key]}; {key !== 'locked' ? `box-shadow: 0 0 6px ${STATE_COLOR[key]};` : ''}"></span>
						<span style="color: var(--app-text-muted);">{label}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Detail panel -->
		{#if active}
			<div class="fade-up absolute right-4 top-4 w-80 rounded-2xl border p-5 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); z-index: 5;">
				<div class="mb-3 flex items-center justify-between">
					<span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
						style="background: color-mix(in srgb, {STATE_COLOR[active.state] ?? '#475569'} 14%, transparent); border-color: color-mix(in srgb, {STATE_COLOR[active.state] ?? '#475569'} 30%, transparent); color: {STATE_COLOR[active.state] ?? '#475569'};">
						{stateLabel(active.state)}
					</span>
					<button onclick={() => { selected = null; }}
						class="grid h-6 w-6 place-items-center rounded-md"
						style="background: transparent; border: none; color: var(--app-text-dim); cursor: pointer;"
						onmouseenter={(e) => { e.currentTarget.style.background = 'var(--app-glass-bg-hover)'; }}
						onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" style="transform: rotate(45deg);"><path d="M12 5v14M5 12h14"/></svg>
					</button>
				</div>
				<h3 class="text-lg font-bold tracking-tight" style="letter-spacing: -0.02em;">{active.title}</h3>
				<div class="mt-4 flex gap-2">
					{#if active.state !== 'locked'}
						<a href={`/learn/${active.slug}`} class="btn btn-primary inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-medium">
							Open module
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
						</a>
					{:else}
						<span class="inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-xs font-medium" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-dim); opacity: 0.6;">
							Locked
						</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="rounded-2xl border p-6 text-sm backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted); box-shadow: var(--app-glass-shadow);">
		No prerequisite graph to show yet.
	</div>
{/if}
