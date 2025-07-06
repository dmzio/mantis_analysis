import { defineComponent } from 'vue';
import * as d3 from 'd3';

export default defineComponent({
  name: 'SessionViewer',
  template: `
      <div>
        <header>MantisX Session&nbsp;Visualizer (offline)</header>
        <div ref="dropzone" id="dropzone">Drop a <code>.json</code> session file here or click to select</div>
        <input ref="fileInput" type="file" id="file-input" accept="application/json" style="display:none" />
        <div ref="controls" id="controls" style="display:none">
          <div class="label-row"><span>Shot:</span><span ref="shotNum">–</span></div>
          <input ref="shotSlider" type="range" id="shot-slider" min="0" max="0" value="0" step="1" />
          <div class="label-row"><span>Speed:</span><span ref="speedVal">1×</span></div>
          <input ref="speedSlider" type="range" id="speed-slider" min="0.25" max="3" value="1" step="0.25" />
          <select ref="scaleSelect" id="scale-select">
            <option value="auto">Auto Scale</option>
            <option value="fixed">Fixed Scale (10&nbsp;ring)</option>
          </select>
        </div>
        <div ref="canvasWrap" id="canvas-wrap"></div>
      </div>
    `,
  data() {
    return { session: null as any, shots: [] as any[], current: 0 };
  },
  mounted() {
    const dz = this.$refs.dropzone as HTMLElement;
    const fi = this.$refs.fileInput as HTMLInputElement;
    ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('hover'); }));
    ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('hover'); }));
    dz.addEventListener('drop', e => this.readFile((e as DragEvent).dataTransfer!.files[0]));
    dz.addEventListener('click', () => fi.click());
    fi.addEventListener('change', e => this.readFile((e.target as HTMLInputElement).files![0]));
    (this.$refs.speedSlider as HTMLInputElement).addEventListener('input', e => { (this.$refs.speedVal as HTMLElement).textContent = (e.target as HTMLInputElement).value + '×'; this.drawCanvas(); });
    (this.$refs.shotSlider as HTMLInputElement).addEventListener('input', e => { this.current = +(e.target as HTMLInputElement).value; this.drawCanvas(); });
    (this.$refs.scaleSelect as HTMLSelectElement).addEventListener('change', () => this.drawCanvas());
  },
  methods: {
    toRelativeCoords(shot: any) {
      const { pitch, yaw, hold_index } = shot;
      const basePitch = pitch[hold_index] ?? pitch[0];
      const baseYaw = yaw[hold_index] ?? yaw[0];
      const relPitch = pitch.map((p: number) => p - basePitch);
      const relYaw = yaw.map((y: number) => y - baseYaw);
      return relPitch.map((p: number, i: number) => [relYaw[i], -p]);
    },
    makeScale(coords: number[], size: number) {
      if ((this.$refs.scaleSelect as HTMLSelectElement).value === 'fixed') {
        const maxDeg = 10;
        return (v: number) => (v / maxDeg) * (size / 2);
      }
      const extent = d3.extent(coords.map(Math.abs)) as [number, number];
      const k = (size / 2) / (extent[1] || 1e-3);
      return (v: number) => v * k;
    },
    drawCanvas() {
      const cw = this.$refs.canvasWrap as HTMLElement;
      d3.select(cw).html('');
      const size = cw.clientWidth;
      const svg = d3.select(cw).append('svg');
      const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`);
      const rings = d3.range(1, 6).map(i => (i / 5) * (size / 2));
      g.selectAll('circle.ring').data(rings).enter().append('circle')
        .attr('class', 'ring').attr('r', d => d)
        .attr('fill', 'none').attr('stroke', 'var(--ring)').attr('stroke-width', 1);
      g.append('line').attr('x1', -size / 2).attr('x2', size / 2).attr('y1', 0).attr('y2', 0)
        .attr('stroke', 'var(--cross)').attr('stroke-width', 1);
      g.append('line').attr('y1', -size / 2).attr('y2', size / 2).attr('x1', 0).attr('x2', 0)
        .attr('stroke', 'var(--cross)').attr('stroke-width', 1);
      const holdPathGrp = g.append('g').attr('id', 'trace-hold');
      const triggerPathGrp = g.append('g').attr('id', 'trace-trigger');
      const pullDot = g.append('circle').attr('r', 4).attr('fill', 'var(--marker-pull)').attr('opacity', 0);
      const shotMark = g.append('text').attr('fill', 'var(--marker-shot)').attr('font-size', 14)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle').attr('opacity', 0).text('✕');
      const shot = (this as any).shots[this.current];
      if (!shot) return;
      (this.$refs.shotNum as HTMLElement).textContent = `${this.current + 1} / ${(this as any).shots.length}`;
      const coords = this.toRelativeCoords(shot);
      const scale = this.makeScale(coords.flat(), size);
      const scaled = coords.map(([x, y]) => [scale(x), scale(y)]);
      const holdEnd = shot.hold_index ?? 0;
      const triggerEnd = shot.pull_index ?? holdEnd;
      const shotIdx = shot.shot_index ?? scaled.length - 1;
      const pathHold = scaled.slice(0, triggerEnd + 1);
      const pathTrigger = scaled.slice(triggerEnd, shotIdx + 1);
      const line = d3.line().curve(d3.curveBasis);
      const holdPath = holdPathGrp.append('path')
        .attr('d', line(pathHold)!)
        .attr('fill', 'none')
        .attr('stroke', 'var(--trace-hold)')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', function () { return (this as SVGPathElement).getTotalLength(); })
        .attr('stroke-dashoffset', function () { return (this as SVGPathElement).getTotalLength(); });
      const triggerPath = triggerPathGrp.append('path')
        .attr('d', line(pathTrigger)!)
        .attr('fill', 'none')
        .attr('stroke', 'var(--trace-trigger)')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', function () { return (this as SVGPathElement).getTotalLength(); })
        .attr('stroke-dashoffset', function () { return (this as SVGPathElement).getTotalLength(); });
      const totalDur = 3000 / +(this.$refs.speedSlider as HTMLInputElement).value;
      const holdDur = totalDur * (pathHold.length / scaled.length);
      const trigDur = totalDur - holdDur;
      holdPath.transition()
        .duration(holdDur)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0)
        .on('end', () => {
          const [px, py] = scaled[triggerEnd];
          pullDot.attr('cx', px).attr('cy', py).attr('opacity', 1);
          triggerPath.transition()
            .duration(trigDur)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0)
            .on('end', () => {
              const [sx, sy] = scaled[shotIdx];
              shotMark.attr('x', sx).attr('y', sy).attr('opacity', 1);
            });
        });
    },
    loadSession(obj: any) {
      this.session = obj.session || obj;
      this.shots = this.session.shots || [];
      if (!this.shots.length) { alert('No shots found in JSON'); return; }
      (this.$refs.controls as HTMLElement).style.display = 'flex';
      (this.$refs.shotSlider as HTMLInputElement).max = String(this.shots.length - 1);
      (this.$refs.shotSlider as HTMLInputElement).value = '0';
      (this.$refs.speedSlider as HTMLInputElement).value = '1';
      (this.$refs.speedVal as HTMLElement).textContent = '1×';
      this.current = 0;
      this.drawCanvas();
    },
    readFile(file: File | undefined) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          this.loadSession(JSON.parse((e.target as FileReader).result as string));
        } catch (err) {
          alert('Invalid JSON file');
          console.error(err);
        }
      };
      reader.readAsText(file);
    }
  }
});
