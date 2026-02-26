# Guide Technique - Planning École SaaS

## 📋 Vue d'ensemble

Cette application SaaS de planning pour établissements supérieurs est développée avec une architecture moderne et modulaire. Elle utilise React, TypeScript, Tailwind CSS et Supabase pour offrir une expérience utilisateur optimale avec une gestion de données en temps réel.

## 🏗️ Architecture

### Structure modulaire
- **Types centralisés** : Tous les types TypeScript dans `src/types/index.ts`
- **Hooks personnalisés** : Logique métier encapsulée dans des hooks réutilisables
- **Services** : Couche d'abstraction pour les opérations Supabase
- **Composants modulaires** : Séparation claire entre UI et logique

### Flux de données
```
Composants React → Hooks personnalisés → Services → Supabase → Temps réel
```

## 🔧 Hooks Personnalisés

### useAuth - Authentification
**Fichier** : `src/hooks/useAuth.ts`

```typescript
const {
  user,           // AuthUser | null - Utilisateur connecté
  isLoading,      // boolean - État de chargement
  isAuthenticated, // boolean - État d'authentification
  login,          // (credentials) => Promise<AuthUser>
  register,       // (data) => Promise<AuthUser>  
  logout,         // () => Promise<void>
  updateProfile,  // (data) => Promise<User>
  error,          // string | null - Message d'erreur
  clearError      // () => void - Effacer les erreurs
} = useAuth()
```

**Fonctionnalités** :
- Session persistante avec Supabase Auth
- Gestion d'erreurs robuste
- Auto-refresh des tokens
- Notifications toast intégrées

### useRooms - Gestion des salles
**Fichier** : `src/hooks/useRooms.ts`

```typescript
const {
  rooms,          // Room[] - Liste des salles
  isLoading,      // boolean - État de chargement
  error,          // string | null - Message d'erreur
  createRoom,     // (data) => Promise<Room>
  updateRoom,     // (data) => Promise<Room>
  deleteRoom,     // (id) => Promise<void>
  getRoomById,    // (id) => Room | undefined
  filterRooms,    // (filters) => Room[]
  refreshRooms,   // () => Promise<void>
  clearError      // () => void
} = useRooms()
```

**Fonctionnalités** :
- CRUD complet
- Filtrage avancé (type, bâtiment, capacité, équipement)
- Soft delete
- Mise à jour temps réel avec Supabase Realtime

### useBookings - Gestion des réservations
**Fichier** : `src/hooks/useBookings.ts`

```typescript
const {
  bookings,         // Booking[] - Liste des réservations
  isLoading,        // boolean - État de chargement
  error,           // string | null - Message d'erreur
  createBooking,   // (data) => Promise<Booking>
  updateBooking,   // (data) => Promise<Booking>
  deleteBooking,   // (id) => Promise<void>
  cancelBooking,   // (id, reason?) => Promise<Booking>
  getBookingById,  // (id) => Booking | undefined
  filterBookings,  // (filters) => Booking[]
  getBookingsByRoom, // (roomId, date?) => Booking[]
  getBookingsByUser, // (userId) => Booking[]
  refreshBookings,   // () => Promise<void>
  clearError,        // () => void
  // Valeurs calculées
  calendarEvents,    // CalendarEvent[] - Pour affichage calendrier
  upcomingBookings,  // Booking[] - Prochaines réservations
  bookingsByStatus   // Record<string, Booking[]> - Groupées par statut
} = useBookings()
```

**Fonctionnalités** :
- Vérification automatique des conflits
- Gestion des participants
- Conversion en événements calendrier
- Statistiques intégrées

### useUsers - Gestion des utilisateurs
**Fichier** : `src/hooks/useUsers.ts`

```typescript
const {
  users,           // User[] - Liste des utilisateurs
  isLoading,       // boolean - État de chargement
  error,          // string | null - Message d'erreur
  createUser,     // (data) => Promise<User> (admin only)
  updateUser,     // (id, data) => Promise<User>
  deleteUser,     // (id) => Promise<void> (admin only)
  getUserById,    // (id) => User | undefined
  getUsersByRole, // (role) => User[]
  refreshUsers,   // () => Promise<void>
  clearError,     // () => void
  // Valeurs calculées
  usersByRole,    // Record<UserRole, User[]>
  userStats,      // Statistiques d'usage
  teachers,       // User[] - Enseignants
  students,       // User[] - Étudiants
  admins,         // User[] - Administrateurs
  staff,          // User[] - Personnel
  // Permissions
  canCreateUsers, // boolean
  canDeleteUsers, // boolean
  canUpdateUser,  // (userId) => boolean
  canDeleteUser   // (userId) => boolean
} = useUsers()
```

**Fonctionnalités** :
- Gestion des permissions par rôle
- Statistiques utilisateurs
- Recherche et filtrage
- Sécurité intégrée

## 🗄️ Base de Données Supabase

### Tables principales

#### users
```sql
- id: UUID (PK)
- email: VARCHAR (UNIQUE)
- first_name: VARCHAR
- last_name: VARCHAR
- role: user_role ENUM
- establishment_id: UUID (FK)
- is_active: BOOLEAN
- profile_picture: TEXT
- created_at/updated_at: TIMESTAMPTZ
```

