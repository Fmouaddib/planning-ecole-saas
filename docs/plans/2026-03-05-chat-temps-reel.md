# Plan d'Implémentation : Module Chat Temps Réel

> **Pour l'Agent :** Exécuter ce plan tâche par tâche, dans l'ordre. Chaque tâche est autonome et testable indépendamment.

**Objectif :** Ajouter un système de messagerie temps réel (Slack-style) avec DMs, channels classe et matière, mentions, réactions, pièces jointes et indicateurs de présence.

**Architecture :** 6 tables SQL avec RLS multi-tenant, Supabase Realtime pour les messages + Presence pour le statut en ligne et le typing indicator, Supabase Storage pour les pièces jointes. Frontend en 4 hooks + page 3 colonnes responsive.

**Stack Technique :** React + TypeScript, Supabase (Realtime, Presence, Storage, RLS), Tailwind CSS, lucide-react, date-fns.

**Design de référence :** `docs/plans/2026-03-05-chat-temps-reel-design.md`

---

## Tâche 1 : Migration — Tables chat_channels + chat_members

**Fichiers :**
- Appliquer via `mcp__supabase__apply_migration`

**Migration `create_chat_channels_and_members` :**

```sql
-- Types
CREATE TYPE chat_channel_type AS ENUM ('dm', 'class', 'subject');
CREATE TYPE chat_member_role AS ENUM ('member', 'admin');

-- Channels
CREATE TABLE chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES training_centers(id) ON DELETE CASCADE,
  type chat_channel_type NOT NULL,
  name text,
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  avatar_url text,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Members
CREATE TABLE chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role chat_member_role DEFAULT 'member',
  last_read_at timestamptz DEFAULT now(),
  is_muted boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Index
CREATE INDEX idx_chat_channels_center_type ON chat_channels(center_id, type);
CREATE INDEX idx_chat_channels_class ON chat_channels(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_chat_channels_subject ON chat_channels(subject_id) WHERE subject_id IS NOT NULL;
CREATE INDEX idx_chat_members_user ON chat_members(user_id);
CREATE INDEX idx_chat_members_channel ON chat_members(channel_id);

-- RLS
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

-- Channels : visible si membre OU super_admin
CREATE POLICY "chat_channels_select" ON chat_channels FOR SELECT USING (
  public.get_caller_role() = 'super_admin'
  OR (
    center_id = public.get_caller_center_id()
    AND EXISTS (
      SELECT 1 FROM chat_members cm WHERE cm.channel_id = id AND cm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "chat_channels_insert" ON chat_channels FOR INSERT WITH CHECK (
  public.get_caller_role() IN ('super_admin', 'admin', 'coordinator')
  OR (
    center_id = public.get_caller_center_id()
    AND type = 'dm'
  )
);

CREATE POLICY "chat_channels_update" ON chat_channels FOR UPDATE USING (
  public.get_caller_role() IN ('super_admin', 'admin', 'coordinator')
  AND center_id = public.get_caller_center_id()
);

-- Members : visible si même channel
CREATE POLICY "chat_members_select" ON chat_members FOR SELECT USING (
  public.get_caller_role() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM chat_members cm2
    WHERE cm2.channel_id = chat_members.channel_id AND cm2.user_id = auth.uid()
  )
);

CREATE POLICY "chat_members_insert" ON chat_members FOR INSERT WITH CHECK (
  public.get_caller_role() IN ('super_admin', 'admin', 'coordinator')
  OR (
    -- DM : l'utilisateur s'ajoute lui-même
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_channels c WHERE c.id = channel_id AND c.type = 'dm'
    )
  )
);

CREATE POLICY "chat_members_update" ON chat_members FOR UPDATE USING (
  user_id = auth.uid()
  OR public.get_caller_role() IN ('super_admin', 'admin', 'coordinator')
);

CREATE POLICY "chat_members_delete" ON chat_members FOR DELETE USING (
  public.get_caller_role() IN ('super_admin', 'admin', 'coordinator')
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;
```

**Vérification :** `list_tables` → chat_channels + chat_members existent avec colonnes correctes.

---

## Tâche 2 : Migration — Tables chat_messages + chat_attachments + chat_reactions + chat_mentions

**Migration `create_chat_messages_and_related` :**

