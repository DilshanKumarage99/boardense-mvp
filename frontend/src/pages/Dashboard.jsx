import React, { useState, useContext, useEffect, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaPlus } from 'react-icons/fa';

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    stage: 'seed',
    industry: ''
  });

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await axios.get('/api/companies/list');
      setCompanies(response.data);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await axios.post('/api/companies/create', newCompanyData);
      setCompanies([...companies, response.data]);
      setNewCompanyData({ name: '', stage: 'seed', industry: '' });
      setShowNewCompanyForm(false);
      navigate(`/company/${response.data.id}`);
    } catch (err) {
      alert('Failed to create company: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-black shadow">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-center items-center">
          <h1 className="text-2xl font-bold text-brand-orange">Boardense</h1>
          <div className="absolute right-8 flex items-center gap-4">
            <span className="text-white">Welcome, {user?.first_name}!</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8 flex flex-col items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-800">Your Companies</h2>
          <button
            onClick={() => setShowNewCompanyForm(!showNewCompanyForm)}
            className="px-6 py-2 bg-brand-orange text-white rounded hover:bg-brand-orange-dark flex items-center gap-2"
          >
            <FaPlus /> Add Company
          </button>
        </div>

        {showNewCompanyForm && (
          <div className="mb-8 bg-white rounded-lg shadow-lg p-6">
            <form onSubmit={handleCreateCompany}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Company Name</label>
                <input
                  type="text"
                  value={newCompanyData.name}
                  onChange={(e) => setNewCompanyData({...newCompanyData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Stage</label>
                  <select
                    value={newCompanyData.stage}
                    onChange={(e) => setNewCompanyData({...newCompanyData, stage: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                  >
                    <option value="seed">Seed</option>
                    <option value="series-a">Series A</option>
                    <option value="series-b">Series B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Industry</label>
                  <input
                    type="text"
                    value={newCompanyData.industry}
                    onChange={(e) => setNewCompanyData({...newCompanyData, industry: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="bg-brand-orange text-white px-6 py-2 rounded hover:bg-brand-orange-dark disabled:opacity-50 flex items-center gap-2"
              >
                <FaPlus /> {creating ? 'Creating...' : 'Create Company'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center p-8">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {companies.length === 0 ? (
              <div className="md:col-span-3 bg-white rounded-lg shadow-lg p-8 text-center">
                <p className="text-gray-500 mb-4">No companies yet. Click "Add Company" to get started.</p>
                <button
                  onClick={() => setShowNewCompanyForm(true)}
                  className="px-6 py-2 bg-brand-orange text-white rounded hover:bg-brand-orange-dark flex items-center gap-2"
                >
                  <FaPlus /> Create Your First Company
                </button>
              </div>
            ) : (
              companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => navigate(`/company/${company.id}`)}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 border-l-4 border-brand-orange text-center"
                >
                  <h3 className="text-xl font-bold mb-2">{company.name}</h3>
                  <p className="text-gray-600">Stage: {company.stage}</p>
                  <p className="text-gray-600">Industry: {company.industry}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
