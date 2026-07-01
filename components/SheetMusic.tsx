'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Measure } from '@/types';
import { vexKeySignature } from '@/lib/noteUtils';

interface MeasurePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SheetMusicProps {
  measures: Measure[];
  timeSignature: string;
  keySignature: string;
  selectedMeasure: number | null;
  onSelectMeasure: (idx: number | null) => void;
  currentPlayingMeasure?: number | null;
}

export interface SheetMusicHandle {
  getSvgElement: () => SVGElement | null;
}

const TREBLE_Y_BASE = 30;
const BASS_Y_BASE = 130;
const ROW_HEIGHT = 220;
const FIRST_MEASURE_W = 310;
const STANDARD_MEASURE_W = 210;
const MEASURES_PER_ROW = 4;

const SheetMusic = forwardRef<SheetMusicHandle, SheetMusicProps>(function SheetMusic(
  { measures, timeSignature, keySignature, selectedMeasure, onSelectMeasure, currentPlayingMeasure },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGElement | null>(null);
  const [measurePositions, setMeasurePositions] = useState<MeasurePosition[]>([]);

  useImperativeHandle(ref, () => ({
    getSvgElement: () => svgRef.current,
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const displayMeasures = measures.length === 0
      ? [{ id: 'empty', trebleEvents: [], bassEvents: [], isComplete: false }]
      : measures;

    const rows = Math.ceil(displayMeasures.length / MEASURES_PER_ROW);
    const totalWidth = container.offsetWidth || 900;
    const totalHeight = rows * ROW_HEIGHT + 60;

    // Dynamically import VexFlow to avoid SSR issues
    import('vexflow').then(({
      Renderer, Stave, StaveNote, Voice, Formatter,
      StaveConnector, Accidental, Barline,
    }) => {
      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(totalWidth, totalHeight);
      const ctx = renderer.getContext();
      ctx.setFont('Arial', 10);

      const svg = container.querySelector('svg');
      if (svg) svgRef.current = svg as SVGElement;

      const positions: MeasurePosition[] = [];
      let xOffset = 10;

      displayMeasures.forEach((measure, idx) => {
        const row = Math.floor(idx / MEASURES_PER_ROW);
        const col = idx % MEASURES_PER_ROW;

        if (col === 0) xOffset = 10;

        const isFirstInRow = col === 0;
        const measureW = isFirstInRow ? FIRST_MEASURE_W : STANDARD_MEASURE_W;
        const x = xOffset;
        const trebleY = row * ROW_HEIGHT + TREBLE_Y_BASE;
        const bassY = row * ROW_HEIGHT + BASS_Y_BASE;

        // Highlight selected or playing measure
        const isSelected = selectedMeasure === idx;
        const isPlaying = currentPlayingMeasure === idx;

        if (isSelected || isPlaying) {
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          g.setAttribute('x', String(x));
          g.setAttribute('y', String(trebleY - 10));
          g.setAttribute('width', String(measureW));
          g.setAttribute('height', String(BASS_Y_BASE - TREBLE_Y_BASE + 60));
          g.setAttribute('fill', isPlaying ? 'rgba(16,185,129,0.12)' : 'rgba(124,111,205,0.15)');
          g.setAttribute('rx', '4');
          if (svg) svg.insertBefore(g, svg.firstChild);
        }

        // Draw treble stave
        const trebleStave = new Stave(x, trebleY, measureW);
        if (isFirstInRow) {
          trebleStave.addClef('treble');
          if (row === 0) {
            const vexKey = vexKeySignature(keySignature);
            if (vexKey !== 'C') trebleStave.addKeySignature(vexKey);
            trebleStave.addTimeSignature(timeSignature);
          } else {
            const vexKey = vexKeySignature(keySignature);
            if (vexKey !== 'C') trebleStave.addKeySignature(vexKey);
          }
        }
        trebleStave.setContext(ctx).draw();

        // Draw bass stave
        const bassStave = new Stave(x, bassY, measureW);
        if (isFirstInRow) {
          bassStave.addClef('bass');
          if (row === 0) {
            const vexKey = vexKeySignature(keySignature);
            if (vexKey !== 'C') bassStave.addKeySignature(vexKey);
            bassStave.addTimeSignature(timeSignature);
          } else {
            const vexKey = vexKeySignature(keySignature);
            if (vexKey !== 'C') bassStave.addKeySignature(vexKey);
          }
        }
        bassStave.setContext(ctx).draw();

        // Connectors on first of each row
        if (isFirstInRow) {
          try {
            const brace = new StaveConnector(trebleStave, bassStave);
            brace.setType(StaveConnector.type.BRACE);
            brace.setContext(ctx).draw();
            const singleLeft = new StaveConnector(trebleStave, bassStave);
            singleLeft.setType(StaveConnector.type.SINGLE_LEFT);
            singleLeft.setContext(ctx).draw();
          } catch (_) {}
        }

        const [beatsNum, beatVal] = timeSignature.split('/').map(Number);
        const formatWidth = measureW - (isFirstInRow ? 120 : 30);

        // Draw treble events
        try {
          const trebleNotes = measure.trebleEvents.length > 0
            ? measure.trebleEvents
            : [{ id: 'r', midiNotes: [], keys: ['b/4'], accidentals: [null], duration: 'w' as const, isRest: true, clef: 'treble' as const }];

          const vfTreble = trebleNotes.map(ev => {
            const n = new StaveNote({
              clef: 'treble',
              keys: ev.keys.length > 0 ? ev.keys : ['b/4'],
              duration: ev.isRest ? `${ev.duration}r` : ev.duration,
            });
            if (!ev.isRest) {
              ev.accidentals.forEach((acc, i) => {
                if (acc) n.addModifier(new Accidental(acc), i);
              });
            }
            return n;
          });

          const trebleVoice = new Voice({ num_beats: beatsNum, beat_value: beatVal }).setStrict(false);
          trebleVoice.addTickables(vfTreble);
          new Formatter().joinVoices([trebleVoice]).format([trebleVoice], formatWidth);
          trebleVoice.draw(ctx, trebleStave);
        } catch (_) {}

        // Draw bass events
        try {
          const bassNotes = measure.bassEvents.length > 0
            ? measure.bassEvents
            : [{ id: 'r', midiNotes: [], keys: ['d/3'], accidentals: [null], duration: 'w' as const, isRest: true, clef: 'bass' as const }];

          const vfBass = bassNotes.map(ev => {
            const n = new StaveNote({
              clef: 'bass',
              keys: ev.keys.length > 0 ? ev.keys : ['d/3'],
              duration: ev.isRest ? `${ev.duration}r` : ev.duration,
            });
            if (!ev.isRest) {
              ev.accidentals.forEach((acc, i) => {
                if (acc) n.addModifier(new Accidental(acc), i);
              });
            }
            return n;
          });

          const bassVoice = new Voice({ num_beats: beatsNum, beat_value: beatVal }).setStrict(false);
          bassVoice.addTickables(vfBass);
          new Formatter().joinVoices([bassVoice]).format([bassVoice], formatWidth);
          bassVoice.draw(ctx, bassStave);
        } catch (_) {}

        positions.push({
          x,
          y: row * ROW_HEIGHT + TREBLE_Y_BASE - 10,
          width: measureW,
          height: BASS_Y_BASE - TREBLE_Y_BASE + 60,
        });

        xOffset += measureW;
      });

      setMeasurePositions(positions);
    });
  }, [measures, timeSignature, keySignature, selectedMeasure, currentPlayingMeasure]);

  return (
    <div className="relative w-full overflow-x-auto rounded-xl bg-white">
      <div ref={containerRef} className="w-full min-h-[260px]" style={{ minWidth: '600px' }} />
      {/* Invisible click overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {measurePositions.map((pos, i) => (
          <div
            key={i}
            className="absolute pointer-events-auto cursor-pointer"
            style={{ left: pos.x, top: pos.y, width: pos.width, height: pos.height }}
            onClick={() => onSelectMeasure(selectedMeasure === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
});

export default SheetMusic;