```sql
-- Messages
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text,
  is_system boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  parent_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Attachments
CREATE TABLE chat_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Reactions
CREATE TABLE chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Mentions
CREATE TABLE chat_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX idx_chat_messages_channel_time ON chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_parent ON chat_messages(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_chat_attachments_message ON chat_attachments(message_id);
CREATE INDEX idx_chat_reactions_message ON chat_reactions(message_id);
CREATE INDEX idx_chat_mentions_user_time ON chat_mentions(user_id, created_at DESC);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mentions ENABLE ROW LEVEL SECURITY;

-- Messages : accessible si membre du channel
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT USING (
  public.get_caller_role() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM chat_members cm WHERE cm.channel_id = chat_messages.channel_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_members cm WHERE cm.channel_id = channel_id AND cm.user_id = auth.uid()
  )
  OR public.get_caller_role() = 'super_admin'
);

CREATE POLICY "chat_messages_update" ON chat_messages FOR UPDATE USING (
  sender_id = auth.uid() OR public.get_caller_role() IN ('super_admin', 'admin')
);

CREATE POLICY "chat_messages_delete" ON chat_messages FOR DELETE USING (
  sender_id = auth.uid() OR public.get_caller_role() IN ('super_admin', 'admin')
);

-- Attachments : accessible si membre du channel du message
CREATE POLICY "chat_attachments_select" ON chat_attachments FOR SELECT USING (
  public.get_caller_role() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_members cm ON cm.channel_id = m.channel_id
    WHERE m.id = chat_attachments.message_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "chat_attachments_insert" ON chat_attachments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_members cm ON cm.channel_id = m.channel_id
    WHERE m.id = message_id AND cm.user_id = auth.uid()
  )
  OR public.get_caller_role() = 'super_admin'
);

-- Reactions : accessible si membre du channel
CREATE POLICY "chat_reactions_select" ON chat_reactions FOR SELECT USING (
  public.get_caller_role() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_members cm ON cm.channel_id = m.channel_id
    WHERE m.id = chat_reactions.message_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "chat_reactions_insert" ON chat_reactions FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_members cm ON cm.channel_id = m.channel_id
    WHERE m.id = message_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "chat_reactions_delete" ON chat_reactions FOR DELETE USING (
  user_id = auth.uid()
);

-- Mentions : accessible si concerné ou membre
CREATE POLICY "chat_mentions_select" ON chat_mentions FOR SELECT USING (
  user_id = auth.uid()
  OR public.get_caller_role() = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_members cm ON cm.channel_id = m.channel_id
    WHERE m.id = chat_mentions.message_id AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "chat_mentions_insert" ON chat_mentions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_messages m
    JOIN chat_members cm ON cm.channel_id = m.channel_id
    WHERE m.id = message_id AND cm.user_id = auth.uid()
  )
  OR public.get_caller_role() = 'super_admin'
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
```

**Vérification :** `list_tables` → 6 tables chat_* existent.

---

## Tâche 3 : Migration — Storage bucket + RLS policies

**Migration `create_chat_storage_bucket` :**

```sql
-- Bucket (via Supabase Storage API, pas SQL direct)
-- À créer via Dashboard ou API : bucket 'chat-attachments', privé

-- Storage policies pour le bucket chat-attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policy : upload si membre du channel (path = center_id/channel_id/*)
CREATE POLICY "chat_attachments_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (
    public.get_caller_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.channel_id = (string_to_array(name, '/'))[2]::uuid
      AND cm.user_id = auth.uid()
    )
  )
);

-- Policy : lecture si membre du channel
CREATE POLICY "chat_attachments_read" ON storage.objects FOR SELECT USING (
  bucket_id = 'chat-attachments'
  AND (
    public.get_caller_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.channel_id = (string_to_array(name, '/'))[2]::uuid
      AND cm.user_id = auth.uid()
    )
  )
);
```

**Vérification :** `execute_sql` → `SELECT * FROM storage.buckets WHERE id = 'chat-attachments'` retourne 1 row.

---

## Tâche 4 : Migration — Fonctions auto-provision channels

**Migration `create_chat_auto_provision_functions` :**

