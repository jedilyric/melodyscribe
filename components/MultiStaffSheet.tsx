'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Measure } from '@/types';
import { Instrument } from '@/lib/instruments';
import { vexKeySignature } from '@/lib/noteUtils';

export interface InstrumentPart {
  instrument: Instrument;
  measures: Measure[];
}

interface MultiStaffSheetProps {
  parts: InstrumentPart[];
  timeSignature: string;
  keySignature: string;
  selectedMeasure: number | null;
  onSelectMeasure: (idx: number | null) => void;
}

export interface MultiStaffSheetHandle {
  getSvgElement: () => SVGElement | null;
}

const STAVE_GAP = 28;
const SYSTEM_PAD = 55;
const FIRST_MEASURE_W = 300;
const STANDARD_MEASURE_W = 195;
const MEASURES_PER_ROW = 4;
const LEFT_MARGIN = 70;

const MultiStaffSheet = forwardRef<MultiStaffSheetHandle, MultiStaffSheetProps>(function MultiStaffSheet(
  { parts, timeSignature, keySignature, selectedMeasure, onSelectMeasure },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGElement | null>(null);
  const [clickZones, setClickZones] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);

  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current,
  }));

  useEffect(() => {
    if (!containerRef.current || parts.length === 0) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const numParts = parts.length;
    const maxMeasures = Math.max(...parts.map(p => p.measures.length), 1);
    const rows = Math.ceil(maxMeasures / MEASURES_PER_ROW);
    const totalWidth = container.offsetWidth || 900;

    // stave visual height is 40px in VexFlow; we use spacing relative to that
    const staveSpacing = 75; // top-of-stave to top-of-next-stave
    const systemHeight = numParts * staveSpacing + SYSTEM_PAD;
    const totalHeight = rows * systemHeight + 80;

    import('vexflow').then(({
      Renderer, Stave, StaveNote, Voice, Formatter,
      StaveConnector, Accidental,
    }) => {
      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(totalWidth, totalHeight);
      const ctx = renderer.getContext();
      ctx.setFont('Arial', 10);

      const svg = container.querySelector('svg') as SVGElement | null;
      if (svg) svgRef.current = svg;

      const zones: Array<{ x: number; y: number; width: number; height: number }> = [];
      const [beatsNum, beatVal] = timeSignature.split('/').map(Number);
      const vexKey = vexKeySignature(keySignature);

      for (let row = 0; row < rows; row++) {
        const systemTopY = row * systemHeight + 30;
        const measuresInRow = Math.min(MEASURES_PER_ROW, maxMeasures - row * MEASURES_PER_ROW);
        let xCursor = LEFT_MARGIN;

        for (let col = 0; col < measuresInRow; col++) {
          const mIdx = row * MEASURES_PER_ROW + col;
          const isFirst = col === 0;
          const mW = isFirst ? FIRST_MEASURE_W : STANDARD_MEASURE_W;
          const x = xCursor;
          const systemBotY = systemTopY + numParts * staveSpacing - staveSpacing + 40;

          // Highlight selected measure
          if (selectedMeasure === mIdx && svg) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', String(x));
            rect.setAttribute('y', String(systemTopY - 8));
            rect.setAttribute('width', String(mW));
            rect.setAttribute('height', String(systemBotY - systemTopY + 16));
            rect.setAttribute('fill', 'rgba(124,111,205,0.12)');
            rect.setAttribute('rx', '5');
            svg.insertBefore(rect, svg.firstChild);
          }

          const staveList: InstanceType<typeof Stave>[] = [];

          parts.forEach((part, pIdx) => {
            const staveY = systemTopY + pIdx * staveSpacing;
            const stave = new Stave(x, staveY, mW);

            if (isFirst) {
              const vfClef = part.instrument.clef === 'alto' ? 'alto' : part.instrument.clef;
              stave.addClef(vfClef);
              if (vexKey !== 'C') stave.addKeySignature(vexKey);
              if (row === 0) stave.addTimeSignature(timeSignature);
            }
            stave.setContext(ctx).draw();
            staveList.push(stave);

            // Add instrument short name label on first column of each system
            if (isFirst && svg) {
              const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              label.setAttribute('x', String(x - 6));
              label.setAttribute('y', String(staveY + 22));
              label.setAttribute('text-anchor', 'end');
              label.setAttribute('font-size', '9');
              label.setAttribute('font-weight', '600');
              label.setAttribute('font-family', 'Arial, sans-serif');
              label.setAttribute('fill', '#7c6fcd');
              label.textContent = part.instrument.shortName;
              svg.appendChild(label);
            }

            // Build notes
            const measure = part.measures[mIdx];
            const clef = part.instrument.clef;
            const restKey = clef === 'bass' ? 'd/3' : 'b/4';
            const vfClef = clef === 'alto' ? 'treble' : clef;

            const rawEvents = measure
              ? (clef === 'bass' ? measure.bassEvents : measure.trebleEvents)
              : [];
            const events = rawEvents.length > 0
              ? rawEvents
              : [{ id: 'r', midiNotes: [], keys: [restKey], accidentals: [null as null], duration: 'w' as const, isRest: true, clef: clef as 'treble' | 'bass' }];

            try {
              const vfNotes = events.map(ev => {
                const sn = new StaveNote({
                  clef: vfClef,
                  keys: ev.keys.length > 0 ? ev.keys : [restKey],
                  duration: ev.isRest ? `${ev.duration}r` : ev.duration,
                });
                if (!ev.isRest) {
                  ev.accidentals.forEach((acc, ai) => {
                    if (acc) sn.addModifier(new Accidental(acc), ai);
                  });
                }
                return sn;
              });

              const formatW = mW - (isFirst ? 110 : 25);
              const voice = new Voice({ num_beats: beatsNum, beat_value: beatVal }).setStrict(false);
              voice.addTickables(vfNotes);
              new Formatter().joinVoices([voice]).format([voice], formatW);
              voice.draw(ctx, stave);
            } catch (_) {}
          });

          // System bracket + bar line on first measure of each row
          if (isFirst && staveList.length >= 2) {
            try {
              const bracket = new StaveConnector(staveList[0], staveList[staveList.length - 1]);
              bracket.setType(StaveConnector.type.BRACKET);
              bracket.setContext(ctx).draw();
              const barline = new StaveConnector(staveList[0], staveList[staveList.length - 1]);
              barline.setType(StaveConnector.type.SINGLE_LEFT);
              barline.setContext(ctx).draw();
            } catch (_) {}
          }

          zones.push({
            x,
            y: systemTopY - 8,
            width: mW,
            height: systemBotY - systemTopY + 16,
          });

          xCursor += mW;
        }
      }

      setClickZones(zones);
    });
  }, [parts, timeSignature, keySignature, selectedMeasure]);

  return (
    <div className="relative w-full overflow-x-auto rounded-xl bg-white">
      <div ref={containerRef} className="w-full" style={{ minWidth: '640px', minHeight: '220px' }} />
      <div className="absolute inset-0 pointer-events-none">
        {clickZones.map((z, i) => (
          <div
            key={i}
            className="absolute pointer-events-auto cursor-pointer"
            style={{ left: z.x, top: z.y, width: z.width, height: z.height }}
            onClick={() => onSelectMeasure(selectedMeasure === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
});

export default MultiStaffSheet;
