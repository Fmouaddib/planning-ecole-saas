# PlanningÉcole - Gestion de Planning pour Établissements Supérieurs

Une application SaaS premium conçue spécialement pour la gestion de planning d'établissements d'enseignement supérieur privés et internationaux.

## 🎯 Caractéristiques principales

### Interface Premium
- **Design System complet** avec palette de couleurs raffinée
- **Composants UI réutilisables** construits avec Tailwind CSS
- **Mode sombre** optionnel pour un confort d'utilisation optimal
- **Animations subtiles** et micro-interactions pour une expérience fluide
- **Interface responsive** adaptée à tous les appareils

### Fonctionnalités Core
- **Authentification sécurisée** avec gestion des rôles
- **Dashboard interactif** avec statistiques en temps réel
- **Gestion complète des salles** (CRUD avec équipements)
- **Planning visuel** avec interface calendrier intuitive
- **Gestion multi-utilisateurs** avec permissions granulaires
- **Navigation fluide** sans rechargement de page

## 🛠 Stack Technique

### Frontend
- **React 18** avec TypeScript pour la robustesse
- **Tailwind CSS** pour un styling moderne et maintenu
- **Lucide React** pour les icônes cohérentes
- **Date-fns** pour la manipulation des dates
- **Headless UI** pour les composants accessibles

### Backend
- **Supabase** pour la base de données et authentification
- **PostgreSQL** comme système de gestion de base de données
- **Row Level Security** pour la sécurité des données

### Outils de développement
- **Vite** pour un développement rapide
- **TypeScript** pour la sécurité des types
- **ESLint** pour la qualité du code

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Supabase

### Installation

1. **Cloner le projet**
   ```bash
   git clone <repository-url>
   cd planning-ecole-saas
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration Supabase**
   ```bash
   # Créer un fichier .env.local
   cp .env.example .env.local
   
   # Ajouter vos clés Supabase
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```

5. **Accéder à l'application**
   Ouvrir [http://localhost:5173](http://localhost:5173) dans votre navigateur

## 🎨 Design System

### Palette de couleurs
```css
/* Couleurs principales */
primary: #6366f1 (Indigo premium)
secondary: #78716c (Stone élégant)
accent: #14b8a6 (Teal moderne)

/* Couleurs fonctionnelles */
success: #22c55e
warning: #f59e0b
error: #ef4444
neutral: #737373
```

### Typographie
- **Famille principale**: Inter (lecture optimale)
- **Famille d'affichage**: Poppins (titres impactants)
- **Tailles**: Échelle harmonieuse de 12px à 60px

### Espacement
- **Système 8px**: Cohérence dans tous les composants
- **Grille flexible**: Adaptation automatique aux écrans

## 📱 Composants UI

### Composants de base
- `Button` - Boutons avec variants et états
- `Input` - Champs de saisie avec validation
- `Select` - Menus déroulants stylés
- `Textarea` - Zones de texte multi-lignes
- `Card` - Conteneurs de contenu modulaires
- `Modal` - Fenêtres modales accessibles
- `Badge` - Étiquettes d'état colorées
- `LoadingSpinner` - Indicateurs de chargement

### Composants de layout
- `Header` - En-tête avec navigation et actions
- `Sidebar` - Navigation latérale adaptative
- `Layout` - Structure principale de l'application
- `PageHeader` - En-têtes de page avec breadcrumbs

## 🔐 Authentification et Rôles

### Rôles utilisateur
- **Admin**: Accès complet au système
- **Teacher**: Gestion des cours et réservations
- **Student**: Consultation du planning
- **Staff**: Gestion administrative

### Démo (développement)
```
Email: admin@demo.com
Mot de passe: password123
```

## 📊 Structure des données

### Utilisateur
```typescript
interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  schoolId: string
  avatar?: string
  createdAt: string
  updatedAt: string
}
```

### Salle
```typescript
interface Room {
  id: string
  name: string
  code: string
  capacity: number
  type: RoomType
  equipment: Equipment[]
  location: string
  description?: string
  isActive: boolean
  schoolId: string
}
```

### Réservation
```typescript
interface Booking {
  id: string
  title: string
  startTime: string
  endTime: string
  roomId: string
  userId: string
  attendeeIds: string[]
  status: BookingStatus
  type: BookingType
  recurrence?: RecurrenceRule
}
```

## 🎯 Public cible

### Établissements visés
- **Écoles privées** d'enseignement supérieur
- **Universités internationales** 
- **Centres de formation** premium
- **Instituts spécialisés**

### Caractéristiques du public
- Budget confortable pour solutions SaaS
- Exigence de qualité et d'esthétique
- Besoin de fonctionnalités avancées
- Utilisateurs technophiles

## 🚧 Développement

### Scripts disponibles
```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run preview      # Aperçu du build
npm run lint         # Vérification du code
```

### Structure du projet
```
src/
├── components/      # Composants réutilisables
│   ├── ui/         # Composants d'interface
│   └── layout/     # Composants de mise en page
├── pages/          # Pages de l'application
│   ├── auth/       # Pages d'authentification
│   └── dashboard/  # Pages du tableau de bord
├── types/          # Définitions TypeScript
├── utils/          # Fonctions utilitaires
└── styles/         # Styles globaux
```

## 📋 Roadmap

### Phase 1 ✅ (Complétée)
- [x] Design system et composants UI
- [x] Authentification et layout
- [x] Dashboard interactif
- [x] Navigation et routing

### Phase 2 🚧 (En cours)
- [ ] Gestion des salles (CRUD)
- [ ] Interface de planning visuel
- [ ] Page de profil utilisateur
- [ ] Système de notifications

### Phase 3 📋 (Planifiée)
- [ ] Gestion des cours
- [ ] Système de réservation avancé
- [ ] Statistiques et analytics
- [ ] API REST complète

### Phase 4 🔮 (Future)
- [ ] Application mobile
- [ ] Intégrations tierces
- [ ] IA pour optimisation
- [ ] Multi-tenant SaaS

## 🤝 Contribution

Ce projet suit une architecture modulaire et des conventions strictes :

1. **Composants** : Un composant par fichier
2. **Types** : Définitions centralisées
3. **Styles** : Classes Tailwind uniquement
4. **Accessibilité** : Support clavier et lecteurs d'écran

## 📄 Licence

© 2024 PlanningÉcole. Tous droits réservés.

---

**PlanningÉcole** - La solution premium pour la gestion de planning d'établissements supérieurs