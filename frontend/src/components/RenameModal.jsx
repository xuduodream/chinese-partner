import React, { useState, useEffect } from 'react';

const RenameModal = ({
  isOpen,
  onClose,
  onRename,
  currentName,
  validateName,
  title = "Rename",
  itemType = "Item"
}) => {
  const [newName, setNewName] = useState('');
  const [validation, setValidation] = useState({ valid: true, message: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName || '');
      setValidation({ valid: true, message: '' });
    }
  }, [isOpen, currentName]);

  useEffect(() => {
    if (isOpen && newName !== currentName) {
      // Debounced validation
      const timeoutId = setTimeout(() => {
        if (validateName) {
          const result = validateName(newName);
          setValidation(result);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [newName, currentName, isOpen, validateName]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validation.valid) return;

    setIsLoading(true);
    try {
      const result = await onRename(newName.trim());
      if (result.success) {
        onClose();
      } else {
        setValidation({ valid: false, message: result.message });
      }
    } catch (error) {
      setValidation({ valid: false, message: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (e) => {
    setNewName(e.target.value);
  };

  const isValid = validation.valid && newName.trim() !== '' && newName.trim() !== currentName;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="rename-input">{itemType} Name:</label>
            <input
              id="rename-input"
              type="text"
              value={newName}
              onChange={handleNameChange}
              placeholder={`Enter new ${itemType.toLowerCase()} name`}
              autoFocus
              disabled={isLoading}
            />

            {newName.trim() === currentName && newName.trim() !== '' && (
              <div className="info-message">
                Name is the same as current
              </div>
            )}

            {!validation.valid && (
              <div className="error-message">
                {validation.message}
              </div>
            )}

            {validation.valid && newName.trim() !== '' && newName.trim() !== currentName && (
              <div className="success-message">
                ✓ Name is available
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-btn"
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameModal;