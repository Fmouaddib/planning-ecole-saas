// Types pour l'espace Super-Admin

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  currency: string;
  max_users: number;
  max_sessions: number;
  max_rooms: number;
  max_programs: number;
  max_students: number;
  features: string[];
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  stripe_product_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CenterSubscription {
  id: string;
  center_id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'cancelled' | 'trialing' | 'expired';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  trial_ends_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;

  // Relations
  plan?: SubscriptionPlan;
  center?: {
    id: string;
    name: string;
    acronym?: string;
    email?: string;
  };
}

export interface BillingEvent {
  id: string;
  center_id?: string;
  subscription_id?: string;
  event_type: string;
  amount?: number;
  currency: string;
  stripe_event_id?: string;
  stripe_invoice_id?: string;
  description?: string;
  metadata: Record<string, unknown>;
  created_at: string;

  // Relations
  center?: {
    id: string;
    name: string;
    acronym?: string;
  };
}

export interface AuditLogEntry {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  created_at: string;

  // Relations
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface SuperAdminDashboardStats {
  totalCenters: number;
  activeCenters: number;
  totalUsers: number;
  activeUsers: number;
  mrr: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  recentActivity: AuditLogEntry[];
  mrrHistory: { month: string; amount: number }[];
}

export interface SuperAdminUserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'trainer' | 'coordinator' | 'staff' | 'super_admin' | 'student';
  phone?: string;
  avatar_url?: string;
  center_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Relations
  center?: {
    id: string;
    name: string;
  };
}

export interface SuperAdminCenter {
  id: string;
  name: string;
  acronym?: string;
  address?: string;
  address_line_2?: string;
  postal_code?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  enrollment_code?: string;
  settings: Record<string, unknown>;
  stripe_customer_id?: string;
  owner_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Relations
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
  subscription?: CenterSubscription;
  _count?: {
    users: number;
    sessions: number;
    rooms: number;
    programs: number;
  };
}

// Types pour les formulaires
export interface CreatePlanData {
  name: string;
  slug: string;
  description?: string;
  price_monthly: number;
  price_yearly?: number;
  max_users: number;
  max_sessions: number;
  max_rooms: number;
  max_programs: number;
  max_students: number;
  features: string[];
}

export interface CreateCenterData {
  name: string;
  acronym?: string;
  address?: string;
  address_line_2?: string;
  postal_code?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  owner_id?: string;
  is_active?: boolean;
}

export interface CreateUserData {
  email: string;
  full_name: string;
  role: 'admin' | 'trainer' | 'coordinator' | 'staff' | 'super_admin' | 'student';
  phone?: string;
  center_id?: string;
  password?: string;
  send_invitation?: boolean;
}

export interface CreateCenterWithAdminData extends CreateCenterData {
  admin_email?: string;
  admin_full_name?: string;
  admin_phone?: string;
  admin_password?: string;
  send_admin_invitation?: boolean;
}

export interface AssignPlanData {
  center_id: string;
  plan_id: string;
  billing_cycle: 'monthly' | 'yearly';
  max_students?: number;
}

// ==================== ADDON SYSTEM ====================

export interface AddonPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  addon_type: 'email' | 'teacher' | 'student';
  quota_value: number;
  price_monthly: number;
  price_yearly?: number;
  currency: string;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  stripe_product_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CenterAddon {
  id: string;
  center_id: string;
  addon_plan_id: string;
  quantity: number;
  status: 'active' | 'cancelled' | 'past_due' | 'pending';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
  stripe_subscription_id?: string;
  stripe_item_id?: string;
  created_at: string;
  updated_at: string;

  // Relations (populated via JOIN)
  addon_plan?: AddonPlan;
  center?: {
    id: string;
    name: string;
    acronym?: string;
  };
}

export interface CreateAddonPlanData {
  name: string;
  slug: string;
  description?: string;
  addon_type: 'email' | 'teacher' | 'student';
  quota_value: number;
  price_monthly: number;
  price_yearly?: number;
}

export interface AssignAddonData {
  center_id: string;
  addon_plan_id: string;
  quantity: number;
  billing_cycle: 'monthly' | 'yearly';
}
