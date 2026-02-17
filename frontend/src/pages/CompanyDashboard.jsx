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
  const [analyses, setAnalyses] = useState([]);
  // multi-file/group upload state
  const [groups, setGroups] = useState([]); // { type: string, files: File[] }
  const [currentFiles, setCurrentFiles] = useState([]);
  const [documentType, setDocumentType] = useState('board_deck');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCompanyData();
    }
  }, [user]);

  const fetchCompanyData = async () => {
    try {
      const response = await axios.get(`/api/companies/${companyId}`);
      setCompany(response.data);
      setDocuments([]);
      setAnalyses([]);
    } catch (err) {
      console.error('Error fetching company data:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFiles = (e) => {
    setCurrentFiles(Array.from(e.target.files || []));
  };

  const handleAddGroup = () => {
    if (!currentFiles.length) return;
    setGroups((prev) => [...prev, { type: documentType, files: currentFiles }]);
    setCurrentFiles([]);
  };

  const removeFileFromGroup = (gIdx, fIdx) => {
    setGroups((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[gIdx].files.splice(fIdx, 1);
      if (copy[gIdx].files.length === 0) copy.splice(gIdx, 1);
      return copy;
    });
  };

  const removeGroup = (gIdx) => {
    setGroups((prev) => prev.filter((_, i) => i !== gIdx));
  };

  const handleUploadAndAnalyzeAll = async () => {
    if (groups.length === 0) {
      alert('No files to upload.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      groups.forEach((group) => {
        group.files.forEach((file) => {
          formData.append('files', file);
          formData.append('types', group.type);
        });
      });

      const uploadRes = await axios.post(
        `/api/documents/companies/${companyId}/upload-batch`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const uploadedDocs = uploadRes.data;
      setDocuments((prev) => [...prev, ...uploadedDocs]);

      const docIds = uploadedDocs.map((d) => d.id);
      const analyzeRes = await axios.post(
        `/api/analysis/companies/${companyId}/analyze-batch`,
        { document_ids: docIds }
      );

      setAnalyses((prev) => [...prev, ...analyzeRes.data.analyses]);

      setSummary({
        groups: groups.map((g) => ({ type: g.type, files: g.files.map((f) => f.name) })),
        total_files: uploadedDocs.length,
        aggregated: analyzeRes.data.summary || null,
      });

      setGroups([]);
      setCurrentFiles([]);
      alert('Upload & analysis complete!');
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
                onClick={handleAddGroup}
                disabled={!currentFiles.length}
                className="flex-1 bg-brand-orange text-white font-semibold py-2 rounded hover:bg-brand-orange-dark disabled:opacity-50"
              >
                Add files under this type
              </button>
              <button
                onClick={() => { setCurrentFiles([]); }}
                className="px-4 py-2 border rounded"
              >
                Clear
              </button>
            </div>

            <div className="mb-4">
              <button
                onClick={handleUploadAndAnalyzeAll}
                disabled={groups.length === 0 || uploading}
                className="w-full bg-green-600 text-white font-semibold py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {uploading ? 'Processing...' : 'Analyze & Summarize All'}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Upload Groups Preview */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-left">
              <h2 className="text-2xl font-bold mb-4 flex items-center justify-start gap-2"><FaFileAlt /> Upload Groups</h2>
              {groups.length === 0 ? (
                <p className="text-gray-500">No groups created yet. Select files and click "Add files under this type".</p>
              ) : (
                <div className="space-y-3">
                  {groups.map((g, gi) => (
                    <div key={gi} className="p-4 border border-gray-200 rounded">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">Type: {g.type}</p>
                          <p className="text-sm text-gray-600">{g.files.length} file(s)</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => removeGroup(gi)} className="text-sm px-2 py-1 border rounded">Remove Group</button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {g.files.map((f, fi) => (
                          <div key={fi} className="p-2 border rounded flex justify-between items-center">
                            <div>
                              <p className="font-medium">{f.name}</p>
                              <p className="text-xs text-gray-500">{f.type || f.name.split('.').pop()}</p>
                            </div>
                            <button onClick={() => removeFileFromGroup(gi, fi)} className="text-sm px-2 py-1 border rounded">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Documents */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2"><FaFileAlt /> Documents</h2>
              {documents.length === 0 ? (
                <p className="text-gray-500">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 border border-gray-200 rounded">
                      <p className="font-semibold">{doc.filename}</p>
                      <p className="text-sm text-gray-600">{doc.document_type}</p>
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
    </div>
  );
}