#### rooms
```sql
- id: UUID (PK)
- name: VARCHAR
- code: VARCHAR (UNIQUE)
- description: TEXT
- capacity: INTEGER
- room_type: room_type ENUM
- establishment_id: UUID (FK)
- building_id: UUID (FK, nullable)
- floor: INTEGER
- equipment: JSONB
- is_active: BOOLEAN
- created_at/updated_at: TIMESTAMPTZ
```

#### bookings
```sql
- id: UUID (PK)
- title: VARCHAR
- description: TEXT
- start_date_time: TIMESTAMPTZ
- end_date_time: TIMESTAMPTZ
- room_id: UUID (FK)
- user_id: UUID (FK)
- establishment_id: UUID (FK)
- status: booking_status ENUM
- booking_type: booking_type ENUM
- recurring_booking_id: UUID (FK, nullable)
- cancelled_at: TIMESTAMPTZ
- cancelled_by: UUID (FK)
- cancellation_reason: TEXT
- created_at/updated_at: TIMESTAMPTZ
```

### Fonctions SQL personnalisées

#### check_booking_conflict
Vérifie les conflits de réservation pour une salle et période données.

```sql
check_booking_conflict(
  p_room_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN
```

#### get_room_availability
Récupère les créneaux d'une salle pour une date donnée.

```sql
get_room_availability(
  p_room_id UUID,
  p_date DATE
) RETURNS TABLE(...)
```

### Row Level Security (RLS)
- **Isolation par établissement** : Les utilisateurs ne voient que les données de leur établissement
- **Permissions par rôle** : Admins = accès complet, autres = accès limité
- **Sécurité des opérations** : Chaque action vérifie les permissions

## 🎨 Système de Design

### Classes CSS utilitaires
**Fichier** : `src/index.css`

#### Boutons
```css
.btn-primary    /* Bouton principal bleu */
.btn-secondary  /* Bouton secondaire gris */
.btn-danger     /* Bouton danger rouge */
.btn-success    /* Bouton succès vert */
.btn-sm/.btn-lg /* Variations de taille */
```

#### Formulaires
```css
.form-input     /* Champ de saisie standard */
.form-textarea  /* Zone de texte */
.form-select    /* Menu déroulant */
.form-checkbox  /* Case à cocher */
.form-radio     /* Bouton radio */
.form-label     /* Libellé de champ */
.form-error     /* Message d'erreur */
```

#### Cartes et conteneurs
```css
.card           /* Conteneur carte avec ombre */
.card-header    /* En-tête de carte */
.card-title     /* Titre de carte */
.card-body      /* Corps de carte */
```

#### Badges et états
```css
.badge-primary  /* Badge bleu */
.badge-success  /* Badge vert */
.badge-warning  /* Badge orange */
.badge-error    /* Badge rouge */
.badge-gray     /* Badge gris */
```

### Couleurs personnalisées
```css
primary: #3b82f6 (bleu)
success: #22c55e (vert)  
warning: #f59e0b (orange)
error: #ef4444 (rouge)
secondary: #64748b (gris)
```

## 🔒 Authentification & Sécurité

### Flux d'authentification
1. Connexion via Supabase Auth
2. Récupération du profil utilisateur
3. Vérification des permissions
4. Mise en cache de la session

### Protection des routes
**Fichier** : `src/components/auth/ProtectedRoute.tsx`

```tsx
<ProtectedRoute requiredRoles={['admin', 'teacher']}>
  <AdminPanel />
</ProtectedRoute>
```

### Gestion des erreurs
- Messages d'erreur utilisateur-friendly
- Logging automatique des erreurs
- Retry automatique pour les erreurs réseau
- Fallbacks gracieux

## 📱 Responsive Design

### Breakpoints Tailwind
- `sm`: 640px
- `md`: 768px  
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Approche mobile-first
Tous les composants sont conçus pour mobile d'abord, puis adaptés aux écrans plus grands.

## ⚡ Performance

### Optimisations
- Code splitting automatique avec Vite
- Lazy loading des composants
- Mise en cache avec React Query
- Debouncing des recherches
- Optimistic updates

### Temps réel
- Supabase Realtime pour les mises à jour automatiques
- WebSocket connections gérées automatiquement
- Synchronisation multi-utilisateur

## 🧪 Tests

### Structure de test
```
src/
├── __tests__/          # Tests unitaires
├── hooks/__tests__/    # Tests des hooks
└── utils/__tests__/    # Tests des utilitaires
```

### Commandes
```bash
npm run test           # Tests unitaires
npm run test:ui        # Interface de test
npm run test:coverage  # Rapport de couverture
```

## 🚀 Déploiement

### Variables d'environnement requises
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Build de production
```bash
npm run build
npm run preview  # Test du build local
```

### Plateformes supportées
- Vercel (recommandé)
- Netlify
- Firebase Hosting
- Serveur statique

## 📚 Ressources

### Documentation externe
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/docs)
- [React Query](https://tanstack.com/query)

### Structure du projet
```
src/
├── components/     # Composants réutilisables
├── contexts/       # Contextes React
├── hooks/          # Hooks personnalisés
├── lib/            # Configuration des librairies
├── pages/          # Pages de l'application
├── services/       # Services métier
├── types/          # Types TypeScript
├── utils/          # Fonctions utilitaires
└── validation/     # Schémas Zod
```

---

**Cette documentation technique a été générée par l'Agent Features** 🤖

Pour toute question technique, référez-vous aux fichiers sources commentés ou contactez l'équipe de développement.