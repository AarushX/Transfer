<script lang="ts">
	import { filterByScope } from './skill-tree-scope';

	let {
		nodes = [],
		statuses = [],
		prerequisites = [],
		scope = undefined,
		selectedNodeId = undefined,
		onSelect = undefined
	}: {
		nodes: Array<{ id: string; title: string; slug: string }>;
		statuses: Array<{ node_id: string; computed_status: string }>;
		prerequisites: Array<{ node_id: string; prerequisite_node_id: string }>;
		scope?: Set<string> | string[] | undefined;
		selectedNodeId?: string | null;
		onSelect?: ((nodeId: string | null) => void) | undefined;
	} = $props();

	const scopeSet = $derived(
		scope instanceof Set ? scope : scope ? new Set(scope) : undefined
	);

	const filtered = $derived.by(() => filterByScope(nodes, prerequisites, scopeSet));

	const hasGraphData = $derived((filtered.nodes?.length ?? 0) > 0 && (filtered.prerequisites?.length ?? 0) > 0);

	let legendMinimized = $state(true);

	const NODE_R = 26;
	const MIN_ZOOM = 0.15;
	const MAX_ZOOM = 3;

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
		for (const n of filtered.nodes) {
			incoming.set(n.id, 0);
			children.set(n.id, []);
		}
		for (const edge of filtered.prerequisites) {
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
		for (const n of filtered.nodes) {
			const l = layer.get(n.id) ?? 0;
			const arr = perLayerNodes.get(l) ?? [];
			arr.push(n.id);
			perLayerNodes.set(l, arr);
		}

		const hSpacing = 200;
		const vSpacing = 100;
		const padX = 120;
		const padY = 80;

		const result: LayoutNode[] = [];
		for (const n of filtered.nodes) {
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

	const nodeMap = $derived(new Map(layoutNodes.map((n) => [n.id, n])));

	const edges = $derived.by(() => {
		return filtered.prerequisites
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
	// When the parent provides selectedNodeId + onSelect it owns selection and
	// the internal detail dialog is suppressed (used on editor pages where the
	// graph is a passive picker).
	const parentControlled = $derived(typeof onSelect === 'function');
	const effectiveSelected = $derived.by(() => {
		if (parentControlled) {
			return selectedNodeId ? layoutNodes.find((n) => n.id === selectedNodeId) ?? null : null;
		}
		return selected;
	});
	const active = $derived(hovered ?? effectiveSelected);

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

	// --- Zoom & pan state ---
	let zoom = $state(1);
	let panX = $state(0);
	let panY = $state(0);
	let containerEl = $state<HTMLDivElement | null>(null);

	let isPanning = $state(false);
	let panStart = $state({ x: 0, y: 0, panX: 0, panY: 0 });
	let didPan = $state(false);

	const viewBox = $derived(
		`${-panX / zoom} ${-panY / zoom} ${(containerEl?.clientWidth ?? 800) / zoom} ${(containerEl?.clientHeight ?? 600) / zoom}`
	);

	function fitView() {
		if (!containerEl || layoutNodes.length === 0) return;
		const cw = containerEl.clientWidth;
		const ch = containerEl.clientHeight;
		const pad = 60;

		const xs = layoutNodes.map((n) => n.x);
		const ys = layoutNodes.map((n) => n.y);
		const minX = Math.min(...xs) - NODE_R;
		const maxX = Math.max(...xs) + NODE_R;
		const minY = Math.min(...ys) - NODE_R;
		const maxY = Math.max(...ys) + NODE_R + 20; // +20 for label below node

		const bboxW = maxX - minX;
		const bboxH = maxY - minY;

		const zx = cw / (bboxW + pad * 2);
		const zy = ch / (bboxH + pad * 2);
		const z = Math.min(zx, zy, MAX_ZOOM);
		zoom = Math.max(z, MIN_ZOOM);

		const bboxCenterX = (minX + maxX) / 2;
		const bboxCenterY = (minY + maxY) / 2;
		panX = cw / 2 - bboxCenterX * zoom;
		panY = ch / 2 - bboxCenterY * zoom;
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const rect = containerEl!.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const absDelta = Math.abs(e.deltaY);
		const speed = absDelta < 10 ? 0.01 : absDelta < 50 ? 0.03 : 0.06;
		const factor = 1 - Math.sign(e.deltaY) * speed * Math.min(absDelta, 60);
		const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
		panX = mx - (mx - panX) * (newZoom / zoom);
		panY = my - (my - panY) * (newZoom / zoom);
		zoom = newZoom;
	}

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		if ((e.target as HTMLElement).closest('button')) return;
		e.preventDefault();
		isPanning = true;
		didPan = false;
		panStart = { x: e.clientX, y: e.clientY, panX, panY };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isPanning) return;
		const dx = e.clientX - panStart.x;
		const dy = e.clientY - panStart.y;
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan = true;
		panX = panStart.panX + dx;
		panY = panStart.panY + dy;
	}

	function handlePointerUp(e: PointerEvent) {
		isPanning = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		if (didPan) return;
		const target = e.target as Element | null;
		const nodeGroup = target?.closest('g[data-node-id]') as SVGElement | null;
		const nodeId = nodeGroup?.getAttribute('data-node-id');
		if (!nodeId) return;
		const node = layoutNodes.find((n) => n.id === nodeId) ?? null;
		if (!node) return;
		if (parentControlled) {
			const next = selectedNodeId === nodeId ? null : nodeId;
			onSelect?.(next);
		} else {
			selected = selected?.id === nodeId ? null : node;
		}
	}

	// Touch pinch-to-zoom
	let pinchStartDist = $state(0);
	let pinchStartZoom = $state(1);

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length === 2) {
			e.preventDefault();
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			pinchStartDist = Math.hypot(dx, dy);
			pinchStartZoom = zoom;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (e.touches.length === 2) {
			e.preventDefault();
			const dx = e.touches[0].clientX - e.touches[1].clientX;
			const dy = e.touches[0].clientY - e.touches[1].clientY;
			const dist = Math.hypot(dx, dy);
			if (pinchStartDist > 0) {
				zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom * (dist / pinchStartDist)));
			}
		}
	}

	// Auto-fit whenever the underlying graph changes — covers fresh mounts AND
	// in-place data swaps (e.g. navigating between sibling subteam pages that
	// share this component instance). Reading layoutNodes here registers the
	// dependency so the effect re-runs on every layout change. Also clear any
	// stale internal selection from the previous graph so the side panel
	// doesn't linger when the host page is uncontrolled.
	$effect(() => {
		const count = layoutNodes.length;
		if (!hasGraphData || !containerEl || count === 0) return;
		if (!parentControlled) selected = null;
		hovered = null;
		requestAnimationFrame(() => fitView());
	});

	// Re-fit if the container itself resizes (sidebar opens/closes, window resize).
	$effect(() => {
		if (!containerEl) return;
		const ro = new ResizeObserver(() => {
			if (hasGraphData && layoutNodes.length > 0) fitView();
		});
		ro.observe(containerEl);
		return () => ro.disconnect();
	});
