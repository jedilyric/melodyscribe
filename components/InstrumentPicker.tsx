'use client';

import { useState } from 'react';
import { X, Check, ChevronRight, Music2 } from 'lucide-react';
import { ALL_INSTRUMENTS, INSTRUMENT_FAMILIES, PRESETS, InstrumentFamily, getInstrument } from '@/lib/instruments';

interface InstrumentPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function InstrumentPicker({ selected, onChange, onClose, onConfirm }: InstrumentPickerProps) {
  const [activeFamily, setActiveFamily] = useState<InstrumentFamily | 'all'>('all');

  const visibleInstruments = activeFamily === 'all'
    ? ALL_INSTRUMENTS
    : ALL_INSTRUMENTS.filter(i => i.family === activeFamily);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else if (selected.length < 12) {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/20 flex flex-col" style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20">
              <Music2 size={18} className="text-accent-light" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Choose Instruments</h2>
              <p className="text-xs text-text-secondary">Select which parts to transcribe from the audio</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-card transition-colors text-muted hover:text-text-primary">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left sidebar */}
          <div className="w-52 flex-shrink-0 border-r border-border overflow-y-auto bg-surface/40">
            <div className="p-4 space-y-5">
              {/* Presets */}
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Quick presets</p>
                <div className="space-y-0.5">
                  {PRESETS.map(preset => (
                    <button key={preset.label} onClick={() => onChange(preset.ids)}
                      className="w-full text-left px-3 py-2 text-xs rounded-lg text-text-secondary hover:bg-card hover:text-text-primary transition-colors flex items-center justify-between group">
                      <span>{preset.label}</span>
                      <ChevronRight size={10} className="opacity-0 group-hover:opacity-70 transition-opacity text-accent-light" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected instruments */}
              {selected.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    Selected <span className="text-accent-light">({selected.length})</span>
                  </p>
                  <div className="space-y-1">
                    {selected.map(id => {
                      const inst = getInstrument(id);
                      if (!inst) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
                          <span className="text-sm flex-shrink-0">{inst.icon}</span>
                          <span className="text-xs text-accent-light truncate flex-1">{inst.name}</span>
                          <button onClick={() => toggle(id)} className="text-accent-light/40 hover:text-accent-light/80 flex-shrink-0 transition-colors">
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main area */}
          <div className="flex-1 overflow-y-auto min-w-0">
            {/* Family filter tabs */}
            <div className="sticky top-0 bg-card/95 border-b border-border px-4 py-2.5 flex gap-1 flex-wrap z-10 backdrop-blur-sm">
              <button onClick={() => setActiveFamily('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeFamily === 'all' ? 'bg-accent/20 text-accent-light shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}>
                All
              </button>
              {INSTRUMENT_FAMILIES.map(f => (
                <button key={f.id} onClick={() => setActiveFamily(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${activeFamily === f.id ? 'bg-accent/20 text-accent-light shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}>
                  <span>{f.icon}</span>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Instrument grid */}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visibleInstruments.map(inst => {
                const isSelected = selected.includes(inst.id);
                return (
                  <button key={inst.id} onClick={() => toggle(inst.id)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-accent/60 bg-accent/15 shadow-sm shadow-accent/10'
                        : 'border-border bg-surface hover:border-accent/30 hover:bg-accent/5'
                    }`}>
                    <span className="text-lg flex-shrink-0 leading-none">{inst.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate leading-tight ${isSelected ? 'text-accent-light' : 'text-text-primary'}`}>
                        {inst.name}
                      </p>
                      <p className="text-xs text-muted leading-tight mt-0.5 capitalize">{inst.clef}</p>
                    </div>
                    {isSelected && (
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent flex-shrink-0">
                        <Check size={9} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-surface">
          <p className="text-xs text-text-secondary">
            {selected.length === 0
              ? 'Select at least one instrument to transcribe'
              : `${selected.length} instrument${selected.length !== 1 ? 's' : ''} selected — max 12`}
          </p>
          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-accent/30 transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={selected.length === 0}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
