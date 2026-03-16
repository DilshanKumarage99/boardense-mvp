import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FaUpload, FaFileAlt, FaClipboardCheck, FaArrowLeft, FaBuilding, FaSync, FaComments, FaPaperPlane, FaSpinner, FaTrash } from 'react-icons/fa';

export default function CompanyDashboard() {
  const { companyId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [currentFiles, setCurrentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null); // {id, filename, content_extracted, content_summary}
  const [summarizing, setSummarizing] = useState(false);
  const [businessStatus, setBusinessStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Business sparring chat
  const [bizChatHistory, setBizChatHistory] = useState([]);
  const [bizChatInput, setBizChatInput] = useState('');
  const [bizChatLoading, setBizChatLoading] = useState(false);
  const [showBizChat, setShowBizChat] = useState(false);
  const bizChatEndRef = useRef(null);

  const fetchCompanyData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/companies/${companyId}`);
      setCompany(response.data);
      // Fetch documents for the company so extracted items persist across navigation
      try {
        const docsRes = await axios.get(`/api/documents/companies/${companyId}/list`);
        setDocuments(docsRes.data || []);
      } catch (e) {
        setDocuments([]);
      }
      // Load stored business status
      try {
        const statusRes = await axios.get(`/api/reports/companies/${companyId}/business-status`);
        setBusinessStatus(statusRes.data);
      } catch (e) {
        // No status yet — that's fine
      }
    } catch (err) {
      console.error('Error fetching company data:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [companyId, navigate]);

  useEffect(() => {
    if (user) {
      fetchCompanyData();
    }
  }, [user, fetchCompanyData]);

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Delete this extracted document?')) return;
    try {
      await axios.delete(`/api/documents/${docId}`);
      setDocuments((prev) => prev.filter(d => d.id !== docId));
      alert('Document deleted');
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleSelectDoc = (docId) => {
    setSelectedDocs((prev) => {
      if (prev.includes(docId)) return prev.filter(id => id !== docId);
      return [...prev, docId];
    });
  };

  const selectAllDocs = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(d => d.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocs.length === 0) return;
    if (!window.confirm(`Delete ${selectedDocs.length} selected document(s)?`)) return;
    try {
      const res = await axios.post('/api/documents/delete-batch', { document_ids: selectedDocs });
      const deleted = res.data.deleted || [];
      setDocuments((prev) => prev.filter(d => !deleted.includes(d.id)));
      setSelectedDocs([]);
      alert(`Deleted ${deleted.length} document(s)`);
    } catch (err) {
      alert('Batch delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteCompany = async () => {
    if (!company) return;

    const confirmed = window.confirm(
      `Delete company "${company.name}"? This will permanently remove the company and all related documents, analyses, decisions, and risks.`
    );
    if (!confirmed) return;

    setDeletingCompany(true);
    try {
      await axios.delete(`/api/companies/${companyId}`);
      alert('Company deleted');
      navigate('/dashboard');
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeletingCompany(false);
    }
  };

  const handleSelectFiles = (e) => {
    setCurrentFiles(Array.from(e.target.files || []));
  };

  // Auto-scroll business chat to bottom
  useEffect(() => {
    if (bizChatEndRef.current) {
      bizChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [bizChatHistory]);

  const sendBizMessage = async () => {
    if (!bizChatInput.trim() || bizChatLoading) return;
    const message = bizChatInput.trim();
    setBizChatInput('');
    const newHistory = [...bizChatHistory, { role: 'user', text: message }];
    setBizChatHistory(newHistory);
    setBizChatLoading(true);
    try {
      const res = await axios.post(`/api/sparring/companies/${companyId}/business-chat`, {
        message,
        history: newHistory.slice(0, -1)
      });
      setBizChatHistory([...newHistory, { role: 'model', text: res.data.reply }]);
    } catch (err) {
      setBizChatHistory([...newHistory, { role: 'model', text: 'Error: ' + (err.response?.data?.error || err.message) }]);
    } finally {
      setBizChatLoading(false);
    }
  };

  const handleBizChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBizMessage();
    }
  };

  const formatBizText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-gray-900 mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <p key={i} className="ml-3 text-gray-700">• {line.slice(2)}</p>;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="text-gray-700">{line}</p>;
    });
  };

  const handleUploadAndExtractAll = async () => {
    if (currentFiles.length === 0) {
      alert('No files to upload.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      currentFiles.forEach((file) => {
        formData.append('files', file);
        formData.append('types', 'general');
      });

      const uploadRes = await axios.post(
        `/api/documents/companies/${companyId}/upload-batch`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const uploadedDocs = uploadRes.data;
      setDocuments((prev) => [...prev, ...uploadedDocs]);
      setCurrentFiles([]);

      // Fetch the auto-regenerated business status
      try {
        setLoadingStatus(true);
        const statusRes = await axios.get(`/api/reports/companies/${companyId}/business-status`);
        setBusinessStatus(statusRes.data);
      } catch (e) {
        // Status update failed silently
      } finally {
        setLoadingStatus(false);
      }
    } catch (err) {
      console.error(err);
      alert('Upload/Analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-4 flex justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
          <button
            onClick={handleDeleteCompany}
            disabled={deletingCompany}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FaTrash /> {deletingCompany ? 'Deleting...' : 'Delete Company'}
          </button>
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{company?.name}</h1>
          <p className="text-gray-600">Industry: {company?.industry}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="md:col-span-1 bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-center gap-2"><FaUpload /> Upload Document</h2>
            
            <div className="mb-4">
              <input
                type="file"
                multiple
                onChange={handleSelectFiles}
                accept=".pdf,.docx,.txt,.xlsx,.xls"
                className="w-full"
              />
            </div>

            <div className="mb-4 flex gap-2">
              <button
                onClick={() => { setCurrentFiles([]); }}
                className="px-4 py-2 border rounded w-full"
              >
                Clear
              </button>
            </div>

            <div className="mb-4">
              <button
                onClick={handleUploadAndExtractAll}
                disabled={currentFiles.length === 0 || uploading}
                className="w-full bg-green-600 text-white font-semibold py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {uploading ? 'Processing...' : 'Extract All'}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Documents */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2"><FaFileAlt /> Documents</h2>
                <div className="flex items-center gap-3">
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" onChange={selectAllDocs} checked={selectedDocs.length === documents.length && documents.length>0} />
                    <span>Select All</span>
                  </label>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedDocs.length === 0}
                    className="px-3 py-1 border rounded text-red-600 disabled:opacity-50"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
              {documents.length === 0 ? (
                <p className="text-gray-500">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 border border-gray-200 rounded flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelectDoc(doc.id); }}
                        />
                        <div
                          className="cursor-pointer"
                          onClick={async () => {
                            try {
                              const res = await axios.get(`/api/documents/${doc.id}`);
                              setSelectedDocument({
                                id: res.data.id,
                                filename: res.data.filename,
                                document_type: res.data.document_type,
                                content_extracted: res.data.content_extracted || '',
                                content_summary: res.data.content_summary || ''
                              });
                            } catch (err) {
                              alert('Failed to load document: ' + (err.response?.data?.error || err.message));
                            }
                          }}
                        >
                          <p className="font-semibold">{doc.filename}</p>
                          <p className="text-sm text-gray-600">{doc.document_type}</p>
                        </div>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                          className="text-sm px-2 py-1 border rounded text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Business Status Overview */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <FaBuilding className="text-brand-orange" /> Business Status Overview
                </h2>
                {businessStatus?._last_updated && (
                  <span className="text-xs text-gray-400">
                    Last updated: {new Date(businessStatus._last_updated).toLocaleString()}
                  </span>
                )}
              </div>

              {loadingStatus && (
                <div className="flex items-center justify-center gap-3 py-8 text-gray-500">
                  <FaSync className="animate-spin" />
                  <span>Updating business overview...</span>
                </div>
              )}

              {!loadingStatus && !businessStatus && documents.length === 0 && (
                <p className="text-gray-400 text-center py-4">Upload documents to generate a business overview.</p>
              )}

              {!loadingStatus && !businessStatus && documents.length > 0 && (
                <p className="text-gray-400 text-center py-4">Overview will appear here after the next document upload completes.</p>
              )}

              {businessStatus && !loadingStatus && (
                <div className="space-y-6">
                  {/* Meta badges + Confidence explainer */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                        Based on {businessStatus.documents_analysed} document{businessStatus.documents_analysed !== 1 ? 's' : ''}
                      </span>
                      <span className={`px-3 py-1 rounded-full font-medium ${
                        businessStatus.confidence_score >= 81 ? 'bg-green-100 text-green-800' :
                        businessStatus.confidence_score >= 61 ? 'bg-blue-100 text-blue-800' :
                        businessStatus.confidence_score >= 41 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Confidence: {businessStatus.confidence_score}%
                      </span>
                    </div>

                    {/* Confidence Score Explanation */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-bold text-gray-600 uppercase mb-2">What is the Confidence Score?</p>
                      <p className="text-xs text-gray-600 mb-3">
                        This score reflects how much reliable business information was found across your submitted documents.
                        A higher score means the AI had more complete, consistent data to work with.
                        Submitting more relevant documents will improve it.
                      </p>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            businessStatus.confidence_score >= 81 ? 'bg-green-500' :
                            businessStatus.confidence_score >= 61 ? 'bg-blue-500' :
                            businessStatus.confidence_score >= 41 ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`}
                          style={{ width: `${businessStatus.confidence_score}%` }}
                        />
                      </div>
                      {/* Score ranges */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className={`rounded p-2 text-center border ${businessStatus.confidence_score <= 40 ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                          <p className="text-xs font-bold text-red-600">0 – 40%</p>
                          <p className="text-xs text-gray-500">Very limited data</p>
                        </div>
                        <div className={`rounded p-2 text-center border ${businessStatus.confidence_score >= 41 && businessStatus.confidence_score <= 60 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}>
                          <p className="text-xs font-bold text-yellow-600">41 – 60%</p>
                          <p className="text-xs text-gray-500">Moderate reliability</p>
                        </div>
                        <div className={`rounded p-2 text-center border ${businessStatus.confidence_score >= 61 && businessStatus.confidence_score <= 80 ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                          <p className="text-xs font-bold text-blue-600">61 – 80%</p>
                          <p className="text-xs text-gray-500">Good reliability</p>
                        </div>
                        <div className={`rounded p-2 text-center border ${businessStatus.confidence_score >= 81 ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                          <p className="text-xs font-bold text-green-600">81 – 100%</p>
                          <p className="text-xs text-gray-500">High reliability</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-800 mb-2">Executive Summary</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">{businessStatus.business_summary}</p>
                  </div>

                  {/* Financial Health */}
                  {businessStatus.financial_health && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3 border-b pb-1">Financial Health</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-green-700 uppercase mb-1">Revenue Trend</p>
                          <p className="text-sm capitalize font-medium text-gray-800">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              businessStatus.financial_health.revenue_trend === 'growing' ? 'bg-green-500' :
                              businessStatus.financial_health.revenue_trend === 'declining' ? 'bg-red-500' : 'bg-yellow-400'
                            }`}></span>
                            {businessStatus.financial_health.revenue_trend}
                          </p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Profitability</p>
                          <p className="text-sm text-gray-800">{businessStatus.financial_health.profitability_status}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Cash Flow</p>
                          <p className="text-sm text-gray-800">{businessStatus.financial_health.cash_flow_status}</p>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">Funding / Debt</p>
                          <p className="text-sm text-gray-800">{businessStatus.financial_health.funding_situation}</p>
                        </div>
                      </div>
                      {businessStatus.financial_health.key_metrics?.length > 0 && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Key Metrics Mentioned</p>
                          <ul className="space-y-1">
                            {businessStatus.financial_health.key_metrics.map((m, i) => (
                              <li key={i} className="text-sm text-gray-700">• {m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SWOT */}
                  {businessStatus.swot && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3 border-b pb-1">SWOT Analysis</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-green-700 uppercase mb-2">Strengths</p>
                          <ul className="space-y-1">
                            {businessStatus.swot.strengths?.map((s, i) => <li key={i} className="text-xs text-gray-700">• {s}</li>)}
                          </ul>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-red-700 uppercase mb-2">Weaknesses</p>
                          <ul className="space-y-1">
                            {businessStatus.swot.weaknesses?.map((w, i) => <li key={i} className="text-xs text-gray-700">• {w}</li>)}
                          </ul>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-blue-700 uppercase mb-2">Opportunities</p>
                          <ul className="space-y-1">
                            {businessStatus.swot.opportunities?.map((o, i) => <li key={i} className="text-xs text-gray-700">• {o}</li>)}
                          </ul>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-yellow-700 uppercase mb-2">Threats</p>
                          <ul className="space-y-1">
                            {businessStatus.swot.threats?.map((t, i) => <li key={i} className="text-xs text-gray-700">• {t}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risks */}
                  {businessStatus.risks?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3 border-b pb-1">Key Risks & Red Flags</h3>
                      <div className="space-y-2">
                        {businessStatus.risks.map((risk, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                              risk.severity === 'high' ? 'bg-red-100 text-red-700' :
                              risk.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {risk.severity?.toUpperCase()}
                            </span>
                            <p className="text-sm text-gray-700">{risk.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market Position */}
                  {businessStatus.market_position && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3 border-b pb-1">Market Position</h3>
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Competitive Landscape</p>
                          <p className="text-sm text-gray-800">{businessStatus.market_position.competitive_landscape}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Target Market</p>
                          <p className="text-sm text-gray-800">{businessStatus.market_position.target_market}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Unique Selling Proposition</p>
                          <p className="text-sm text-gray-800">{businessStatus.market_position.usp}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Strategic Outlook */}
                  {businessStatus.strategic_outlook && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3 border-b pb-1">Strategic Outlook</h3>
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Short-term Priorities</p>
                          <p className="text-sm text-gray-800">{businessStatus.strategic_outlook.short_term}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Long-term Vision</p>
                          <p className="text-sm text-gray-800">{businessStatus.strategic_outlook.long_term}</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-green-700 uppercase mb-1">Growth Strategy</p>
                          <p className="text-sm text-gray-800">{businessStatus.strategic_outlook.growth_strategy}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Business Sparring Chat */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setShowBizChat(v => !v)}
              >
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <FaComments className="text-brand-orange" /> Business Sparring
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {documents.length > 0 && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium text-xs">
                      Powered by {documents.length} document{documents.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-gray-400">{showBizChat ? '▲' : '▼'}</span>
                </div>
              </button>

              {showBizChat && (
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-gray-500">
                    Ask the AI advisor anything about this business. It has full context from all submitted documents —
                    the more you upload, the sharper its intelligence becomes.
                  </p>

                  {documents.length === 0 && (
                    <p className="text-gray-400 text-center py-4">Upload documents first to start a business sparring session.</p>
                  )}

                  {documents.length > 0 && (
                    <>
                      {/* Chat messages */}
                      <div className="border border-gray-200 rounded-lg p-4 h-72 overflow-y-auto bg-gray-50 space-y-3">
                        {bizChatHistory.length === 0 && (
                          <p className="text-gray-400 text-sm text-center mt-8">
                            Start by asking a strategic question about the business...
                          </p>
                        )}
                        {bizChatHistory.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                              msg.role === 'user'
                                ? 'bg-brand-orange text-white'
                                : 'bg-white border border-gray-200 text-gray-800'
                            }`}>
                              {msg.role === 'model' ? formatBizText(msg.text) : msg.text}
                            </div>
                          </div>
                        ))}
                        {bizChatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
                              <FaSpinner className="animate-spin" /> Thinking...
                            </div>
                          </div>
                        )}
                        <div ref={bizChatEndRef} />
                      </div>

                      {/* Input row */}
                      <div className="flex gap-2">
                        <textarea
                          value={bizChatInput}
                          onChange={(e) => setBizChatInput(e.target.value)}
                          onKeyDown={handleBizChatKeyDown}
                          placeholder="Ask a strategic question about the business..."
                          rows={2}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange"
                        />
                        <button
                          onClick={sendBizMessage}
                          disabled={bizChatLoading || !bizChatInput.trim()}
                          className="px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 text-sm font-semibold"
                        >
                          {bizChatLoading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                          Send
                        </button>
                      </div>

                      {bizChatHistory.length > 0 && (
                        <button
                          onClick={() => setBizChatHistory([])}
                          className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                          Clear conversation
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Reports Section */}
        <div className="mt-8 grid grid-cols-1 gap-4">
          <button
            onClick={() => navigate(`/reports/${companyId}/exit-readiness`)}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-brand-orange text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <FaClipboardCheck className="text-brand-orange" />
              <h3 className="text-xl font-bold">Exit Readiness Report</h3>
            </div>
            <p className="text-gray-600">Assess governance maturity and due diligence readiness</p>
          </button>
        </div>
      </div>
      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-screen overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedDocument.filename}</h2>
              <button onClick={() => setSelectedDocument(null)} className="text-gray-600">Close</button>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Type: {selectedDocument.document_type}</p>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Extracted Content</label>
              <textarea
                className="w-full h-52 p-2 border rounded font-mono text-sm"
                value={selectedDocument.content_extracted}
                onChange={(e) => setSelectedDocument((d) => ({ ...d, content_extracted: e.target.value }))}
              />
            </div>

            {/* Summary section */}
            {selectedDocument.content_summary && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4">
                <h3 className="text-sm font-bold text-blue-800 mb-2">AI Document Summary</h3>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{selectedDocument.content_summary}</pre>
              </div>
            )}

            {summarizing && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
                Generating summary... this may take a few seconds.
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setSelectedDocument(null); setSummarizing(false); }} className="px-4 py-2 border rounded">Close</button>
              <button
                onClick={async () => {
                  try {
                    const payload = { content: selectedDocument.content_extracted, analyze: false };
                    const res = await axios.put(`/api/documents/${selectedDocument.id}/update-content`, payload);
                    setDocuments((prev) => prev.map(d => d.id === res.data.id ? res.data : d));
                    setSelectedDocument(null);
                    alert('Saved extracted content.');
                  } catch (err) {
                    alert('Save failed: ' + (err.response?.data?.error || err.message));
                  }
                }}
                className="px-4 py-2 bg-brand-orange text-white rounded"
              >
                Save
              </button>
              <button
                disabled={summarizing}
                onClick={async () => {
                  setSummarizing(true);
                  try {
                    const payload = { content: selectedDocument.content_extracted, analyze: true };
                    const res = await axios.put(`/api/documents/${selectedDocument.id}/update-content`, payload);
                    setDocuments((prev) => prev.map(d => d.id === res.data.id ? res.data : d));
                    setSelectedDocument(null);
                    // Open analysis page in new tab
                    window.open(`/analysis/${selectedDocument.id}`, '_blank');
                  } catch (err) {
                    alert('Save & Analyze failed: ' + (err.response?.data?.error || err.message));
                  } finally {
                    setSummarizing(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {summarizing ? 'Summarizing...' : 'Save & Analyze'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
