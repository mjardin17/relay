import React, { useState } from 'react';
import { Plug, CheckCircle2, AlertCircle, RefreshCw, Key, ShieldCheck, ExternalLink } from 'lucide-react';
import { AppIntegration } from '../../types/relay';

interface IntegrationsHubProps {
  integrations: AppIntegration[];
  darkMode: boolean;
}

export const IntegrationsHub: React.FC<IntegrationsHubProps> = ({
  integrations,
  darkMode
}) => {
  const [list, setList] = useState<AppIntegration[]>(integrations);

  const toggleStatus = (id: string) => {
    setList(list.map((item) => {
      if (item.id === id) {
        const nextStatus = item.status === 'connected' ? 'credentials_required' : 'connected';
        return { ...item, status: nextStatus, lastSync: 'Just updated' };
      }
      return item;
    }));
  };

  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
            EMPIRE OS INTEGRATIONS
          </span>
          <h1 className="text-xl font-extrabold tracking-tight mt-1">Integrations & API Connections</h1>
          <p className="text-xs text-slate-400">
            Connect AI models, CMS platforms, e-commerce stores, and social networks with transparent credential management.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
              darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-100">{item.name}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold flex items-center gap-1 uppercase ${
                  item.status === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : item.status === 'mock_mode'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {item.status === 'connected' && <CheckCircle2 className="w-3 h-3" />}
                  {item.status === 'mock_mode' && <AlertCircle className="w-3 h-3" />}
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">{item.authType}</span>
              <button
                onClick={() => toggleStatus(item.id)}
                className="text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                {item.status === 'connected' ? 'Configure API' : 'Connect Account'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