```sql
-- Fonction : créer un channel classe + ajouter les membres
CREATE OR REPLACE FUNCTION public.provision_class_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_channel_id uuid;
  v_center_id uuid;
BEGIN
  -- Récupérer le center_id de la classe
  SELECT center_id INTO v_center_id FROM classes WHERE id = NEW.id;

  -- Créer le channel
  INSERT INTO chat_channels (center_id, type, name, class_id)
  VALUES (v_center_id, 'class', NEW.name, NEW.id)
  RETURNING id INTO v_channel_id;

  -- Ajouter tous les admins du centre
  INSERT INTO chat_members (channel_id, user_id, role)
  SELECT v_channel_id, p.id, 'admin'
  FROM profiles p
  WHERE p.center_id = v_center_id AND p.role IN ('admin', 'coordinator')
  ON CONFLICT DO NOTHING;

  -- Ajouter les étudiants de la classe
  INSERT INTO chat_members (channel_id, user_id)
  SELECT v_channel_id, p.id
  FROM profiles p
  WHERE p.center_id = v_center_id AND p.class_id = NEW.id AND p.role = 'student'
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger : à la création d'une classe
CREATE TRIGGER trg_provision_class_channel
AFTER INSERT ON classes
FOR EACH ROW
EXECUTE FUNCTION provision_class_channel();

-- Fonction : créer un channel matière quand une matière est liée à une classe
CREATE OR REPLACE FUNCTION public.provision_subject_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_channel_id uuid;
  v_center_id uuid;
  v_subject_name text;
  v_class_name text;
BEGIN
  -- Récupérer infos
  SELECT s.center_id, s.name INTO v_center_id, v_subject_name
  FROM subjects s WHERE s.id = NEW.subject_id;

  SELECT c.name INTO v_class_name FROM classes c WHERE c.id = NEW.class_id;

  -- Vérifier si le channel existe déjà
  IF EXISTS (
    SELECT 1 FROM chat_channels
    WHERE subject_id = NEW.subject_id AND type = 'subject' AND center_id = v_center_id
  ) THEN
    -- Ajouter les étudiants de la nouvelle classe au channel existant
    SELECT id INTO v_channel_id FROM chat_channels
    WHERE subject_id = NEW.subject_id AND type = 'subject' AND center_id = v_center_id
    LIMIT 1;

    INSERT INTO chat_members (channel_id, user_id)
    SELECT v_channel_id, ss.student_id
    FROM student_subjects ss
    WHERE ss.subject_id = NEW.subject_id AND ss.class_id = NEW.class_id AND ss.status = 'enrolled'
    ON CONFLICT DO NOTHING;
  ELSE
    -- Créer le channel
    INSERT INTO chat_channels (center_id, type, name, subject_id)
    VALUES (v_center_id, 'subject', v_subject_name, NEW.subject_id)
    RETURNING id INTO v_channel_id;

    -- Ajouter admins
    INSERT INTO chat_members (channel_id, user_id, role)
    SELECT v_channel_id, p.id, 'admin'
    FROM profiles p
    WHERE p.center_id = v_center_id AND p.role IN ('admin', 'coordinator')
    ON CONFLICT DO NOTHING;

    -- Ajouter les profs de la matière
    INSERT INTO chat_members (channel_id, user_id)
    SELECT v_channel_id, ts.teacher_id
    FROM teacher_subjects ts
    WHERE ts.subject_id = NEW.subject_id
    ON CONFLICT DO NOTHING;

    -- Ajouter les étudiants inscrits
    INSERT INTO chat_members (channel_id, user_id)
    SELECT v_channel_id, ss.student_id
    FROM student_subjects ss
    WHERE ss.subject_id = NEW.subject_id AND ss.status = 'enrolled'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger : quand on ajoute une matière à une classe
CREATE TRIGGER trg_provision_subject_channel
AFTER INSERT ON class_subjects
FOR EACH ROW
EXECUTE FUNCTION provision_subject_channel();

-- Fonction : ajouter un prof au channel matière quand il est assigné
CREATE OR REPLACE FUNCTION public.sync_teacher_to_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Ajouter au channel subject
  INSERT INTO chat_members (channel_id, user_id)
  SELECT cc.id, NEW.teacher_id
  FROM chat_channels cc
  WHERE cc.subject_id = NEW.subject_id AND cc.type = 'subject'
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_teacher_chat
AFTER INSERT ON teacher_subjects
FOR EACH ROW
EXECUTE FUNCTION sync_teacher_to_chat();

-- Fonction : ajouter un étudiant aux channels quand il rejoint une classe
CREATE OR REPLACE FUNCTION public.sync_student_to_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Si c'est un update de class_id et que le nouveau class_id est non null
  IF TG_OP = 'UPDATE' AND NEW.class_id IS DISTINCT FROM OLD.class_id THEN
    -- Retirer des anciens channels classe
    IF OLD.class_id IS NOT NULL THEN
      DELETE FROM chat_members
      WHERE user_id = NEW.id
      AND channel_id IN (
        SELECT cc.id FROM chat_channels cc WHERE cc.class_id = OLD.class_id AND cc.type = 'class'
      );
    END IF;

    -- Ajouter aux nouveaux channels classe
    IF NEW.class_id IS NOT NULL THEN
      INSERT INTO chat_members (channel_id, user_id)
      SELECT cc.id, NEW.id
      FROM chat_channels cc
      WHERE cc.class_id = NEW.class_id AND cc.type = 'class'
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_student_chat
AFTER UPDATE OF class_id ON profiles
FOR EACH ROW
WHEN (NEW.role = 'student')
EXECUTE FUNCTION sync_student_to_chat();

-- Fonction : sync student_subjects → chat_members (matières)
CREATE OR REPLACE FUNCTION public.sync_student_subject_to_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'enrolled' THEN
    INSERT INTO chat_members (channel_id, user_id)
    SELECT cc.id, NEW.student_id
    FROM chat_channels cc
    WHERE cc.subject_id = NEW.subject_id AND cc.type = 'subject'
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM chat_members
    WHERE user_id = OLD.student_id
    AND channel_id IN (
      SELECT cc.id FROM chat_channels cc WHERE cc.subject_id = OLD.subject_id AND cc.type = 'subject'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'dispensed' AND OLD.status = 'enrolled' THEN
    DELETE FROM chat_members
    WHERE user_id = NEW.student_id
    AND channel_id IN (
      SELECT cc.id FROM chat_channels cc WHERE cc.subject_id = NEW.subject_id AND cc.type = 'subject'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'enrolled' AND OLD.status = 'dispensed' THEN
    INSERT INTO chat_members (channel_id, user_id)
    SELECT cc.id, NEW.student_id
    FROM chat_channels cc
    WHERE cc.subject_id = NEW.subject_id AND cc.type = 'subject'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_student_subject_chat
AFTER INSERT OR UPDATE OR DELETE ON student_subjects
FOR EACH ROW
EXECUTE FUNCTION sync_student_subject_to_chat();
```

**Vérification :** `execute_sql` → `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%chat%'` retourne 4 triggers.

---

## Tâche 5 : Types TypeScript

**Fichier :** Modifier `src/types/index.ts`

Ajouter à la fin du fichier :

