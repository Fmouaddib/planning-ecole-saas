/**
 * Create ALL Stripe Products + Prices in LIVE mode for subscription plans + addons.
 * Run: node scripts/create-stripe-live-products.mjs sk_live_...
 *
 * Outputs SQL to update Supabase tables with the new IDs.
 */
import Stripe from 'stripe';
import { writeFileSync } from 'fs';

const STRIPE_SECRET_KEY = process.argv[2] || process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('Usage: node scripts/create-stripe-live-products.mjs <sk_live_...>');
  process.exit(1);
}

if (!STRIPE_SECRET_KEY.startsWith('sk_live_')) {
  console.error('⚠️  WARNING: This key does not start with sk_live_. Are you sure this is a live key?');
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// ── Subscription Plans ──────────────────────────────────────
const plans = [
  { slug: 'pro', name: 'AntiPlanning - École', priceMonthly: 9900, priceYearly: 99000 },
  { slug: 'ecole-en-ligne', name: 'AntiPlanning - École en ligne', priceMonthly: 6900, priceYearly: 69000 },
  { slug: 'enterprise', name: 'AntiPlanning - Enterprise', priceMonthly: 19900, priceYearly: 142800 },
];

// ── Addon Plans ─────────────────────────────────────────────
const addons = [
  { slug: 'email-25', name: 'Pack Email 25', priceMonthly: 990, priceYearly: 9900 },
  { slug: 'email-50', name: 'Pack Email 50', priceMonthly: 1490, priceYearly: 14900 },
  { slug: 'email-200', name: 'Pack Email 200', priceMonthly: 1990, priceYearly: 19900 },
  { slug: 'teacher-5', name: 'Pack Profs +5', priceMonthly: 990, priceYearly: 9900 },
  { slug: 'teacher-15', name: 'Pack Profs +15', priceMonthly: 1990, priceYearly: 19900 },
  { slug: 'teacher-30', name: 'Pack Profs +30', priceMonthly: 2990, priceYearly: 29900 },
  { slug: 'student-50', name: 'Pack Étudiants +50', priceMonthly: 990, priceYearly: 9900 },
  { slug: 'student-150', name: 'Pack Étudiants +150', priceMonthly: 1990, priceYearly: 19900 },
  { slug: 'student-500', name: 'Pack Étudiants +500', priceMonthly: 2990, priceYearly: 29900 },
  { slug: 'attendance-basic', name: 'Suivi Présences', priceMonthly: 1990, priceYearly: 19900 },
  { slug: 'grades-basic', name: 'Notes & Bulletins', priceMonthly: 2490, priceYearly: 24900 },
  { slug: 'pedagogy-bundle', name: 'Pack Pédagogique', priceMonthly: 3990, priceYearly: 39900 },
];

const planSQL = [];
const addonSQL = [];

async function createProduct(item, table) {
  const product = await stripe.products.create({
    name: `AntiPlanning - ${item.name}`,
    metadata: { slug: item.slug, source: 'planning-ecole-saas', mode: 'live' },
  });
  console.log(`✓ Product: ${product.name} (${product.id})`);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: item.priceMonthly,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { slug: item.slug, cycle: 'monthly' },
  });
  console.log(`  ✓ Monthly: ${item.priceMonthly / 100}€/mois (${monthlyPrice.id})`);

  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: item.priceYearly,
    currency: 'eur',
    recurring: { interval: 'year' },
    metadata: { slug: item.slug, cycle: 'yearly' },
  });
  console.log(`  ✓ Yearly: ${item.priceYearly / 100}€/an (${yearlyPrice.id})\n`);

  return `UPDATE ${table} SET stripe_product_id = '${product.id}', stripe_price_id_monthly = '${monthlyPrice.id}', stripe_price_id_yearly = '${yearlyPrice.id}' WHERE slug = '${item.slug}';`;
}

console.log('═══════════════════════════════════════════════');
console.log('  Creating LIVE Stripe Products + Prices');
console.log('═══════════════════════════════════════════════\n');

console.log('── Subscription Plans ──\n');
for (const plan of plans) {
  try {
    const sql = await createProduct(plan, 'subscription_plans');
    planSQL.push(sql);
  } catch (err) {
    console.error(`✗ Error for ${plan.slug}:`, err.message);
  }
}

console.log('── Addon Plans ──\n');
for (const addon of addons) {
  try {
    const sql = await createProduct(addon, 'addon_plans');
    addonSQL.push(sql);
  } catch (err) {
    console.error(`✗ Error for ${addon.slug}:`, err.message);
  }
}

const allSQL = [...planSQL, '', ...addonSQL].join('\n');
console.log('\n═══════ SQL to run in Supabase ═══════\n');
console.log(allSQL);
console.log('\n══════════════════════════════════════\n');

writeFileSync('scripts/update-stripe-live-ids.sql', allSQL);
console.log('✓ SQL saved to scripts/update-stripe-live-ids.sql');
