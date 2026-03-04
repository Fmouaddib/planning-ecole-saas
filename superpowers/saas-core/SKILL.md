---
name: saas-core
description: Orchestrateur principal pour la construction de SaaS. Crée des applications full-stack, gère l'architecture multi-tenant, l'authentification et les paiements.
---

# SaaS Core : L'Orchestrateur de Produit 🚀

## 🧐 Quand utiliser cette compétence ?
C'est le cerveau de votre projet SaaS. Utilisez-la pour :
- **Scaffolder** un nouveau projet ou une nouvelle fonctionnalité majeure.
- **Définir la stack technique** (React, Supabase, Stripe, etc.).
- **Coordonner les autres agents** (Frontend, Backend, Database).
- **Implémenter des fonctions "Core"** : Auth, Abonnements, RLS (Row Level Security).

## 🛠️ Modules de Construction (Templates)
Cette compétence s'appuie sur des modèles éprouvés pour SaaS :
1. **Auth & Sécurité** : Gestion des rôles (Admin, Formateur, Élève) et des accès.
2. **Database SaaS** : Schémas PostgreSQL optimisés pour le multi-tenant.
3. **Paiements** : Intégration de simulateurs ou de Stripe pour les abonnements.
4. **Email & Notifications** : Setup de services comme Brevo ou Resend.

## 🚀 Workflow d'Exécution
1. **Analyse de la demande** : Décortiquer le besoin métier.
2. **Choix de la stratégie** : Déterminer si on modifie l'existant ou si on crée un nouveau moduler.
3. **Planification** : Invoquer la compétence `brainstorming` puis `planning`.
4. **Construction** : Générer le code en suivant les standards du projet (Vite + React + Supabase).
5. **Vérification** : Toujours valider les politiques RLS de Supabase pour assurer l'étanchéité des données.

---
*Réinstallé via le Créateur de Compétences - Basé sur Antigravity Kit 2.0*
