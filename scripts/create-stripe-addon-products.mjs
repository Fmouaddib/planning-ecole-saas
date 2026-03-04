/**
 * Create Stripe Products + Prices for all addon_plans, then update Supabase DB.
 * Run once: node scripts/create-stripe-addon-products.mjs
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const STRIPE_SECRET_KEY = process.argv[2] || process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('Usage: node scripts/create-stripe-addon-products.mjs <sk_test_...>');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const SUPABASE_URL = 'https://rfmaombcwjxeiwanchdh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// We'll use the anon key + direct SQL isn't possible, so we'll output SQL instead if no service role key
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbWFvbWJjd2p4ZWl3YW5jaGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTgzMDUsImV4cCI6MjA4NzUzNDMwNX0.Gm6a2cgjniDWfMPmtWjSMjL1abumZN4v0wtukwq2RNs';

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

const sqlStatements = [];

console.log('Creating Stripe Products + Prices for 12 addon plans...\n');

for (const addon of addons) {
  try {
    // Create Stripe Product
    const product = await stripe.products.create({
      name: `AntiPlanning - ${addon.name}`,
      metadata: { addon_slug: addon.slug, source: 'planning-ecole-saas' },
    });
    console.log(`✓ Product: ${product.name} (${product.id})`);

    // Create Monthly Price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: addon.priceMonthly,
      currency: 'eur',
      recurring: { interval: 'month' },
      metadata: { addon_slug: addon.slug, cycle: 'monthly' },
    });
    console.log(`  ✓ Monthly: ${addon.priceMonthly / 100}€/mois (${monthlyPrice.id})`);

    // Create Yearly Price
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: addon.priceYearly,
      currency: 'eur',
      recurring: { interval: 'year' },
      metadata: { addon_slug: addon.slug, cycle: 'yearly' },
    });
    console.log(`  ✓ Yearly: ${addon.priceYearly / 100}€/an (${yearlyPrice.id})`);

    sqlStatements.push(
      `UPDATE addon_plans SET stripe_product_id = '${product.id}', stripe_price_id_monthly = '${monthlyPrice.id}', stripe_price_id_yearly = '${yearlyPrice.id}' WHERE slug = '${addon.slug}';`
    );

    console.log('');
  } catch (err) {
    console.error(`✗ Error for ${addon.slug}:`, err.message);
  }
}

console.log('\n========== SQL to update addon_plans ==========\n');
console.log(sqlStatements.join('\n'));
console.log('\n================================================\n');

// Output the combined SQL for easy copy-paste or direct execution
const combinedSQL = sqlStatements.join('\n');

// Write SQL to file for reference
import { writeFileSync } from 'fs';
writeFileSync('scripts/update-addon-stripe-ids.sql', combinedSQL);
console.log('SQL saved to scripts/update-addon-stripe-ids.sql');
