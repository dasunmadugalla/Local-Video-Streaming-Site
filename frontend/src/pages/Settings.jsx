import React, { useEffect, useState, useContext } from 'react';
import { API_BASE } from '../utils/api';
import { FileContext } from '../components/FileContext';
import { FaRegTrashAlt  } from "react-icons/fa";
import '../styling/Settings.css';

function Settings() {
  const [folders, setFolders] = useState([]);
  const [newPath, setNewPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // get context setter so we can clear the shuffled cache after changes
  const { setShuffledCache } = useContext(FileContext);

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

  const addFolder = (pathToAdd) => {
    const raw = (pathToAdd ?? newPath ?? '').trim();
    if (!raw) {
      setMessage('Enter folder path first.');
      return;
    }

    setMessage('');
    setSaving(true);

    fetch(`${API_BASE}/api/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: raw })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add folder');
        setNewPath('');
        setMessage('Folder added successfully.');
        fetchFolders();
      })
      .catch(err => {
        console.error(err);
        setMessage(err.message || 'Add failed.');
      })
      .finally(() => setSaving(false));
  };

  // Toggle active by clicking row
  const toggleActive = (id) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
  };

  const deleteFolder = (id) => {
    if (!window.confirm('Remove this folder from the list?')) return;
    fetch(`${API_BASE}/api/folders/${id}`, { method: 'DELETE' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Delete failed');
        setMessage('Folder removed.');
        fetchFolders();
      })
      .catch(err => {
        console.error(err);
        setMessage(err.message || 'Delete failed.');
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

        // 1) Clear client-side shuffled cache so FileList will re-fetch fresh list
        try { setShuffledCache([]); } catch (e) { /* ignore if undefined */ }

        // 2) Broadcast an update so any other tabs/components will re-fetch as well
        try {
          const bc = new BroadcastChannel('app_updates');
          bc.postMessage({ type: 'foldersChanged' });
          bc.close();
        } catch (e) {
          // older browsers may fail; it's fine
        }

        setMessage('Applied.');
        setSaving(false);
        fetchFolders();
      })
      .catch(err => {
        console.error(err);
        setMessage(err.message || 'Save failed.');
        setSaving(false);
      });
  };

  const handleRowKeyDown = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleActive(id);
    }
  };

  return (
    <div className="mainContainer settings-container">
      <h2>Settings — Folders</h2>

      <div className="settings-intro">
        <p>
          Add server folders that contain videos. Type or paste a path like <code>C:\Videos\Movies</code>, then click Add.
        </p>
        <p className="settings-tip">
          Tip: in Windows Explorer you can right-click a folder → <strong>Copy as path</strong>, then paste it into the input.
        </p>
      </div>

      <div className="settings-input-area">
        <div className="settings-input-row">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="Enter full folder path (e.g. C:\Videos\Movies)"
            className="settings-input"
          />
          <button
            className="btn classic settings-add-btn"
            onClick={() => addFolder()}
            disabled={saving}
          >
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>

        {message && <div className="settings-message">{message}</div>}
      </div>

      <div className="folders-panel">
        {loading ? (
          <div className="loading-text">Loading folders...</div>
        ) : (
          <>
            {folders.length === 0 ? (
              <div className="no-folders">No folders configured.</div>
            ) : (
              <div className="folders-list">
                {folders.map(f => {
                  const rowClass = f.active ? 'folder-row active' : 'folder-row';
                  return (
                    <div
                      key={f.id}
                      className={rowClass}
                      role="button"
                      aria-pressed={!!f.active}
                      tabIndex={0}
                      onClick={() => toggleActive(f.id)}
                      onKeyDown={(e) => handleRowKeyDown(e, f.id)}
                    >
                      <div className="folder-main">
                        <div className="folder-name">{f.name}</div>
                        <div className="folder-path">{f.path}</div>
                      </div>

                      <div className="folder-meta">
                        <div className="folder-count">{typeof f.count === 'number' ? `${f.count} video${f.count === 1 ? '' : 's'}` : '-'}</div>
                        <div className="folder-size">{typeof f.formattedSize === 'string' ? f.formattedSize : '-'}</div>
                      </div>

                      <button
                        className="btn folder-remove trash"
                        onClick={(e) => { e.stopPropagation(); deleteFolder(f.id); }}
                        aria-label={`Remove folder ${f.name}`}
                      >
                        <FaRegTrashAlt  />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="settings-actions">
        <button className="btn submit" onClick={saveActive} disabled={saving}>
          {saving ? 'Saving...' : 'Save & Apply'}
        </button>
        <button className="btn classic" onClick={fetchFolders}>Refresh</button>
      </div>
    </div>
  );
}

export default Settings;
