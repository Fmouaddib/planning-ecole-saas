import { useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  LogIn, LogOut, Plus, Pencil, Trash2, Building2, Calendar, Home,
  BookOpen, GraduationCap, Users, BookOpenText, UserCog, CreditCard,
  ClipboardList, Download, ChevronDown, ChevronRight, Search, FileText,
} from 'lucide-react';
import { usePagination } from '@/hooks/usePagination';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { exportToCSV } from '@/utils/csv-export';
import { SAPagination } from '@/components/super-admin/components/SAPagination';
import { SADateRangePicker } from '@/components/super-admin/components/SADateRangePicker';
import { SAAuditService } from '@/services/super-admin/audit';
import { supabase } from '@/lib/supabase';
import type { AuditLogEntry } from '@/types/super-admin';

// -- Enrichissement des entrees avec noms utilisateurs et centres --

async function enrichEntries(entries: AuditLogEntry[]): Promise<AuditLogEntry[]> {
  if (entries.length === 0) return [];

  const userIds = [...new Set(entries.map(e => e.user_id).filter(Boolean))] as string[];
  const entityUserIds = [...new Set(
    entries.filter(e => e.entity_type === 'user' || e.entity_type === 'teacher').map(e => e.entity_id).filter(Boolean)
  )] as string[];
  const allProfileIds = [...new Set([...userIds, ...entityUserIds])];

  const profileMap: Record<string, { full_name: string; email: string; center_id?: string }> = {};
  if (allProfileIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, full_name, email, center_id').in('id', allProfileIds);
    if (data) for (const p of data) profileMap[p.id] = p;
  }

  const centerEntityIds = [...new Set(
    entries.filter(e => e.entity_type === 'center').map(e => e.entity_id).filter(Boolean)
  )] as string[];
  const profileCenterIds = Object.values(profileMap).map(p => p.center_id).filter(Boolean) as string[];
  const allCenterIds = [...new Set([...centerEntityIds, ...profileCenterIds])];

  const centerMap: Record<string, string> = {};
  if (allCenterIds.length > 0) {
    const { data } = await supabase.from('training_centers').select('id, name, acronym').in('id', allCenterIds);
    if (data) for (const c of data) centerMap[c.id] = c.acronym || c.name;
  }

  return entries.map(entry => {
    const profile = entry.user_id ? profileMap[entry.user_id] : undefined;
    const details = (entry.details || {}) as Record<string, unknown>;

    let centerName: string | undefined;
    if (entry.entity_type === 'center' && entry.entity_id && centerMap[entry.entity_id]) {
      centerName = centerMap[entry.entity_id];
    } else if (profile?.center_id && centerMap[profile.center_id]) {
      centerName = centerMap[profile.center_id];
    }

    let targetName: string | undefined;
    if (details.name) targetName = String(details.name);
    else if (details.title) targetName = String(details.title);
    else if (details.email) targetName = String(details.email);
    else if ((entry.entity_type === 'user' || entry.entity_type === 'teacher') && entry.entity_id && profileMap[entry.entity_id]) {
      targetName = profileMap[entry.entity_id].full_name || profileMap[entry.entity_id].email;
    }

    return {
      ...entry,
      details: { ...details, _user_name: profile?.full_name, _center_name: centerName, _target_name: targetName },
    };
  });
}

// -- Action icon/label/color mapping using lucide-react --

interface ActionMeta {
  icon: ReactNode;
  label: string;
  color: string;
}

const ICON_SIZE = 14;

