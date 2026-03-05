import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { odooAuthenticate, odooSearchRead } from "./xmlrpc.ts";
import type { OdooConfig } from "./xmlrpc.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function getOdooConfig(
  supabase: ReturnType<typeof createClient>,
  centerId: string
): Promise<OdooConfig> {
  const { data, error } = await supabase
    .from("training_centers")
    .select("settings")
    .eq("id", centerId)
    .single();

  if (error || !data) throw new Error("Center not found");

  const s = data.settings as Record<string, unknown>;
  if (!s?.odoo_url || !s?.odoo_db || !s?.odoo_user || !s?.odoo_api_key) {
    throw new Error("Odoo configuration incomplete — fill in all fields in Settings");
  }

  return {
    url: s.odoo_url as string,
    db: s.odoo_db as string,
    user: s.odoo_user as string,
    apiKey: s.odoo_api_key as string,
  };
}

// ─── Mapping helpers ────────────────────────────────────────────────────────────

async function getMapping(
  supabase: ReturnType<typeof createClient>,
  centerId: string,
  odooModel: string,
  odooId: number
): Promise<string | null> {
  const { data } = await supabase
    .from("odoo_mappings")
    .select("local_id")
    .eq("center_id", centerId)
    .eq("odoo_model", odooModel)
    .eq("odoo_id", odooId)
    .maybeSingle();
  return data?.local_id ?? null;
}

async function upsertMapping(
  supabase: ReturnType<typeof createClient>,
  centerId: string,
  odooModel: string,
  odooId: number,
  localId: string,
  localTable: string
) {
  await supabase.from("odoo_mappings").upsert(
    {
      center_id: centerId,
      odoo_model: odooModel,
      odoo_id: odooId,
      local_id: localId,
      local_table: localTable,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "center_id,odoo_model,odoo_id" }
  );
}

// ─── Sync logic ─────────────────────────────────────────────────────────────────

interface SyncStats {
  subjects_synced: number;
  subjects_created: number;
  students_matched: number;
  students_not_found: number;
  enrollments_synced: number;
  enrollments_created: number;
  errors: string[];
}

async function syncSubjects(
  supabase: ReturnType<typeof createClient>,
  config: OdooConfig,
  uid: number,
  centerId: string,
  stats: SyncStats
) {
  // Fetch all subjects from Odoo (OpenEduCat)
  const odooSubjects = await odooSearchRead(
    config,
    uid,
    "op.subject",
    [],
    ["id", "name", "code"],
  );

  for (const os of odooSubjects) {
    try {
      const odooId = os.id as number;
      const name = os.name as string;
      const code = (os.code as string) || "";

      // Check if mapping already exists
      let localId = await getMapping(supabase, centerId, "op.subject", odooId);

      if (!localId) {
        // Try matching by code
        if (code) {
          const { data: match } = await supabase
            .from("subjects")
            .select("id")
            .eq("center_id", centerId)
            .eq("code", code)
            .maybeSingle();
          if (match) {
            localId = match.id;
            await upsertMapping(supabase, centerId, "op.subject", odooId, localId, "subjects");
          }
        }

        // Try matching by name
        if (!localId) {
          const { data: match } = await supabase
            .from("subjects")
            .select("id")
            .eq("center_id", centerId)
            .eq("name", name)
            .maybeSingle();
          if (match) {
            localId = match.id;
            await upsertMapping(supabase, centerId, "op.subject", odooId, localId, "subjects");
          }
        }

        // Create new subject
        if (!localId) {
          const { data: created, error } = await supabase
            .from("subjects")
            .insert({ name, code: code || null, center_id: centerId })
            .select("id")
            .single();
          if (error) {
            stats.errors.push(`Subject create error (${name}): ${error.message}`);
            continue;
          }
          localId = created.id;
          await upsertMapping(supabase, centerId, "op.subject", odooId, localId, "subjects");
          stats.subjects_created++;
        }
      } else {
        // Mapping exists — update name/code if changed
        await supabase
          .from("subjects")
          .update({ name, code: code || null })
          .eq("id", localId)
          .eq("center_id", centerId);
      }

      stats.subjects_synced++;
    } catch (e) {
      stats.errors.push(`Subject sync error: ${(e as Error).message}`);
    }
  }
}

async function syncStudents(
  supabase: ReturnType<typeof createClient>,
  config: OdooConfig,
  uid: number,
  centerId: string,
  stats: SyncStats
) {
  // Fetch students from Odoo with partner data for email
  const odooStudents = await odooSearchRead(
    config,
    uid,
    "op.student",
    [["active", "=", true]],
    ["id", "name", "partner_id"],
  );

  for (const os of odooStudents) {
    try {
      const odooId = os.id as number;
      // partner_id is Many2one: [id, name] — we need the partner to get email
      const partnerId = Array.isArray(os.partner_id)
        ? (os.partner_id as unknown[])[0] as number
        : null;

      // Check existing mapping
      let localId = await getMapping(supabase, centerId, "op.student", odooId);

      if (!localId && partnerId) {
        // Fetch partner email from Odoo
        const partners = await odooSearchRead(
          config,
          uid,
          "res.partner",
          [["id", "=", partnerId]],
          ["email"],
          1,
        );
        const email = partners[0]?.email as string | undefined;

        if (email) {
          // Match by email in profiles
          const { data: match } = await supabase
            .from("profiles")
            .select("id")
            .eq("center_id", centerId)
            .ilike("email", email)
            .maybeSingle();

          if (match) {
            localId = match.id;
            await upsertMapping(supabase, centerId, "op.student", odooId, localId, "profiles");
            stats.students_matched++;
          } else {
            stats.students_not_found++;
            stats.errors.push(`Student not found: ${os.name} (${email})`);
          }
        } else {
          stats.students_not_found++;
          stats.errors.push(`Student has no email: ${os.name} (Odoo ID ${odooId})`);
        }
      } else if (localId) {
        stats.students_matched++;
      }
    } catch (e) {
      stats.errors.push(`Student sync error: ${(e as Error).message}`);
    }
  }
}