```typescript
// ─── Chat ───────────────────────────────────────────────────────

export type ChatChannelType = 'dm' | 'class' | 'subject'
export type ChatMemberRole = 'member' | 'admin'

export interface ChatChannel {
  id: string
  centerId: string
  type: ChatChannelType
  name: string | null
  classId: string | null
  subjectId: string | null
  avatarUrl: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
  // Computed / joined
  members?: ChatMember[]
  lastMessage?: ChatMessage | null
  unreadCount?: number
}

export interface ChatMember {
  id: string
  channelId: string
  userId: string
  role: ChatMemberRole
  lastReadAt: string
  isMuted: boolean
  joinedAt: string
  // Joined
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    avatarUrl?: string
  }
}

export interface ChatMessage {
  id: string
  channelId: string
  senderId: string | null
  content: string | null
  isSystem: boolean
  isEdited: boolean
  parentId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  // Joined
  sender?: {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string
  }
  attachments?: ChatAttachment[]
  reactions?: ChatReaction[]
  mentions?: ChatMention[]
}

export interface ChatAttachment {
  id: string
  messageId: string
  fileName: string
  fileSize: number | null
  mimeType: string | null
  storagePath: string
  createdAt: string
  // Computed
  url?: string
}

export interface ChatReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: string
  user?: { id: string; firstName: string; lastName: string }
}

export interface ChatMention {
  id: string
  messageId: string
  userId: string
  createdAt: string
}
```

**Vérification :** `tsc --noEmit` → 0 erreurs.

---

## Tâche 6 : Transform functions

**Fichier :** Modifier `src/utils/transforms.ts`

Ajouter les fonctions de transformation en fin de fichier :

```typescript
import type { ChatChannel, ChatMessage, ChatMember, ChatAttachment, ChatReaction } from '@/types'

export function transformChatChannel(raw: Record<string, any>): ChatChannel {
  return {
    id: raw.id,
    centerId: raw.center_id,
    type: raw.type,
    name: raw.name,
    classId: raw.class_id,
    subjectId: raw.subject_id,
    avatarUrl: raw.avatar_url,
    isArchived: raw.is_archived ?? false,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    lastMessage: raw.last_message ? transformChatMessage(raw.last_message) : null,
    unreadCount: raw.unread_count ?? 0,
  }
}

export function transformChatMember(raw: Record<string, any>): ChatMember {
  const user = raw.user || raw.profiles
  return {
    id: raw.id,
    channelId: raw.channel_id,
    userId: raw.user_id,
    role: raw.role,
    lastReadAt: raw.last_read_at,
    isMuted: raw.is_muted ?? false,
    joinedAt: raw.joined_at,
    user: user ? {
      id: user.id,
      firstName: parseFullName(user.full_name).firstName,
      lastName: parseFullName(user.full_name).lastName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatar_url,
    } : undefined,
  }
}

export function transformChatMessage(raw: Record<string, any>): ChatMessage {
  const sender = raw.sender || raw.profiles
  return {
    id: raw.id,
    channelId: raw.channel_id,
    senderId: raw.sender_id,
    content: raw.content,
    isSystem: raw.is_system ?? false,
    isEdited: raw.is_edited ?? false,
    parentId: raw.parent_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    deletedAt: raw.deleted_at,
    sender: sender ? {
      id: sender.id,
      firstName: parseFullName(sender.full_name).firstName,
      lastName: parseFullName(sender.full_name).lastName,
      avatarUrl: sender.avatar_url,
    } : undefined,
    attachments: raw.chat_attachments?.map(transformChatAttachment) ?? [],
    reactions: raw.chat_reactions?.map(transformChatReaction) ?? [],
  }
}

export function transformChatAttachment(raw: Record<string, any>): ChatAttachment {
  return {
    id: raw.id,
    messageId: raw.message_id,
    fileName: raw.file_name,
    fileSize: raw.file_size,
    mimeType: raw.mime_type,
    storagePath: raw.storage_path,
    createdAt: raw.created_at,
  }
}

export function transformChatReaction(raw: Record<string, any>): ChatReaction {
  const user = raw.user || raw.profiles
  return {
    id: raw.id,
    messageId: raw.message_id,
    userId: raw.user_id,
    emoji: raw.emoji,
    createdAt: raw.created_at,
    user: user ? {
      id: user.id,
      firstName: parseFullName(user.full_name).firstName,
      lastName: parseFullName(user.full_name).lastName,
    } : undefined,
  }
}
```

**Vérification :** `tsc --noEmit` → 0 erreurs.

---

## Tâche 7 : Constantes + Route

**Fichier :** Modifier `src/utils/constants.ts`

Ajouter dans l'objet `ROUTES` :
```typescript
CHAT: '/chat',
```

Ajouter une constante pour les emojis de réaction :
```typescript
export const CHAT_REACTIONS = ['👍', '✅', '❤️', '😂', '🎉', '👀'] as const

export const CHAT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const CHAT_ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
]
```

**Vérification :** grep `ROUTES.CHAT` → trouvé dans constants.ts.

---

## Tâche 8 : Hook `useChat` — Liste channels + unread + channel actif

**Fichier :** Créer `src/hooks/useChat.ts`

Ce hook gère :
- Fetch tous les channels de l'utilisateur avec le dernier message et le count unread
- Channel actif (sélectionné)
- Création de DM
- Recherche de channels
- Unread total (pour badge sidebar)
- Realtime subscription sur `chat_channels` et `chat_members`

