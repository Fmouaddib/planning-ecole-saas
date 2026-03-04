---
name: brainstorming
description: À utiliser avant tout travail créatif - création de fonctionnalités, construction de composants, ajout de fonctionnalités ou modification de comportement. Explore l'intention de l'utilisateur, les exigences et le design avant l'implémentation.
---

# Brainstorming : Des Idées au Design 🧠

## 🧐 Quand utiliser cette compétence ?
Utilisez cette compétence pour transformer des idées en designs et spécifications complets via un dialogue collaboratif naturel, avant d'écrire le moindre code.

## 🚨 Règle stricte (Hard Gate)
NE DÉMARREZ AUCUNE implémentation (ne touchez pas au code, ne créez pas de fichiers) tant que vous n'avez pas présenté un design et que l'utilisateur ne l'a pas validé. Ceci s'applique à TOUS les projets, même les plus simples. "C'est trop simple pour avoir besoin d'un design" est un anti-pattern.

## 🚀 Procédure de Création (Checklist)
Accomplissez ces étapes dans l'ordre :
1. **Explorer le contexte du projet** : Consultez les fichiers, la documentation, les commits récents.
2. **Poser des questions de clarification** : Une à la fois, pour comprendre l'objectif, les contraintes et les critères de succès.
3. **Proposer 2-3 approches** : Avec leurs avantages/inconvénients de manière conversationnelle et donner votre recommandation.
4. **Présenter le design** : En sections proportionnelles à leur complexité, et demander l'approbation de l'utilisateur après chaque section.
5. **Rédiger le document de design** : Sauvegarder l'approche validée dans `docs/plans/YYYY-MM-DD-<sujet>-design.md` et le commiter.
6. **Passer à l'implémentation** : Invoquer la compétence `planning` pour créer le plan d'implémentation de ce design.

## 💡 Meilleures Pratiques pour le Dialogue
- **Une seule question à la fois** : Ne submergez pas l'utilisateur avec de multiples interrogations d'un coup.
- **Choix multiples préférés** : C'est souvent plus facile à répondre que des questions ouvertes.
- **YAGNI (You Aren't Gonna Need It)** : Soyez impitoyable pour retirer les fonctionnalités complètement inutiles de tous vos designs.
- **Flexibilité** : Soyez prêt à revenir en arrière et à clarifier si quelque chose n'a pas de sens ou ne plaît pas.

---
*Réinstallé via le Créateur de Compétences - Basé sur obra/superpowers*