</script>

{#if hasGraphData}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={containerEl}
		class="relative overflow-hidden rounded-2xl border backdrop-blur-xl"
		style="background: var(--app-glass-bg); border-color: var(--app-glass-border); box-shadow: var(--app-glass-shadow); height: 100%; touch-action: none; user-select: none; cursor: {isPanning ? 'grabbing' : 'grab'};"
		onwheel={handleWheel}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
	>
		<svg viewBox={viewBox} style="width: 100%; height: 100%; display: block;">
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

			<rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#dotgrid)" />

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
				{@const isSelected = effectiveSelected?.id === node.id}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<g
					data-node-id={node.id}
					style="cursor: pointer;"
					onmouseenter={() => (hovered = node)}
					onmouseleave={() => (hovered = null)}
				>
					{#if !isLocked}
						<circle cx={node.x} cy={node.y} r={NODE_R + 10}
							fill="url(#halo-{node.state})"
							opacity={node.state === 'in_progress' || node.state === 'video_pending' || node.state === 'quiz_pending' ? 0.9 : 0.5}
							style="pointer-events: none;" />
					{/if}
					<circle cx={node.x} cy={node.y} r={NODE_R}
						fill={isLocked ? '#0f1729' : `url(#fill-${node.state})`}
						stroke={color}
						stroke-width={isSelected ? 2.5 : node.state === 'in_progress' || node.state === 'video_pending' || node.state === 'quiz_pending' ? 2 : 1.2}
						opacity={isLocked ? 0.5 : 1}
						style={isSelected ? `filter: drop-shadow(0 0 8px ${color});` : ''} />
					<foreignObject x={node.x - NODE_R} y={node.y - NODE_R} width={NODE_R * 2} height={NODE_R * 2} style="pointer-events: none;">
						<div style="width: 100%; height: 100%; display: grid; place-items: center; color: {isLocked ? '#475569' : 'white'}; pointer-events: none; cursor: inherit;">
							{#if node.state === 'completed'}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; pointer-events: none;"><polyline points="4 12 10 18 20 6"/></svg>
							{:else if node.state === 'in_progress' || node.state === 'video_pending' || node.state === 'quiz_pending'}
								<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="width: 18px; height: 18px; pointer-events: none;"><polygon points="6 4 20 12 6 20 6 4"/></svg>
							{:else if node.state === 'mentor_checkoff_pending'}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px; pointer-events: none;"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
							{:else if node.state === 'available'}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px; pointer-events: none;"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
							{:else}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; pointer-events: none;"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
							{/if}
						</div>
					</foreignObject>
					<text x={node.x} y={node.y + NODE_R + 18} text-anchor="middle"
						fill={isLocked ? '#475569' : '#e6edf7'} font-size="11" font-weight="600" style="font-family: Inter, sans-serif; pointer-events: none;">
						{node.title}
					</text>
					<!-- Hit target: invisible rect spanning circle + label so the whole
					     visible node area is reliably clickable, even where foreignObject
					     would otherwise swallow the event. -->
					<rect
						x={node.x - NODE_R - 4}
						y={node.y - NODE_R - 4}
						width={NODE_R * 2 + 8}
						height={NODE_R * 2 + 30}
						fill="transparent"
						style="pointer-events: all;"
					/>
				</g>
			{/each}
		</svg>

		<!-- Zoom controls -->
		<div class="absolute right-4 bottom-4 flex flex-col gap-1.5" style="z-index: 5;">
			<button
				type="button"
				onclick={() => { zoom = Math.min(MAX_ZOOM, zoom * 1.3); }}
				class="grid h-8 w-8 place-items-center rounded-lg border backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted); cursor: pointer;"
				aria-label="Zoom in"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4"><path d="M12 5v14M5 12h14"/></svg>
			</button>
			<button
				type="button"
				onclick={() => { zoom = Math.max(MIN_ZOOM, zoom / 1.3); }}
				class="grid h-8 w-8 place-items-center rounded-lg border backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted); cursor: pointer;"
				aria-label="Zoom out"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4"><path d="M5 12h14"/></svg>
			</button>
			<button
				type="button"
				onclick={fitView}
				class="grid h-8 w-8 place-items-center rounded-lg border backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted); cursor: pointer;"
				aria-label="Fit to view"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
			</button>
		</div>

		<!-- Legend -->
		{#if legendMinimized}
			<button
				type="button"
				onclick={() => (legendMinimized = false)}
				class="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase backdrop-blur-xl"
				style="background: var(--app-glass-bg); border-color: var(--app-glass-border); color: var(--app-text-muted); box-shadow: var(--app-glass-shadow); z-index: 5; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;"
				onmouseenter={(event) => {
					event.currentTarget.style.background = 'var(--app-glass-bg-hover)';
					event.currentTarget.style.color = 'var(--app-text)';
					event.currentTarget.style.borderColor = 'var(--app-glass-border-hover)';
				}}
				onmouseleave={(event) => {
					event.currentTarget.style.background = 'var(--app-glass-bg)';
					event.currentTarget.style.color = 'var(--app-text-muted)';
					event.currentTarget.style.borderColor = 'var(--app-glass-border)';
				}}
				aria-label="Show legend"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-2.5 w-2.5"><circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="9"/></svg>
				Legend
			</button>
		{:else}
			<div class="absolute left-4 bottom-4 rounded-2xl border p-3 backdrop-blur-xl" style="background: var(--app-glass-bg); border-color: var(--app-glass-border); z-index: 5;">
				<div class="mb-2 flex items-center justify-between gap-3">
					<p class="eyebrow-label" style="margin-bottom: 0;">Legend</p>
					<button
						type="button"
						onclick={() => (legendMinimized = true)}
						class="grid h-5 w-5 place-items-center rounded-md"
						style="background: transparent; border: none; color: var(--app-text-dim); cursor: pointer;"
						onmouseenter={(event) => { event.currentTarget.style.background = 'var(--app-glass-bg-hover)'; event.currentTarget.style.color = 'var(--app-text)'; }}
						onmouseleave={(event) => { event.currentTarget.style.background = 'transparent'; event.currentTarget.style.color = 'var(--app-text-dim)'; }}
						aria-label="Minimize legend"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-3 w-3"><path d="M5 12h14"/></svg>
					</button>
				</div>
				<div class="flex flex-col gap-1.5">
					{#each [['completed','Completed'], ['in_progress','In progress'], ['mentor_checkoff_pending','Awaiting mentor'], ['available','Available'], ['locked','Locked']] as [key, label]}
						<div class="flex items-center gap-2 text-[11px]">
							<span class="h-2.5 w-2.5 rounded-full" style="background: {STATE_COLOR[key]}; {key !== 'locked' ? `box-shadow: 0 0 6px ${STATE_COLOR[key]};` : ''}"></span>
							<span style="color: var(--app-text-muted);">{label}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

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