async function syncEnrollments(
  supabase: ReturnType<typeof createClient>,
  config: OdooConfig,
  uid: number,
  centerId: string,
  stats: SyncStats
) {
  // Fetch active student courses from Odoo
  const odooCourses = await odooSearchRead(
    config,
    uid,
    "op.student.course",
    [["state", "=", "running"]],
    ["id", "student_id", "subject_ids"],
  );

  for (const oc of odooCourses) {
    try {
      // student_id is Many2one [id, name]
      const studentOdooId = Array.isArray(oc.student_id)
        ? (oc.student_id as unknown[])[0] as number
        : null;
      // subject_ids is Many2many [id, id, ...]
      const subjectOdooIds = (oc.subject_ids as number[]) || [];

      if (!studentOdooId) continue;

      const studentLocalId = await getMapping(supabase, centerId, "op.student", studentOdooId);
      if (!studentLocalId) continue; // Student not mapped, skip

      for (const subjectOdooId of subjectOdooIds) {
        const subjectLocalId = await getMapping(supabase, centerId, "op.subject", subjectOdooId);
        if (!subjectLocalId) continue; // Subject not mapped, skip

        // Check if enrollment already exists
        const { data: existing } = await supabase
          .from("student_subjects")
          .select("id")
          .eq("student_id", studentLocalId)
          .eq("subject_id", subjectLocalId)
          .eq("center_id", centerId)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase.from("student_subjects").insert({
            student_id: studentLocalId,
            subject_id: subjectLocalId,
            center_id: centerId,
            enrollment_type: "class",
            status: "enrolled",
          });
          if (error) {
            stats.errors.push(`Enrollment error: ${error.message}`);
          } else {
            stats.enrollments_created++;
          }
        }

        stats.enrollments_synced++;
      }
    } catch (e) {
      stats.errors.push(`Enrollment sync error: ${(e as Error).message}`);
    }
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, center_id: bodyCenterId } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    // Resolve center_id: from JWT if present, otherwise from body (cron)
    let centerId = bodyCenterId as string | undefined;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await createClient(
        SUPABASE_URL,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      ).auth.getUser(token);

      if (user) {
        // Get center_id from profile
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("center_id")
          .eq("id", user.id)
          .single();
        if (profile) centerId = profile.center_id;
      }
    }

    if (!centerId) {
      return json({ error: "center_id required" }, 400);
    }

    // ─── ACTION: test ─────────────────────────────────────────────────
    if (action === "test") {
      const config = await getOdooConfig(supabaseAdmin, centerId);
      const uid = await odooAuthenticate(config);
      return json({ success: true, uid, message: `Connected as UID ${uid}` });
    }

    // ─── ACTION: sync ─────────────────────────────────────────────────
    if (action === "sync") {
      const config = await getOdooConfig(supabaseAdmin, centerId);
      const uid = await odooAuthenticate(config);

      // Create log entry
      const { data: logEntry } = await supabaseAdmin
        .from("odoo_sync_logs")
        .insert({
          center_id: centerId,
          status: "running",
          triggered_by: authHeader ? "manual" : "cron",
        })
        .select("id")
        .single();

      const stats: SyncStats = {
        subjects_synced: 0,
        subjects_created: 0,
        students_matched: 0,
        students_not_found: 0,
        enrollments_synced: 0,
        enrollments_created: 0,
        errors: [],
      };

      try {
        await syncSubjects(supabaseAdmin, config, uid, centerId, stats);
        await syncStudents(supabaseAdmin, config, uid, centerId, stats);
        await syncEnrollments(supabaseAdmin, config, uid, centerId, stats);

        // Update log
        if (logEntry) {
          await supabaseAdmin
            .from("odoo_sync_logs")
            .update({
              finished_at: new Date().toISOString(),
              status: stats.errors.length > 0 ? "warning" : "success",
              stats,
            })
            .eq("id", logEntry.id);
        }

        // Update last sync timestamp in center settings
        const { data: center } = await supabaseAdmin
          .from("training_centers")
          .select("settings")
          .eq("id", centerId)
          .single();

        if (center) {
          await supabaseAdmin
            .from("training_centers")
            .update({
              settings: {
                ...(center.settings as Record<string, unknown>),
                odoo_last_sync: new Date().toISOString(),
              },
            })
            .eq("id", centerId);
        }

        return json({ success: true, stats });
      } catch (e) {
        // Update log with error
        if (logEntry) {
          await supabaseAdmin
            .from("odoo_sync_logs")
            .update({
              finished_at: new Date().toISOString(),
              status: "error",
              stats,
              error_message: (e as Error).message,
            })
            .eq("id", logEntry.id);
        }
        return json({ success: false, error: (e as Error).message, stats }, 500);
      }
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
