import { useMemo } from 'react';

interface SADateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

type QuickRange = 'today' | 7 | 30 | 'month';

export const SADateRangePicker = ({
  startDate, endDate, onStartDateChange, onEndDateChange,
}: SADateRangePickerProps) => {
  const today = new Date().toISOString().slice(0, 10);

  const activeRange = useMemo((): QuickRange | null => {
    if (!startDate || !endDate) return null;
    const s = startDate.slice(0, 10);
    const e = endDate.slice(0, 10);
    if (s === today && e === today) return 'today';
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    if (s === monthStart && e === today) return 'month';
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (s === d7 && e === today) return 7;
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (s === d30 && e === today) return 30;
    return null;
  }, [startDate, endDate, today]);

  const setQuickRange = (days: QuickRange) => {
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

  const quickButtons: { label: string; value: QuickRange }[] = [
    { label: "Aujourd'hui", value: 'today' },
    { label: '7 jours', value: 7 },
    { label: '30 jours', value: 30 },
    { label: 'Ce mois', value: 'month' },
  ];

  return (
    <div className="sa-date-range">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="date"
          className="sa-form-input sa-date-input"
          value={startDate ? startDate.slice(0, 10) : ''}
          onChange={(e) => onStartDateChange(e.target.value)}
          max={today}
        />
        <span className="sa-text-muted" style={{ fontSize: '0.8rem' }}>à</span>
        <input
          type="date"
          className="sa-form-input sa-date-input"
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
        {quickButtons.map((btn) => (
          <button
            key={btn.label}
            className={`sa-filter-btn ${activeRange === btn.value ? 'active' : ''}`}
            onClick={() => setQuickRange(btn.value)}
            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};