function getActionMeta(action: string): ActionMeta {
  const map: Record<string, ActionMeta> = {
    'user.login':               { icon: <LogIn size={ICON_SIZE} />,        label: 'Connexion',            color: '#6b7280' },
    'user.logout':              { icon: <LogOut size={ICON_SIZE} />,       label: 'Deconnexion',          color: '#6b7280' },
    'user.created':             { icon: <Plus size={ICON_SIZE} />,         label: 'Utilisateur cree',     color: '#16a34a' },
    'user.updated':             { icon: <Pencil size={ICON_SIZE} />,       label: 'Utilisateur modifie',  color: '#2563eb' },
    'user.deleted':             { icon: <Trash2 size={ICON_SIZE} />,       label: 'Utilisateur supprime', color: '#dc2626' },
    'user.bulk_updated':        { icon: <Pencil size={ICON_SIZE} />,       label: 'Maj groupee',          color: '#2563eb' },
    'center.created':           { icon: <Building2 size={ICON_SIZE} />,    label: 'Centre cree',          color: '#16a34a' },
    'center.updated':           { icon: <Pencil size={ICON_SIZE} />,       label: 'Centre modifie',       color: '#2563eb' },
    'center.deleted':           { icon: <Trash2 size={ICON_SIZE} />,       label: 'Centre supprime',      color: '#dc2626' },
    'subscription.activated':   { icon: <CreditCard size={ICON_SIZE} />,   label: 'Abonnement active',    color: '#16a34a' },
    'subscription.updated':     { icon: <Pencil size={ICON_SIZE} />,       label: 'Abonnement modifie',   color: '#2563eb' },
    'subscription.cancelled':   { icon: <Trash2 size={ICON_SIZE} />,       label: 'Abonnement annule',    color: '#dc2626' },
    'session.created':          { icon: <Calendar size={ICON_SIZE} />,     label: 'Session creee',        color: '#16a34a' },
    'session.updated':          { icon: <Pencil size={ICON_SIZE} />,       label: 'Session modifiee',     color: '#2563eb' },
    'session.deleted':          { icon: <Trash2 size={ICON_SIZE} />,       label: 'Session supprimee',    color: '#dc2626' },
    'room.created':             { icon: <Home size={ICON_SIZE} />,         label: 'Salle creee',          color: '#16a34a' },
    'room.updated':             { icon: <Pencil size={ICON_SIZE} />,       label: 'Salle modifiee',       color: '#2563eb' },
    'room.deleted':             { icon: <Trash2 size={ICON_SIZE} />,       label: 'Salle supprimee',      color: '#dc2626' },
    'program.created':          { icon: <BookOpen size={ICON_SIZE} />,     label: 'Programme cree',       color: '#16a34a' },
    'program.updated':          { icon: <Pencil size={ICON_SIZE} />,       label: 'Programme modifie',    color: '#2563eb' },
    'program.deleted':          { icon: <Trash2 size={ICON_SIZE} />,       label: 'Programme supprime',   color: '#dc2626' },
    'diploma.created':          { icon: <GraduationCap size={ICON_SIZE} />,label: 'Diplome cree',         color: '#16a34a' },
    'diploma.updated':          { icon: <Pencil size={ICON_SIZE} />,       label: 'Diplome modifie',      color: '#2563eb' },
    'diploma.deleted':          { icon: <Trash2 size={ICON_SIZE} />,       label: 'Diplome supprime',     color: '#dc2626' },
    'class.created':            { icon: <Users size={ICON_SIZE} />,        label: 'Classe creee',         color: '#16a34a' },
    'class.updated':            { icon: <Pencil size={ICON_SIZE} />,       label: 'Classe modifiee',      color: '#2563eb' },
    'class.deleted':            { icon: <Trash2 size={ICON_SIZE} />,       label: 'Classe supprimee',     color: '#dc2626' },
    'subject.created':          { icon: <BookOpenText size={ICON_SIZE} />, label: 'Matiere creee',        color: '#16a34a' },
    'subject.updated':          { icon: <Pencil size={ICON_SIZE} />,       label: 'Matiere modifiee',     color: '#2563eb' },
    'subject.deleted':          { icon: <Trash2 size={ICON_SIZE} />,       label: 'Matiere supprimee',    color: '#dc2626' },
    'teacher.created':          { icon: <UserCog size={ICON_SIZE} />,      label: 'Professeur ajoute',    color: '#16a34a' },
    'teacher.updated':          { icon: <Pencil size={ICON_SIZE} />,       label: 'Professeur modifie',   color: '#2563eb' },
    'teacher.deleted':          { icon: <Trash2 size={ICON_SIZE} />,       label: 'Professeur retire',    color: '#dc2626' },
    'plan.created':             { icon: <Plus size={ICON_SIZE} />,         label: 'Plan cree',            color: '#16a34a' },
    'plan.updated':             { icon: <Pencil size={ICON_SIZE} />,       label: 'Plan modifie',         color: '#2563eb' },
    'plan.deleted':             { icon: <Trash2 size={ICON_SIZE} />,       label: 'Plan supprime',        color: '#dc2626' },
    'booking.created':          { icon: <Calendar size={ICON_SIZE} />,     label: 'Reservation creee',    color: '#16a34a' },
    'booking.updated':          { icon: <Pencil size={ICON_SIZE} />,       label: 'Reservation modifiee', color: '#2563eb' },
    'booking.deleted':          { icon: <Trash2 size={ICON_SIZE} />,       label: 'Reservation supprimee', color: '#dc2626' },
  };

  return map[action] || { icon: <ClipboardList size={ICON_SIZE} />, label: action, color: '#6b7280' };
}

