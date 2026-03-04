---
name: planning
description: À utiliser lorsque vous avez des spécifications ou des exigences pour une tâche multi-étapes, AVANT de commencer à coder. Écrit des plans d'implémentation détaillés pour que l'exécution se déroule sans encombre.
---

# Planification d'Implémentation 📋

## 🧐 Quand utiliser cette compétence ?
Après avoir terminé la phase de brainstorming ou dès lors que vous disposez d'un cahier des charges clair pour une nouvelle fonctionnalité. Elle permet de structurer le travail technique en petites étapes digestes (2-5 minutes chacune).

## 🚀 Le Concept Central
Rédigez un plan d'implémentation complet en supposant que le développeur (ou l'agent qui exécutera la tâche) :
- N'a **aucun contexte** sur notre base de code.
- Ne connaît pas très bien les bonnes pratiques de test.
- A besoin qu'on lui mâche le travail en spécifiant **exactement** quels fichiers modifier, quel code écrire et comment le tester.
- Applique les principes **DRY** (Don't Repeat Yourself), **YAGNI** (You Aren't Gonna Need It) et **TDD** (Test-Driven Development).

## 📝 Structure du Plan (Document)
Le plan doit être sauvegardé dans : `docs/plans/YYYY-MM-DD-<nom-de-la-fonctionnalite>.md`

**En-tête obligatoire :**
```markdown
# Plan d'Implémentation : [Nom de la Fonctionnalité]

> **Pour l'Agent :** COMPÉTENCE REQUISE SOUS-JACENTE : Utiliser la compétence appropriée pour exécuter ce plan tâche par tâche.

**Objectif :** [Une phrase décrivant ce qui va être construit]
**Architecture :** [2-3 phrases sur l'approche globale]
**Stack Technique :** [Technologies/bibliothèques clés]
```

## 🛠️ Granularité des Tâches (Format)
Chaque "Tâche Principale" regroupe les actions d'un composant, décomposées en petites étapes (Bite-Sized) d'une seule action.

**Structure d'une Tâche (Exemple) :**
```markdown
### Tâche N : [Nom du Composant]
**Fichiers :**
- Créer : `chemin/exact/vers/fichier.ts`
- Modifier : `chemin/exact/vers/existant.ts:Lignes 10-25`
- Tester : `tests/chemin/exact/vers/test.ts`

**Étape 1 : Écrire le test qui échoue (TDD)**
(Insérer le code complet du test)

**Étape 2 : Lancer le test pour vérifier l'échec**
Exécuter : `npm test path/test.ts`
Attendu : ÉCHEC "Fonction non définie"

---
*Réinstallé via le Créateur de Compétences - Basé sur obra/superpowers*
