# Plan d'Implémentation : Emails & Visio (Zoom/Teams/Brevo)

> **Pour l'Agent :** Exécuter ce plan tâche par tâche dans l'ordre.

**Objectif :** Intégrer un système complet d'emails (notifications, invitations, rappels, récap hebdo) via Brevo + finaliser l'intégration des liens visio Zoom/Teams.

**Architecture :** Edge Function Supabase (Deno) → API Brevo (SMTP/REST) pour l'envoi. pg_cron pour les rappels planifiés. Templates HTML stockés dans `email_templates`. Logs dans `email_logs`.

**Stack :** Supabase Edge Functions (Deno), Brevo API v3 (gratuit 300/jour), pg_cron, pg_net

---

## État des lieux (déjà en place)

- ✅ `training_sessions.meeting_url` — colonne existante
- ✅ Formulaire `CreateBookingModal` — champ lien visio fonctionnel
- ✅ Salles virtuelles (`useVisio.ts`, `VisioPage.tsx`) — détection plateforme
- ✅ `email_templates` table — vide, prête
- ✅ `email_logs` table — vide, prête (session_id, participant_email, email_type, status)
- ✅ `session_participants.participant_email` — champ existant
- ✅ `profiles.email` — email de chaque utilisateur
- ✅ `pg_cron` + `pg_net` — extensions disponibles

---

## Tâche 1 : Configuration Brevo & secrets Supabase

**Étape 1 : Créer un compte Brevo**
- Aller sur https://app.brevo.com/account/register
- Valider l'email, configurer le domaine d'envoi (SPF/DKIM optionnel pour commencer)
- Récupérer la **clé API** dans Paramètres → SMTP & API → Clés API

**Étape 2 : Stocker la clé API dans Supabase Vault**
```sql
-- Via le dashboard Supabase > Project Settings > Edge Functions > Secrets
-- Ajouter : BREVO_API_KEY = xkeysib-xxx...
```

**Vérification :** La clé est visible dans les secrets du projet Supabase.

---

## Tâche 2 : Edge Function `send-email`

**Fichiers :** Créer l'Edge Function via `deploy_edge_function`

**Étape 1 : Créer la fonction principale**

```typescript
// index.ts - Edge Function send-email
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailRequest {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  replyTo?: { email: string; name?: string };
  tags?: string[];
}

Deno.serve(async (req: Request) => {
  // Vérifier le JWT (sécurité)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { to, subject, htmlContent, replyTo, tags } = await req.json() as EmailRequest;

    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoKey) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Planning École", email: "noreply@planning-ecole.fr" },
        to,
        subject,
        htmlContent,
        replyTo,
        tags,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

**Vérification :** Déployer et tester avec un curl/fetch simple.

---

## Tâche 3 : Migration — Peupler `email_templates`

**Fichiers :** Migration SQL via `apply_migration`

**Templates à créer :**

```sql
-- Migration: seed_email_templates

INSERT INTO email_templates (id, name, subject, html_body, email_type, center_id) VALUES

