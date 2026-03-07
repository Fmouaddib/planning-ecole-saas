/**
 * MockStore — couche de persistance localStorage pour le mode demo.
 * Chaque collection (users, centers, plans, subscriptions, billing, audit)
 * est stockee dans localStorage et toutes les operations CRUD mutent le store.
 */

import type {
  SuperAdminUserProfile,
  SuperAdminCenter,
  SubscriptionPlan,
  CenterSubscription,
  BillingEvent,
  AuditLogEntry,
  AddonPlan,
  CenterAddon,
  AssignAddonData,
} from '@/types/super-admin';

const PREFIX = 'sa_mock_';
const VERSION_KEY = `${PREFIX}version`;
const CURRENT_VERSION = '4';

// ──────────── Generic helpers ────────────

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(data));
}

// ──────────── Seed data ────────────

function seedUsers(): SuperAdminUserProfile[] {
  return [
    { id: 'u1', email: 'admin@formapro.fr', full_name: 'Marie Dupont', role: 'admin', is_active: true, center_id: 'c1', created_at: '2025-06-15T10:00:00Z', updated_at: '2025-06-15T10:00:00Z', center: { id: 'c1', name: 'FormaPro Paris' } },
    { id: 'u2', email: 'formateur@formapro.fr', full_name: 'Jean Martin', role: 'trainer', is_active: true, center_id: 'c1', created_at: '2025-07-01T10:00:00Z', updated_at: '2025-07-01T10:00:00Z', center: { id: 'c1', name: 'FormaPro Paris' } },
    { id: 'u3', email: 'admin@techskills.fr', full_name: 'Sophie Bernard', role: 'admin', is_active: true, center_id: 'c2', created_at: '2025-08-10T10:00:00Z', updated_at: '2025-08-10T10:00:00Z', center: { id: 'c2', name: 'TechSkills Lyon' } },
    { id: 'u4', email: 'coord@formapro.fr', full_name: 'Pierre Durand', role: 'coordinator', is_active: false, center_id: 'c1', created_at: '2025-05-20T10:00:00Z', updated_at: '2025-05-20T10:00:00Z', center: { id: 'c1', name: 'FormaPro Paris' } },
    { id: 'u5', email: 'staff@techskills.fr', full_name: 'Luc Moreau', role: 'staff', is_active: true, center_id: 'c2', created_at: '2025-09-01T10:00:00Z', updated_at: '2025-09-01T10:00:00Z', center: { id: 'c2', name: 'TechSkills Lyon' } },
    { id: 'u6', email: 'superadmin@antiplanning.com', full_name: 'Super Admin', role: 'super_admin', is_active: true, created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:00:00Z' },
  ];
}

function seedPlans(): SubscriptionPlan[] {
  return [
    { id: 'p1', name: 'Free', slug: 'free', description: 'Pour decouvrir AntiPlanning', price_monthly: 0, price_yearly: 0, currency: 'EUR', max_users: 3, max_sessions: 20, max_rooms: 2, max_programs: 3, max_students: 0, features: ['Tableau de bord', 'Gestion sessions', 'Export CSV'], has_chat: false, is_active: true, sort_order: 1, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    { id: 'p2', name: 'Pro', slug: 'pro', description: 'Pour les centres en croissance', price_monthly: 99, price_yearly: 990, currency: 'EUR', max_users: 15, max_sessions: 200, max_rooms: 10, max_programs: 25, max_students: 0, features: ['Tout Free', 'Integration Zoom', 'Emails automatiques', 'Paiements Stripe', 'Support prioritaire'], has_chat: true, is_active: true, sort_order: 2, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
    { id: 'p3', name: 'Enterprise', slug: 'enterprise', description: 'Pour les grands centres', price_monthly: 149, price_yearly: 1490, currency: 'EUR', max_users: -1, max_sessions: -1, max_rooms: -1, max_programs: -1, max_students: 100, features: ['Tout Pro', 'Utilisateurs illimites', 'Sessions illimitees', 'Comptes etudiants', 'API access', 'SSO', 'Support dedie'], has_chat: true, is_active: true, sort_order: 3, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  ];
}

function seedCenters(): SuperAdminCenter[] {
  const plans = seedPlans();
  return [
    {
      id: 'c1', name: 'FormaPro Paris', address: '123 Avenue des Champs-Elysees, Paris',
      email: 'contact@formapro-paris.fr', phone: '01 23 45 67 89', is_active: true, settings: {},
      created_at: '2025-03-15T10:00:00Z', updated_at: '2025-03-15T10:00:00Z',
      _count: { users: 12, sessions: 45, rooms: 4, programs: 6 },
      subscription: { id: 's1', center_id: 'c1', plan_id: 'p2', status: 'active', billing_cycle: 'monthly', cancel_at_period_end: false, created_at: '', updated_at: '', current_period_start: '2026-02-01T00:00:00Z', current_period_end: '2026-03-01T00:00:00Z', plan: plans[1] },
    },
    {
      id: 'c2', name: 'TechSkills Lyon', address: '456 Rue de la Republique, Lyon',
      email: 'info@techskills-lyon.fr', phone: '04 56 78 90 12', is_active: true, settings: {},
      created_at: '2025-05-20T10:00:00Z', updated_at: '2025-05-20T10:00:00Z',
      _count: { users: 8, sessions: 23, rooms: 3, programs: 4 },
      subscription: { id: 's2', center_id: 'c2', plan_id: 'p1', status: 'active', billing_cycle: 'monthly', cancel_at_period_end: false, created_at: '', updated_at: '', current_period_start: '2026-02-01T00:00:00Z', current_period_end: '2026-03-01T00:00:00Z', plan: plans[0] },
    },
    {
      id: 'c3', name: 'DigiLearn Marseille', address: '789 La Canebiere, Marseille',
      email: 'hello@digilearn.fr', is_active: false, settings: {},
      created_at: '2025-07-01T10:00:00Z', updated_at: '2025-07-01T10:00:00Z',
      _count: { users: 3, sessions: 5, rooms: 1, programs: 2 },
    },
  ];
}

function seedSubscriptions(): CenterSubscription[] {
  const plans = seedPlans();
  return [
    { id: 's1', center_id: 'c1', plan_id: 'p2', status: 'active', billing_cycle: 'monthly', current_period_start: '2026-02-01T00:00:00Z', current_period_end: '2026-03-01T00:00:00Z', cancel_at_period_end: false, created_at: '2025-06-15T10:00:00Z', updated_at: '2026-02-01T00:00:00Z', plan: plans[1], center: { id: 'c1', name: 'FormaPro Paris', email: 'contact@formapro-paris.fr' } },
    { id: 's2', center_id: 'c2', plan_id: 'p1', status: 'active', billing_cycle: 'monthly', current_period_start: '2026-02-01T00:00:00Z', current_period_end: '2026-03-01T00:00:00Z', cancel_at_period_end: false, created_at: '2025-08-10T10:00:00Z', updated_at: '2026-02-01T00:00:00Z', plan: plans[0], center: { id: 'c2', name: 'TechSkills Lyon', email: 'info@techskills-lyon.fr' } },
  ];
}

function seedBilling(): BillingEvent[] {
  return [
    { id: 'b1', center_id: 'c1', event_type: 'invoice.paid', amount: 99, currency: 'EUR', description: 'Facture Pro - Fevrier 2026', metadata: {}, created_at: '2026-02-15T10:00:00Z', center: { id: 'c1', name: 'FormaPro Paris' } },
    { id: 'b2', center_id: 'c1', event_type: 'invoice.paid', amount: 99, currency: 'EUR', description: 'Facture Pro - Janvier 2026', metadata: {}, created_at: '2026-01-15T10:00:00Z', center: { id: 'c1', name: 'FormaPro Paris' } },
  ];
}

function seedAudit(): AuditLogEntry[] {
  const now = Date.now();
  return [
    { id: 'a1', user_email: 'admin@formapro.fr', action: 'user.login', entity_type: 'auth', details: { ip: '192.168.1.1' }, created_at: new Date(now - 300000).toISOString() },
    { id: 'a2', user_email: 'superadmin@antiplanning.com', action: 'center.created', entity_type: 'center', entity_id: 'c3', details: { name: 'DigiLearn Marseille' }, created_at: new Date(now - 3600000).toISOString() },
    { id: 'a3', user_email: 'superadmin@antiplanning.com', action: 'subscription.activated', entity_type: 'subscription', entity_id: 's1', details: { plan: 'Pro', center: 'FormaPro Paris' }, created_at: new Date(now - 7200000).toISOString() },
    { id: 'a4', user_email: 'admin@techskills.fr', action: 'user.login', entity_type: 'auth', details: { ip: '10.0.0.5' }, created_at: new Date(now - 14400000).toISOString() },
    { id: 'a5', user_email: 'superadmin@antiplanning.com', action: 'user.updated', entity_type: 'user', entity_id: 'u4', details: { field: 'is_active', value: false }, created_at: new Date(now - 28800000).toISOString() },
    { id: 'a6', user_email: 'formateur@formapro.fr', action: 'session.created', entity_type: 'session', details: { title: 'Excel Avance - Groupe B' }, created_at: new Date(now - 43200000).toISOString() },
    { id: 'a7', user_email: 'superadmin@antiplanning.com', action: 'plan.updated', entity_type: 'plan', entity_id: 'p2', details: { field: 'price_monthly', old: 39, new: 49 }, created_at: new Date(now - 86400000).toISOString() },
    { id: 'a8', user_email: 'admin@formapro.fr', action: 'user.login', entity_type: 'auth', details: {}, created_at: new Date(now - 172800000).toISOString() },
  ];
}

function seedAddonPlans(): AddonPlan[] {
  const now = new Date().toISOString();
  return [
    { id: 'ap1', name: 'Pack Email 25', slug: 'email-25', description: '25 emails/jour supplémentaires', addon_type: 'email', quota_value: 25, price_monthly: 9.90, price_yearly: 99, currency: 'EUR', is_active: true, sort_order: 1, created_at: now, updated_at: now },
    { id: 'ap2', name: 'Pack Email 50', slug: 'email-50', description: '50 emails/jour supplémentaires', addon_type: 'email', quota_value: 50, price_monthly: 14.90, price_yearly: 149, currency: 'EUR', is_active: true, sort_order: 2, created_at: now, updated_at: now },
    { id: 'ap3', name: 'Pack Email 200', slug: 'email-200', description: '200 emails/jour supplémentaires', addon_type: 'email', quota_value: 200, price_monthly: 19.90, price_yearly: 199, currency: 'EUR', is_active: true, sort_order: 3, created_at: now, updated_at: now },
    { id: 'ap4', name: 'Pack Profs +5', slug: 'teacher-5', description: '+5 enseignants supplémentaires', addon_type: 'teacher', quota_value: 5, price_monthly: 9.90, price_yearly: 99, currency: 'EUR', is_active: true, sort_order: 4, created_at: now, updated_at: now },
    { id: 'ap5', name: 'Pack Profs +15', slug: 'teacher-15', description: '+15 enseignants supplémentaires', addon_type: 'teacher', quota_value: 15, price_monthly: 19.90, price_yearly: 199, currency: 'EUR', is_active: true, sort_order: 5, created_at: now, updated_at: now },
    { id: 'ap6', name: 'Pack Profs +30', slug: 'teacher-30', description: '+30 enseignants supplémentaires', addon_type: 'teacher', quota_value: 30, price_monthly: 29.90, price_yearly: 299, currency: 'EUR', is_active: true, sort_order: 6, created_at: now, updated_at: now },
    { id: 'ap7', name: 'Pack Étudiants +50', slug: 'student-50', description: '+50 étudiants supplémentaires', addon_type: 'student', quota_value: 50, price_monthly: 9.90, price_yearly: 99, currency: 'EUR', is_active: true, sort_order: 7, created_at: now, updated_at: now },
    { id: 'ap8', name: 'Pack Étudiants +150', slug: 'student-150', description: '+150 étudiants supplémentaires', addon_type: 'student', quota_value: 150, price_monthly: 19.90, price_yearly: 199, currency: 'EUR', is_active: true, sort_order: 8, created_at: now, updated_at: now },
    { id: 'ap9', name: 'Pack Étudiants +500', slug: 'student-500', description: '+500 étudiants supplémentaires', addon_type: 'student', quota_value: 500, price_monthly: 29.90, price_yearly: 299, currency: 'EUR', is_active: true, sort_order: 9, created_at: now, updated_at: now },
    { id: 'ap10', name: 'Suivi Présences', slug: 'attendance-basic', description: 'Module suivi présences/absences', addon_type: 'attendance', quota_value: 1, price_monthly: 19.90, price_yearly: 199, currency: 'EUR', is_active: true, sort_order: 10, created_at: now, updated_at: now },
    { id: 'ap11', name: 'Notes & Bulletins', slug: 'grades-basic', description: 'Module notes et évaluations', addon_type: 'grades', quota_value: 1, price_monthly: 24.90, price_yearly: 249, currency: 'EUR', is_active: true, sort_order: 11, created_at: now, updated_at: now },
    { id: 'ap12', name: 'Pack Pédagogique', slug: 'pedagogy-bundle', description: 'Présences + Notes combinés', addon_type: 'attendance', quota_value: 1, price_monthly: 39.90, price_yearly: 399, currency: 'EUR', is_active: true, sort_order: 12, created_at: now, updated_at: now },
  ];
}

// ──────────── Init: seed si premiere visite ou version changee ────────────

function initStore(): void {
  const version = localStorage.getItem(VERSION_KEY);
  if (version === CURRENT_VERSION) return; // deja initialise

  save('users', seedUsers());
  save('centers', seedCenters());
  save('plans', seedPlans());
  save('subscriptions', seedSubscriptions());
  save('billing', seedBilling());
  save('audit', seedAudit());
  save('addonPlans', seedAddonPlans());
  save('centerAddons', []);
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
}

// Auto-init
initStore();

// ──────────── Public API ────────────

function uid(): string { return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export const MockStore = {
  // ── Users ──
  getUsers(search?: string): SuperAdminUserProfile[] {
    let users = load<SuperAdminUserProfile>('users');
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u => u.full_name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    return users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addUser(u: Omit<SuperAdminUserProfile, 'id' | 'created_at' | 'updated_at'>): SuperAdminUserProfile {
    const users = load<SuperAdminUserProfile>('users');
    const now = new Date().toISOString();
    const newUser: SuperAdminUserProfile = { ...u, id: uid(), created_at: now, updated_at: now };
    users.unshift(newUser);
    save('users', users);
    return newUser;
  },
  updateUser(id: string, data: Partial<SuperAdminUserProfile>): SuperAdminUserProfile | null {
    const users = load<SuperAdminUserProfile>('users');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...data, updated_at: new Date().toISOString() };
    save('users', users);
    return users[idx];
  },
  deleteUser(id: string): void {
    save('users', load<SuperAdminUserProfile>('users').filter(u => u.id !== id));
  },

  // ── Centers ──
  getCenters(search?: string): SuperAdminCenter[] {
    let centers = load<SuperAdminCenter>('centers');
    if (search) {
      const s = search.toLowerCase();
      centers = centers.filter(c => c.name.toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s));
    }
    // Enrich with current subscription data
    const subs = load<CenterSubscription>('subscriptions');
    centers = centers.map(c => {
      const sub = subs.find(s => s.center_id === c.id && s.status === 'active');
      return { ...c, subscription: sub || c.subscription };
    });
    return centers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addCenter(data: Partial<SuperAdminCenter>): SuperAdminCenter {
    const centers = load<SuperAdminCenter>('centers');
    const now = new Date().toISOString();
    const c: SuperAdminCenter = {
      id: uid(), name: data.name || '', address: data.address, phone: data.phone,
      email: data.email, website: data.website, owner_id: data.owner_id,
      is_active: true, settings: {}, created_at: now, updated_at: now,
      _count: { users: 0, sessions: 0, rooms: 0, programs: 0 },
    };
    centers.unshift(c);
    save('centers', centers);
    return c;
  },
  updateCenter(id: string, data: Partial<SuperAdminCenter>): SuperAdminCenter | null {
    const centers = load<SuperAdminCenter>('centers');
    const idx = centers.findIndex(c => c.id === id);
    if (idx === -1) return null;
    centers[idx] = { ...centers[idx], ...data, updated_at: new Date().toISOString() };
    save('centers', centers);
    return centers[idx];
  },
  deleteCenter(id: string): void {
    save('centers', load<SuperAdminCenter>('centers').filter(c => c.id !== id));
    // Also remove related subscriptions
    save('subscriptions', load<CenterSubscription>('subscriptions').filter(s => s.center_id !== id));
  },

  // ── Plans ──
  getPlans(): SubscriptionPlan[] {
    return load<SubscriptionPlan>('plans').sort((a, b) => a.sort_order - b.sort_order);
  },
  addPlan(data: Partial<SubscriptionPlan>): SubscriptionPlan {
    const plans = load<SubscriptionPlan>('plans');
    const now = new Date().toISOString();
    const p: SubscriptionPlan = {
      id: uid(), name: data.name || '', slug: data.slug || '', description: data.description,
      price_monthly: data.price_monthly || 0, price_yearly: data.price_yearly, currency: 'EUR',
      max_users: data.max_users || 5, max_sessions: data.max_sessions || 50,
      max_rooms: data.max_rooms || 5, max_programs: data.max_programs || 10,
      max_students: data.max_students || 0, features: data.features || [],
      has_chat: data.has_chat ?? false,
      is_active: true, sort_order: plans.length + 1, created_at: now, updated_at: now,
    };
    plans.push(p);
    save('plans', plans);
    return p;
  },
  updatePlan(id: string, data: Partial<SubscriptionPlan>): SubscriptionPlan | null {
    const plans = load<SubscriptionPlan>('plans');
    const idx = plans.findIndex(p => p.id === id);
    if (idx === -1) return null;
    plans[idx] = { ...plans[idx], ...data, updated_at: new Date().toISOString() };
    save('plans', plans);
    return plans[idx];
  },
  deletePlan(id: string): void {
    save('plans', load<SubscriptionPlan>('plans').filter(p => p.id !== id));
  },

  // ── Subscriptions ──
  getSubscriptions(): CenterSubscription[] {
    const subs = load<CenterSubscription>('subscriptions');
    const plans = load<SubscriptionPlan>('plans');
    const centers = load<SuperAdminCenter>('centers');
    return subs.map(s => ({
      ...s,
      plan: s.plan || plans.find(p => p.id === s.plan_id),
      center: s.center || (() => { const c = centers.find(c => c.id === s.center_id); return c ? { id: c.id, name: c.name, email: c.email } : undefined; })(),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addSubscription(data: Partial<CenterSubscription>): CenterSubscription {
    const subs = load<CenterSubscription>('subscriptions');
    const plans = load<SubscriptionPlan>('plans');
    const centers = load<SuperAdminCenter>('centers');
    const now = new Date();
    const periodEnd = new Date(now);
    if (data.billing_cycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const plan = plans.find(p => p.id === data.plan_id);
    const center = centers.find(c => c.id === data.center_id);

    const sub: CenterSubscription = {
      id: uid(), center_id: data.center_id || '', plan_id: data.plan_id || '',
      status: 'active', billing_cycle: data.billing_cycle || 'monthly',
      current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false, created_at: now.toISOString(), updated_at: now.toISOString(),
      plan: plan, center: center ? { id: center.id, name: center.name, email: center.email } : undefined,
    };

    // Remove existing active sub for this center
    const filtered = subs.filter(s => !(s.center_id === data.center_id && s.status === 'active'));
    filtered.unshift(sub);
    save('subscriptions', filtered);
    return sub;
  },
  updateSubscription(id: string, data: Partial<CenterSubscription>): CenterSubscription | null {
    const subs = load<CenterSubscription>('subscriptions');
    const plans = load<SubscriptionPlan>('plans');
    const idx = subs.findIndex(s => s.id === id);
    if (idx === -1) return null;
    subs[idx] = { ...subs[idx], ...data, updated_at: new Date().toISOString() };
    if (data.plan_id) subs[idx].plan = plans.find(p => p.id === data.plan_id);
    save('subscriptions', subs);
    return subs[idx];
  },
  cancelSubscription(id: string): void {
    const subs = load<CenterSubscription>('subscriptions');
    const idx = subs.findIndex(s => s.id === id);
    if (idx !== -1) {
      subs[idx] = { ...subs[idx], status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_at_period_end: true, updated_at: new Date().toISOString() };
      save('subscriptions', subs);
    }
  },

  // ── Billing ──
  getBilling(centerId?: string): BillingEvent[] {
    let events = load<BillingEvent>('billing');
    if (centerId) events = events.filter(e => e.center_id === centerId);
    return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addBillingEvent(data: Partial<BillingEvent>): void {
    const events = load<BillingEvent>('billing');
    events.unshift({ id: uid(), currency: 'EUR', metadata: {}, created_at: new Date().toISOString(), ...data } as BillingEvent);
    save('billing', events);
  },

  // ── Audit ──
  getAudit(filters?: { action?: string; startDate?: string; endDate?: string }): AuditLogEntry[] {
    let entries = load<AuditLogEntry>('audit');
    if (filters?.action) entries = entries.filter(e => e.action === filters.action);
    if (filters?.startDate) entries = entries.filter(e => e.created_at >= filters.startDate!);
    if (filters?.endDate) entries = entries.filter(e => e.created_at <= filters.endDate!);
    return entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addAuditEntry(data: Partial<AuditLogEntry>): void {
    const entries = load<AuditLogEntry>('audit');
    entries.unshift({ id: uid(), details: {}, created_at: new Date().toISOString(), ...data } as AuditLogEntry);
    save('audit', entries);
  },

  // ── Dashboard Stats (derives des donnees stockees) ──
  getStats() {
    const centers = load<SuperAdminCenter>('centers');
    const users = load<SuperAdminUserProfile>('users');
    const subs = load<CenterSubscription>('subscriptions');
    const plans = load<SubscriptionPlan>('plans');
    const audit = load<AuditLogEntry>('audit');

    const activeSubs = subs.filter(s => s.status === 'active');
    let mrr = 0;
    let paidCount = 0;
    for (const s of activeSubs) {
      const plan = plans.find(p => p.id === s.plan_id);
      const price = plan?.price_monthly || 0;
      mrr += price;
      if (price > 0) paidCount++;
    }

    return {
      totalCenters: centers.length,
      activeCenters: centers.filter(c => c.is_active).length,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      mrr,
      activeSubscriptions: paidCount,
      totalSubscriptions: activeSubs.length,
      recentActivity: audit.slice(0, 10),
      mrrHistory: [],
    };
  },

  // ── Addon Plans ──
  getAddonPlans(): AddonPlan[] {
    return load<AddonPlan>('addonPlans').sort((a, b) => a.sort_order - b.sort_order);
  },
  addAddonPlan(data: Partial<AddonPlan>): AddonPlan {
    const plans = load<AddonPlan>('addonPlans');
    const now = new Date().toISOString();
    const p: AddonPlan = {
      id: uid(), name: data.name || '', slug: data.slug || '', description: data.description,
      addon_type: data.addon_type || 'email', quota_value: data.quota_value || 0,
      price_monthly: data.price_monthly || 0, price_yearly: data.price_yearly, currency: 'EUR',
      is_active: true, sort_order: plans.length + 1, created_at: now, updated_at: now,
    };
    plans.push(p);
    save('addonPlans', plans);
    return p;
  },
  updateAddonPlan(id: string, data: Partial<AddonPlan>): AddonPlan | null {
    const plans = load<AddonPlan>('addonPlans');
    const idx = plans.findIndex(p => p.id === id);
    if (idx === -1) return null;
    plans[idx] = { ...plans[idx], ...data, updated_at: new Date().toISOString() };
    save('addonPlans', plans);
    return plans[idx];
  },
  deleteAddonPlan(id: string): void {
    save('addonPlans', load<AddonPlan>('addonPlans').filter(p => p.id !== id));
  },

  // ── Center Addons ──
  getCenterAddons(centerId?: string): CenterAddon[] {
    let addons = load<CenterAddon>('centerAddons');
    if (centerId) addons = addons.filter(a => a.center_id === centerId);
    const plans = load<AddonPlan>('addonPlans');
    const centers = load<SuperAdminCenter>('centers');
    return addons.map(a => ({
      ...a,
      addon_plan: a.addon_plan || plans.find(p => p.id === a.addon_plan_id),
      center: a.center || (() => { const c = centers.find(c => c.id === a.center_id); return c ? { id: c.id, name: c.name, acronym: c.acronym } : undefined; })(),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addCenterAddon(data: AssignAddonData): CenterAddon {
    const addons = load<CenterAddon>('centerAddons');
    const plans = load<AddonPlan>('addonPlans');
    const centers = load<SuperAdminCenter>('centers');
    const now = new Date();
    const periodEnd = new Date(now);
    if (data.billing_cycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const plan = plans.find(p => p.id === data.addon_plan_id);
    const center = centers.find(c => c.id === data.center_id);

    const addon: CenterAddon = {
      id: uid(), center_id: data.center_id, addon_plan_id: data.addon_plan_id,
      quantity: data.quantity, status: 'active', billing_cycle: data.billing_cycle,
      current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false, created_at: now.toISOString(), updated_at: now.toISOString(),
      addon_plan: plan, center: center ? { id: center.id, name: center.name, acronym: center.acronym } : undefined,
    };
    addons.unshift(addon);
    save('centerAddons', addons);
    return addon;
  },
  updateCenterAddon(id: string, data: Partial<CenterAddon>): CenterAddon | null {
    const addons = load<CenterAddon>('centerAddons');
    const idx = addons.findIndex(a => a.id === id);
    if (idx === -1) return null;
    addons[idx] = { ...addons[idx], ...data, updated_at: new Date().toISOString() };
    save('centerAddons', addons);
    return addons[idx];
  },
  cancelCenterAddon(id: string): void {
    const addons = load<CenterAddon>('centerAddons');
    const idx = addons.findIndex(a => a.id === id);
    if (idx !== -1) {
      addons[idx] = { ...addons[idx], status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_at_period_end: true, updated_at: new Date().toISOString() };
      save('centerAddons', addons);
    }
  },

  /** Reset complet du store (utile pour debug) */
  reset(): void {
    localStorage.removeItem(VERSION_KEY);
    ['users', 'centers', 'plans', 'subscriptions', 'billing', 'audit', 'addonPlans', 'centerAddons'].forEach(k => localStorage.removeItem(`${PREFIX}${k}`));
    initStore();
  },
};
