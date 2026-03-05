# Design : Module Chat Temps Réel

**Date** : 2026-03-05
**Axe stratégique** : Rétention
**Problème résolu** : Communication fragmentée entre admin, professeurs et étudiants
**Approche** : Chat temps réel (Slack-style) avec Supabase Realtime + Presence

---

## 1. Types de conversations

| Type | Création | Exemples |
|------|----------|----------|
| **DM** (Direct Message) | À la demande, par n'importe quel utilisateur autorisé | Prof ↔ Étudiant, Admin ↔ Prof |
| **Classe** (channel) | Auto-provisionné à la création d'une classe | `#BTS-SIO-2A`, `#L3-Informatique` |
| **Matière** (channel) | Auto-provisionné à la création d'une matière | `#Mathématiques-BTS2`, `#Anglais-L3` |

### Membres auto-provisionnés
- **Channel classe** : tous les étudiants de la classe + profs assignés aux matières de cette classe + admin
- **Channel matière** : étudiants inscrits à la matière (via `student_subjects`) + prof(s) de la matière (via `teacher_subjects`) + admin
- **Sync automatique** : ajout/retrait de membres quand un étudiant rejoint/quitte une classe, quand une matière est ajoutée/retirée, quand un prof est assigné/désassigné

## 2. Permissions

| Rôle | Peut écrire à | Peut créer DM avec |
|------|--------------|---------------------|
| **Admin** | Tous les channels + tous les DMs | Tout le monde |
| **Professeur** | Channels de ses matières/classes + DMs | Ses étudiants, autres profs, admin |
| **Étudiant** | Channels de sa classe/matières + DMs | Ses profs, ses camarades de classe |

**Garde-fous** :
- Pas de DM étudiant → étudiant d'une autre classe
- Pas d'accès aux channels de classes/matières non attribuées
- Admin voit et modère tout

## 3. Fonctionnalités MVP

| Feature | Description |
|---------|-------------|
| **Messages texte** | Markdown basique (gras, italique, code, liens) |
| **@mentions** | `@nom` avec autocomplétion, notification ciblée |
| **Réactions emoji** | Set limité : 👍 ✅ ❤️ 😂 🎉 👀 |
| **Pièces jointes** | Upload fichiers via Supabase Storage (images, PDF, docs) |
| **Indicateur de frappe** | "X est en train d'écrire…" via Supabase Presence |
| **Statut en ligne** | Pastille verte/grise via Supabase Presence |
| **Accusés de lecture** | Dernier message lu par membre (cursor-based) |
| **Recherche** | Recherche full-text dans les messages d'un channel |
| **Édition/Suppression** | Modifier ou supprimer ses propres messages |
| **Messages système** | Auto-générés (membre ajouté, cours annulé, etc.) |

## 4. Schéma base de données

### Tables

```sql
-- Channels (DM, classe, matière)
chat_channels (
  id uuid PK DEFAULT gen_random_uuid(),
  center_id uuid FK → training_centers(id),
  type text NOT NULL CHECK (type IN ('dm', 'class', 'subject')),
  name text,                    -- NULL pour DM, auto pour class/subject
  class_id uuid FK → classes(id),     -- si type = 'class'
  subject_id uuid FK → subjects(id),  -- si type = 'subject'
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Membres d'un channel
chat_members (
  id uuid PK DEFAULT gen_random_uuid(),
  channel_id uuid FK → chat_channels(id) ON DELETE CASCADE,
  user_id uuid FK → profiles(id),
  role text DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  last_read_at timestamptz DEFAULT now(),
  is_muted boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
)

-- Messages
chat_messages (
  id uuid PK DEFAULT gen_random_uuid(),
  channel_id uuid FK → chat_channels(id) ON DELETE CASCADE,
  sender_id uuid FK → profiles(id),
  content text,
  is_system boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  parent_id uuid FK → chat_messages(id),  -- pour threads futurs
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz             -- soft delete
)

-- Pièces jointes
chat_attachments (
  id uuid PK DEFAULT gen_random_uuid(),
  message_id uuid FK → chat_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  storage_path text NOT NULL,      -- chemin Supabase Storage
  created_at timestamptz DEFAULT now()
)

-- Réactions
chat_reactions (
  id uuid PK DEFAULT gen_random_uuid(),
  message_id uuid FK → chat_messages(id) ON DELETE CASCADE,
  user_id uuid FK → profiles(id),
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
)

-- Mentions
chat_mentions (
  id uuid PK DEFAULT gen_random_uuid(),
  message_id uuid FK → chat_messages(id) ON DELETE CASCADE,
  user_id uuid FK → profiles(id),
  created_at timestamptz DEFAULT now()
)
```

