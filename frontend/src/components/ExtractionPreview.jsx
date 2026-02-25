import React, { useState } from 'react';
import axios from 'axios';
import { FaSpinner, FaTimes, FaSave, FaTrash } from 'react-icons/fa';

export default function ExtractionPreview({ 
  companyId, 
  documentType, 
  onClose, 
  onSuccess 
}) {
  const [extractedContent, setExtractedContent] = useState('');
  const [filename, setFilename] = useState('');
  const [fileType, setFileType] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setExtracting(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('/api/documents/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setExtractedContent(response.data.content);
      setFilename(response.data.filename);
      setFileType(response.data.file_type);
      setCharCount(response.data.char_count);
    } catch (err) {
      alert('Extraction failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveAndAnalyze = async () => {
    if (!selectedFile || !extractedContent) {
      alert('Please extract content first');
      return;
    }

    setSaving(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', documentType);
    formData.append('content', extractedContent);
    formData.append('analyze', shouldAnalyze.toString());

    try {
      const response = await axios.post(
        `/api/documents/companies/${companyId}/save-and-analyze`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      alert('Document saved successfully!');
      onSuccess(response.data);
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExtracted = async () => {
    if (!extractedContent) {
      alert('No extracted content to save');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        filename: filename || 'extracted.txt',
        content: extractedContent,
        document_type: documentType
      };

      const response = await axios.post(
        `/api/documents/companies/${companyId}/save-extracted`,
        payload
      );

      alert('Extracted content saved.');
      onSuccess(response.data);
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setExtractedContent('');
    setFilename('');
    setFileType('');
    setCharCount(0);
    setSelectedFile(null);
    setDocumentType('general');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-300 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-800">Extract & Review Document Content</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Selection */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">Step 1: Select & Extract File</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.pptx,.txt"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  disabled={extracting}
                />
                <p className="text-xs text-gray-500 mt-1">Supported: PDF, DOCX, PPTX, TXT</p>
              </div>
              <button
                onClick={handleExtract}
                disabled={!selectedFile || extracting}
                className="px-6 py-2 bg-brand-orange text-white rounded hover:bg-brand-orange-dark disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {extracting ? <FaSpinner className="animate-spin" /> : null}
                {extracting ? 'Extracting...' : 'Extract Content'}
              </button>
            </div>
          </div>

          {/* Extracted Content */}
          {extractedContent && (
            <>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-700">File: {filename}</h3>
                    <p className="text-sm text-gray-600">Type: {fileType.toUpperCase()} | Characters: {charCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Step 2: Review & Edit Content</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Review the extracted content below. You can edit it before saving.
                </p>
                <textarea
                  value={extractedContent}
                  onChange={(e) => {
                    setExtractedContent(e.target.value);
                    setCharCount(e.target.value.length);
                  }}
                  className="w-full h-80 px-4 py-3 border border-gray-300 rounded font-mono text-sm"
                  placeholder="Extracted content will appear here..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {charCount.toLocaleString()} characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end p-4 bg-gray-50 rounded-lg border border-gray-200">
                <button
                  onClick={handleClear}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 flex items-center gap-2"
                >
                  <FaTrash /> Clear
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveExtracted}
                  disabled={saving || !extractedContent}
                  className="px-6 py-2 bg-brand-orange text-white rounded hover:bg-brand-orange-dark disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          )}

          {!extractedContent && !extracting && (
            <div className="text-center py-12 text-gray-500">
              <p>Select a file and click "Extract Content" to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
