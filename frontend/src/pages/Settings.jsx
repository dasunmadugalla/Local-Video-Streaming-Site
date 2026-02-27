import React, { useEffect, useState, useContext } from 'react';
import { API_BASE } from '../utils/api';
import { FileContext } from '../components/FileContext';
import { FaRegTrashAlt  } from "react-icons/fa";
import ScrollToggleButton from '../components/ScrollToggleButton';
import '../styling/Settings.css';

const PREVIEW_TAG_CATEGORIES_KEY = 'previewTagCategories';
const MAX_PREVIEW_TAG_CATEGORIES = 2;

function Settings() {
  const [folders, setFolders] = useState([]);
  const [newPath, setNewPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tagCategories, setTagCategories] = useState({});
  const [selectedPreviewCategories, setSelectedPreviewCategories] = useState([]);
  const [jsonFileName, setJsonFileName] = useState('');
  const [sourceMode, setSourceMode] = useState('fs');

  // get context setter so we can clear the shuffled cache after changes
  const { setShuffledCache } = useContext(FileContext);

  const fetchFolders = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/folders`)
      .then(res => res.json())
      .then(data => {
        const nextFolders = data || [];
        setFolders(nextFolders);

        const hasActiveJson = nextFolders.some((folder) => folder.active && folder.sourceType === 'json');
        setSourceMode(hasActiveJson ? 'json' : 'fs');

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

  useEffect(() => {
    fetch(`${API_BASE}/api/tagCategories`)
      .then((res) => res.json())
      .then((data) => setTagCategories(data || {}))
      .catch(() => setTagCategories({}));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREVIEW_TAG_CATEGORIES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setSelectedPreviewCategories(parsed.slice(0, MAX_PREVIEW_TAG_CATEGORIES));
      }
    } catch {
      setSelectedPreviewCategories([]);
    }
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

  const togglePreviewCategory = (category) => {
    setSelectedPreviewCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }

      if (prev.length >= MAX_PREVIEW_TAG_CATEGORIES) {
        setMessage('You can select up to 2 tag categories for preview display.');
        return prev;
      }

      return [...prev, category];
    });
  };

  const savePreviewTagCategories = () => {
    try {
      localStorage.setItem(PREVIEW_TAG_CATEGORIES_KEY, JSON.stringify(selectedPreviewCategories));

      try {
        const bc = new BroadcastChannel('app_updates');
        bc.postMessage({ type: 'previewTagCategoriesChanged', categories: selectedPreviewCategories });
        bc.close();
      } catch {
        // BroadcastChannel is optional
      }

      window.dispatchEvent(new CustomEvent('preview_tag_categories_changed', {
        detail: selectedPreviewCategories
      }));

      setMessage('Preview tag display settings saved.');
    } catch {
      setMessage('Failed to save preview tag display settings.');
    }
  };

  const handleJsonUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    setJsonFileName(file.name);
    setSaving(true);
    setMessage('');

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);

      const res = await fetch(`${API_BASE}/api/folders/import-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsed })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'JSON import failed');

      try { setShuffledCache([]); } catch { /* ignore */ }

      try {
        const bc = new BroadcastChannel('app_updates');
        bc.postMessage({ type: 'foldersChanged' });
        bc.close();
      } catch {
        // ignore
      }

      window.dispatchEvent(new CustomEvent('app_folders_changed'));

      setMessage(`Imported JSON catalog (${data.totalVideos || 0} videos).`);
      fetchFolders();
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Failed to upload JSON file.');
    } finally {
      setSaving(false);
      event.target.value = '';
    }
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

    const activeIds = folders
      .filter((folder) => {
        if (!folder.active) return false;
        if (sourceMode === 'json') return folder.sourceType === 'json';
        return folder.sourceType !== 'json';
      })
      .map((folder) => folder.id);

    fetch(`${API_BASE}/api/folders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeIds })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Save failed');

        // 1) Clear client-side shuffled cache so FileList will re-fetch fresh list
        try { setShuffledCache([]); } catch { /* ignore if undefined */ }

        // 2) Broadcast an update so any other tabs/components will re-fetch as well
        try {
          const bc = new BroadcastChannel('app_updates');
          bc.postMessage({ type: 'foldersChanged' });
          bc.close();
        } catch {
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

  const categoryNames = Object.keys(tagCategories || {});
  const fsFolders = folders.filter((folder) => folder.sourceType !== 'json');
  const jsonFolders = folders.filter((folder) => folder.sourceType === 'json');
  const visibleFolders = sourceMode === 'json' ? jsonFolders : fsFolders;

  const switchSourceMode = (mode) => {
    setSourceMode(mode);
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


      <div className="settings-preview-tags-panel">
        <h3>Video Preview Tag Display</h3>
        <p className="settings-tip">Select up to 2 categories to show tags under each video preview title.</p>

        {categoryNames.length === 0 ? (
          <div className="no-folders">No tag categories found.</div>
        ) : (
          <div className="settings-category-options">
            {categoryNames.map((category) => {
              const checked = selectedPreviewCategories.includes(category);
              const disabled = !checked && selectedPreviewCategories.length >= MAX_PREVIEW_TAG_CATEGORIES;

              return (
                <label key={category} className={`settings-category-option${disabled ? ' disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => togglePreviewCategory(category)}
                  />
                  <span>{category}</span>
                </label>
              );
            })}
          </div>
        )}

        <button className="btn classic" onClick={savePreviewTagCategories}>Save Preview Tag Display</button>
      </div>

      <div className="folders-panel">
        <div className="source-mode-toggle" role="tablist" aria-label="Folder source mode">
          <button
            type="button"
            className={`btn classic source-mode-btn ${sourceMode === 'fs' ? 'active' : ''}`.trim()}
            onClick={() => switchSourceMode('fs')}
          >
            File System Folders
          </button>
          <button
            type="button"
            className={`btn classic source-mode-btn ${sourceMode === 'json' ? 'active' : ''}`.trim()}
            onClick={() => switchSourceMode('json')}
          >
            JSON Catalog Folders
          </button>
        </div>

        {sourceMode === 'fs' ? (
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
          </div>
        ) : (
          <div className="settings-input-area settings-json-panel-only">
            <div className="settings-json-upload">
              <label className="settings-json-label" htmlFor="catalog-json-upload">
                Upload JSON catalog
              </label>
              <input
                id="catalog-json-upload"
                type="file"
                accept="application/json,.json"
                onChange={handleJsonUpload}
                disabled={saving}
              />
              {jsonFileName && <div className="settings-tip">Last file: {jsonFileName}</div>}
            </div>
          </div>
        )}

        {message && <div className="settings-message">{message}</div>}

        {loading ? (
          <div className="loading-text">Loading folders...</div>
        ) : (
          <>
            {visibleFolders.length === 0 ? (
              <div className="no-folders">
                {sourceMode === 'json' ? 'No JSON catalog folders uploaded.' : 'No file-system folders configured.'}
              </div>
            ) : (
              <div className="folders-list">
                {visibleFolders.map(f => {
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
                        {f.sourceType === 'json' && <div className="folder-path">Source: JSON catalog</div>}
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
                        <FaRegTrashAlt/>
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

      <ScrollToggleButton />
    </div>
  );
}

export default Settings;
