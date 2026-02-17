import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function ReportPage() {
  const { companyId, reportType } = useParams();
  const { token } = useContext(AuthContext);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [companyId, reportType]);

  const fetchReport = async () => {
    try {
      let endpoint = '';
      if (reportType === 'exit-readiness') {
        endpoint = `/api/reports/companies/${companyId}/exit-readiness`;
      } else if (reportType === 'investor-questions') {
        endpoint = `/api/reports/companies/${companyId}/investor-questions`;
      }

      const response = await axios.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setReport(response.data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading report...</div>;
  }

  const reportTitle = reportType === 'exit-readiness'
    ? 'Exit Readiness Report'
    : 'Investor Questions Report';

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">{reportTitle}</h1>

        {report && (
          <div>
            {reportType === 'exit-readiness' && (
              <div className="space-y-6">
                <div className="bg-brand-orange-light p-6 rounded-lg">
                  <h2 className="text-2xl font-bold mb-4">Readiness Score</h2>
                  <p className="text-5xl font-bold text-brand-orange">{report.readiness_score}/100</p>
                  <p className="text-gray-600 mt-2">Governance Maturity: {report.governance_maturity}</p>
                </div>

                <div className="border-t pt-6">
                  <h2 className="text-2xl font-bold mb-4">Key Metrics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(report.key_metrics).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 p-4 rounded">
                        <p className="text-gray-600 text-sm">{key.replace(/_/g, ' ')}</p>
                        <p className="text-2xl font-bold">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h2 className="text-2xl font-bold mb-4">Due Diligence Gaps</h2>
                  <ul className="space-y-2">
                    {report.due_diligence_gaps.map((gap, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-red-600 mr-3">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t pt-6">
                  <h2 className="text-2xl font-bold mb-4">Recommended Actions</h2>
                  <ul className="space-y-2">
                    {report.recommended_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-600 mr-3">✓</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {reportType === 'investor-questions' && (
              <div className="space-y-6">
                {Object.entries(report).map(([category, questions]) => {
                  if (Array.isArray(questions)) {
                    return (
                      <div key={category} className="border-t pt-6">
                        <h2 className="text-2xl font-bold mb-4 capitalize">
                          {category.replace(/_/g, ' ')}
                        </h2>
                        <ul className="space-y-3">
                          {questions.map((q, idx) => (
                            <li key={idx} className="bg-gray-50 p-4 rounded">
                              <p className="text-gray-800">{q}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
