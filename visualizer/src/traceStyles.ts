import { computed, ref } from 'vue';
import * as d3 from 'd3';

export type TraceStyleId = 'target' | 'mantisx';

export interface TraceStyleRenderContext {
  root: d3.Selection<SVGGElement, unknown, null, undefined>;
  size: number;
  ringPixels: number[];
  ringDegrees: number[];
  ringMoa: number[];
  useMoa: boolean;
  styleMeta?: unknown;
}

export interface TraceStyleDefinition {
  id: TraceStyleId;
  label: string;
  description: string;
  ringDegrees: number[];
  meta?: unknown;
  renderBackground(ctx: TraceStyleRenderContext): void;
}

const BASE_RING_DEGREES = [1 / 16, 3 / 16, 5 / 16, 7 / 16, 9 / 16];
const MOA_TO_DEG = 1 / 60;

interface TargetRingSpec {
  score: string;
  diameterMoa: number;
  showLabel?: boolean;
}

const TARGET_RING_SPECS: TargetRingSpec[] = [
  { score: 'inner10', diameterMoa: 1.719 },
  { score: '10', diameterMoa: 3.953 },
  { score: '9', diameterMoa: 9.454 },
  { score: '8', diameterMoa: 14.954, showLabel: true },
  { score: '7', diameterMoa: 20.455, showLabel: true },
  { score: '6', diameterMoa: 25.955, showLabel: true },
  { score: '5', diameterMoa: 31.455, showLabel: true },
  { score: '4', diameterMoa: 36.956, showLabel: true },
  { score: '3', diameterMoa: 42.456, showLabel: true },
  { score: '2', diameterMoa: 47.957, showLabel: true },
  { score: '1', diameterMoa: 53.457, showLabel: true }
];

const TARGET_RING_DEGREES = TARGET_RING_SPECS.map(spec => moaDiameterToDegreeRadius(spec.diameterMoa));

function moaDiameterToDegreeRadius(moaDiameter: number) {
  const radiusMoa = moaDiameter / 2;
  return radiusMoa * MOA_TO_DEG;
}

function drawCrosshair(root: d3.Selection<SVGGElement, unknown, null, undefined>, size: number) {
  const center = size / 2;
  root.append('line')
    .attr('x1', 0)
    .attr('x2', size)
    .attr('y1', center)
    .attr('y2', center)
    .attr('stroke', 'var(--cross)')
    .attr('stroke-width', 0.8)
    .attr('stroke-opacity', 'var(--crosshair-alpha, 0.4)')
    .attr('class', 'trace-crosshair');
  root.append('line')
    .attr('y1', 0)
    .attr('y2', size)
    .attr('x1', center)
    .attr('x2', center)
    .attr('stroke', 'var(--cross)')
    .attr('stroke-width', 0.8)
    .attr('stroke-opacity', 'var(--crosshair-alpha, 0.4)')
    .attr('class', 'trace-crosshair');
}

const mantisxStyle: TraceStyleDefinition = {
  id: 'mantisx',
  label: 'MantisX',
  description: 'Classic concentric rings with MOA guidance, matching the legacy view.',
  ringDegrees: BASE_RING_DEGREES,
  renderBackground({ root, size, ringPixels, ringMoa }) {
    const center = size / 2;
    root.selectAll('circle.ring').data(ringPixels).enter().append('circle')
      .attr('class', 'ring')
      .attr('cx', center)
      .attr('cy', center)
      .attr('r', d => d)
      .attr('fill', 'none')
      .attr('stroke', 'var(--ring)')
      .attr('stroke-width', 1);
    root.selectAll('text.ring-label').data(ringPixels).enter().append('text')
      .attr('class', 'ring-label')
      .attr('x', d => center + d + 2)
      .attr('y', center - 2)
      .text((_, i) => `${ringMoa[i].toFixed(1)} MOA`);
    drawCrosshair(root, size);
  }
};

