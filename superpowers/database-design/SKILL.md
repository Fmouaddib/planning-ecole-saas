---
name: database-design
description: Principes de conception de base de données et prise de décision. Conception de schéma, stratégie d'indexation, choix d'ORM, bases de données serverless (Supabase).
---

# Conception de Base de Données SaaS 🗄️

## 🧐 Quand utiliser cette compétence ?
Dès qu'un changement implique de nouvelles tables, des relations complexes, ou l'ajout de types TypeScript pour les données. Spécialement optimisé pour l'écosystème **Supabase (PostgreSQL)**.

## 🚀 Principes Fondamentaux (Checklist)
Accomplissez ces étapes dans l'ordre :
1. **Analyser les entités** : Identifier les Objets (Salles, Sessions, Étudiants) et leurs attributs.
2. **Définir les relations** : Un-à-plusieurs, Plusieurs-à-plusieurs (sessions <-> participants).
3. **Optimiser pour le SaaS** : S'assurer que chaque table a un `school_id` ou un `user_id` pour le multi-tenant.
4. **Appliquer les politiques RLS** : Sécuriser les accès au niveau de la ligne dans PostgreSQL.
5. **Générer les types TypeScript** : Mettre à jour `src/types/index.ts` dès qu'un changement de schéma a lieu.

## ⚠️ Standards Techniques
- **Clés primaires** : Utiliser `uuid` par défaut.
- **Timestamps** : Toujours inclure `created_at` et `updated_at`.
- **Nommage** : `snake_case` pour les tables et colonnes SQL, `camelCase` pour les objets TypeScript.

---
*Réinstallé via le Créateur de Compétences - Basé sur Antigravity Kit 2.0*
