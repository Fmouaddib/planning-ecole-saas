interface SADateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const SADateRangePicker = ({
  startDate, endDate, onStartDateChange, onEndDateChange,
}: SADateRangePickerProps) => {
  const today = new Date().toISOString().slice(0, 10);

  const setQuickRange = (days: number | 'today' | 'month') => {
    const end = new Date();
    let start: Date;

    if (days === 'today') {
      start = new Date();
      onStartDateChange(today);
      onEndDateChange(today + 'T23:59:59');
      return;
    }

    if (days === 'month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else {
      start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    }

    onStartDateChange(start.toISOString().slice(0, 10));
    onEndDateChange(end.toISOString().slice(0, 10) + 'T23:59:59');
  };

  const clearDates = () => {
    onStartDateChange('');
    onEndDateChange('');
  };

  return (
    <div className="sa-date-range">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="date"
          className="sa-form-input"
          style={{ width: '160px', padding: '8px 10px', fontSize: '0.8rem' }}
          value={startDate ? startDate.slice(0, 10) : ''}
          onChange={(e) => onStartDateChange(e.target.value)}
          max={today}
        />
        <span style={{ color: 'var(--color-gray-400)', fontSize: '0.8rem' }}>a</span>
        <input
          type="date"
          className="sa-form-input"
          style={{ width: '160px', padding: '8px 10px', fontSize: '0.8rem' }}
          value={endDate ? endDate.slice(0, 10) : ''}
          onChange={(e) => onEndDateChange(e.target.value + 'T23:59:59')}
          max={today}
        />
        {(startDate || endDate) && (
          <button
            className="sa-btn sa-btn-secondary"
            onClick={clearDates}
            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
          >
            Effacer
          </button>
        )}
      </div>
      <div className="sa-quick-dates">
        <button className="sa-filter-btn" onClick={() => setQuickRange('today')} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
          Aujourd'hui
        </button>
        <button className="sa-filter-btn" onClick={() => setQuickRange(7)} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
          7 jours
        </button>
        <button className="sa-filter-btn" onClick={() => setQuickRange(30)} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
          30 jours
        </button>
        <button className="sa-filter-btn" onClick={() => setQuickRange('month')} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
          Ce mois
        </button>
      </div>
    </div>
  );
};
