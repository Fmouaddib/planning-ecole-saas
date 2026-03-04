---
name: api-patterns
description: Principes de conception d'API et prise de décision. REST vs GraphQL vs tRPC, formats de réponse, versionnement, pagination.
---

# API SaaS & Communication 🔌

## 🧐 Quand utiliser cette compétence ?
Utilisez cette compétence pour concevoir la couche de communication de votre application :
- Création de **hooks API** (React Query) pour Supabase.
- Mise en place de **Server Actions** ou d'API Routes.
- Gestion des **Webhooks** (pour les paiements ou les notifications).
- Décoration des données (transformation avant affichage).

## 🚀 Patterns SaaS (Checklist)
Accomplissez ces étapes dans l'ordre :
1. **Choisir le format** : REST (standard Supabase) ou RPC (fonctions spécifiques).
2. **Gérer les états** : Utiliser `useQuery` pour la récupération et `useMutation` pour les changements.
3. **Optimisation** : Pagination systématique pour les listes de sessions ou de participants.
4. **Gestion d'erreurs** : Toujours renvoyer des messages d'erreur clairs (utilisables par Toast UI).
5. **Types API** : Garder une synchronisation stricte entre les types de retour SQL et le frontend.

---
*Réinstallé via le Créateur de Compétences - Basé sur Antigravity Kit 2.0*
