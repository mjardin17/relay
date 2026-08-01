import React from 'react';
import { Users, Shield, CheckCircle2, Clock, MessageSquare, UserPlus } from 'lucide-react';
import { TeamMember, ContentPost } from '../../types/relay';

interface TeamCollaborationProps {
  team: TeamMember[];
  pendingPosts: ContentPost[];
  darkMode: boolean;
  onApprovePost: (id: string) => void;
}

export const TeamCollaboration: React.FC<TeamCollaborationProps> = ({
  team,
  pendingPosts,
  darkMode,
  onApprovePost
}) => {
  return (
    <div className="space-y-6">
      <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">
            GOVERNANCE & PERMISSIONS
          </span>
          <h1 className="text-xl font-extrabold tracking-tight mt-1">Team & Content Approval Pipeline</h1>
          <p className="text-xs text-slate-400">
            Multi-user roles, draft approvals, feedback threads, and audit logs inside Empire OS shared security layer.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pending Approvals */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`p-5 rounded-2xl border space-y-3 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold font-mono">Pending Approval Queue ({pendingPosts.length})</h3>
              <span className="text-xs text-slate-400 font-mono">Role: Approver</span>
            </div>

            {pendingPosts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">
                No items waiting for review. All clear!
              </div>
            ) : (
              pendingPosts.map((post) => (
                <div key={post.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-100">{post.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">Author: {post.author}</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">{post.body}</p>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-indigo-400">Target: {post.platforms.join(', ')}</span>
                    <button
                      onClick={() => onApprovePost(post.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Schedule
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Team Members */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-5 rounded-2xl border space-y-3 ${
            darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="text-sm font-bold font-mono border-b border-slate-800 pb-2">Empire OS Workspace Team</h3>
            <div className="space-y-3">
              {team.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
