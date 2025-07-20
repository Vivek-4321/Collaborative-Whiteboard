import React from 'react';
import './Toolbar.css';

const Toolbar = ({ 
  color, 
  strokeWidth, 
  onColorChange, 
  onStrokeWidthChange, 
  onClearCanvas,
  userCount,
  roomId 
}) => {
  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#dc3545' },
    { name: 'Blue', value: '#007bff' },
    { name: 'Green', value: '#28a745' }
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <div className="room-info">
          <span className="room-code">Room: {roomId}</span>
          <span className="user-count">{userCount} user{userCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="toolbar-section">
        <label className="toolbar-label">Color</label>
        <div className="color-picker">
          {colors.map((colorOption) => (
            <button
              key={colorOption.value}
              className={`color-button ${color === colorOption.value ? 'active' : ''}`}
              style={{ backgroundColor: colorOption.value }}
              onClick={() => onColorChange(colorOption.value)}
              title={colorOption.name}
              aria-label={`Select ${colorOption.name} color`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <label className="toolbar-label">
          Stroke Width: {strokeWidth}px
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => onStrokeWidthChange(parseInt(e.target.value))}
          className="stroke-slider"
        />
        <div className="stroke-preview">
          <div
            className="stroke-preview-line"
            style={{
              height: `${strokeWidth}px`,
              backgroundColor: color
            }}
          />
        </div>
      </div>

      <div className="toolbar-section">
        <button
          onClick={onClearCanvas}
          className="clear-button"
          title="Clear canvas"
        >
          Clear Canvas
        </button>
      </div>
    </div>
  );
};

export default Toolbar;