// -- Labels and filter groups --

const ENTITY_LABELS: Record<string, string> = {
  user: 'Utilisateur', center: 'Centre', subscription: 'Abonnement', session: 'Session',
  room: 'Salle', program: 'Programme', diploma: 'Diplome', class: 'Classe',
  subject: 'Matiere', teacher: 'Professeur', plan: 'Plan', booking: 'Reservation',
};

const FILTER_GROUPS = [
  { label: 'Toutes', value: '' },
  { label: 'Connexions', value: 'user.login' },
  { label: 'Utilisateurs', value: 'user.' },
  { label: 'Centres', value: 'center.' },
  { label: 'Abonnements', value: 'subscription.' },
  { label: 'Sessions', value: 'session.' },
  { label: 'Salles', value: 'room.' },
  { label: 'Academique', value: 'academic' },
  { label: 'Plans', value: 'plan.' },
];

const ACADEMIC_PREFIXES = ['program.', 'diploma.', 'class.', 'subject.', 'teacher.'];

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getActionLabel(action: string): string {
  return getActionMeta(action).label;
}

// -- Component --

export const SAAuditPage = () => {
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [enrichedEntries, setEnrichedEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch audit data
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      const filters: Record<string, string> = {};
      if (actionFilter && !actionFilter.endsWith('.') && actionFilter !== 'academic') filters.action = actionFilter;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const data = await SAAuditService.getAuditLog(
        Object.keys(filters).length > 0 ? filters as { action?: string; startDate?: string; endDate?: string } : undefined
      );
      if (cancelled) return;

      const enriched = await enrichEntries(data);
      if (cancelled) return;
      setEnrichedEntries(enriched);
      setIsLoading(false);
    };
    fetchData();
    return () => { cancelled = true; };
  }, [actionFilter, startDate, endDate]);

  // Filter entries
  const filteredEntries = enrichedEntries.filter(entry => {
    // Action prefix filter
    if (actionFilter && actionFilter.endsWith('.') && actionFilter !== 'academic') {
      if (!entry.action.startsWith(actionFilter)) return false;
    }
    if (actionFilter === 'academic') {
      if (!ACADEMIC_PREFIXES.some(p => entry.action.startsWith(p))) return false;
    }

    // Text search
    if (searchText) {
      const s = searchText.toLowerCase();
      const d = entry.details || {};
      const userName = (d._user_name as string) || '';
      const centerName = (d._center_name as string) || '';
      const targetName = (d._target_name as string) || '';
      const match = (entry.user_email || '').toLowerCase().includes(s) ||
        userName.toLowerCase().includes(s) ||
        centerName.toLowerCase().includes(s) ||
        targetName.toLowerCase().includes(s) ||
        entry.action.toLowerCase().includes(s);
      if (!match) return false;
    }

    return true;
  });

  const {
    page, totalPages, totalItems, pageSize, paginatedData,
    canNext, canPrev, nextPage, prevPage, setPageSize,
  } = usePagination(filteredEntries, { initialPageSize: 25 });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeAllModals = useCallback(() => {
    setExpandedRows(new Set());
  }, []);

  useEscapeKey(closeAllModals);

  const handleExportCSV = () => {
    exportToCSV(filteredEntries, [
      { header: 'Date', accessor: (e) => formatDate(e.created_at) },
      { header: 'Utilisateur', accessor: (e) => (e.details as Record<string, unknown>)?._user_name as string || e.user_email || 'Systeme' },
      { header: 'Action', accessor: (e) => getActionLabel(e.action) },
      { header: 'Detail', accessor: (e) => (e.details as Record<string, unknown>)?._target_name as string || '' },
      { header: 'Centre', accessor: (e) => (e.details as Record<string, unknown>)?._center_name as string || '' },
      { header: 'Entite', accessor: (e) => ENTITY_LABELS[e.entity_type || ''] || e.entity_type || '' },
    ], 'audit');
  };

  const renderDetails = (entry: AuditLogEntry) => {
    if (!entry.details || Object.keys(entry.details).length === 0) return null;
    const publicDetails = Object.entries(entry.details).filter(([key]) => !key.startsWith('_'));
    if (publicDetails.length === 0) return null;
    const isExpanded = expandedRows.has(entry.id);

    return (
      <>
        <button
          className="sa-btn sa-btn-secondary"
          style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          onClick={() => toggleRow(entry.id)}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {isExpanded ? 'Masquer' : 'Details'}
        </button>
        {isExpanded && (
          <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--sa-bg-subtle)', borderRadius: '6px', fontSize: '0.8rem' }}>
            {publicDetails.map(([key, value]) => (
              <div key={key} style={{ display: 'flex', gap: '8px', padding: '3px 0', borderBottom: '1px solid var(--sa-border-light)' }}>
                <span style={{ fontWeight: 600, color: 'var(--sa-text-secondary)', minWidth: '80px' }}>{key}</span>
                <span style={{ color: 'var(--sa-text-primary)' }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="p-6">
      <div className="sa-page-header">
        <div>
          <h1 className="sa-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} />
            Journal d'audit
          </h1>
          <p className="sa-page-subtitle">{filteredEntries.length} action(s) enregistree(s)</p>
        </div>
        <button className="sa-btn sa-btn-secondary" onClick={handleExportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Download size={14} />
          Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        {FILTER_GROUPS.map(f => (
          <button
            key={f.value}
            className={`sa-filter-btn ${actionFilter === f.value ? 'active' : ''}`}
            onClick={() => setActionFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + Date Range */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 250px', minWidth: '200px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--sa-text-secondary)' }} />
          <input
            type="text"
            className="sa-search-input"
            placeholder="Rechercher par nom, email, centre..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%', paddingLeft: '32px' }}
          />
        </div>
        <SADateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* Table */}
      <div className="sa-table-container">
        {isLoading ? (
          <div className="p-8 text-center sa-text-muted">Chargement...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="sa-empty-state">
            <div className="sa-empty-title">Aucune entree dans le journal</div>
            <div className="sa-empty-text">Les actions seront enregistrees automatiquement.</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--sa-border-medium)', textAlign: 'left' }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Utilisateur</th>
                    <th style={thStyle}>Action</th>
                    <th style={thStyle}>Detail</th>
                    <th style={thStyle}>Centre</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((entry) => {
                    const d = (entry.details || {}) as Record<string, unknown>;
                    const userName = (d._user_name as string) || entry.user_email || 'Systeme';
                    const centerName = (d._center_name as string) || '';
                    const targetName = (d._target_name as string) || '';
                    const { icon, label, color } = getActionMeta(entry.action);

                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--sa-border-light)' }}>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: 'var(--sa-text-secondary)', fontSize: '0.8rem' }}>
                          {formatDate(entry.created_at)}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 500, color: 'var(--sa-text-primary)' }}>{userName}</div>
                          {entry.user_email && entry.user_email !== userName && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-secondary)' }}>{entry.user_email}</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 500,
                            background: color + '18', color,
                          }}>
                            {icon}
                            {label}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--sa-text-primary)' }}>
                          {targetName || '\u2014'}
                        </td>
                        <td style={{ ...tdStyle, color: 'var(--sa-text-secondary)' }}>
                          {centerName || '\u2014'}
                        </td>
                        <td style={{ ...tdStyle, maxWidth: '120px' }}>
                          {renderDetails(entry)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <SAPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              canNext={canNext}
              canPrev={canPrev}
              onNext={nextPage}
              onPrev={prevPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px', color: 'var(--sa-text-secondary)', fontWeight: 600,
  fontSize: '0.75rem', textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
};