**Structure :**
```typescript
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isDemoMode } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { transformChatChannel } from '@/utils/transforms'
import type { ChatChannel } from '@/types'

// Demo data
const DEMO_CHANNELS: ChatChannel[] = [
  { id: 'demo-dm-1', centerId: 'demo', type: 'dm', name: 'Alice Martin', classId: null, subjectId: null, avatarUrl: null, isArchived: false, createdAt: '...', updatedAt: '...', unreadCount: 2 },
  { id: 'demo-class-1', centerId: 'demo', type: 'class', name: 'BTS SIO 2A', classId: null, subjectId: null, avatarUrl: null, isArchived: false, createdAt: '...', updatedAt: '...', unreadCount: 5 },
  { id: 'demo-subject-1', centerId: 'demo', type: 'subject', name: 'Mathématiques', classId: null, subjectId: null, avatarUrl: null, isArchived: false, createdAt: '...', updatedAt: '...', unreadCount: 0 },
]

export function useChat() {
  const { user } = useAuthContext()
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch channels avec dernier message + unread count
  const fetchChannels = useCallback(async () => {
    if (isDemoMode || !user) { setChannels(DEMO_CHANNELS); setIsLoading(false); return }
    try {
      setIsLoading(true)
      // 1. Get les channels dont l'user est membre
      const { data: memberData } = await supabase
        .from('chat_members')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id)

      if (!memberData?.length) { setChannels([]); return }

      const channelIds = memberData.map(m => m.channel_id)
      const lastReadMap = Object.fromEntries(memberData.map(m => [m.channel_id, m.last_read_at]))

      // 2. Get les channels avec infos
      const { data: channelData } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', channelIds)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })

      if (!channelData) { setChannels([]); return }

      // 3. Pour chaque channel, get le dernier message + unread count
      const enriched = await Promise.all(channelData.map(async (ch) => {
        // Dernier message
        const { data: lastMsg } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
          .eq('channel_id', ch.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Unread count
        const lastRead = lastReadMap[ch.id]
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', ch.id)
          .is('deleted_at', null)
          .gt('created_at', lastRead)

        // Pour DM : récupérer le nom de l'autre membre
        let displayName = ch.name
        if (ch.type === 'dm') {
          const { data: otherMember } = await supabase
            .from('chat_members')
            .select('profiles:user_id(full_name)')
            .eq('channel_id', ch.id)
            .neq('user_id', user.id)
            .limit(1)
            .maybeSingle()
          displayName = otherMember?.profiles?.full_name || 'DM'
        }

        return {
          ...ch,
          name: displayName,
          last_message: lastMsg,
          unread_count: count || 0,
        }
      }))

      setChannels(enriched.map(transformChatChannel))
    } catch (err) {
      console.error('Chat fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Créer un DM
  const createDM = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (isDemoMode || !user) return null
    // Vérifier si DM existe déjà
    const { data: existing } = await supabase
      .from('chat_channels')
      .select('id, chat_members!inner(user_id)')
      .eq('type', 'dm')
      .eq('center_id', user.establishmentId)

    // Filtrer côté client pour trouver un DM avec exactement ces 2 membres
    const existingDM = existing?.find(ch => {
      const memberIds = ch.chat_members.map((m: any) => m.user_id)
      return memberIds.length === 2 && memberIds.includes(user.id) && memberIds.includes(otherUserId)
    })

    if (existingDM) {
      setActiveChannelId(existingDM.id)
      return existingDM.id
    }

    // Créer le DM
    const { data: newChannel } = await supabase
      .from('chat_channels')
      .insert({ center_id: user.establishmentId, type: 'dm' })
      .select()
      .single()

    if (!newChannel) return null

    // Ajouter les 2 membres
    await supabase.from('chat_members').insert([
      { channel_id: newChannel.id, user_id: user.id },
      { channel_id: newChannel.id, user_id: otherUserId },
    ])

    setActiveChannelId(newChannel.id)
    await fetchChannels()
    return newChannel.id
  }, [user, fetchChannels])

  // Marquer comme lu
  const markAsRead = useCallback(async (channelId: string) => {
    if (isDemoMode || !user) return
    await supabase
      .from('chat_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channelId)
      .eq('user_id', user.id)

    setChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, unreadCount: 0 } : ch
    ))
  }, [user])

  // Channel actif
  const activeChannel = useMemo(() =>
    channels.find(ch => ch.id === activeChannelId) || null
  , [channels, activeChannelId])

  // Channels filtrés par recherche
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels
    const q = searchQuery.toLowerCase()
    return channels.filter(ch => ch.name?.toLowerCase().includes(q))
  }, [channels, searchQuery])

  // Groupes
  const dmChannels = useMemo(() => filteredChannels.filter(ch => ch.type === 'dm'), [filteredChannels])
  const classChannels = useMemo(() => filteredChannels.filter(ch => ch.type === 'class'), [filteredChannels])
  const subjectChannels = useMemo(() => filteredChannels.filter(ch => ch.type === 'subject'), [filteredChannels])

  // Unread total
  const totalUnread = useMemo(() =>
    channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0)
  , [channels])

  // Realtime
  useEffect(() => {
    if (isDemoMode || !user) return
    const channel = supabase
      .channel('chat_channels_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_channels' }, () => fetchChannels())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_members', filter: `user_id=eq.${user.id}` }, () => fetchChannels())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, fetchChannels])

  // Initial fetch
  useEffect(() => { fetchChannels() }, [fetchChannels])

  return {
    channels, dmChannels, classChannels, subjectChannels,
    activeChannel, activeChannelId, setActiveChannelId,
    isLoading, totalUnread,
    searchQuery, setSearchQuery,
    createDM, markAsRead, fetchChannels,
  }
}
```

