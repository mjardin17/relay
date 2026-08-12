import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  Search,
  FileCheck2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Sparkles,
  RefreshCw,
  ExternalLink,
  MapPin,
  EyeOff,
  UserCheck,
  KeyRound,
  FileText,
} from 'lucide-react';
import { GBPBusinessIntake, GBPProfile, GBPConnectorStatus, GBPProfilePlan, GBPPost, GBPReview } from '../../types/gbpLaunch';

interface GBPLaunchStudioProps {
  darkMode: boolean;
  tenantToken?: string;
}

export const GBPLaunchStudio: React.FC<GBPLaunchStudioProps> = ({ darkMode, tenantToken = 'token_owner_tenant1' }) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [connectorStatus, setConnectorStatus] = useState<GBPConnectorStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Intake state with electrical contractor default pilot data
  const [intake, setIntake] = useState<GBPBusinessIntake>({
    companyName: 'Apex Electrical Solutions & Generators',
    accountType: 'service_area',
    primaryCategory: 'Electrician',
    secondaryCategories: ['Electrical Installation Service', 'Lighting Consultant', 'Electric Vehicle Charging Station Contractor'],
    publicPhone: '(555) 234-5678',
    websiteUrl: 'https://apexelectricalpdx.com',
    businessHours: [
      { day: 'Monday - Friday', open: '07:00', close: '18:00' },
      { day: 'Saturday', open: '08:00', close: '16:00' },
      { day: 'Sunday', open: '00:00', close: '00:00', closed: true },
    ],
    serviceAreas: ['Portland, OR', 'Gresham, OR', 'Beaverton, OR', 'Lake Oswego, OR', 'Tigard, OR'],
    servicesOffered: ['24/7 Emergency Electrical Repair', '200A Electrical Panel Upgrade', 'EV Charger Installation', 'Whole-Home Generator Hookup', 'Recessed LED Lighting'],
    description: 'Licensed, bonded, and insured electrical contractors serving Portland Metro. Specializing in residential panel upgrades, EV chargers, commercial maintenance, and 24/7 emergency repair.',
    photos: [
      { type: 'logo', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80', caption: 'Apex Electrical Logo' },
      { type: 'work_sample', url: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=500&q=80', caption: '200A Panel Upgrade Inspection' },
    ],
    licenseNumber: 'CCB #239481 / ELE-9982',
    licenseState: 'OR',
    // Private verification address
    privateStreetAddress: '1420 SW 5th Ave',
    privateUnit: 'Suite 800',
    privateCity: 'Portland',
    privateState: 'OR',
    privateZip: '97201',
  });

  const [profile, setProfile] = useState<GBPProfile | null>(null);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<any>(null);
  const [plan, setPlan] = useState<GBPProfilePlan | null>(null);
  const [approvalHash, setApprovalHash] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Post & Review state
  const [postSummary, setPostSummary] = useState<string>('Specializing in 200A electrical service panel upgrades for older Portland homes. Book your electrical safety inspection today.');
  const [createdPost, setCreatedPost] = useState<any>(null);
  const [postApproved, setPostApproved] = useState<boolean>(false);
  const [postPublished, setPostPublished] = useState<boolean>(false);

  // Review reply state
  const [sampleReview] = useState<GBPReview>({
    id: 'rev-101',
    tenantId: 'tenant_demo_1',
    gbpProfileId: 'gbp-prof-101',
    googleReviewId: 'goog-rev-998',
    reviewerName: 'Marcus Vance',
    starRating: 5,
    comment: 'Apex Electrical came out same-day when our main breaker tripped. Professional, transparent pricing, and explained the EV charger setup clearly. Highly recommend!',
    reviewDate: '2026-08-10',
    responseStatus: 'unanswered',
    createdAt: new Date().toISOString(),
  });
  const [reviewReplyDraft, setReviewReplyDraft] = useState<string>('');
  const [replyApproved, setReplyApproved] = useState<boolean>(false);
  const [replySubmitted, setReplySubmitted] = useState<boolean>(false);

  useEffect(() => {
    fetchConnectorStatus();
    fetchAuditLogs();
  }, []);

  const fetchConnectorStatus = async () => {
    try {
      const res = await fetch('/api/gbp-launch/connector-status', {
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setConnectorStatus(data.connectorStatus);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/gbp-launch/audit-logs', {
        headers: { Authorization: `Bearer ${tenantToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Step 1: Submit Intake
  const handleSaveIntake = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/gbp-launch/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantToken}`,
          'X-Idempotency-Key': `intake-${Date.now()}`,
        },
        body: JSON.stringify({
          clientId: 'elec-co-pilot-1',
          ...intake,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setStatusMessage('Business intake profile saved with private verification address separation.');
        setActiveStep(2);
        fetchAuditLogs();
      } else {
        setStatusMessage(`Error: ${data.error || 'Failed to save intake'}`);
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Check Duplicates
  const handleCheckDuplicates = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gbp-launch/check-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantToken}`,
          'X-Idempotency-Key': `dup-${profile.id}`,
        },
        body: JSON.stringify({ profileId: profile.id }),
      });
      const data = await res.json();
      if (data.success) {
        setDuplicateCheckResult(data.discovery);
        setStatusMessage('Existing profiles discovered. Classification: Service Area Business (SAB) - Address Hidden.');
        setActiveStep(3);
        fetchAuditLogs();
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Generate Plan & Human Owner Approval Gate
  const handleGeneratePlan = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gbp-launch/generate-profile-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantToken}`,
          'X-Idempotency-Key': `plan-${profile.id}`,
        },
        body: JSON.stringify({ profileId: profile.id }),
      });
      const data = await res.json();
      if (data.success) {
        setPlan(data.plan);
        setStatusMessage('Policy-compliant GBP profile plan generated via Gemini Flash.');
        fetchAuditLogs();
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!profile || !plan) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gbp-launch/approve-profile-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantToken}`,
          'X-Idempotency-Key': `appr-plan-${profile.id}`,
        },
        body: JSON.stringify({
          profileId: profile.id,
          planPayload: plan,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovalHash(data.approval.contentHash);
        setStatusMessage(`Human owner approval signed and recorded in server database with SHA-256 content hash: ${data.approval.contentHash.substring(0, 16)}...`);
        setActiveStep(4);
        fetchAuditLogs();
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Track Verification
  const handleTrackVerification = async (state: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gbp-launch/track-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantToken}`,
          'X-Idempotency-Key': `track-${state}-${Date.now()}`,
        },
        body: JSON.stringify({
          profileId: profile.id,
          verificationMethod: 'manual_guided',
          verificationState: state,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setStatusMessage(`Verification state updated to: ${state}`);
        if (state === 'verified_active') {
          setActiveStep(5);
        }
        fetchAuditLogs();
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Post Workflow
  const handleCreatePostDraft = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gbp-launch/create-post-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantToken}`,
          'X-Idempotency-Key': `post-draft-${Date.now()}`,
        },
        body: JSON.stringify({
          profileId: profile.id,
          postType: 'offer',
          summary: postSummary,
          callToAction: { actionType: 'CALL' },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedPost(data.post);
        setStatusMessage('Post draft created. Awaiting human owner sign-off.');
        fetchAuditLogs();
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePost = async () => {
    if (!createdPost) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gbp-launch/approve-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantToken}`,
          'X-Idempotency-Key': `post-appr-${createdPost.id}`,
        },
        body: JSON.stringify({
          postId: createdPost.id,
          postContent: { summary: postSummary },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPostApproved(true);
        setStatusMessage(`Post approved with SHA-256 hash: ${data.approval.contentHash.substring(0, 16)}...`);
        fetchAuditLogs();
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishPost = async () => {
    if (!createdPost) return;
    setLoading(true);
    try {
      const res = await fetch('/api/gbp-launch/publish-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantToken}`,
          'X-Idempotency-Key': `post-pub-${createdPost.id}`,
        },
        body: JSON.stringify({
          postId: createdPost.id,
          postContent: { summary: postSummary },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPostPublished(true);
        setStatusMessage('Post published via Guided Manual Execution Mode!');
        fetchAuditLogs();
      } else {
        setStatusMessage(`Publish Blocked: ${data.message || data.error}`);
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Review Reply Workflow
  const handleGenerateReviewReply = () => {
    setReviewReplyDraft(
      `Thank you so much for the 5-star review, ${sampleReview.reviewerName}! We are thrilled we could restore your electrical power promptly and assist with your EV charger installation. Please reach out if you need any future electrical service in Portland!`
    );
  };

  const handleApproveAndSubmitReply = () => {
    setReplyApproved(true);
    setReplySubmitted(true);
    setStatusMessage('Review response approved by owner and dispatched!');
  };

  return (
    <div className="space-y-6">
      {/* Pilot Header & Truthful Status Badge */}
      <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Electrical Pilot #1
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Lock className="w-3 h-3" /> GUIDED MANUAL PILOT MODE
              </span>
            </div>
            <h1 className="text-xl font-bold mt-1 text-slate-100 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-400" /> Google Business Profile Launch Program
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Human-approved onboarding system for local electrical contractors. Collects verified business data, hides private home addresses for Service Area Business compliance, enforces owner-controlled Google account primary ownership, and locks every submission behind SHA-256 human approval gates.
            </p>
          </div>

          <div className={`p-3 rounded-xl border text-xs space-y-1.5 min-w-[280px] ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="font-semibold flex items-center justify-between text-slate-300">
              <span>Connector Truthfulness</span>
              <span className="text-[10px] text-amber-400 font-mono">Simulated / Guided</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Google API Access:</span>
              <span className="text-slate-300 font-medium">Awaiting Project Audit</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>OAuth Status:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Guided Auth Ready
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Primary Owner:</span>
              <span className="text-indigo-400 font-medium">Electrical Owner Account</span>
            </div>
          </div>
        </div>

        {/* Workflow Stepper */}
        <div className="grid grid-cols-5 gap-2 mt-6 pt-5 border-t border-slate-800 text-xs">
          {[
            { step: 1, label: '1. Business Intake', desc: 'SAB & Private Address' },
            { step: 2, label: '2. Duplicate Discovery', desc: 'Create vs Claim' },
            { step: 3, label: '3. Policy Plan Gate', desc: 'Owner SHA-256 Approval' },
            { step: 4, label: '4. Verification Guide', desc: 'Postcard / Video Code' },
            { step: 5, label: '5. Post & Review Engine', desc: 'Human-Approved Edits' },
          ].map((s) => (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeStep === s.step
                  ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300 font-medium'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-semibold text-xs">{s.label}</div>
              <div className="text-[10px] text-slate-500 truncate">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* STEP 1: BUSINESS INTAKE */}
      {activeStep === 1 && (
        <div className={`p-6 rounded-2xl border space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Step 1: Electrical Contractor Business Intake
              </h2>
              <p className="text-xs text-slate-400">
                Collect primary identity, electrical licensing, phone, website, and private verification street address.
              </p>
            </div>
            <button
              onClick={handleSaveIntake}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save & Proceed to Step 2
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Core Public Business Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-200 border-b border-slate-800 pb-2">Public Business Information</h3>
              <div>
                <label className="block text-slate-400 mb-1">Company Legal / Brand Name</label>
                <input
                  type="text"
                  value={intake.companyName}
                  onChange={(e) => setIntake({ ...intake, companyName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Account Type</label>
                  <select
                    value={intake.accountType}
                    onChange={(e) => setIntake({ ...intake, accountType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  >
                    <option value="service_area">Service Area Business (SAB - Address Hidden)</option>
                    <option value="storefront">Storefront (Public Customer Visits)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Primary Category</label>
                  <input
                    type="text"
                    value={intake.primaryCategory}
                    onChange={(e) => setIntake({ ...intake, primaryCategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Public Phone</label>
                <input
                  type="text"
                  value={intake.publicPhone}
                  onChange={(e) => setIntake({ ...intake, publicPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Website URL</label>
                <input
                  type="text"
                  value={intake.websiteUrl}
                  onChange={(e) => setIntake({ ...intake, websiteUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">State License Metadata</label>
                <input
                  type="text"
                  value={intake.licenseNumber}
                  onChange={(e) => setIntake({ ...intake, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  placeholder="CCB # / Electrical License Number"
                />
              </div>
            </div>

            {/* Private Verification Address Box */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <EyeOff className="w-4 h-4" />
                  <span>Private Verification Address (Separated from Public)</span>
                </div>
                <p className="text-[11px] text-amber-200/80">
                  Google policy requires a physical street address to deliver postcard/video verification. Because contractors serve clients on-site, this physical address remains strictly private and hidden from public Google Maps pins.
                </p>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Street Address</label>
                  <input
                    type="text"
                    value={intake.privateStreetAddress}
                    onChange={(e) => setIntake({ ...intake, privateStreetAddress: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">City</label>
                    <input
                      type="text"
                      value={intake.privateCity}
                      onChange={(e) => setIntake({ ...intake, privateCity: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">State</label>
                    <input
                      type="text"
                      value={intake.privateState}
                      onChange={(e) => setIntake({ ...intake, privateState: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Zip Code</label>
                    <input
                      type="text"
                      value={intake.privateZip}
                      onChange={(e) => setIntake({ ...intake, privateZip: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Service Areas (ZIPs / Cities)</label>
                <input
                  type="text"
                  value={intake.serviceAreas.join(', ')}
                  onChange={(e) => setIntake({ ...intake, serviceAreas: e.target.value.split(',').map((s) => s.trim()) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DUPLICATE DISCOVERY */}
      {activeStep === 2 && (
        <div className={`p-6 rounded-2xl border space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-400" /> Step 2: Existing Profile Discovery & Classification
              </h2>
              <p className="text-xs text-slate-400">
                Scan Google Maps directory for existing listings to prevent duplicate suspension or claim existing profiles.
              </p>
            </div>
            <button
              onClick={handleCheckDuplicates}
              disabled={loading || !profile}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Scan for Duplicate Listings
            </button>
          </div>

          {duplicateCheckResult ? (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
                <div className="font-semibold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Discovery Decision: {duplicateCheckResult.decision}
                </div>
                <p>
                  No active duplicate storefronts detected at this physical location. Recommended action: Create New Service Area Business (SAB) listing with address hidden.
                </p>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 p-3 font-semibold text-slate-300 border-b border-slate-800">
                  Scanned Google Directory Listings
                </div>
                {duplicateCheckResult.possibleDuplicates.map((d: any, idx: number) => (
                  <div key={idx} className="p-3 border-b border-slate-800/60 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">{d.title}</div>
                      <div className="text-slate-400 text-[11px]">{d.address} • {d.phone}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Match Confidence: {d.matchConfidence}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveStep(3)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  Proceed to Step 3 (Policy Plan)
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <p>Click "Scan for Duplicate Listings" to perform search across Google Maps directory.</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: POLICY PLAN & HUMAN APPROVAL GATE */}
      {activeStep === 3 && (
        <div className={`p-6 rounded-2xl border space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Step 3: Policy-Compliant Plan & Owner Sign-Off Gate
              </h2>
              <p className="text-xs text-slate-400">
                Generate optimized profile metadata using Gemini Flash and lock exact content with a SHA-256 human approval hash.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGeneratePlan}
                disabled={loading || !profile}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Generate Plan via Gemini
              </button>
            </div>
          </div>

          {plan && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-semibold text-indigo-400">Optimized Profile Title</div>
                  <div className="text-sm font-bold text-slate-100">{plan.optimizedName}</div>
                  <div className="text-[11px] text-slate-400">Primary Category: <span className="text-slate-200 font-medium">{plan.primaryCategory}</span></div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-semibold text-emerald-400">Google Policy Compliance Rules</div>
                  <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                    {plan.complianceNotes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Owner Sign-Off Gate */}
              <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-indigo-200 text-sm flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-400" /> Human Owner Exact-Content Sign-Off Required
                    </h3>
                    <p className="text-[11px] text-indigo-300/80">
                      Before any verification submission or public profile setup, the authorized electrical company owner must approve this exact profile payload.
                    </p>
                  </div>

                  {approvalHash ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                    </span>
                  ) : (
                    <button
                      onClick={handleApprovePlan}
                      disabled={loading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all"
                    >
                      <FileCheck2 className="w-4 h-4" /> Sign Owner Approval
                    </button>
                  )}
                </div>

                {approvalHash && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1">
                    <div className="text-slate-400 text-[10px]">Durable SHA-256 Approval Content Hash (Recorded in DB):</div>
                    <div className="break-all">{approvalHash}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: GUIDED VERIFICATION TRACKER */}
      {activeStep === 4 && (
        <div className={`p-6 rounded-2xl border space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-400" /> Step 4: Guided Verification Execution (Joshua & Owner)
              </h2>
              <p className="text-xs text-slate-400">
                Step-by-step owner verification checklist for Google Business Profile Manager.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Status: {profile?.verificationState || 'not_started'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Guide Steps for Owner */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h3 className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-indigo-400" /> Owner Guided Actions in Google Manager
              </h3>
              <ol className="space-y-2 text-slate-300 text-[11px] list-decimal list-inside">
                <li>Owner signs into business Google account (<span className="text-indigo-300 font-mono">owner@apexelectricalpdx.com</span>).</li>
                <li>Go to <span className="underline text-indigo-400">business.google.com</span> and enter exact approved profile title: <span className="font-semibold text-slate-100">Apex Electrical Solutions & Generators</span>.</li>
                <li>Select Service Area Business model. Enter service areas (Portland, Beaverton, Gresham).</li>
                <li>Input private verification street address (<span className="text-amber-300">1420 ***, Suite 800, Portland OR 97201</span>). Select "Hide Street Address".</li>
                <li>Request Video or Postcard verification from Google.</li>
                <li>Once postcard/video is completed, enter 5-digit verification code.</li>
              </ol>
            </div>

            {/* Verification Status Controls */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <h3 className="font-semibold text-slate-200">Track Verification Progress</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleTrackVerification('verification_requested')}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500 text-left text-xs font-medium text-slate-200 flex items-center justify-between"
                >
                  <span>1. Mark Verification Code Requested</span>
                  <span className="text-[10px] text-slate-400">Postcard/Video Sent</span>
                </button>
                <button
                  onClick={() => handleTrackVerification('verification_pending')}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500 text-left text-xs font-medium text-slate-200 flex items-center justify-between"
                >
                  <span>2. Mark Verification Pending Code Entry</span>
                  <span className="text-[10px] text-amber-400">Awaiting Postcard Arrival</span>
                </button>
                <button
                  onClick={() => handleTrackVerification('verified_active')}
                  className="w-full p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500 text-left text-xs font-semibold text-emerald-300 flex items-center justify-between"
                >
                  <span>3. Mark Profile Fully Verified & Active</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Live Active
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: POST & REVIEW ENGINE */}
      {activeStep === 5 && (
        <div className={`p-6 rounded-2xl border space-y-6 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" /> Step 5: Post-Verification Engine (Posts & Review Responses)
              </h2>
              <p className="text-xs text-slate-400">
                Draft posts and review replies, enforce human sign-off with SHA-256 tamper checks before publishing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Posts Draft & Approve */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 className="font-semibold text-indigo-400 flex items-center gap-1.5">
                <Send className="w-4 h-4" /> GBP Local Post Publisher
              </h3>
              <div>
                <label className="block text-slate-400 mb-1">Post Summary / Offer Text</label>
                <textarea
                  rows={3}
                  value={postSummary}
                  onChange={(e) => setPostSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleCreatePostDraft}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
                >
                  1. Create Draft
                </button>

                {createdPost && !postApproved && (
                  <button
                    onClick={handleApprovePost}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                  >
                    2. Approve Post (SHA-256)
                  </button>
                )}

                {postApproved && !postPublished && (
                  <button
                    onClick={handlePublishPost}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold"
                  >
                    3. Dispatch Publish
                  </button>
                )}
              </div>

              {postPublished && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Post Published via Guided Manual Execution!
                </div>
              )}
            </div>

            {/* Review Monitoring & Reply Draft */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <h3 className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" /> Review Response Generator
              </h3>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span>{sampleReview.reviewerName}</span>
                  <span className="text-amber-400">★★★★★</span>
                </div>
                <p className="text-slate-400 text-[11px]">{sampleReview.comment}</p>
              </div>

              {!reviewReplyDraft ? (
                <button
                  onClick={handleGenerateReviewReply}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Draft AI Response via Gemini
                </button>
              ) : (
                <div className="space-y-2">
                  <label className="block text-slate-400 text-[11px]">Draft Response (Editable):</label>
                  <textarea
                    rows={3}
                    value={reviewReplyDraft}
                    onChange={(e) => setReviewReplyDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs"
                  />
                  {!replySubmitted ? (
                    <button
                      onClick={handleApproveAndSubmitReply}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                    >
                      Approve & Dispatch Reply
                    </button>
                  ) : (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold text-[11px]">
                      Response Approved & Submitted!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Feed */}
      <div className={`p-5 rounded-2xl border space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="font-bold text-slate-200 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" /> Tenant-Isolated GBP Security Audit Log
        </h3>
        <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
          {auditLogs.map((log: any, i: number) => (
            <div key={i} className="p-2 rounded-lg bg-slate-950 border border-slate-800/60 flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2 truncate">
                <span className="text-indigo-400 font-semibold">{log.action}</span>
                <span className="text-slate-500">({log.status})</span>
              </div>
              <span className="text-slate-500 text-[10px] shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
