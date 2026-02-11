// ../components/TagModal.jsx
import React from 'react';
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
  modalTitle = ''
}) => (
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
      </div>
    ))}

    <div className="buttons">
      <button className='btn classic cancel' onClick={onClose}>Cancel</button>
      <button className='btn submit' onClick={onSave}>Save</button>
    </div>
  </div>
);

export default TagModal;
