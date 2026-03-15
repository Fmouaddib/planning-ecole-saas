import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SADateRangePicker } from '@/components/super-admin/components/SADateRangePicker';

interface ErrorLogEntry {
  id: string;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  user_id: string | null;
  center_id: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
  // enriched
  user_email?: string;
  center_name?: string;
}

const PAGE_SIZE = 50;

export const SAErrorsPage = () => {
  const [entries, setEntries] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  const fetchErrors = useCallback(async () => {
    try {
      let query = supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        query = query.lt('created_at', end.toISOString());
      }
      if (searchQuery.trim()) {
        query = query.ilike('message', `%${searchQuery.trim()}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[SAErrorsPage] fetch error:', error.message);
        return;
      }

      if (count !== null) setTotalCount(count);

      // Enrich with user emails and center names
      const enriched = await enrichEntries(data || []);
      setEntries(enriched);
    } catch (err) {
      console.error('[SAErrorsPage] unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, searchQuery, page]);

  useEffect(() => {
    setLoading(true);
    fetchErrors();
  }, [fetchErrors]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchErrors, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchErrors]);

  const handleClearOld = async () => {
    if (!confirm('Supprimer les erreurs de plus de 7 jours ?')) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    await supabase.from('error_logs').delete().lt('created_at', cutoff.toISOString());
    fetchErrors();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Journal d'erreurs
            </h1>
            <p className="text-sm text-neutral-500">
              {totalCount} erreur{totalCount !== 1 ? 's' : ''} enregistree{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={() => { setLoading(true); fetchErrors(); }}
            className="sa-btn sa-btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            onClick={handleClearOld}
            className="sa-btn sa-btn-secondary flex items-center gap-2 text-red-600 dark:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            Purger (+7j)
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Recherche</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Filtrer par message..."
            className="sa-input w-full"
          />
        </div>
        <SADateRangePicker
          startDate={dateFrom}
          endDate={dateTo}
          onStartDateChange={(v: string) => { setDateFrom(v); setPage(0); }}
          onEndDateChange={(v: string) => { setDateTo(v); setPage(0); }}
        />
      </div>

      {/* Table */}
      <div className="sa-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e74c3c]"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center p-12 text-neutral-500">
            Aucune erreur enregistree. Bonne nouvelle !
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 text-left">
                  <th className="px-4 py-3 font-medium text-neutral-500 w-8"></th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Date</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Message</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">URL</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Utilisateur</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Centre</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <ErrorRow
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="sa-btn sa-btn-secondary text-sm disabled:opacity-40"
          >
            Precedent
          </button>
          <span className="text-sm text-neutral-500">
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="sa-btn sa-btn-secondary text-sm disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
};

// --- Error row component ---

function ErrorRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: ErrorLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const date = new Date(entry.created_at);
  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const shortUrl = entry.url ? entry.url.replace(/^https?:\/\/[^/]+/, '') : '-';

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3 text-neutral-400">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
          <div>{dateStr}</div>
          <div className="text-xs text-neutral-400">{timeStr}</div>
        </td>
        <td className="px-4 py-3 max-w-xs">
          <div className="truncate text-neutral-900 dark:text-neutral-100 font-medium">
            {entry.message}
          </div>
          {entry.context?.component != null && (
            <div className="text-xs text-neutral-400 mt-0.5">
              {String(entry.context.component)}
            </div>
          )}
        </td>
        <td className="px-4 py-3 max-w-[200px]">
          <div className="truncate text-neutral-500 text-xs" title={entry.url || ''}>
            {shortUrl}
          </div>
        </td>
        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
          {entry.user_email || (entry.user_id ? entry.user_id.slice(0, 8) + '...' : '-')}
        </td>
        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
          {entry.center_name || (entry.center_id ? entry.center_id.slice(0, 8) + '...' : '-')}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-neutral-50 dark:bg-neutral-900">
          <td colSpan={6} className="px-6 py-4">
            <div className="space-y-3 text-xs font-mono">
              {entry.stack && (
                <div>
                  <div className="font-sans font-semibold text-neutral-500 mb-1">Stack trace</div>
                  <pre className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 overflow-auto max-h-60 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                    {entry.stack}
                  </pre>
                </div>
              )}
              {entry.context && Object.keys(entry.context).length > 0 && (
                <div>
                  <div className="font-sans font-semibold text-neutral-500 mb-1">Contexte</div>
                  <pre className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                    {JSON.stringify(entry.context, null, 2)}
                  </pre>
                </div>
              )}
              {entry.user_agent && (
                <div>
                  <div className="font-sans font-semibold text-neutral-500 mb-1">User Agent</div>
                  <div className="text-neutral-600 dark:text-neutral-400">{entry.user_agent}</div>
                </div>
              )}
              <div className="flex gap-6 text-neutral-500 font-sans">
                <span>ID: {entry.id}</span>
                {entry.user_id && <span>User ID: {entry.user_id}</span>}
                {entry.center_id && <span>Center ID: {entry.center_id}</span>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// --- Enrichment helpers ---

async function enrichEntries(entries: ErrorLogEntry[]): Promise<ErrorLogEntry[]> {
  if (entries.length === 0) return [];

  const userIds = [...new Set(entries.map(e => e.user_id).filter(Boolean))] as string[];
  const centerIds = [...new Set(entries.map(e => e.center_id).filter(Boolean))] as string[];

  const profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);
    if (data) {
      for (const p of data) profileMap[p.id] = p.email;
    }
  }

  const centerMap: Record<string, string> = {};
  if (centerIds.length > 0) {
    const { data } = await supabase
      .from('training_centers')
      .select('id, name, acronym')
      .in('id', centerIds);
    if (data) {
      for (const c of data) centerMap[c.id] = c.acronym || c.name;
    }
  }

  return entries.map(e => ({
    ...e,
    user_email: e.user_id ? profileMap[e.user_id] : undefined,
    center_name: e.center_id ? centerMap[e.center_id] : undefined,
  }));
}
