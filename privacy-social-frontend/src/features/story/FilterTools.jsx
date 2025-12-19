import React from 'react';

const FILTERS = [
    { name: 'Normal', filter: '' },
    { name: 'Vibrant', filter: 'saturate(1.5) contrast(1.1)' },
    { name: 'Cool', filter: 'hue-rotate(30deg) saturate(1.2)' },
    { name: 'Warm', filter: 'sepia(0.3) saturate(1.4)' },
    { name: 'B&W', filter: 'grayscale(1)' },
    { name: 'Classic', filter: 'sepia(0.5) contrast(1.2)' },
    { name: 'Dramatic', filter: 'contrast(1.5) brightness(0.8)' },
    { name: 'Soft', filter: 'brightness(1.1) contrast(0.9) saturate(0.8)' },
];

const FilterTools = ({ selectedFilter, onSelectFilter }) => {
    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-text-secondary px-1">Filters</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
                {FILTERS.map((f) => (
                    <button
                        key={f.name}
                        onClick={() => onSelectFilter(f.filter)}
                        className={`flex-shrink-0 flex flex-col items-center gap-2 group transition-all ${selectedFilter === f.filter ? 'scale-105' : 'hover:scale-102'
                            }`}
                    >
                        <div
                            className={`w-14 h-14 rounded-xl border-2 transition-all overflow-hidden ${selectedFilter === f.filter ? 'border-primary-500 shadow-lg shadow-primary-500/20' : 'border-border/50 group-hover:border-border'
                                }`}
                        >
                            <div
                                className="w-full h-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20"
                                style={{ filter: f.filter }}
                            />
                        </div>
                        <span className={`text-[10px] font-medium transition-colors ${selectedFilter === f.filter ? 'text-primary-500' : 'text-text-tertiary group-hover:text-text-secondary'
                            }`}>
                            {f.name}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FilterTools;
