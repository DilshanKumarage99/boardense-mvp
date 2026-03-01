import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const COVERAGE_LABELS = {
  financial_statements: 'Financial Statements',
  business_strategy: 'Business Strategy',
  market_analysis: 'Market Analysis',
  legal_structure: 'Legal Structure',
  operational_documentation: 'Operational Documentation',
  customer_contracts: 'Customer Contracts',
  ip_documentation: 'IP Documentation',
  management_team: 'Management Team'
};

const CATEGORY_LABELS = {
  financial: 'Financial',
  legal: 'Legal',
  operational: 'Operational',
  market: 'Market',
  strategic: 'Strategic'
};

function ScoreBar({ score, color = 'orange' }) {
  const colorMap = {
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-400'
  };
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${colorMap[color]}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function CoverageIcon({ status }) {
  if (status === 'found') return <span className="text-green-600 font-bold">✓</span>;
  if (status === 'partial') return <span className="text-yellow-500 font-bold">~</span>;
  return <span className="text-red-500 font-bold">✗</span>;
}

function statusColor(status) {
  if (status === 'strong' || status === 'found') return 'text-green-700 bg-green-50 border-green-200';
  if (status === 'good') return 'text-blue-700 bg-blue-50 border-blue-200';
  if (status === 'developing' || status === 'partial') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function verdictColor(verdict) {
  if (verdict === 'Strong') return 'text-green-700 bg-green-100';
  if (verdict === 'Good') return 'text-blue-700 bg-blue-100';
  if (verdict === 'Developing') return 'text-yellow-700 bg-yellow-100';
  if (verdict === 'Early Stage') return 'text-orange-700 bg-orange-100';
  return 'text-red-700 bg-red-100';
}

function severityColor(severity) {
  if (severity === 'critical') return 'bg-red-100 text-red-700 border-red-300';
  if (severity === 'high') return 'bg-orange-100 text-orange-700 border-orange-300';
  if (severity === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  return 'bg-gray-100 text-gray-600 border-gray-300';
}

function scoreBarColor(score) {
  if (score >= 75) return 'green';
  if (score >= 50) return 'blue';
  if (score >= 25) return 'yellow';
  return 'red';
}

export default function ReportPage() {
  const { companyId } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [companyId]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = `/api/reports/companies/${companyId}/exit-readiness`;
      const response = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setReport(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-16 text-gray-500">Generating report...</div>;
  if (error) return <div className="text-center p-16 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            ← Back
          </button>
          {report?._last_updated && (
            <span className="text-xs text-gray-400">
              Last updated: {new Date(report._last_updated).toLocaleString()}
            </span>
          )}
        </div>

        {/* EXIT READINESS REPORT */}
        {report && (
          <div className="space-y-6">

            {/* Title + Score Hero */}
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Exit Readiness Report</h1>
              <p className="text-gray-500 mb-1">{report.company_name} · {report.company_stage} · {report.company_industry}</p>
              <div className="flex items-center justify-center gap-3 mb-6 text-sm text-gray-400">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                  Based on {report.documents_analysed} document{report.documents_analysed !== 1 ? 's' : ''}
                </span>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                  Confidence: {report.confidence_score}%
                </span>
              </div>

              {/* Big score */}
              <div className="inline-block">
                <div className="relative w-40 h-40 mx-auto mb-4">
                  <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke={report.overall_readiness_score >= 75 ? '#22c55e' : report.overall_readiness_score >= 50 ? '#3b82f6' : report.overall_readiness_score >= 25 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      strokeDasharray={`${(report.overall_readiness_score / 100) * 314} 314`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-800">{report.overall_readiness_score}</span>
                    <span className="text-xs text-gray-500">/ 100</span>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${verdictColor(report.readiness_verdict)}`}>
                  {report.readiness_verdict}
                </span>
              </div>

              {/* Executive Summary */}
              {report.executive_summary && (
                <p className="mt-6 text-gray-600 text-sm leading-relaxed max-w-2xl mx-auto">
                  {report.executive_summary}
                </p>
              )}
            </div>

            {/* Document Coverage */}
            {report.document_coverage && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Document Coverage</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(report.document_coverage).map(([key, status]) => (
                    <div key={key} className={`border rounded-lg p-3 flex items-center gap-2 ${statusColor(status)}`}>
                      <CoverageIcon status={status} />
                      <span className="text-xs font-medium">{COVERAGE_LABELS[key] || key}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span><span className="text-green-600 font-bold">✓</span> Found</span>
                  <span><span className="text-yellow-500 font-bold">~</span> Partial</span>
                  <span><span className="text-red-500 font-bold">✗</span> Missing</span>
                </div>
              </div>
            )}

            {/* Readiness by Category */}
            {report.readiness_by_category && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Readiness by Category</h2>
                <div className="space-y-5">
                  {Object.entries(report.readiness_by_category).map(([key, cat]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{CATEGORY_LABELS[key] || key}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${statusColor(cat.status)}`}>
                            {cat.status}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">{cat.score}/100</span>
                      </div>
                      <ScoreBar score={cat.score} color={scoreBarColor(cat.score)} />
                      <p className="text-xs text-gray-600 mt-1">{cat.summary}</p>
                      {cat.gaps?.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {cat.gaps.map((g, i) => (
                            <li key={i} className="text-xs text-red-600">• {g}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red Flags */}
            {report.red_flags?.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">🚩 Red Flags</h2>
                <div className="space-y-3">
                  {report.red_flags.map((flag, i) => (
                    <div key={i} className={`border rounded-lg p-4 ${severityColor(flag.severity)}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${severityColor(flag.severity)}`}>
                          {flag.severity}
                        </span>
                        <p className="text-sm font-semibold">{flag.description}</p>
                      </div>
                      {flag.impact && (
                        <p className="text-xs opacity-80 mt-1">Impact: {flag.impact}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preparation Recommendations */}
            {report.preparation_recommendations?.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Preparation Recommendations</h2>
                <div className="space-y-3">
                  {report.preparation_recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full whitespace-nowrap ${severityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <div>
                        <p className="text-sm text-gray-800">{rec.action}</p>
                        {rec.category && (
                          <p className="text-xs text-gray-400 capitalize mt-0.5">{rec.category}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Timeline */}
            {report.estimated_timeline && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-3">Estimated Timeline to Exit Ready</h2>
                <div className="flex items-center gap-4">
                  <div className="bg-brand-orange text-white rounded-lg px-6 py-4 text-center min-w-[100px]">
                    <p className="text-3xl font-bold">{report.estimated_timeline.months_to_ready}</p>
                    <p className="text-xs">months</p>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">
                    {report.estimated_timeline.narrative}
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