const targetStyle: TraceStyleDefinition = {
  id: 'target',
  label: 'Target',
  description: 'ISSF-inspired pistol target with numbered scoring rings.',
  ringDegrees: TARGET_RING_DEGREES,
  meta: { specs: TARGET_RING_SPECS },
  renderBackground({ root, size, ringPixels, styleMeta }) {
    const specs = (styleMeta as { specs: TargetRingSpec[] } | undefined)?.specs ?? [];
    if (!specs.length) {
      drawCrosshair(root, size);
      return;
    }
    const center = size / 2;
    const populated = specs.map((spec, idx) => ({
      ...spec,
      radiusPx: ringPixels[idx]
    })).filter(entry => Number.isFinite(entry.radiusPx));
    if (!populated.length) {
      drawCrosshair(root, size);
      return;
    }
    const radiusByScore = new Map(populated.map(entry => [entry.score, entry.radiusPx]));
    const outerRadius = radiusByScore.get('1') ?? populated[populated.length - 1].radiusPx;
    const group = root.append('g').attr('class', 'target-visual');

    group.append('circle')
      .attr('class', 'target-paper')
      .attr('cx', center)
      .attr('cy', center)
      .attr('r', outerRadius + Math.min(outerRadius * 0.08, 18));

    const aimRadius = radiusByScore.get('7');
    if (aimRadius) {
      group.append('circle')
        .attr('class', 'target-aim')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', aimRadius);
    }

    const innerTenRadius = radiusByScore.get('inner10');
    if (innerTenRadius) {
      group.append('circle')
        .attr('class', 'target-inner-ten')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', innerTenRadius);
    }

    group.append('g')
      .selectAll('circle.target-ring')
      .data(populated.filter(entry => entry.score !== 'inner10'))
      .enter()
      .append('circle')
      .attr('class', d => `target-ring target-ring--${d.score}`)
      .attr('data-score', d => d.score)
      .attr('cx', center)
      .attr('cy', center)
      .attr('r', d => d.radiusPx);

    const labelSpecs = populated.filter(entry => entry.showLabel);
    if (labelSpecs.length) {
      const cardinals = [
        { dx: 0, dy: -1, anchor: 'middle' as const },
        { dx: 1, dy: 0, anchor: 'start' as const },
        { dx: 0, dy: 1, anchor: 'middle' as const },
        { dx: -1, dy: 0, anchor: 'end' as const }
      ];
      const labelGroup = group.append('g').attr('class', 'target-ring-numerals');
      labelGroup.selectAll('g.target-ring-label')
        .data(labelSpecs)
        .enter()
        .append('g')
        .attr('class', d => `target-ring-label target-ring-label--${d.score}`)
        .selectAll('text')
        .data(spec => {
          const radius = spec.radiusPx;
          const inset = Math.min(radius * 0.2, 18);
          const distance = Math.max(4, radius - inset);
          return cardinals.map(pos => ({
            score: spec.score,
            x: center + pos.dx * distance,
            y: center + pos.dy * distance,
            anchor: pos.anchor
          }));
        })
        .enter()
        .append('text')
        .attr('class', 'target-ring-numeral')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('text-anchor', d => d.anchor)
        .attr('dominant-baseline', 'middle')
        .text(d => d.score);
    }

    drawCrosshair(group, size);
  }
};

export const TRACE_STYLES: Record<TraceStyleId, TraceStyleDefinition> = {
  target: targetStyle,
  mantisx: mantisxStyle
};

export const TRACE_STYLE_OPTIONS = Object.values(TRACE_STYLES).map(style => ({
  label: style.label,
  value: style.id,
  description: style.description
}));

export const DEFAULT_TRACE_STYLE: TraceStyleId = 'target';

const activeStyleId = ref<TraceStyleId>(DEFAULT_TRACE_STYLE);
let appliedClass: string | null = null;

function applyBodyClass(id: TraceStyleId) {
  if (typeof document === 'undefined') return;
  const nextClass = `trace-style-${id}`;
  if (appliedClass === nextClass) return;
  if (appliedClass) {
    document.body.classList.remove(appliedClass);
  }
  document.body.classList.add(nextClass);
  appliedClass = nextClass;
}

export function setActiveTraceStyle(id: TraceStyleId) {
  if (!TRACE_STYLES[id]) return;
  activeStyleId.value = id;
  applyBodyClass(id);
}

setActiveTraceStyle(DEFAULT_TRACE_STYLE);

export function useTraceStyle() {
  const activeStyle = computed(() => TRACE_STYLES[activeStyleId.value]);
  return {
    activeStyleId,
    activeStyle
  };
}
