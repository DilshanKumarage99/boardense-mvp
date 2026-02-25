import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FaUpload, FaFileAlt, FaChartLine, FaClipboardCheck, FaQuestionCircle, FaArrowLeft } from 'react-icons/fa';

export default function CompanyDashboard() {
  const { companyId } = useParams();
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [currentFiles, setCurrentFiles] = useState([]);
  const [documentType, setDocumentType] = useState('board_deck');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null); // {id, filename, content_extracted, content_summary}
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCompanyData();
    }
  }, [user]);

  const fetchCompanyData = async () => {
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
      setAnalyses([]);
    } catch (err) {
      console.error('Error fetching company data:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSelectFiles = (e) => {
    setCurrentFiles(Array.from(e.target.files || []));
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
        formData.append('types', documentType);
      });

      const uploadRes = await axios.post(
        `/api/documents/companies/${companyId}/upload-batch`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const uploadedDocs = uploadRes.data;
      setDocuments((prev) => [...prev, ...uploadedDocs]);
      setCurrentFiles([]);
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
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{company?.name}</h1>
          <p className="text-gray-600">Stage: {company?.stage} | Industry: {company?.industry}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="md:col-span-1 bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-center gap-2"><FaUpload /> Upload Document</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="board_deck">Board Deck</option>
                <option value="strategy_doc">Strategy Document</option>
                <option value="okr">OKRs</option>
                <option value="decision_note">Decision Note</option>
                <option value="general">General Document</option>
              </select>
            </div>

            <div className="mb-4">
              <input
                type="file"
                multiple
                onChange={handleSelectFiles}
                accept=".pdf,.docx,.txt"
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

            {/* Analyses */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2"><FaChartLine /> Analyses</h2>
              {analyses.length === 0 ? (
                <p className="text-gray-500">No analyses yet. Upload documents to see analysis results.</p>
              ) : (
                <div className="space-y-3">
                  {analyses.map((analysis) => (
                    <div key={analysis.id} className="p-4 border border-gray-200 rounded">
                      <p className="font-semibold mb-2">Analysis Summary</p>
                      <p className="text-sm text-gray-600">{analysis.executive_summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reports Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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

          <button
            onClick={() => navigate(`/reports/${companyId}/investor-questions`)}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-brand-orange text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <FaQuestionCircle className="text-brand-orange" />
              <h3 className="text-xl font-bold">Investor Questions</h3>
            </div>
            <p className="text-gray-600">See likely questions from acquirers and investors</p>
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
