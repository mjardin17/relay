import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Globe,
  Flame,
  Zap,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Code2,
  Award,
  Play,
  FileCheck,
  Eye,
  X,
  Target,
  Check
} from 'lucide-react';
import { ProductDefinition } from '../../types/products';

interface ProjectsModulesViewProps {
  darkMode: boolean;
  tenantId: string;
  onNavigateAppTab?: (tab: string) => void;
}

export const ProjectsModulesView: React.FC<ProjectsModulesViewProps> = ({
  darkMode,
  tenantId,
  onNavigateAppTab
}) => {
  const [data, setData] = useState<any>(null);
  const [products, setProducts] = useState<ProductDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductDefinition | null>(null);

  const authHeaders = {
    Authorization: 'Bearer demo-session',
    'Content-Type': 'application/json'
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modulesRes, productsRes] = await Promise.all([
        fetch('/api/control-center/projects-and-modules', { headers: authHeaders }),
        fetch('/api/control-center/products', { headers: authHeaders })
      ]);

      if (modulesRes.ok) {
        const d = await modulesRes.json();
        setData(d);
      }
      if (productsRes.ok) {
        const pd = await productsRes.json();
        setProducts(pd.products || []);
      }
    } catch (err) {
      console.error('Failed to load projects and products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading Products, Projects, and Architecture Modules...
      </div>
    );
  }

  const businessProjects = data?.businessProjects || [];
  const modules = data?.modules || [];

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div
        className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Product Launcher & Governed Operating Infrastructure</span>
            </h2>
            <p className="text-xs text-slate-400">
              Authoritative roster of verified software products operating on Relay core: Relay, BossLister, StoryForge, Crosspost, and OnTrack.
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 border border-slate-800"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Product Roster & Launcher */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            Software Products & Workflows
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            {products.length} Products Registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((prod) => (
            <div
              key={prod.id}
              id={`prod_card_${prod.id}`}
              className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all ${
                darkMode
                  ? 'bg-slate-900/70 border-slate-800 hover:border-sky-500/40 hover:bg-slate-900'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-100 text-base">{prod.name}</h4>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{prod.category}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                      {prod.status}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {prod.truthStatus}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">{prod.tagline}</p>

                {/* Capabilities Chips */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Registered Capabilities
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prod.capabilities.slice(0, 3).map((cap, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60"
                      >
                        {cap}
                      </span>
                    ))}
                    {prod.capabilities.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono">
                        +{prod.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Evidence Proofs Count */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                  <span>Integration: <strong className="text-sky-300">{prod.integrationStatus}</strong></span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Award className="w-3.5 h-3.5" />
                    {prod.evidenceProofCount} Verifiable Proofs
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedProduct(prod)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  Inspect Specs
                </button>

                {onNavigateAppTab && prod.openProductTab && (
                  <button
                    onClick={() => onNavigateAppTab(prod.openProductTab!)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1 transition-all shadow-sm"
                  >
                    <span>Launch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Product Specification Inspector Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border p-6 space-y-4 shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-base font-bold flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-sky-400" />
                  {selectedProduct.name} — Product Specification
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {selectedProduct.id} | Status: {selectedProduct.status}
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">{selectedProduct.description}</p>

            {/* Truth Summary */}
            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs space-y-1">
              <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Honest Implementation & Proof Baseline
              </div>
              <p className="text-slate-300 text-[11px]">{selectedProduct.implementationTruthSummary}</p>
            </div>

            {/* Inputs & Outputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-semibold text-slate-200">Supported Input Types</div>
                <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                  {selectedProduct.supportedInputTypes.map((inp, i) => (
                    <li key={i} className="font-mono text-slate-300">{inp}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-semibold text-slate-200">Supported Output Types</div>
                <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                  {selectedProduct.supportedOutputTypes.map((out, i) => (
                    <li key={i} className="font-mono text-sky-300">{out}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Cryptographic Proof Items */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-400" />
                Verifiable Cryptographic Proofs ({selectedProduct.proofs.length})
              </div>
              <div className="space-y-2">
                {selectedProduct.proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{proof.title}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {proof.verificationStatus}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{proof.summary}</p>
                    <div className="text-[10px] font-mono text-slate-500 truncate" title={proof.evidenceHash}>
                      SHA-256: {proof.evidenceHash}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Business Deployments */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" /> Active Business Deployments & Web Assets
        </h3>

        {businessProjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl border-slate-800">
            No custom websites deployed yet for this tenant. Launch via the Website Builder Hub.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessProjects.map((p: any) => (
              <div
                key={p.id}
                className={`p-5 rounded-xl border flex flex-col justify-between gap-3 ${
                  darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-200 text-sm">{p.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {p.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">Domain: {p.domain || 'staging.relay.local'}</div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">ID: {p.id}</span>
                  {onNavigateAppTab && (
                    <button
                      onClick={() => onNavigateAppTab('website_builder')}
                      className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Manage Site</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Core Architectural Modules */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" /> Core Operating System Subsystems
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m: any) => (
            <div
              key={m.id}
              className={`p-4 rounded-xl border flex flex-col justify-between gap-2.5 ${
                darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 text-xs">{m.name}</h4>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    {m.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{m.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Status: <strong className="text-emerald-400">{m.status}</strong></span>
                <span>{m.evidenceCount} Evidence Proofs</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