### Index
- `chat_messages(channel_id, created_at DESC)` — pagination messages
- `chat_members(user_id)` — channels d'un utilisateur
- `chat_members(channel_id)` — membres d'un channel
- `chat_mentions(user_id, created_at DESC)` — mentions d'un utilisateur
- `chat_channels(center_id, type)` — channels par centre

### RLS
- Toutes les tables : `get_caller_center_id()` pour isolation multi-tenant
- `chat_messages` : SELECT/INSERT si membre du channel
- `chat_members` : SELECT si même channel, INSERT/DELETE admin only (ou auto-provision)
- `chat_reactions` : INSERT/DELETE si membre du channel
- `super_admin` bypass sur tout

## 5. Architecture technique

### Supabase Realtime
- **Channel subscription** : `supabase.channel('chat:' + channelId)` pour recevoir les nouveaux messages
- **Presence** : `channel.track({ user_id, online_at })` pour statut en ligne + typing indicator
- **Broadcast** : événements `typing_start` / `typing_stop` par channel

### Supabase Storage
- **Bucket** : `chat-attachments` (privé, RLS)
- **Path** : `{center_id}/{channel_id}/{message_id}/{filename}`
- **Limites** : 10 Mo par fichier, types autorisés (images, PDF, docs, spreadsheets)

### Hooks React
- `useChat` — liste channels, channel actif, unread count
- `useChatMessages` — messages paginés (infinite scroll), realtime subscription
- `useChatMembers` — membres du channel actif, présence en ligne
- `useChatActions` — send, edit, delete, react, mention, upload

## 6. UI — Layout 3 colonnes

```
┌──────────────┬─────────────────────────────┬──────────────┐
│  CHANNELS    │       MESSAGES              │  INFO PANEL  │
│              │                             │              │
│ 🔍 Recherche │  ┌─ Channel name ────────┐  │ #BTS-SIO-2A  │
│              │  │                       │  │              │
│ DMs          │  │  [Alice] 10:30        │  │ 24 membres   │
│  • Alice ●   │  │  Bonjour à tous !     │  │              │
│  • Bob       │  │                       │  │ ● Alice      │
│              │  │  [Bob] 10:32          │  │ ● Bob        │
│ Classes      │  │  Salut ! 👍           │  │ ○ Charlie    │
│  # BTS-SIO   │  │                       │  │ ...          │
│  # L3-Info   │  │  [System] 10:35       │  │              │
│              │  │  Charlie a rejoint    │  │ Fichiers     │
│ Matières     │  │                       │  │  doc.pdf     │
│  # Maths     │  ├───────────────────────┤  │  img.png     │
│  # Anglais   │  │ 📎  Message...  [➤]   │  │              │
│              │  └───────────────────────┘  │              │
└──────────────┴─────────────────────────────┴──────────────┘
   ~250px              flexible                  ~280px
```

- **Colonne gauche** : liste des channels groupés (DMs / Classes / Matières), barre de recherche, badges unread
- **Colonne centrale** : fil de messages avec infinite scroll, barre de saisie (markdown + upload + emoji picker + mentions)
- **Colonne droite** : info channel (nom, description, nombre de membres), liste membres avec statut en ligne, fichiers partagés

### Responsive
- **Mobile** : une seule colonne à la fois avec navigation back
- **Tablet** : 2 colonnes (channels + messages), info panel en drawer

## 7. Route et navigation

- **Route** : `/chat` (accessible à tous les rôles)
- **Sidebar** : icône `MessageCircle` (lucide-react), avec badge unread count
- **Constantes** : `ROUTES.CHAT = '/chat'`

## 8. Sync automatique

| Événement | Action chat |
|-----------|------------|
| Classe créée | Créer channel `class` + ajouter admin |
| Étudiant ajouté à une classe | Ajouter aux channels classe + matières inscrites |
| Étudiant retiré d'une classe | Retirer des channels classe + matières liées |
| Matière ajoutée à une classe (`class_subjects`) | Créer channel `subject` si inexistant + ajouter étudiants de la classe |
| Matière retirée d'une classe | Retirer les étudiants de la classe du channel matière |
| Prof assigné à une matière (`teacher_subjects`) | Ajouter au channel matière + channels classes liées |
| Prof désassigné | Retirer des channels correspondants |
| Classe supprimée | Archiver le channel (soft delete) |

---

*Design validé le 2026-03-05 — Prêt pour planification d'implémentation*
