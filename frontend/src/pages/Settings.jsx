// src/pages/Settings.jsx
import React, { useEffect, useState } from 'react';
import { API_BASE } from '../utils/api';

function Settings() {
  const [folders, setFolders] = useState([]);
  const [newPath, setNewPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchFolders = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/folders`)
      .then(res => res.json())
      .then(data => {
        setFolders(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load folders', err);
        setFolders([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const addFolder = () => {
    const trimmed = (newPath || '').trim();
    if (!trimmed) return setMessage('Enter a folder path first');
    setMessage('');
    fetch(`${API_BASE}/api/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: trimmed })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add folder');
        setNewPath('');
        fetchFolders();
        setMessage('Folder added');
      })
      .catch(err => {
        console.error(err);
        setMessage(err.message || 'Add failed');
      });
  };

  const toggleActive = (id) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
  };

  const deleteFolder = (id) => {
    if (!window.confirm('Remove this folder from the list?')) return;
    fetch(`${API_BASE}/api/folders/${id}`, { method: 'DELETE' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Delete failed');
        fetchFolders();
      })
      .catch(err => {
        console.error(err);
        setMessage(err.message || 'Delete failed');
      });
  };

  const saveActive = () => {
    setSaving(true);
    const activeIds = folders.filter(f => f.active).map(f => f.id);
    fetch(`${API_BASE}/api/folders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeIds })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Save failed');
        setMessage('Applied');
        setSaving(false);
        fetchFolders();
      })
      .catch(err => {
        console.error(err);
        setMessage(err.message || 'Save failed');
        setSaving(false);
      });
  };

  return (
    <div className="mainContainer">
      <h2>Settings — Folders</h2>

      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: 0 }}>Add folder paths that contain videos. Each folder's path will be displayed under the name to avoid confusion.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={newPath}
          onChange={e => setNewPath(e.target.value)}
          placeholder="Enter full folder path (e.g. D:\\Videos\\Movies)"
          style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.6)', color: 'white' }}
        />
        <button className="btn classic" onClick={addFolder}>Add</button>
      </div>

      {message && <div style={{ marginBottom: 12, color: 'var(--secondary_color)' }}>{message}</div>}

      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
        {loading ? (
          <div>Loading folders...</div>
        ) : (
          <>
            {folders.length === 0 ? <div>No folders configured.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {folders.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.2)' }}>
                    <input type="checkbox" checked={!!f.active} onChange={() => toggleActive(f.id)} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{f.name}</div>
                      <div style={{ color: 'var(--progress_grey)', fontSize: 12, marginTop: 2 }}>{f.path}</div>
                    </div>
                    <div style={{ color: 'var(--progress_grey)', fontSize: 13 }}>{f.count ?? '-'}</div>
                    <button className="btn classic" onClick={() => deleteFolder(f.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button className="btn submit" onClick={saveActive} disabled={saving}>{saving ? 'Saving...' : 'Save & Apply'}</button>
        <button className="btn classic" onClick={fetchFolders}>Refresh</button>
      </div>
    </div>
  );
}

export default Settings;
