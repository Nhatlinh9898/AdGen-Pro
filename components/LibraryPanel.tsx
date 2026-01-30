
import React, { useState } from 'react';
import { LibraryItem } from '../types';
import { Trash2, Save, Upload, Sparkles, Play, Box } from 'lucide-react';

interface LibraryPanelProps {
  title: string;
  items: LibraryItem[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpload: () => void;
  onFusion: () => void;
  onLoadItem: (item: LibraryItem) => void;
  isFusionLoading?: boolean;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ 
  title, items, selectedIds, onSelect, onDelete, onUpload, onFusion, onLoadItem, isFusionLoading 
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'user'>('system');

  const filteredItems = items.filter(item => item.source === activeTab);

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-lg border border-white/10 overflow-hidden">
      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">{title}</h3>
        <div className="flex gap-1">
             <button 
                onClick={onUpload}
                className="p-1.5 hover:bg-white/10 rounded text-[#00ffff] transition"
                title="Upload / Import"
             >
                <Upload className="w-4 h-4" />
             </button>
        </div>
      </div>

      <div className="flex text-xs font-bold border-b border-white/10">
        <button 
            className={`flex-1 py-2 text-center transition ${activeTab === 'system' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('system')}
        >
            System
        </button>
        <button 
            className={`flex-1 py-2 text-center transition ${activeTab === 'user' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('user')}
        >
            Personal
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">
                {activeTab === 'system' ? 'No system items.' : 'Library empty. Save or upload items.'}
            </div>
        ) : (
            filteredItems.map(item => (
                <div 
                    key={item.id} 
                    className={`group relative p-3 rounded border transition-all ${
                        selectedIds.includes(item.id) 
                        ? 'bg-[#00ffff]/10 border-[#00ffff] shadow-[0_0_10px_rgba(0,255,255,0.2)]' 
                        : 'bg-black/40 border-white/5 hover:border-white/20'
                    }`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <input 
                                type="checkbox"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => onSelect(item.id)}
                                className="accent-[#00ffff] cursor-pointer"
                            />
                            <span className="font-bold text-sm truncate text-white/90" title={item.name}>{item.name}</span>
                        </div>
                        {item.source === 'user' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2 truncate">
                        {item.type === '3d' ? (
                            <span>{item.data.shape} • {item.data.color}</span>
                        ) : (
                            <span>{item.data.mood} • {item.data.voiceName}</span>
                        )}
                    </div>

                    <button 
                        onClick={() => onLoadItem(item)}
                        className="w-full py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300 transition flex items-center justify-center gap-1"
                    >
                        {item.type === '3d' ? <Box className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        Load
                    </button>
                </div>
            ))
        )}
      </div>

      <div className="p-3 border-t border-white/10 bg-white/5">
        <button
            onClick={onFusion}
            disabled={selectedIds.length < 2 || isFusionLoading}
            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded text-white font-bold text-sm hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
        >
            {isFusionLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Fusion Mix ({selectedIds.length})
        </button>
        <p className="text-[10px] text-gray-500 text-center mt-2">Select 2+ items to create a new hybrid</p>
      </div>
    </div>
  );
};
