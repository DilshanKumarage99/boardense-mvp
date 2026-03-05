import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaBrain, FaComments, FaSpinner, FaChevronDown, FaChevronUp, FaPaperPlane } from 'react-icons/fa';

export default function AnalysisPage() {
  const { documentId } = useParams();


  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Board intelligence
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);

  // Summary display
  const [showSummary, setShowSummary] = useState(true);

  // Sparring session
  const [showSparring, setShowSparring] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const fetchDocument = async () => {
    try {
      const res = await axios.get(`/api/documents/${documentId}`);
      setDocument(res.data);
    } catch (err) {
      setError('Failed to load document.');
    } finally {
      setLoading(false);
    }
  };

  const loadBoardIntelligence = async () => {
    if (intelligence) { setShowIntelligence(true); return; }
    setIntelligenceLoading(true);
    setShowIntelligence(true);
    try {
      const res = await axios.get(`/api/sparring/document/${documentId}/board-intelligence`);
      setIntelligence(res.data.intelligence);
    } catch (err) {
      setIntelligence('Failed to generate board intelligence: ' + (err.response?.data?.error || err.message));
    } finally {
      setIntelligenceLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim() || chatLoading) return;
    const message = userInput.trim();
    setUserInput('');

    const newHistory = [...chatHistory, { role: 'user', text: message }];
    setChatHistory(newHistory);
    setChatLoading(true);

    try {
      const res = await axios.post(`/api/sparring/document/${documentId}/chat`, {
        message,
        history: newHistory.slice(0, -1) // send history before this message
      });
      setChatHistory([...newHistory, { role: 'model', text: res.data.reply }]);
    } catch (err) {
      setChatHistory([...newHistory, { role: 'model', text: 'Error: ' + (err.response?.data?.error || err.message) }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-gray-900 mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.match(/^\*\*.*\*\*/)) {
        return <p key={i} className="font-semibold text-gray-800 mt-2">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="ml-4 text-gray-700">{line.replace(/^[-•] /, '')}</li>;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="text-gray-700">{line}</p>;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-brand-orange" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Document not found.'}</p>
          <button onClick={() => window.close()} className="px-4 py-2 bg-gray-600 text-white rounded">Close Tab</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.close()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <FaArrowLeft /> Close
          </button>
          <div className="w-px h-6 bg-gray-300" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{document.filename}</h1>
            <p className="text-sm text-gray-500">Type: {document.document_type}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadBoardIntelligence}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold"
          >
            <FaBrain /> Board Intelligence
          </button>
          <button
            onClick={() => setShowSparring((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
          >
            <FaComments /> {showSparring ? 'Hide Sparring' : 'Start Sparring'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Document Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={() => setShowSummary((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-xl font-bold text-gray-900">AI Document Summary</h2>
            {showSummary ? <FaChevronUp className="text-gray-400" /> : <FaChevronDown className="text-gray-400" />}
          </button>
          {showSummary && (
            <div className="mt-4">
              {document.content_summary ? (
                <div className="prose max-w-none text-sm leading-relaxed">
                  {formatText(document.content_summary)}
                </div>
              ) : (
                <p className="text-gray-500 italic">No summary available. Go back and click "Save & Analyze" on the document.</p>
              )}
            </div>
          )}
        </div>

        {/* Board Intelligence */}
        {showIntelligence && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FaBrain className="text-indigo-500" /> Board Intelligence Brief
              </h2>
              <button onClick={() => setShowIntelligence(false)} className="text-gray-400 hover:text-gray-600 text-sm">Hide</button>
            </div>
            {intelligenceLoading ? (
              <div className="flex items-center gap-3 text-indigo-600">
                <FaSpinner className="animate-spin" />
                <span>Generating board intelligence analysis...</span>
              </div>
            ) : (
              <div className="prose max-w-none text-sm leading-relaxed">
                {formatText(intelligence)}
              </div>
            )}
          </div>
        )}

        {/* Sparring Session */}
        {showSparring && (
          <div className="bg-white rounded-lg shadow border-l-4 border-green-500 flex flex-col" style={{ height: '600px' }}>
            <div className="p-4 border-b flex items-center gap-2">
              <FaComments className="text-green-600" />
              <h2 className="text-xl font-bold text-gray-900">Sparring Session</h2>
              <span className="text-sm text-gray-500 ml-2">— Your virtual board member</span>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                  <FaComments className="text-5xl mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Start your sparring session</p>
                  <p className="text-sm mt-1">Ask about risks, decisions, assumptions, or anything you want challenged.</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto text-left">
                    {[
                      'What are the biggest risks we are not addressing?',
                      'What assumptions are we making that could be wrong?',
                      'What questions would an investor ask that we cannot answer?',
                      'What decisions are we avoiding that we should make now?'
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setUserInput(suggestion)}
                        className="p-2 text-xs border rounded hover:bg-gray-50 text-gray-600 text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl px-4 py-3 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-orange text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {msg.role === 'model' ? (
                      <div className="leading-relaxed">{formatText(msg.text)}</div>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-3 rounded-lg flex items-center gap-2 text-gray-500 text-sm">
                    <FaSpinner className="animate-spin" /> Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t flex gap-3">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question... (Enter to send, Shift+Enter for new line)"
                className="flex-1 border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={2}
                disabled={chatLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!userInput.trim() || chatLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