**Vérification :** `tsc --noEmit` → 0 erreurs.

---

## Tâche 9 : Hook `useChatMessages` — Messages paginés + Realtime

**Fichier :** Créer `src/hooks/useChatMessages.ts`

Ce hook gère :
- Fetch messages paginés (50 par page, infinite scroll vers le haut)
- Realtime subscription pour nouveaux messages
- Send, edit, delete messages
- Messages système

```typescript
export function useChatMessages(channelId: string | null) {
  const { user } = useAuthContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 50

  // Fetch messages (initial + pagination)
  const fetchMessages = useCallback(async (before?: string) => {
    if (isDemoMode || !channelId || !user) return
    setIsLoading(true)
    try {
      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!sender_id(id, full_name, avatar_url),
          chat_attachments(*),
          chat_reactions(*, profiles:user_id(id, full_name))
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data } = await query
      if (!data) return

      const transformed = data.map(transformChatMessage).reverse()
      if (before) {
        setMessages(prev => [...transformed, ...prev])
      } else {
        setMessages(transformed)
      }
      setHasMore(data.length === PAGE_SIZE)
    } finally {
      setIsLoading(false)
    }
  }, [channelId, user])

  // Load more (infinite scroll up)
  const loadMore = useCallback(() => {
    if (messages.length > 0 && hasMore) {
      fetchMessages(messages[0].createdAt)
    }
  }, [messages, hasMore, fetchMessages])

  // Send message
  const sendMessage = useCallback(async (content: string, attachmentFiles?: File[]) => {
    if (isDemoMode || !channelId || !user) return
    // Insert message
    const { data: msg } = await supabase
      .from('chat_messages')
      .insert({ channel_id: channelId, sender_id: user.id, content })
      .select()
      .single()

    if (!msg) return

    // Upload attachments
    if (attachmentFiles?.length) {
      for (const file of attachmentFiles) {
        const path = `${user.establishmentId}/${channelId}/${msg.id}/${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(path, file)
        if (!uploadError) {
          await supabase.from('chat_attachments').insert({
            message_id: msg.id,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: path,
          })
        }
      }
    }

    // Parse mentions (@prenom nom)
    const mentionRegex = /@(\w+ \w+)/g
    // (Implémentation mention lookup + insert chat_mentions)

    // Update channel updated_at
    await supabase
      .from('chat_channels')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', channelId)
  }, [channelId, user])

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (isDemoMode || !user) return
    await supabase
      .from('chat_messages')
      .update({ content: newContent, is_edited: true, updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id)
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, isEdited: true } : m))
  }, [user])

  // Delete message (soft)
  const deleteMessage = useCallback(async (messageId: string) => {
    if (isDemoMode || !user) return
    await supabase
      .from('chat_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }, [user])

  // Toggle reaction
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (isDemoMode || !user) return
    const existing = messages.find(m => m.id === messageId)
      ?.reactions?.find(r => r.userId === user.id && r.emoji === emoji)

    if (existing) {
      await supabase.from('chat_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('chat_reactions').insert({
        message_id: messageId, user_id: user.id, emoji
      })
    }
    // Refetch pour maj (ou optimistic update)
    fetchMessages()
  }, [user, messages, fetchMessages])

  // Realtime : nouveaux messages
  useEffect(() => {
    if (isDemoMode || !channelId || !user) return
    const channel = supabase
      .channel(`chat_messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, async (payload) => {
        // Fetch le message complet avec joins
        const { data } = await supabase
          .from('chat_messages')
          .select('*, sender:profiles!sender_id(id, full_name, avatar_url), chat_attachments(*), chat_reactions(*, profiles:user_id(id, full_name))')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setMessages(prev => [...prev, transformChatMessage(data)])
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, () => fetchMessages())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [channelId, user, fetchMessages])

  // Reset on channel change
  useEffect(() => {
    setMessages([])
    setHasMore(true)
    if (channelId) fetchMessages()
  }, [channelId]) // intentionally NOT fetchMessages to avoid loop

  return {
    messages, isLoading, hasMore,
    loadMore, sendMessage, editMessage, deleteMessage, toggleReaction,
  }
}
```

---

## Tâche 10 : Hook `useChatMembers` — Membres + Présence

**Fichier :** Créer `src/hooks/useChatMembers.ts`

Ce hook gère :
- Liste des membres du channel actif
- Supabase Presence pour statut en ligne
- Typing indicator

```typescript
export function useChatMembers(channelId: string | null) {
  const { user } = useAuthContext()
  const [members, setMembers] = useState<ChatMember[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // Fetch membres
  const fetchMembers = useCallback(async () => {
    if (isDemoMode || !channelId) return
    setIsLoading(true)
    const { data } = await supabase
      .from('chat_members')
      .select('*, profiles:user_id(id, full_name, email, role, avatar_url)')
      .eq('channel_id', channelId)
      .order('joined_at')
    setMembers((data || []).map(transformChatMember))
    setIsLoading(false)
  }, [channelId])

  // Presence : online status + typing
  useEffect(() => {
    if (isDemoMode || !channelId || !user) return

    const channel = supabase.channel(`presence:${channelId}`)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineIds = new Set<string>()
        const typingIds = new Set<string>()
        Object.values(state).forEach(presences => {
          presences.forEach((p: any) => {
            onlineIds.add(p.user_id)
            if (p.is_typing) typingIds.add(p.user_id)
          })
        })
        setOnlineUserIds(onlineIds)
        setTypingUserIds(typingIds)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString(), is_typing: false })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [channelId, user])

  // Set typing
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (isDemoMode || !channelId || !user) return
    const channel = supabase.channel(`presence:${channelId}`)
    await channel.track({ user_id: user.id, online_at: new Date().toISOString(), is_typing: isTyping })
  }, [channelId, user])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  return {
    members, onlineUserIds, typingUserIds,
    isLoading, setTyping, fetchMembers,
  }
}
```

---

## Tâche 11 : Composants UI — ChannelList (colonne gauche)

**Fichier :** Créer `src/pages/chat/ChannelList.tsx`

```typescript
// Props : channels groupés (dm/class/subject), activeChannelId, onSelect, searchQuery, onSearchChange
// Sections collapsibles : "Messages directs", "Classes", "Matières"
// Chaque item : icône + nom + badge unread + dernier message preview
// Barre de recherche en haut
// Bouton "Nouveau message" pour créer DM
```

Éléments clés :
- `Search` icon + input pour filtrer
- `MessageSquarePlus` pour nouveau DM
- Sections avec `ChevronDown`/`ChevronRight` toggle
- Item : pastille verte si online (DM only), badge unread, truncate lastMessage
- Active item highlight : `bg-primary-50 dark:bg-primary-950`

---

## Tâche 12 : Composants UI — MessageView (colonne centrale)

**Fichier :** Créer `src/pages/chat/MessageView.tsx`

```typescript
// Header : nom du channel + membres count + icône type
// Zone messages : infinite scroll (useRef + IntersectionObserver pour loadMore en haut)
// Chaque message : MessageBubble component
// Typing indicator en bas
// Barre de saisie : MessageInput component
```

**Sous-composant `MessageBubble.tsx` :**
- Avatar initiales (pas de photo)
- Nom expéditeur + timestamp
- Contenu texte (avec markdown basique : **bold**, *italic*, `code`)
- Pièces jointes (preview image ou icône fichier + nom)
- Barre de réactions (sous le message, petits badges emoji + count)
- Hover : menu contextuel (réagir, éditer, supprimer)
- Messages système : centré, gris, italique
- Messages édités : petit label "(modifié)"
- Messages supprimés : masqués (soft delete côté serveur)

**Sous-composant `MessageInput.tsx` :**
- Textarea auto-resize (Shift+Enter = newline, Enter = send)
- Bouton emoji picker (popover avec les 6 réactions)
- Bouton pièce jointe (input file caché)
- @mention autocomplétion (popup au-dessus de l'input quand on tape @)
- Preview des fichiers sélectionnés avant envoi
- Typing indicator : déclenché au keydown, reset après 3s sans frappe

---

## Tâche 13 : Composants UI — InfoPanel (colonne droite)

**Fichier :** Créer `src/pages/chat/InfoPanel.tsx`

```typescript
// Nom du channel + type badge
// Description (pour channels classe/matière : nombre d'étudiants, prof(s))
// Liste des membres avec pastille online/offline
// Section "Fichiers partagés" : liste des attachments du channel
// Bouton "Quitter" pour DMs (optionnel)
```

---

## Tâche 14 : Page principale ChatPage

**Fichier :** Créer `src/pages/chat/ChatPage.tsx`

```typescript
import { useChat } from '@/hooks/useChat'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useChatMembers } from '@/hooks/useChatMembers'
import { ChannelList } from './ChannelList'
import { MessageView } from './MessageView'
import { InfoPanel } from './InfoPanel'
import { HelpBanner } from '@/components/ui'

export default function ChatPage() {
  const chat = useChat()
  const messages = useChatMessages(chat.activeChannelId)
  const members = useChatMembers(chat.activeChannelId)
  const [showInfo, setShowInfo] = useState(true)

  // Mobile : état de navigation (channels | messages | info)
  const [mobileView, setMobileView] = useState<'channels' | 'messages' | 'info'>('channels')

  return (
    <div className="h-[calc(100vh-4rem)]"> {/* Full height minus header */}
      <HelpBanner storageKey="chat">
        Échangez avec vos collègues et étudiants en temps réel. Les canaux de classe et de matière sont créés automatiquement. Cliquez sur « Nouveau message » pour démarrer une conversation privée.
      </HelpBanner>

      <div className="flex h-full border rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
        {/* Colonne gauche : channels */}
        <div className="w-64 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700">
          <ChannelList
            dmChannels={chat.dmChannels}
            classChannels={chat.classChannels}
            subjectChannels={chat.subjectChannels}
            activeChannelId={chat.activeChannelId}
            onSelect={(id) => { chat.setActiveChannelId(id); chat.markAsRead(id); setMobileView('messages') }}
            searchQuery={chat.searchQuery}
            onSearchChange={chat.setSearchQuery}
            onNewDM={/* modal pour sélectionner un utilisateur */}
          />
        </div>

        {/* Colonne centrale : messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {chat.activeChannel ? (
            <MessageView
              channel={chat.activeChannel}
              messages={messages.messages}
              isLoading={messages.isLoading}
              hasMore={messages.hasMore}
              onLoadMore={messages.loadMore}
              onSend={messages.sendMessage}
              onEdit={messages.editMessage}
              onDelete={messages.deleteMessage}
              onReact={messages.toggleReaction}
              typingUserIds={members.typingUserIds}
              members={members.members}
              onSetTyping={members.setTyping}
              onToggleInfo={() => setShowInfo(!showInfo)}
            />
          ) : (
            <EmptyState ... />
          )}
        </div>

        {/* Colonne droite : info */}
        {showInfo && chat.activeChannel && (
          <div className="w-72 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700">
            <InfoPanel
              channel={chat.activeChannel}
              members={members.members}
              onlineUserIds={members.onlineUserIds}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Tâche 15 : Intégration — Route + Sidebar + Badge unread

**Fichiers :**
- Modifier `src/utils/constants.ts` → ajouter `CHAT: '/chat'`
- Modifier `src/App.tsx` → lazy import ChatPage + ajouter dans `routeComponents`
- Modifier `src/components/layout/Sidebar.tsx` → ajouter item Chat avec badge unread

**Sidebar :**
```typescript
// Dans mainNavigation, ajouter après l'entrée Calendrier :
{ icon: MessageCircle, label: 'Messages', href: ROUTES.CHAT, active: currentPath === ROUTES.CHAT, badge: totalUnreadChat > 0 ? String(totalUnreadChat) : undefined }
```

**Note :** Le `totalUnreadChat` nécessite soit :
- (a) Un hook global léger `useChatUnread()` dans le Sidebar qui ne fetch que le count
- (b) Un context `ChatProvider` qui wrappe l'app

**Recommandé : option (a)** — petit hook `useChatUnread` :
```typescript
export function useChatUnread(): number {
  const { user } = useAuthContext()
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (isDemoMode || !user) return
    // Fetch unread count total
    // Subscribe realtime pour update
  }, [user])
  return count
}
```

**Route dans App.tsx :**
- `/chat` n'est PAS dans `teacherForbiddenRoutes` ni `studentForbiddenRoutes` → accessible à tous

---

## Tâche 16 : Modal "Nouveau DM" — Sélection d'utilisateur

**Fichier :** Créer `src/pages/chat/NewDMModal.tsx`

- Modal avec recherche d'utilisateur (filtrée par permissions du rôle)
- Admin : voit tout le monde du centre
- Prof : voit ses étudiants + autres profs + admin
- Étudiant : voit ses profs + camarades de classe
- Sélection → `createDM(userId)` → ferme modal → ouvre le DM

---

## Tâche 17 : Données de démo

**Fichier :** Créer `src/pages/chat/demoData.ts`

Données démo hardcodées pour quand `isDemoMode` est true :
- 2 DMs, 2 channels classe, 1 channel matière
- 10-15 messages variés (texte, système, avec réactions)
- 5-6 membres fictifs

---

## Tâche 18 : Responsive mobile

**Modifications :**
- `ChatPage.tsx` : état `mobileView` avec 3 vues exclusives sur mobile
- Classes CSS conditionnelles : `hidden md:block` / `block md:hidden`
- Bouton back dans MessageView header (mobile only)
- Bouton info dans MessageView header → ouvre InfoPanel en drawer sur mobile

---

## Tâche 19 : Vérification finale

- [ ] `tsc --noEmit` → 0 erreurs
- [ ] `vite build` → succès
- [ ] Mode démo : page `/chat` affiche les données démo
- [ ] Supabase : 6 tables chat_* avec RLS correctes
- [ ] Supabase : 4 triggers auto-provision fonctionnels
- [ ] Supabase : bucket `chat-attachments` créé
- [ ] Sidebar : icône Messages visible pour tous les rôles
- [ ] Responsive : 3 colonnes desktop, 1 colonne mobile
- [ ] Realtime : messages apparaissent en temps réel entre 2 onglets
- [ ] Presence : indicateur typing + pastille en ligne
- [ ] HelpBanner sur la page chat

---

## Ordre d'exécution recommandé

1. **Tâches 1-4** : Migrations SQL (séquentielles, chacune dépend de la précédente)
2. **Tâches 5-7** : Types + Transforms + Constants (parallélisables)
3. **Tâches 8-10** : Hooks (séquentiels : useChat → useChatMessages → useChatMembers)
4. **Tâches 11-14** : Composants UI (séquentiels : ChannelList → MessageView → InfoPanel → ChatPage)
5. **Tâche 15** : Intégration (route + sidebar)
6. **Tâches 16-18** : Finitions (modal + demo + responsive)
7. **Tâche 19** : Vérification

**Estimation :** 19 tâches × ~3-5 min = ~60-90 min d'exécution agent

---

*Plan rédigé le 2026-03-05 — Basé sur le design `docs/plans/2026-03-05-chat-temps-reel-design.md`*
