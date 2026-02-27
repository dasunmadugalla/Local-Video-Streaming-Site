// ../components/TagModal.jsx
import React, { useMemo, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

const TagModal = ({
  titleInput,
  setTitleInput,
  tagCategories,
  tagInputs,
  setTagInputs,
  removeTag,
  onSave,
  onClose,
  showTitle = true,
  modalTitle = '',
  showThumbnail = false,
  thumbnailInput = '',
  setThumbnailInput = () => {}
}) => {
  const [activeCategory, setActiveCategory] = useState(null);

  const categorySuggestions = useMemo(() => {
    const suggestionMap = {};

    Object.keys(tagCategories).forEach((category) => {
      const allCategoryTags = Object.keys(tagCategories[category] || {})
        .sort((a, b) => a.localeCompare(b));

      const selectedTags = new Set(tagInputs[category] || []);
      const filterValue = (tagInputs[`${category}_input`] || '').trim().toLowerCase();

      suggestionMap[category] = allCategoryTags.filter((tag) => {
        if (selectedTags.has(tag)) return false;
        if (!filterValue) return true;
        return tag.toLowerCase().includes(filterValue);
      });
    });

    return suggestionMap;
  }, [tagCategories, tagInputs]);

  const handleSuggestionPick = (category, tag) => {
    const existingTags = tagInputs[category] || [];
    if (existingTags.includes(tag)) return;

    setTagInputs({
      ...tagInputs,
      [category]: [...existingTags, tag],
      [`${category}_input`]: ''
    });
  };

  return (
    <div className="videoTitleModal">
      {modalTitle ? <h3>{modalTitle}</h3> : null}

    {showTitle && (
      <>
        <label>Title:</label>
        <input
          type="text"
          placeholder="Enter Video Title"
          value={titleInput}
          onChange={e => setTitleInput(e.target.value)}
        />
      </>
    )}


    {showThumbnail && (
      <>
        <label>Thumbnail:</label>
        <input
          type="text"
          placeholder="Enter thumbnail path"
          value={thumbnailInput}
          onChange={e => setThumbnailInput(e.target.value)}
        />
      </>
    )}

      {Object.keys(tagCategories).map(cat => (
        <div key={cat} className="tagInputWrapper">
          <label>{cat}</label>
          <div className="tagBox">
            {(tagInputs[cat] || []).map((tag, index) => (
              <span key={index} className="tagBubble">
                {tag}
                <FaTimes className="removeTag" onClick={() => removeTag(cat, index)} />
              </span>
            ))}
            <input
              type="text"
              placeholder={`Add ${cat} tag`}
              value={tagInputs[`${cat}_input`] || ''}
              onFocus={() => setActiveCategory(cat)}
              onBlur={() => {
                setTimeout(() => {
                  setActiveCategory((current) => (current === cat ? null : current));
                }, 100);
              }}
              onChange={e => setTagInputs({ ...tagInputs, [`${cat}_input`]: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const newTag = e.target.value.trim();
                  const existingTags = tagInputs[cat] || [];
                  if (!existingTags.includes(newTag)) {
                    setTagInputs({
                      ...tagInputs,
                      [cat]: [...existingTags, newTag],
                      [`${cat}_input`]: ''
                    });
                  } else {
                    setTagInputs({ ...tagInputs, [`${cat}_input`]: '' });
                  }
                }
              }}
            />
          </div>

          {activeCategory === cat && categorySuggestions[cat] && categorySuggestions[cat].length > 0 && (
            <div className="tagSuggestions" role="listbox" aria-label={`${cat} suggestions`}>
              {categorySuggestions[cat].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="tagSuggestionItem"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSuggestionPick(cat, tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

    <div className="buttons">
      <button className='btn classic cancel' onClick={onClose}>Cancel</button>
      <button className='btn submit' onClick={onSave}>Save</button>
    </div>
    </div>
  );
};

export default TagModal;
