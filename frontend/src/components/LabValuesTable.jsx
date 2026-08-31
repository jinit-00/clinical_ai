import React from 'react';
import './LabValuesTable.css';

/**
 * LabValuesTable Component
 * Renders parsed bloodwork items with sage (normal) & terracotta (borderline/critical) flag badges.
 */
export const LabValuesTable = ({ labs = [] }) => {
  if (!labs || labs.length === 0) {
    return <div className="no-labs-text">No bloodwork values parsed yet.</div>;
  }

  return (
    <div className="lab-table-container">
      <table className="lab-table">
        <thead>
          <tr>
            <th>Biomarker Test</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Reference Range</th>
            <th>Category</th>
            <th>Flag Status</th>
          </tr>
        </thead>
        <tbody>
          {labs.map((item, idx) => {
            const isNormal = item.flag === 'normal';
            const flagClass = isNormal ? 'flag-normal' : 'flag-alert';

            return (
              <tr key={idx} className={isNormal ? '' : 'row-alert'}>
                <td className="test-name-cell">
                  <strong>{item.test_name}</strong>
                </td>
                <td className="value-cell">
                  <span className={`val-pill ${flagClass}`}>{item.value}</span>
                </td>
                <td className="unit-cell">{item.unit || '-'}</td>
                <td className="range-cell">{item.reference_range}</td>
                <td className="category-cell">{item.category || 'General'}</td>
                <td className="flag-cell">
                  <span className={`flag-badge ${flagClass}`}>
                    {item.flag_label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LabValuesTable;