-- 1. Notification nouvelle séance
(gen_random_uuid(), 'session_created',
 'Nouvelle séance : {{session_title}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
   <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0">
     <h1 style="margin:0;font-size:20px">📅 Nouvelle séance planifiée</h1>
   </div>
   <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
     <h2 style="color:#1f2937">{{session_title}}</h2>
     <p><strong>Date :</strong> {{session_date}}</p>
     <p><strong>Horaire :</strong> {{start_time}} - {{end_time}}</p>
     <p><strong>Type :</strong> {{session_type}}</p>
     {{#if meeting_url}}
     <p><a href="{{meeting_url}}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">Rejoindre la visio</a></p>
     {{/if}}
     {{#if room_name}}
     <p><strong>Salle :</strong> {{room_name}}</p>
     {{/if}}
   </div>
 </div>',
 'session_created', NULL),

-- 2. Modification de séance
(gen_random_uuid(), 'session_updated',
 'Séance modifiée : {{session_title}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
   <div style="background:#f59e0b;color:white;padding:20px;border-radius:8px 8px 0 0">
     <h1 style="margin:0;font-size:20px">✏️ Séance modifiée</h1>
   </div>
   <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
     <h2 style="color:#1f2937">{{session_title}}</h2>
     <p><strong>Nouvelle date :</strong> {{session_date}}</p>
     <p><strong>Nouvel horaire :</strong> {{start_time}} - {{end_time}}</p>
     <p><strong>Type :</strong> {{session_type}}</p>
     {{#if meeting_url}}
     <p><a href="{{meeting_url}}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">Rejoindre la visio</a></p>
     {{/if}}
   </div>
 </div>',
 'session_updated', NULL),

-- 3. Annulation de séance
(gen_random_uuid(), 'session_cancelled',
 'Séance annulée : {{session_title}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
   <div style="background:#ef4444;color:white;padding:20px;border-radius:8px 8px 0 0">
     <h1 style="margin:0;font-size:20px">❌ Séance annulée</h1>
   </div>
   <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
     <h2 style="color:#1f2937">{{session_title}}</h2>
     <p>La séance prévue le <strong>{{session_date}}</strong> de {{start_time}} à {{end_time}} a été annulée.</p>
     <p style="color:#6b7280">Si vous avez des questions, contactez votre centre de formation.</p>
   </div>
 </div>',
 'session_cancelled', NULL),

-- 4. Rappel J-1
(gen_random_uuid(), 'session_reminder_day',
 'Rappel : séance demain - {{session_title}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
   <div style="background:#8b5cf6;color:white;padding:20px;border-radius:8px 8px 0 0">
     <h1 style="margin:0;font-size:20px">🔔 Rappel - Séance demain</h1>
   </div>
   <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
     <h2 style="color:#1f2937">{{session_title}}</h2>
     <p><strong>Demain</strong> {{session_date}}</p>
     <p><strong>Horaire :</strong> {{start_time}} - {{end_time}}</p>
     {{#if meeting_url}}
     <p><a href="{{meeting_url}}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">Lien visio</a></p>
     {{/if}}
   </div>
 </div>',
 'reminder_day', NULL),

-- 5. Rappel H-1
(gen_random_uuid(), 'session_reminder_hour',
 'Dans 1h : {{session_title}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
   <div style="background:#ec4899;color:white;padding:20px;border-radius:8px 8px 0 0">
     <h1 style="margin:0;font-size:20px">⏰ Séance dans 1 heure !</h1>
   </div>
   <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
     <h2 style="color:#1f2937">{{session_title}}</h2>
     <p><strong>Début :</strong> {{start_time}}</p>
     {{#if meeting_url}}
     <p><a href="{{meeting_url}}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:16px">🚀 Rejoindre maintenant</a></p>
     {{/if}}
     {{#if room_name}}
     <p><strong>Salle :</strong> {{room_name}}</p>
     {{/if}}
   </div>
 </div>',
 'reminder_hour', NULL),

-- 6. Invitation au centre
(gen_random_uuid(), 'center_invitation',
 'Invitation à rejoindre {{center_name}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
   <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0">
     <h1 style="margin:0;font-size:20px">🎓 Vous êtes invité(e) !</h1>
   </div>
   <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
     <p>Bonjour {{recipient_name}},</p>
     <p>Vous avez été invité(e) à rejoindre <strong>{{center_name}}</strong> en tant que <strong>{{role}}</strong>.</p>
     <p><a href="{{login_url}}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">Se connecter</a></p>
   </div>
 </div>',
 'invitation', NULL),

-- 7. Récapitulatif hebdomadaire
(gen_random_uuid(), 'weekly_recap',
 'Votre semaine du {{week_start}} au {{week_end}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
   <div style="background:#059669;color:white;padding:20px;border-radius:8px 8px 0 0">
     <h1 style="margin:0;font-size:20px">📊 Récap de la semaine</h1>
   </div>
   <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
     <p>Bonjour {{recipient_name}},</p>
     <p>Voici vos séances pour la semaine du <strong>{{week_start}}</strong> au <strong>{{week_end}}</strong> :</p>
     <div>{{sessions_html}}</div>
     <p style="color:#6b7280;font-size:13px;margin-top:20px">{{total_sessions}} séance(s) cette semaine</p>
   </div>
 </div>',
 'weekly_recap', NULL);
```

**Vérification :** `SELECT count(*) FROM email_templates` → 7

---

## Tâche 4 : Hook frontend — Envoi d'emails à la création/modif/annulation

**Fichiers :**
- Créer : `src/hooks/useEmailNotifications.ts`
- Modifier : `src/hooks/useBookings.ts` (ajouter appels email après CRUD)

**Étape 1 : Créer le hook `useEmailNotifications`**

```typescript
// src/hooks/useEmailNotifications.ts
import { supabase } from '../lib/supabase';
import { Booking } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type EmailType = 'session_created' | 'session_updated' | 'session_cancelled';

interface SessionEmailData {
  session: Booking;
  roomName?: string;
  recipients: { email: string; name?: string }[];
}

function buildSessionHtml(template: string, session: Booking, roomName?: string): string {
  const date = format(new Date(session.startTime), 'EEEE d MMMM yyyy', { locale: fr });
  const start = format(new Date(session.startTime), 'HH:mm');
  const end = format(new Date(session.endTime), 'HH:mm');
  const typeLabels: Record<string, string> = {
    in_person: 'Présentiel',
    online: 'En ligne',
    hybrid: 'Hybride',
  };

  return template
    .replace(/\{\{session_title\}\}/g, session.title)
    .replace(/\{\{session_date\}\}/g, date)
    .replace(/\{\{start_time\}\}/g, start)
    .replace(/\{\{end_time\}\}/g, end)
    .replace(/\{\{session_type\}\}/g, typeLabels[session.sessionType || 'in_person'] || 'Présentiel')
    .replace(/\{\{room_name\}\}/g, roomName || '')
    .replace(/\{\{meeting_url\}\}/g, session.meetingUrl || '')
    .replace(/\{\{#if meeting_url\}\}([\s\S]*?)\{\{\/if\}\}/g, session.meetingUrl ? '$1' : '')
    .replace(/\{\{#if room_name\}\}([\s\S]*?)\{\{\/if\}\}/g, roomName ? '$1' : '');
}

export function useEmailNotifications() {
  const sendSessionEmail = async (type: EmailType, data: SessionEmailData) => {
    try {
      // 1. Récupérer le template
      const { data: templates } = await supabase
        .from('email_templates')
        .select('subject, html_body')
        .eq('name', type)
        .limit(1)
        .single();

      if (!templates) return;

      // 2. Construire le HTML
      const htmlContent = buildSessionHtml(templates.html_body, data.session, data.roomName);
      const subject = templates.subject
        .replace(/\{\{session_title\}\}/g, data.session.title);

      // 3. Appeler l'Edge Function
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: data.recipients,
          subject,
          htmlContent,
          tags: [type],
        },
      });

      // 4. Logger dans email_logs
      for (const recipient of data.recipients) {
        await supabase.from('email_logs').insert({
          session_id: data.session.id,
          participant_email: recipient.email,
          email_type: type,
          status: error ? 'failed' : 'sent',
          error_message: error?.message || null,
        });
      }
    } catch (err) {
      console.error('Email notification error:', err);
    }
  };

  return { sendSessionEmail };
}
```

**Étape 2 : Intégrer dans `useBookings.ts`**
- Après `createBooking` → appeler `sendSessionEmail('session_created', ...)`
- Après `updateBooking` → appeler `sendSessionEmail('session_updated', ...)`
- Après suppression/annulation → appeler `sendSessionEmail('session_cancelled', ...)`

**Vérification :** Créer une séance → email envoyé + log dans `email_logs`

---

## Tâche 5 : Cron rappels (J-1 et H-1)

**Fichiers :** Migration SQL pour créer les crons via pg_cron + pg_net

```sql
-- Migration: setup_email_reminder_crons

-- Fonction qui récupère les séances de demain et envoie les rappels via Edge Function
CREATE OR REPLACE FUNCTION public.send_daily_reminders()
RETURNS void AS $$
DECLARE
  session_record RECORD;
  participant RECORD;
  template_subject TEXT;
  template_body TEXT;
BEGIN
  -- Récupérer le template rappel J-1
  SELECT subject, html_body INTO template_subject, template_body
  FROM email_templates WHERE name = 'session_reminder_day' LIMIT 1;

  -- Séances de demain (statut scheduled uniquement)
  FOR session_record IN
    SELECT ts.*, r.name as room_name
    FROM training_sessions ts
    LEFT JOIN rooms r ON r.id = ts.room_id
    WHERE ts.start_time::date = CURRENT_DATE + INTERVAL '1 day'
      AND ts.status = 'scheduled'
  LOOP
    -- Envoyer aux participants + trainer
    FOR participant IN
      SELECT DISTINCT email FROM (
        SELECT p.email FROM profiles p WHERE p.id = session_record.trainer_id
        UNION
        SELECT sp.participant_email as email FROM session_participants sp
        WHERE sp.session_id = session_record.id AND sp.participant_email IS NOT NULL
      ) emails WHERE email IS NOT NULL
    LOOP
      -- Appel via pg_net à l'Edge Function
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'to', jsonb_build_array(jsonb_build_object('email', participant.email)),
          'subject', replace(template_subject, '{{session_title}}', session_record.title),
          'htmlContent', template_body,
          'tags', ARRAY['reminder_day']
        )
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction rappel H-1 (même logique, fenêtre = prochaine heure)
CREATE OR REPLACE FUNCTION public.send_hourly_reminders()
RETURNS void AS $$
-- (même structure, WHERE start_time BETWEEN NOW() + INTERVAL '55 min' AND NOW() + INTERVAL '65 min')
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Planifier les crons
SELECT cron.schedule('daily-session-reminders', '0 18 * * *', 'SELECT public.send_daily_reminders()');
SELECT cron.schedule('hourly-session-reminders', '*/15 * * * *', 'SELECT public.send_hourly_reminders()');
```

**Vérification :** `SELECT * FROM cron.job` → 2 jobs planifiés

---

## Tâche 6 : Récapitulatif hebdomadaire (cron dimanche soir)

**Fichiers :** Migration SQL + Edge Function ou extension de `send_daily_reminders`

```sql
-- Cron récap hebdo : dimanche 18h
SELECT cron.schedule('weekly-recap', '0 18 * * 0', 'SELECT public.send_weekly_recap()');
```

La fonction `send_weekly_recap()` :
- Récupère toutes les séances de la semaine suivante par centre
- Regroupe par utilisateur (profs + étudiants)
- Construit le HTML avec la liste des séances
- Envoie via l'Edge Function

**Vérification :** Exécuter manuellement `SELECT public.send_weekly_recap()` → emails envoyés

---

## Tâche 7 : UI — Page de suivi des emails

**Fichiers :**
- Créer : `src/pages/emails/EmailLogsPage.tsx`
- Modifier : `src/App.tsx` (ajouter la route)
- Modifier : navigation sidebar (ajouter le lien)

**Composants :**
- Tableau des emails envoyés (date, destinataire, type, statut)
- Filtres par type d'email et statut
- Stats : nombre envoyés / échoués / en attente
- Badge dans la sidebar avec le compteur d'échecs

**Vérification :** La page affiche les logs depuis `email_logs`, filtrables.

---

## Résumé des tâches

| # | Tâche | Dépendance | Priorité |
|---|-------|------------|----------|
| 1 | Config Brevo + secrets | - | 🔴 Bloquant |
| 2 | Edge Function `send-email` | Tâche 1 | 🔴 Bloquant |
| 3 | Templates email (migration) | - | 🟡 Parallélisable |
| 4 | Hook frontend + intégration useBookings | Tâches 2+3 | 🔴 Core |
| 5 | Crons rappels J-1 / H-1 | Tâche 2 | 🟢 Peut attendre |
| 6 | Récap hebdomadaire | Tâche 2 | 🟢 Peut attendre |
| 7 | Page suivi emails | Tâche 4 | 🟢 Peut attendre |
