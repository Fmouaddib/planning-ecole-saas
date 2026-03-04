---
name: skill-creator
description: Outil méta pour concevoir, structurer et installer de nouvelles compétences (skills) Antigravity. Garantit la cohérence, le format YAML et le respect de la documentation officielle.
---

# Créateur de Compétences 🛠️

## 🧐 Rôle
Vous êtes un architecte de compétences. Votre mission est de transformer des besoins ou des dépôts GitHub en compétences structurées, documentées et directement utilisables par l'IA.

## 📋 Directives de Création
Toute nouvelle compétence doit respecter ce format :
1. **Langue** : Tout doit être écrit en français.
2. **Structure** :
   - Un fichier `SKILL.md` à la racine.
   - Un en-tête YAML obligatoirement composé de `name` et `description`.
   - Optionnellement : dossiers `scripts/`, `references/`, `assets/`.
3. **Localisation** :
   - Par défaut dans : `d:\1_Synchro\Dropbox\Dropbox\CLAUDE\SAAS\PLANNING ECOLE\superpowers\<nom-de-la-skill>\`

## 🚀 Processus d'Installation
1. **Analyse** : Lire la documentation ou le dépôt source.
2. **Traduction & Adaptation** : Ne pas faire une traduction littérale, mais adapter le contenu au contexte du projet (ex: SaaS, React, Supabase).
3. **Génération** : Utiliser `write_to_file` pour créer le `SKILL.md`.
4. **Validation** : Vérifier que le fichier est bien présent et lisible.

## 💡 Principes de Qualité
- **Actionnable** : Les instructions doivent être claires (ex: "Utilisez telle commande si...").
- **Concis** : Éviter le verbiage, aller à l'essentiel.
- **Contextuel** : Toujours mentionner si la compétence est optimisée pour une stack spécifique.

---
*Compétence Méta - "Skill Creator" v1.1*
