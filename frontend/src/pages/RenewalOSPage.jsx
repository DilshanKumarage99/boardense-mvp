import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaSync, FaChartBar, FaUsers, FaLightbulb, FaBuilding } from 'react-icons/fa';

// ─── Maturity helpers ────────────────────────────────────────────────────────

function maturityBand(score) {
  if (!score) return 'unknown';
  if (score <= 2.0) return 'reactive';
  if (score <= 3.0) return 'adaptive';
  if (score <= 4.0) return 'strategic';
  return 'continuous';
}

function maturityColors(score) {
  const band = maturityBand(score);
  const map = {
    reactive:   { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    bar: 'bg-red-500' },
    adaptive:   { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', bar: 'bg-yellow-400' },
    strategic:  { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300',   bar: 'bg-blue-500' },
    continuous: { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  bar: 'bg-green-500' },
    unknown:    { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-300',   bar: 'bg-gray-400' },
  };
  return map[band];
}

function maturityLabel(score) {
  const band = maturityBand(score);
  const labels = {
    reactive: 'Reactive', adaptive: 'Adaptive',
    strategic: 'Strategic Renewal', continuous: 'Continuous Renewal', unknown: '—'
  };
  return labels[band];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreCard({ label, score, icon: Icon }) {
  const c = maturityColors(score);
  const pct = score ? Math.round((score / 5) * 100) : 0;
  return (
    <div className={`border rounded-lg p-4 ${c.border} ${c.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{label}</p>
        {Icon && <Icon className={`${c.text} text-lg`} />}
      </div>
      <p className={`text-3xl font-bold ${c.text}`}>{score ? score.toFixed(1) : '—'}</p>
      <p className={`text-xs mt-1 font-medium ${c.text}`}>{maturityLabel(score)}</p>
      <div className="w-full bg-white bg-opacity-60 rounded-full h-2 mt-3">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${c.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
      </div>
    </div>
  );
}

function OverallScorePanel({ scores, maturityLevel }) {
  if (!scores) return null;
  const c = maturityColors(scores.overall_score);
  return (
    <div className={`rounded-xl border-2 p-6 ${c.border} ${c.bg} text-center mb-6`}>
      <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-1">Overall Renewal Score</p>
      <p className={`text-6xl font-black ${c.text}`}>{scores.overall_score?.toFixed(1)}</p>
      <p className={`text-lg font-bold mt-2 ${c.text}`}>{maturityLevel || maturityLabel(scores.overall_score)}</p>
      <div className="w-full bg-white bg-opacity-60 rounded-full h-3 mt-4 max-w-sm mx-auto">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${c.bar}`}
          style={{ width: `${Math.round((scores.overall_score / 5) * 100)}%` }}
        />
      </div>
      {/* Maturity scale legend */}
      <div className="flex justify-between text-xs text-gray-500 mt-2 max-w-sm mx-auto">
        <span>1.0<br/>Reactive</span>
        <span>2.0</span>
        <span>3.0<br/>Adaptive</span>
        <span>4.0</span>
        <span>5.0<br/>Continuous</span>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
      <h3 className="font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">{title}</h3>
      {children}
    </div>
  );
}

function BulletList({ items, colorClass = 'text-gray-700' }) {
  if (!items?.length) return <p className="text-sm text-gray-400 italic">None identified.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className={`text-sm flex gap-2 ${colorClass}`}>
          <span className="mt-0.5 shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items, colorClass = 'text-gray-700' }) {
  if (!items?.length) return <p className="text-sm text-gray-400 italic">None identified.</p>;
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className={`text-sm flex gap-2 ${colorClass}`}>
          <span className="font-bold shrink-0 text-gray-400">{i + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

// ─── Report renderers ─────────────────────────────────────────────────────────

function ExecutiveReport({ report }) {
  const snap = report.renewal_maturity_snapshot;
  return (
    <div className="space-y-5">
      <Section title="Executive Summary">
        <p className="text-sm text-gray-700 leading-relaxed">{report.executive_summary}</p>
      </Section>

      {snap && (
        <Section title="Renewal Maturity Snapshot">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <ScoreCard label="Strategic Renewal"      score={snap.strategic_renewal}      icon={FaChartBar} />
            <ScoreCard label="Leadership Renewal"     score={snap.leadership_renewal}     icon={FaUsers} />
            <ScoreCard label="Business Model Renewal" score={snap.business_model_renewal} icon={FaLightbulb} />
            <ScoreCard label="Organizational Renewal" score={snap.organizational_renewal} icon={FaBuilding} />
          </div>
          {snap.interpretation && (
            <p className="text-sm text-gray-600 italic">{snap.interpretation}</p>
          )}
        </Section>
      )}

      <Section title="Key Renewal Strengths">
        <BulletList items={report.key_renewal_strengths} colorClass="text-green-800" />
      </Section>

      <Section title="Key Renewal Risks">
        <BulletList items={report.key_renewal_risks} colorClass="text-red-800" />
      </Section>

      <Section title="Leadership Priorities (12–24 months)">
        <NumberedList items={report.leadership_priorities} colorClass="text-blue-800" />
      </Section>

      <Section title="Renewal Outlook">
        <p className="text-sm text-gray-700 leading-relaxed">{report.renewal_outlook}</p>
      </Section>
    </div>
  );
}

function BoardBrief({ report }) {
  const snap = report.renewal_maturity_snapshot;
  return (
    <div className="space-y-5">
      <Section title="Overall Renewal Assessment">
        <p className="text-sm text-gray-700 leading-relaxed">{report.overall_renewal_assessment}</p>
      </Section>

      {snap && (
        <Section title="Renewal Maturity Snapshot">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <ScoreCard label="Strategic Renewal"      score={snap.strategic_renewal}      icon={FaChartBar} />
            <ScoreCard label="Leadership Renewal"     score={snap.leadership_renewal}     icon={FaUsers} />
            <ScoreCard label="Business Model Renewal" score={snap.business_model_renewal} icon={FaLightbulb} />
            <ScoreCard label="Organizational Renewal" score={snap.organizational_renewal} icon={FaBuilding} />
          </div>
          {snap.governance_interpretation && (
            <p className="text-sm text-gray-600 italic">{snap.governance_interpretation}</p>
          )}
        </Section>
      )}

      <Section title="Strategic Renewal Risks">
        <BulletList items={report.strategic_renewal_risks} colorClass="text-red-800" />
      </Section>

      <Section title="Governance Implications">
        <p className="text-sm text-gray-700 leading-relaxed">{report.governance_implications}</p>
      </Section>

      <Section title="Key Questions for the Board">
        <NumberedList items={report.key_questions_for_board} colorClass="text-purple-800" />
      </Section>

      <Section title="Priority Areas for Board Oversight (12–24 months)">
        <NumberedList items={report.priority_areas_for_board_oversight} colorClass="text-blue-800" />
      </Section>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RenewalOSPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  const [reportType, setReportType] = useState('executive');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companyName, setCompanyName] = useState('');

  const fetchReport = useCallback(async (type) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `/api/reports/companies/${companyId}/renewal-os?report_type=${type}`
      );
      setReport(res.data);
      if (res.data.company_name) setCompanyName(res.data.company_name);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate Renewal OS report.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const handleTypeChange = (type) => {
    setReportType(type);
    setReport(null);
    fetchReport(type);
  };

  // Try to get company name from the companies endpoint as a fallback
  useEffect(() => {
    axios.get(`/api/companies/${companyId}`)
      .then(res => setCompanyName(res.data.name || ''))
      .catch(() => {});
  }, [companyId]);

  const scores = report?._core_scores;
  const maturityLevel = report?._maturity_level;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-8">

        {/* Back button */}
        <div className="mb-6 flex justify-start">
          <button
            onClick={() => navigate(`/company/${companyId}`)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2 text-sm"
          >
            <FaArrowLeft /> Back to Company
          </button>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-gray-800 mb-1">Renewal OS</h1>
          {companyName && <p className="text-lg text-gray-500">{companyName}</p>}
          <p className="text-sm text-gray-400 mt-1">
            Organizational Renewal Operating System Assessment
          </p>
        </div>

        {/* Report type toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => handleTypeChange('executive')}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${
                reportType === 'executive'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Executive Report
            </button>
            <button
              onClick={() => handleTypeChange('board')}
              className={`px-6 py-3 text-sm font-semibold border-l border-gray-300 transition-colors ${
                reportType === 'board'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Board Brief
            </button>
          </div>
        </div>

        {/* Generate button (shown before first load) */}
        {!report && !loading && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-6 text-sm">
              Click below to generate the{' '}
              <strong>{reportType === 'executive' ? 'Executive Renewal Readiness Report' : 'Board Renewal Brief'}</strong>{' '}
              from your uploaded documents.
            </p>
            <button
              onClick={() => fetchReport(reportType)}
              className="px-8 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow"
            >
              Generate Report
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <FaSync className="animate-spin text-3xl text-orange-400 mb-4" />
            <p className="text-sm">Running Renewal OS analysis — this may take 15–30 seconds…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 text-sm mb-4">{error}</p>
            <button
              onClick={() => fetchReport(reportType)}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Report output */}
        {report && !loading && (
          <>
            {/* Meta bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-gray-500">
              {report._documents_analysed > 0 && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                  Based on {report._documents_analysed} document{report._documents_analysed !== 1 ? 's' : ''}
                </span>
              )}
              {report._confidence_score > 0 && (
                <span className={`px-3 py-1 rounded-full font-medium ${
                  report._confidence_score >= 70 ? 'bg-green-100 text-green-800' :
                  report._confidence_score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Confidence: {report._confidence_score}%
                </span>
              )}
              {report._cached && (
                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs">
                  Cached {report._last_updated ? `· ${new Date(report._last_updated).toLocaleString()}` : ''}
                </span>
              )}
              <button
                onClick={() => fetchReport(reportType)}
                className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 underline"
              >
                <FaSync className="text-xs" /> Regenerate
              </button>
            </div>

            {/* Overall score panel */}
            <OverallScorePanel scores={scores} maturityLevel={maturityLevel} />

            {/* Report sections */}
            {report.error ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="text-yellow-800 text-sm">{report.error}</p>
              </div>
            ) : reportType === 'executive' ? (
              <ExecutiveReport report={report} />
            ) : (
              <BoardBrief report={report} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
