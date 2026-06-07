import React from 'react';

const ProgressBar = ({ current, total, accuracy, className = '' }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={`progress-container ${className}`}>
      <div className="progress-header">
        <span className="progress-text">{current} / {total} cards</span>
        {accuracy !== undefined && (
          <span className="accuracy-text">Accuracy: {accuracy}%</span>
        )}
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const StudyStats = ({ stats, className = '' }) => {
  const { total, studied, correct, streak = 0 } = stats;
  const accuracy = studied > 0 ? Math.round((correct / studied) * 100) : 0;

  return (
    <div className={`study-stats ${className}`}>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{studied}</div>
          <div className="stat-label">Studied</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{accuracy}%</div>
          <div className="stat-label">Accuracy</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{streak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{total - studied}</div>
          <div className="stat-label">Remaining</div>
        </div>
      </div>
      <ProgressBar
        current={studied}
        total={total}
        accuracy={accuracy}
        className="session-progress"
      />
    </div>
  );
};

export { ProgressBar, StudyStats };
export default ProgressBar;