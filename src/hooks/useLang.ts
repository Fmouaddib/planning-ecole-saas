import { useState, useCallback } from 'react'

type Lang = 'fr' | 'en'

const translations: Record<string, Record<Lang, string>> = {
  // Navbar
  'nav.features': { fr: 'Fonctionnalités', en: 'Features' },
  'nav.howItWorks': { fr: 'Comment ça marche', en: 'How it works' },
  'nav.testimonials': { fr: 'Témoignages', en: 'Testimonials' },
  'nav.pricing': { fr: 'Tarifs', en: 'Pricing' },
  'nav.faq': { fr: 'FAQ', en: 'FAQ' },
  'nav.about': { fr: 'À propos', en: 'About' },
  'nav.login': { fr: 'Connexion', en: 'Login' },
  'nav.start': { fr: 'Commencer', en: 'Get Started' },

  // Hero
  'hero.title': { fr: 'Révolutionnez votre gestion de planning', en: 'Revolutionize your schedule management' },
  'hero.subtitle': {
    fr: 'La plateforme intelligente qui simplifie la planification des cours, la gestion des salles et la coordination des équipes pour votre établissement.',
    en: 'The intelligent platform that simplifies course scheduling, room management and team coordination for your institution.',
  },
  'hero.cta.primary': { fr: 'Créer mon établissement', en: 'Create my institution' },
  'hero.cta.secondary': { fr: 'Voir les fonctionnalités', en: 'See features' },
  'hero.cta.secondary.join': { fr: 'Rejoindre un établissement', en: 'Join an institution' },

  // Features
  'features.section': { fr: 'Fonctionnalités', en: 'Features' },
  'features.title': { fr: 'Tout ce dont vous avez besoin', en: 'Everything you need' },
  'features.subtitle': {
    fr: 'Des outils puissants conçus pour simplifier la gestion de votre établissement.',
    en: 'Powerful tools designed to simplify your institution management.',
  },
  'features.calendar.title': { fr: 'Calendrier intelligent', en: 'Smart Calendar' },
  'features.calendar.desc': {
    fr: 'Visualisez et gérez tous vos plannings en un coup d\'œil avec notre calendrier interactif et intuitif.',
    en: 'Visualize and manage all your schedules at a glance with our interactive and intuitive calendar.',
  },
  'features.conflict.title': { fr: 'Détection de conflits', en: 'Conflict Detection' },
  'features.conflict.desc': {
    fr: 'Notre algorithme détecte automatiquement les chevauchements de salles, d\'enseignants et de créneaux.',
    en: 'Our algorithm automatically detects room, teacher and time slot overlaps.',
  },
  'features.zoom.title': { fr: 'Intégration Teams & Zoom', en: 'Teams & Zoom Integration' },
  'features.zoom.desc': {
    fr: 'Créez automatiquement des liens Teams ou Zoom pour vos cours en ligne et réunions hybrides.',
    en: 'Automatically create Teams or Zoom links for your online classes and hybrid meetings.',
  },
  'features.email.title': { fr: 'Emails automatiques', en: 'Automatic Emails' },
  'features.email.desc': {
    fr: 'Notifications et rappels automatiques envoyés aux enseignants et étudiants concernés.',
    en: 'Automatic notifications and reminders sent to relevant teachers and students.',
  },
  'features.reports.title': { fr: 'Export & Rapports', en: 'Export & Reports' },
  'features.reports.desc': {
    fr: 'Exportez vos plannings en PDF, Excel ou CSV et générez des rapports d\'occupation détaillés.',
    en: 'Export your schedules as PDF, Excel or CSV and generate detailed occupancy reports.',
  },
  'features.multiCampus.title': { fr: 'Multi-campus', en: 'Multi-campus' },
  'features.multiCampus.desc': {
    fr: 'Gérez plusieurs campus depuis une seule interface avec des droits d\'accès granulaires.',
    en: 'Manage multiple campuses from a single interface with granular access rights.',
  },
  'features.academic.title': { fr: 'Référentiel académique', en: 'Academic Framework' },
  'features.academic.desc': {
    fr: 'Structurez vos diplômes, programmes, matières et classes dans une hiérarchie claire.',
    en: 'Structure your diplomas, programs, subjects and classes in a clear hierarchy.',
  },
  'features.mobile.title': { fr: 'Mobile responsive', en: 'Mobile Responsive' },
  'features.mobile.desc': {
    fr: 'Accédez à votre planning depuis n\'importe quel appareil, smartphone ou tablette.',
    en: 'Access your schedule from any device, smartphone or tablet.',
  },
  'features.learnMore': { fr: 'Découvrir toutes les fonctionnalités', en: 'Discover all features' },

  // How it works
  'howItWorks.section': { fr: 'Comment ça marche', en: 'How it works' },
  'howItWorks.title': { fr: 'Démarrez en 3 étapes simples', en: 'Get started in 3 simple steps' },
  'howItWorks.subtitle': {
    fr: 'De la création de votre compte à la planification de vos séances, tout est conçu pour être rapide et intuitif.',
    en: 'From creating your account to scheduling your sessions, everything is designed to be fast and intuitive.',
  },
  'howItWorks.step1.title': { fr: 'Créez votre compte', en: 'Create your account' },
  'howItWorks.step1.desc': {
    fr: 'Inscrivez-vous gratuitement en quelques secondes et créez votre premier établissement.',
    en: 'Sign up for free in seconds and create your first institution.',
  },
  'howItWorks.step2.title': { fr: 'Configurez votre centre', en: 'Configure your center' },
  'howItWorks.step2.desc': {
    fr: 'Ajoutez vos salles, enseignants, matières et classes. Importez vos données existantes.',
    en: 'Add your rooms, teachers, subjects and classes. Import your existing data.',
  },
  'howItWorks.step3.title': { fr: 'Planifiez vos séances', en: 'Schedule your sessions' },
  'howItWorks.step3.desc': {
    fr: 'Créez vos séances en glisser-déposer. La détection de conflits vous guide en temps réel.',
    en: 'Create your sessions with drag and drop. Conflict detection guides you in real time.',
  },
  'howItWorks.learnMore': { fr: 'En savoir plus sur le fonctionnement', en: 'Learn more about how it works' },

  // Feature showcase
  'showcase.calendar.label': { fr: 'Vue calendrier', en: 'Calendar view' },
  'showcase.calendar.title': { fr: 'Un calendrier pensé pour l\'éducation', en: 'A calendar designed for education' },
  'showcase.calendar.desc': {
    fr: 'Visualisez vos plannings en vue jour, semaine, mois ou liste. Filtrez par salle, enseignant ou classe en un clic.',
    en: 'View your schedules in day, week, month or list view. Filter by room, teacher or class in one click.',
  },
  'showcase.calendar.b1': { fr: '4 vues : jour, semaine, mois, liste', en: '4 views: day, week, month, list' },
  'showcase.calendar.b2': { fr: 'Filtres avancés par salle, enseignant, classe', en: 'Advanced filters by room, teacher, class' },
  'showcase.calendar.b3': { fr: 'Glisser-déposer pour modifier les séances', en: 'Drag and drop to modify sessions' },
  'showcase.calendar.b4': { fr: 'Code couleur par type de séance', en: 'Color coding by session type' },

  'showcase.conflict.label': { fr: 'Détection de conflits', en: 'Conflict detection' },
  'showcase.conflict.title': { fr: 'Zéro conflit, zéro stress', en: 'Zero conflicts, zero stress' },
  'showcase.conflict.desc': {
    fr: 'Notre moteur de détection vérifie en temps réel la disponibilité des salles, enseignants et créneaux avant chaque création.',
    en: 'Our detection engine checks room, teacher and slot availability in real time before each creation.',
  },
  'showcase.conflict.b1': { fr: 'Vérification en temps réel des disponibilités', en: 'Real-time availability checking' },
  'showcase.conflict.b2': { fr: 'Alertes visuelles sur les chevauchements', en: 'Visual alerts on overlaps' },
  'showcase.conflict.b3': { fr: 'Suggestions automatiques de créneaux libres', en: 'Automatic free slot suggestions' },

  'showcase.academic.label': { fr: 'Gestion académique', en: 'Academic management' },
  'showcase.academic.title': { fr: 'Structurez votre offre de formation', en: 'Structure your training offer' },
  'showcase.academic.desc': {
    fr: 'Organisez votre référentiel en hiérarchie Diplôme → Programme → Matière. Affectez les enseignants et les classes en quelques clics.',
    en: 'Organize your framework in a Diploma → Program → Subject hierarchy. Assign teachers and classes in a few clicks.',
  },
  'showcase.academic.b1': { fr: 'Hiérarchie Diplôme → Programme → Matière', en: 'Diploma → Program → Subject hierarchy' },
  'showcase.academic.b2': { fr: 'Affectation enseignants-matières', en: 'Teacher-subject assignment' },
  'showcase.academic.b3': { fr: 'Profils de planification par classe', en: 'Class scheduling profiles' },
  'showcase.academic.b4': { fr: 'Volume horaire configurable', en: 'Configurable hour volume' },

  // Testimonials
  'testimonials.section': { fr: 'Témoignages', en: 'Testimonials' },
  'testimonials.title': { fr: 'Ce que nos utilisateurs en pensent', en: 'What our users think' },
  'testimonials.subtitle': {
    fr: 'Découvrez pourquoi nos utilisateurs ont adopté AntiPlanning.',
    en: 'Discover why our users have adopted AntiPlanning.',
  },
  'testimonial.1.quote': {
    fr: 'AntiPlanning a transformé notre organisation. Nous avons réduit de 80% le temps passé sur la planification et éliminé les conflits de salles.',
    en: 'AntiPlanning has transformed our organization. We reduced planning time by 80% and eliminated room conflicts.',
  },
  'testimonial.1.name': { fr: 'Marie Dupont', en: 'Marie Dupont' },
  'testimonial.1.role': { fr: 'Directrice — Institut Supérieur de Commerce', en: 'Director — Higher Business Institute' },
  'testimonial.2.quote': {
    fr: 'L\'interface est intuitive et la détection de conflits nous fait gagner un temps précieux chaque semaine. Un outil indispensable.',
    en: 'The interface is intuitive and conflict detection saves us valuable time every week. An indispensable tool.',
  },
  'testimonial.2.name': { fr: 'Thomas Bernard', en: 'Thomas Bernard' },
  'testimonial.2.role': { fr: 'Responsable planning — Centre de Formation ProTech', en: 'Planning Manager — ProTech Training Center' },
  'testimonial.3.quote': {
    fr: 'En tant qu\'enseignant, j\'apprécie de pouvoir consulter mon planning à jour depuis mon téléphone. Fini les surprises en arrivant le matin.',
    en: 'As a teacher, I appreciate being able to check my up-to-date schedule from my phone. No more surprises in the morning.',
  },
  'testimonial.3.name': { fr: 'Sophie Martin', en: 'Sophie Martin' },
  'testimonial.3.role': { fr: 'Enseignante — Lycée International de Lyon', en: 'Teacher — Lyon International High School' },

  // Pricing
  'pricing.section': { fr: 'Tarifs', en: 'Pricing' },
  'pricing.title': { fr: 'Des tarifs simples et transparents', en: 'Simple and transparent pricing' },
  'pricing.subtitle': {
    fr: 'Choisissez le plan adapté à la taille de votre établissement.',
    en: 'Choose the plan that fits your institution size.',
  },
  'pricing.monthly': { fr: 'Mensuel', en: 'Monthly' },
  'pricing.annual': { fr: 'Annuel', en: 'Annual' },
  'pricing.annual.save': { fr: 'Économisez 20%', en: 'Save 20%' },
  'pricing.mo': { fr: '/mois', en: '/mo' },
  'pricing.popular': { fr: 'Populaire', en: 'Popular' },
  'pricing.cta.free': { fr: 'Commencer gratuitement', en: 'Start for free' },
  'pricing.cta.pro': { fr: 'Essayer Pro', en: 'Try Pro' },
  'pricing.cta.enterprise': { fr: 'Contacter les ventes', en: 'Contact sales' },
  'pricing.cta.ecole': { fr: 'Essayer École en ligne', en: 'Try Online School' },

  // Plan names
  'plan.free': { fr: 'Gratuit', en: 'Free' },
  'plan.pro': { fr: 'Pro', en: 'Pro' },
  'plan.ecole': { fr: 'École en ligne', en: 'Online School' },
  'plan.enterprise': { fr: 'Enterprise', en: 'Enterprise' },

  // Plan features
  'plan.free.f1': { fr: 'Jusqu\'à 3 profs', en: 'Up to 3 teachers' },
  'plan.free.f2': { fr: '3 salles maximum', en: '3 rooms maximum' },
  'plan.free.f3': { fr: '50 séances/mois', en: '50 bookings/month' },
  'plan.free.f4': { fr: 'Calendrier de base', en: 'Basic calendar' },
  'plan.pro.f1': { fr: 'Jusqu\'à 15 profs', en: 'Up to 15 teachers' },
  'plan.pro.f2': { fr: 'Salles illimitées', en: 'Unlimited rooms' },
  'plan.pro.f3': { fr: 'Séances illimitées', en: 'Unlimited bookings' },
  'plan.pro.f4': { fr: 'Détection de conflits', en: 'Conflict detection' },
  'plan.pro.f5': { fr: 'Intégration Teams & Zoom', en: 'Teams & Zoom integration' },
  'plan.pro.f6': { fr: 'Support prioritaire', en: 'Priority support' },
  'plan.ecole.f1': { fr: 'Jusqu\'à 15 profs', en: 'Up to 15 teachers' },
  'plan.ecole.f2': { fr: 'Jusqu\'à 200 étudiants', en: 'Up to 200 students' },
  'plan.ecole.f3': { fr: 'Intégration Teams & Zoom', en: 'Teams & Zoom integration' },
  'plan.ecole.f4': { fr: 'Séances illimitées', en: 'Unlimited sessions' },
  'plan.ecole.f5': { fr: 'Comptes étudiants avec planning', en: 'Student accounts with schedule' },
  'plan.ecole.f6': { fr: 'Support prioritaire', en: 'Priority support' },
  'plan.enterprise.f1': { fr: 'Utilisateurs illimités', en: 'Unlimited users' },
  'plan.enterprise.f2': { fr: 'Multi-établissements', en: 'Multi-campus' },
  'plan.enterprise.f3': { fr: 'API & webhooks', en: 'API & webhooks' },
  'plan.enterprise.f4': { fr: 'SSO / SAML', en: 'SSO / SAML' },
  'plan.enterprise.f5': { fr: 'SLA garanti 99.9%', en: '99.9% SLA guarantee' },
  'plan.enterprise.f6': { fr: 'Account manager dédié', en: 'Dedicated account manager' },

  // FAQ
  'faq.section': { fr: 'FAQ', en: 'FAQ' },
  'faq.title': { fr: 'Questions fréquentes', en: 'Frequently asked questions' },
  'faq.subtitle': {
    fr: 'Tout ce que vous devez savoir sur AntiPlanning.',
    en: 'Everything you need to know about AntiPlanning.',
  },
  'faq.1.q': { fr: 'Puis-je essayer gratuitement ?', en: 'Can I try for free?' },
  'faq.1.a': {
    fr: 'Oui ! Le plan Gratuit vous permet de tester AntiPlanning avec jusqu\'à 5 utilisateurs et 3 salles. Aucune carte bancaire requise.',
    en: 'Yes! The Free plan lets you test AntiPlanning with up to 5 users and 3 rooms. No credit card required.',
  },
  'faq.2.q': { fr: 'Puis-je importer mes données existantes ?', en: 'Can I import my existing data?' },
  'faq.2.a': {
    fr: 'Absolument. Vous pouvez importer vos salles, enseignants et classes via fichier CSV ou Excel. Notre équipe peut aussi vous aider lors de la migration.',
    en: 'Absolutely. You can import your rooms, teachers and classes via CSV or Excel file. Our team can also help during migration.',
  },
  'faq.3.q': { fr: 'AntiPlanning supporte-t-il le multi-campus ?', en: 'Does AntiPlanning support multi-campus?' },
  'faq.3.a': {
    fr: 'Oui, le plan Enterprise permet de gérer plusieurs campus depuis une interface centralisée avec des droits d\'accès distincts par site.',
    en: 'Yes, the Enterprise plan allows managing multiple campuses from a centralized interface with distinct access rights per site.',
  },
  'faq.4.q': { fr: 'Mes données sont-elles sécurisées ?', en: 'Is my data secure?' },
  'faq.4.a': {
    fr: 'Vos données sont hébergées en Europe sur des serveurs certifiés. Toutes les communications sont chiffrées en TLS 1.3 et nous appliquons les meilleures pratiques RGPD.',
    en: 'Your data is hosted in Europe on certified servers. All communications are encrypted with TLS 1.3 and we follow GDPR best practices.',
  },
  'faq.5.q': { fr: 'Quel support est disponible ?', en: 'What support is available?' },
  'faq.5.a': {
    fr: 'Le plan Gratuit inclut le support par email. Les plans Pro et Enterprise bénéficient d\'un support prioritaire avec temps de réponse garanti et account manager dédié.',
    en: 'The Free plan includes email support. Pro and Enterprise plans get priority support with guaranteed response time and a dedicated account manager.',
  },
  'faq.6.q': { fr: 'Puis-je annuler à tout moment ?', en: 'Can I cancel at any time?' },
  'faq.6.a': {
    fr: 'Oui, vous pouvez annuler votre abonnement à tout moment depuis votre espace de gestion. Vos données restent accessibles pendant 30 jours après l\'annulation.',
    en: 'Yes, you can cancel your subscription at any time from your management area. Your data remains accessible for 30 days after cancellation.',
  },

  // CTA section
  'cta.title': { fr: 'Prêt à transformer votre planning ?', en: 'Ready to transform your schedule?' },
  'cta.subtitle': {
    fr: 'Rejoignez les établissements qui font confiance à AntiPlanning.',
    en: 'Join the institutions that trust AntiPlanning.',
  },
  'cta.button': { fr: 'Créer mon établissement', en: 'Create my institution' },
  'cta.quote': {
    fr: '« Le meilleur investissement que nous ayons fait pour notre organisation cette année. »',
    en: '"The best investment we made for our organization this year."',
  },
  'cta.quoteAuthor': { fr: '— Marie Dupont, Directrice ISC', en: '— Marie Dupont, Director ISC' },

  // Footer
  'footer.tagline': {
    fr: 'La gestion de planning intelligente pour l\'éducation.',
    en: 'Smart schedule management for education.',
  },
  'footer.product': { fr: 'Produit', en: 'Product' },
  'footer.legal': { fr: 'Légal', en: 'Legal' },
  'footer.resources': { fr: 'Ressources', en: 'Resources' },
  'footer.support': { fr: 'Support', en: 'Support' },
  'footer.features': { fr: 'Fonctionnalités', en: 'Features' },
  'footer.howItWorks': { fr: 'Comment ça marche', en: 'How it works' },
  'footer.pricing': { fr: 'Tarifs', en: 'Pricing' },
  'footer.terms': { fr: 'Conditions d\'utilisation', en: 'Terms of Service' },
  'footer.privacy': { fr: 'Politique de confidentialité', en: 'Privacy Policy' },
  'footer.blog': { fr: 'Blog', en: 'Blog' },
  'footer.docs': { fr: 'Documentation', en: 'Documentation' },
  'footer.guides': { fr: 'Guides', en: 'Guides' },
  'footer.helpCenter': { fr: 'Centre d\'aide', en: 'Help Center' },
  'footer.contact': { fr: 'Nous contacter', en: 'Contact us' },
  'footer.status': { fr: 'Statut des services', en: 'Service status' },
  'footer.copyright': { fr: '© 2026 AntiPlanning. Tous droits réservés.', en: '© 2026 AntiPlanning. All rights reserved.' },

  // Auth back link
  'auth.back': { fr: '← Retour à l\'accueil', en: '← Back to home' },

  // ===================== FEATURES PAGE =====================
  'featuresPage.hero.label': { fr: 'Fonctionnalités', en: 'Features' },
  'featuresPage.hero.title': { fr: 'Toutes nos fonctionnalités', en: 'All our features' },
  'featuresPage.hero.subtitle': {
    fr: 'Découvrez en détail chaque outil conçu pour simplifier la gestion de votre établissement.',
    en: 'Discover in detail each tool designed to simplify your institution management.',
  },

  'featuresPage.calendar.title': { fr: 'Calendrier intelligent', en: 'Smart Calendar' },
  'featuresPage.calendar.desc': {
    fr: 'Notre calendrier interactif vous offre une vision claire et complète de l\'ensemble de vos plannings. Basculez entre les vues jour, semaine, mois et liste selon vos besoins. Chaque séance est codée par couleur pour un repérage instantané.',
    en: 'Our interactive calendar gives you a clear and complete view of all your schedules. Switch between day, week, month and list views as needed. Each session is color-coded for instant recognition.',
  },
  'featuresPage.calendar.b1': { fr: '4 vues interchangeables : jour, semaine, mois, liste', en: '4 interchangeable views: day, week, month, list' },
  'featuresPage.calendar.b2': { fr: 'Filtres par salle, enseignant, classe ou matière', en: 'Filters by room, teacher, class or subject' },
  'featuresPage.calendar.b3': { fr: 'Glisser-déposer pour créer et modifier les séances', en: 'Drag and drop to create and modify sessions' },
  'featuresPage.calendar.b4': { fr: 'Code couleur par type (présentiel, en ligne, hybride)', en: 'Color coding by type (in-person, online, hybrid)' },
  'featuresPage.calendar.b5': { fr: 'Navigation rapide par semaine et par mois', en: 'Quick navigation by week and month' },

  'featuresPage.conflict.title': { fr: 'Détection de conflits en temps réel', en: 'Real-time conflict detection' },
  'featuresPage.conflict.desc': {
    fr: 'Fini les doublons et les chevauchements. Notre algorithme vérifie automatiquement la disponibilité de chaque salle, enseignant et créneau avant la création d\'une séance. Des alertes visuelles vous préviennent immédiatement en cas de conflit.',
    en: 'No more duplicates and overlaps. Our algorithm automatically checks the availability of each room, teacher and slot before creating a session. Visual alerts warn you immediately in case of conflict.',
  },
  'featuresPage.conflict.b1': { fr: 'Vérification automatique avant chaque création', en: 'Automatic check before each creation' },
  'featuresPage.conflict.b2': { fr: 'Alertes visuelles claires sur les chevauchements', en: 'Clear visual alerts on overlaps' },
  'featuresPage.conflict.b3': { fr: 'Vérification salles, enseignants et classes', en: 'Room, teacher and class verification' },
  'featuresPage.conflict.b4': { fr: 'Suggestions de créneaux alternatifs disponibles', en: 'Available alternative slot suggestions' },

  'featuresPage.zoom.title': { fr: 'Intégration Teams & Zoom', en: 'Teams & Zoom Integration' },
  'featuresPage.zoom.desc': {
    fr: 'Ajoutez vos liens Microsoft Teams ou Zoom directement dans vos séances. Le lien est accessible par les étudiants depuis leur planning personnel.',
    en: 'Add your Microsoft Teams or Zoom links directly to your sessions. The link is accessible by students from their personal schedule.',
  },
  'featuresPage.zoom.b1': { fr: 'Compatible Microsoft Teams et Zoom', en: 'Compatible with Microsoft Teams and Zoom' },
  'featuresPage.zoom.b2': { fr: 'Support des sessions hybrides (présentiel + en ligne)', en: 'Hybrid session support (in-person + online)' },
  'featuresPage.zoom.b3': { fr: 'Lien cliquable depuis le détail de la séance', en: 'Clickable link from session details' },
  'featuresPage.zoom.b4': { fr: 'Mode présentiel, en ligne ou hybride par séance', en: 'In-person, online or hybrid mode per session' },

  'featuresPage.email.title': { fr: 'Notifications et emails automatiques', en: 'Automatic notifications and emails' },
  'featuresPage.email.desc': {
    fr: 'Gardez tout le monde informé sans effort. Des notifications automatiques sont envoyées lors de la création, modification ou annulation d\'une séance. Les rappels avant les cours réduisent les absences.',
    en: 'Keep everyone informed effortlessly. Automatic notifications are sent when a session is created, modified or cancelled. Pre-class reminders reduce absences.',
  },
  'featuresPage.email.b1': { fr: 'Notifications à la création et modification de séances', en: 'Notifications on session creation and modification' },
  'featuresPage.email.b2': { fr: 'Rappels automatiques avant chaque cours', en: 'Automatic reminders before each class' },
  'featuresPage.email.b3': { fr: 'Alertes d\'annulation envoyées en temps réel', en: 'Cancellation alerts sent in real time' },
  'featuresPage.email.b4': { fr: 'Emails personnalisables par établissement', en: 'Customizable emails per institution' },

  'featuresPage.reports.title': { fr: 'Export et rapports détaillés', en: 'Export and detailed reports' },
  'featuresPage.reports.desc': {
    fr: 'Exportez vos plannings et données en un clic. Générez des rapports d\'occupation des salles, de charge enseignante et d\'heures par classe pour piloter votre établissement.',
    en: 'Export your schedules and data in one click. Generate room occupancy, teacher workload and class hours reports to manage your institution.',
  },
  'featuresPage.reports.b1': { fr: 'Export PDF, Excel et CSV', en: 'PDF, Excel and CSV export' },
  'featuresPage.reports.b2': { fr: 'Rapports d\'occupation des salles', en: 'Room occupancy reports' },
  'featuresPage.reports.b3': { fr: 'Suivi de la charge enseignante', en: 'Teacher workload tracking' },
  'featuresPage.reports.b4': { fr: 'Statistiques par classe et par matière', en: 'Statistics by class and subject' },

  'featuresPage.multiCampus.title': { fr: 'Gestion multi-campus', en: 'Multi-campus management' },
  'featuresPage.multiCampus.desc': {
    fr: 'Pilotez plusieurs sites depuis une interface unique. Chaque campus dispose de ses propres salles, enseignants et plannings, avec une vue consolidée pour la direction.',
    en: 'Manage multiple sites from a single interface. Each campus has its own rooms, teachers and schedules, with a consolidated view for management.',
  },
  'featuresPage.multiCampus.b1': { fr: 'Interface centralisée pour tous les sites', en: 'Centralized interface for all sites' },
  'featuresPage.multiCampus.b2': { fr: 'Droits d\'accès granulaires par campus', en: 'Granular access rights per campus' },
  'featuresPage.multiCampus.b3': { fr: 'Vue consolidée pour la direction', en: 'Consolidated view for management' },
  'featuresPage.multiCampus.b4': { fr: 'Partage d\'enseignants entre campus', en: 'Teacher sharing between campuses' },

  'featuresPage.academic.title': { fr: 'Référentiel académique complet', en: 'Complete academic framework' },
  'featuresPage.academic.desc': {
    fr: 'Structurez votre offre de formation avec une hiérarchie claire : Diplôme → Programme → Matière. Affectez les enseignants aux matières et les matières aux classes en quelques clics.',
    en: 'Structure your training offer with a clear hierarchy: Diploma → Program → Subject. Assign teachers to subjects and subjects to classes in a few clicks.',
  },
  'featuresPage.academic.b1': { fr: 'Hiérarchie Diplôme → Programme → Matière', en: 'Diploma → Program → Subject hierarchy' },
  'featuresPage.academic.b2': { fr: 'Affectation enseignants-matières en un clic', en: 'One-click teacher-subject assignment' },
  'featuresPage.academic.b3': { fr: 'Profils de planification par classe', en: 'Class scheduling profiles' },
  'featuresPage.academic.b4': { fr: 'Volume horaire et jours configurables', en: 'Configurable hours and days' },
  'featuresPage.academic.b5': { fr: 'Périodes d\'examens intégrées', en: 'Integrated exam periods' },

  'featuresPage.mobile.title': { fr: 'Accès mobile responsive', en: 'Responsive mobile access' },
  'featuresPage.mobile.desc': {
    fr: 'Consultez et gérez vos plannings depuis n\'importe quel appareil. L\'interface s\'adapte automatiquement aux smartphones et tablettes pour une expérience optimale en mobilité.',
    en: 'View and manage your schedules from any device. The interface automatically adapts to smartphones and tablets for an optimal mobile experience.',
  },
  'featuresPage.mobile.b1': { fr: 'Interface adaptative smartphones et tablettes', en: 'Adaptive smartphone and tablet interface' },
  'featuresPage.mobile.b2': { fr: 'Consultation du planning en temps réel', en: 'Real-time schedule viewing' },
  'featuresPage.mobile.b3': { fr: 'Notifications push sur mobile', en: 'Mobile push notifications' },
  'featuresPage.mobile.b4': { fr: 'Aucune application à installer', en: 'No app to install' },

  'featuresPage.cta.title': { fr: 'Prêt à découvrir AntiPlanning ?', en: 'Ready to discover AntiPlanning?' },
  'featuresPage.cta.subtitle': {
    fr: 'Créez votre compte gratuitement et testez toutes les fonctionnalités.',
    en: 'Create your free account and test all features.',
  },

  // ===================== HOW IT WORKS PAGE =====================
  'howItWorksPage.hero.label': { fr: 'Comment ça marche', en: 'How it works' },
  'howItWorksPage.hero.title': { fr: 'Comment fonctionne AntiPlanning', en: 'How AntiPlanning works' },
  'howItWorksPage.hero.subtitle': {
    fr: 'De votre inscription à la planification quotidienne, découvrez chaque étape en détail.',
    en: 'From your registration to daily scheduling, discover each step in detail.',
  },

  'howItWorksPage.step1.title': { fr: 'Créez votre compte en 30 secondes', en: 'Create your account in 30 seconds' },
  'howItWorksPage.step1.desc': {
    fr: 'L\'inscription est gratuite et ne nécessite aucune carte bancaire. Renseignez votre email, créez un mot de passe et vous êtes prêt. Vous pouvez créer un nouvel établissement ou rejoindre un établissement existant avec un code d\'invitation.',
    en: 'Registration is free and requires no credit card. Enter your email, create a password and you\'re ready. You can create a new institution or join an existing one with an invitation code.',
  },
  'howItWorksPage.step1.b1': { fr: 'Inscription gratuite sans carte bancaire', en: 'Free registration without credit card' },
  'howItWorksPage.step1.b2': { fr: 'Création d\'établissement ou rejoindre via code', en: 'Create institution or join via code' },
  'howItWorksPage.step1.b3': { fr: 'Profil configuré en quelques clics', en: 'Profile configured in a few clicks' },

  'howItWorksPage.step2.title': { fr: 'Configurez votre établissement', en: 'Configure your institution' },
  'howItWorksPage.step2.desc': {
    fr: 'Ajoutez vos salles avec leurs équipements et capacités. Créez votre référentiel académique (diplômes, programmes, matières). Invitez vos enseignants et votre équipe. Tout est guidé étape par étape.',
    en: 'Add your rooms with their equipment and capacities. Create your academic framework (diplomas, programs, subjects). Invite your teachers and team. Everything is guided step by step.',
  },
  'howItWorksPage.step2.b1': { fr: 'Ajout de salles avec équipements et capacité', en: 'Add rooms with equipment and capacity' },
  'howItWorksPage.step2.b2': { fr: 'Création du référentiel académique complet', en: 'Create complete academic framework' },
  'howItWorksPage.step2.b3': { fr: 'Invitation des enseignants et de l\'équipe', en: 'Invite teachers and team' },
  'howItWorksPage.step2.b4': { fr: 'Import de données existantes (CSV/Excel)', en: 'Import existing data (CSV/Excel)' },

  'howItWorksPage.step3.title': { fr: 'Planifiez et gérez au quotidien', en: 'Plan and manage daily' },
  'howItWorksPage.step3.desc': {
    fr: 'Créez vos séances en glisser-déposer sur le calendrier. La détection de conflits vous guide en temps réel. Les notifications automatiques informent les participants. Exportez vos plannings en un clic.',
    en: 'Create your sessions by dragging and dropping on the calendar. Conflict detection guides you in real time. Automatic notifications inform participants. Export your schedules in one click.',
  },
  'howItWorksPage.step3.b1': { fr: 'Création de séances par glisser-déposer', en: 'Session creation by drag and drop' },
  'howItWorksPage.step3.b2': { fr: 'Détection de conflits en temps réel', en: 'Real-time conflict detection' },
  'howItWorksPage.step3.b3': { fr: 'Notifications automatiques aux participants', en: 'Automatic notifications to participants' },
  'howItWorksPage.step3.b4': { fr: 'Export PDF, Excel et CSV en un clic', en: 'One-click PDF, Excel and CSV export' },

  'howItWorksPage.personas.title': { fr: 'Pour qui ?', en: 'Who is it for?' },
  'howItWorksPage.personas.subtitle': {
    fr: 'AntiPlanning s\'adapte à chaque rôle dans votre établissement.',
    en: 'AntiPlanning adapts to each role in your institution.',
  },
  'howItWorksPage.persona.admin.title': { fr: 'Administrateurs', en: 'Administrators' },
  'howItWorksPage.persona.admin.desc': {
    fr: 'Pilotez l\'ensemble de la planification, gérez les salles, les utilisateurs et les droits d\'accès depuis un tableau de bord centralisé.',
    en: 'Manage all scheduling, rooms, users and access rights from a centralized dashboard.',
  },
  'howItWorksPage.persona.teacher.title': { fr: 'Enseignants', en: 'Teachers' },
  'howItWorksPage.persona.teacher.desc': {
    fr: 'Consultez votre planning à jour en temps réel, recevez les notifications de changement et accédez à vos cours depuis votre smartphone.',
    en: 'Check your up-to-date schedule in real time, receive change notifications and access your classes from your smartphone.',
  },
  'howItWorksPage.persona.student.title': { fr: 'Étudiants', en: 'Students' },
  'howItWorksPage.persona.student.desc': {
    fr: 'Visualisez votre emploi du temps de la semaine, vérifiez les salles et accédez aux liens Zoom pour les cours en ligne.',
    en: 'View your weekly timetable, check rooms and access Zoom links for online classes.',
  },
  'howItWorksPage.persona.coordinator.title': { fr: 'Coordinateurs', en: 'Coordinators' },
  'howItWorksPage.persona.coordinator.desc': {
    fr: 'Supervisez les plannings de vos programmes, suivez les heures réalisées et générez des rapports pour votre direction.',
    en: 'Supervise your program schedules, track completed hours and generate reports for your management.',
  },

  'howItWorksPage.cta.title': { fr: 'Prêt à simplifier votre planification ?', en: 'Ready to simplify your scheduling?' },
  'howItWorksPage.cta.subtitle': {
    fr: 'Créez votre compte en 30 secondes et commencez à planifier.',
    en: 'Create your account in 30 seconds and start scheduling.',
  },

  // ===================== PRICING PAGE =====================
  'pricingPage.hero.label': { fr: 'Tarifs', en: 'Pricing' },
  'pricingPage.hero.title': { fr: 'Choisissez votre plan', en: 'Choose your plan' },
  'pricingPage.hero.subtitle': {
    fr: 'Des tarifs transparents, sans engagement. Changez de plan ou annulez à tout moment.',
    en: 'Transparent pricing, no commitment. Change plans or cancel at any time.',
  },

  'pricingPage.compare.title': { fr: 'Comparaison détaillée des plans', en: 'Detailed plan comparison' },
  'pricingPage.compare.subtitle': {
    fr: 'Retrouvez en un coup d\'œil toutes les fonctionnalités incluses dans chaque plan.',
    en: 'See at a glance all the features included in each plan.',
  },

  'pricingPage.row.teachers': { fr: 'Professeurs', en: 'Teachers' },
  'pricingPage.row.students': { fr: 'Comptes étudiants', en: 'Student accounts' },
  'pricingPage.row.rooms': { fr: 'Salles', en: 'Rooms' },
  'pricingPage.row.sessions': { fr: 'Séances / mois', en: 'Sessions / month' },
  'pricingPage.row.calendar': { fr: 'Calendrier interactif', en: 'Interactive calendar' },
  'pricingPage.row.conflicts': { fr: 'Détection de conflits', en: 'Conflict detection' },
  'pricingPage.row.dragdrop': { fr: 'Glisser-déposer', en: 'Drag & drop' },
  'pricingPage.row.export': { fr: 'Export PDF / Excel / CSV', en: 'PDF / Excel / CSV export' },
  'pricingPage.row.academic': { fr: 'Référentiel académique', en: 'Academic framework' },
  'pricingPage.row.visio': { fr: 'Intégration Teams & Zoom', en: 'Teams & Zoom integration' },
  'pricingPage.row.studentAccess': { fr: 'Accès étudiant au planning', en: 'Student schedule access' },
  'pricingPage.row.multiCampus': { fr: 'Multi-établissements', en: 'Multi-campus' },
  'pricingPage.row.api': { fr: 'API & webhooks', en: 'API & webhooks' },
  'pricingPage.row.sso': { fr: 'SSO / SAML', en: 'SSO / SAML' },
  'pricingPage.row.sla': { fr: 'SLA garanti', en: 'SLA guarantee' },
  'pricingPage.row.support': { fr: 'Support', en: 'Support' },
  'pricingPage.row.manager': { fr: 'Account manager dédié', en: 'Dedicated account manager' },

  'pricingPage.support.email': { fr: 'Email', en: 'Email' },
  'pricingPage.support.priority': { fr: 'Prioritaire', en: 'Priority' },
  'pricingPage.support.dedicated': { fr: 'Dédié', en: 'Dedicated' },

  'pricingPage.guarantee.title': { fr: 'Satisfait ou remboursé', en: 'Money-back guarantee' },
  'pricingPage.guarantee.desc': {
    fr: 'Testez AntiPlanning pendant 14 jours. Si vous n\'êtes pas convaincu, nous vous remboursons intégralement, sans question.',
    en: 'Try AntiPlanning for 14 days. If you\'re not convinced, we\'ll refund you in full, no questions asked.',
  },

  'pricingPage.cta.title': { fr: 'Prêt à simplifier votre planning ?', en: 'Ready to simplify your schedule?' },
  'pricingPage.cta.subtitle': {
    fr: 'Commencez gratuitement et passez à un plan supérieur quand vous êtes prêt.',
    en: 'Start for free and upgrade when you\'re ready.',
  },

  // ===================== ONLINE SCHOOL PAGE =====================
  'nav.onlineSchool': { fr: 'École en ligne', en: 'Online School' },
  'footer.onlineSchool': { fr: 'École en ligne', en: 'Online School' },

  'onlineSchoolPage.hero.label': { fr: 'École en ligne', en: 'Online School' },
  'onlineSchoolPage.hero.title': { fr: 'Votre école 100% en ligne', en: 'Your 100% online school' },
  'onlineSchoolPage.hero.subtitle': {
    fr: 'Gérez vos classes virtuelles, vos étudiants et vos professeurs depuis une plateforme unique. Intégrez Teams et Zoom en un clic.',
    en: 'Manage your virtual classrooms, students and teachers from a single platform. Integrate Teams and Zoom in one click.',
  },

  'onlineSchoolPage.virtual.title': { fr: 'Classes virtuelles', en: 'Virtual classrooms' },
  'onlineSchoolPage.virtual.desc': {
    fr: 'Créez et planifiez vos cours en ligne comme des séances présentielles. Chaque séance peut recevoir un lien visio Teams ou Zoom, partagé automatiquement aux participants.',
    en: 'Create and schedule your online classes just like in-person sessions. Each session can receive a Teams or Zoom video link, automatically shared with participants.',
  },
  'onlineSchoolPage.virtual.b1': { fr: 'Création de séances en ligne ou hybrides', en: 'Create online or hybrid sessions' },
  'onlineSchoolPage.virtual.b2': { fr: 'Lien visio ajouté directement à la séance', en: 'Video link added directly to the session' },
  'onlineSchoolPage.virtual.b3': { fr: 'Planning identique au présentiel', en: 'Same planning as in-person' },
  'onlineSchoolPage.virtual.b4': { fr: 'Accès étudiant au lien depuis le planning', en: 'Student access to link from schedule' },

  'onlineSchoolPage.integration.title': { fr: 'Intégration Teams & Zoom', en: 'Teams & Zoom integration' },
  'onlineSchoolPage.integration.desc': {
    fr: 'Ajoutez vos liens de visioconférence Microsoft Teams ou Zoom directement dans les séances. Les étudiants y accèdent en un clic depuis leur planning personnel.',
    en: 'Add your Microsoft Teams or Zoom video conference links directly in sessions. Students access them in one click from their personal schedule.',
  },
  'onlineSchoolPage.integration.b1': { fr: 'Compatible Microsoft Teams et Zoom', en: 'Compatible with Microsoft Teams and Zoom' },
  'onlineSchoolPage.integration.b2': { fr: 'Lien cliquable depuis le détail de la séance', en: 'Clickable link from session details' },
  'onlineSchoolPage.integration.b3': { fr: 'Mode en ligne, hybride ou présentiel par séance', en: 'Online, hybrid or in-person mode per session' },
  'onlineSchoolPage.integration.b4': { fr: 'Aucune extension à installer', en: 'No extension to install' },

  'onlineSchoolPage.students.title': { fr: 'Gestion des étudiants', en: 'Student management' },
  'onlineSchoolPage.students.desc': {
    fr: 'Créez jusqu\'à 200 comptes étudiants inclus dans votre offre. Chaque étudiant dispose d\'un accès personnalisé avec son planning de classe en lecture seule.',
    en: 'Create up to 200 student accounts included in your plan. Each student has personalized access with their class schedule in read-only mode.',
  },
  'onlineSchoolPage.students.b1': { fr: 'Jusqu\'à 200 comptes étudiants inclus', en: 'Up to 200 student accounts included' },
  'onlineSchoolPage.students.b2': { fr: 'Accès personnalisé par classe', en: 'Personalized access by class' },
  'onlineSchoolPage.students.b3': { fr: 'Planning en lecture seule pour les étudiants', en: 'Read-only schedule for students' },
  'onlineSchoolPage.students.b4': { fr: 'Séparation profs (15) / étudiants (200)', en: 'Separate teachers (15) / students (200)' },

  'onlineSchoolPage.planning.title': { fr: 'Planning en ligne', en: 'Online scheduling' },
  'onlineSchoolPage.planning.desc': {
    fr: 'Toute la puissance du planning AntiPlanning disponible pour vos cours en ligne : vues jour/semaine/mois, filtres, détection de conflits et export PDF/Excel.',
    en: 'All the power of AntiPlanning scheduling available for your online classes: day/week/month views, filters, conflict detection and PDF/Excel export.',
  },
  'onlineSchoolPage.planning.b1': { fr: 'Vues jour, semaine et mois', en: 'Day, week and month views' },
  'onlineSchoolPage.planning.b2': { fr: 'Filtres par professeur, classe, matière', en: 'Filters by teacher, class, subject' },
  'onlineSchoolPage.planning.b3': { fr: 'Détection de conflits en temps réel', en: 'Real-time conflict detection' },
  'onlineSchoolPage.planning.b4': { fr: 'Export PDF, Excel et CSV', en: 'PDF, Excel and CSV export' },

  'onlineSchoolPage.cta.title': { fr: 'Lancez votre école en ligne dès maintenant', en: 'Launch your online school now' },
  'onlineSchoolPage.cta.subtitle': {
    fr: 'Créez votre établissement et commencez à planifier vos cours en ligne en quelques minutes.',
    en: 'Create your institution and start scheduling your online classes in minutes.',
  },

  // Session mode labels
  'session.mode.in_person': { fr: 'Présentiel', en: 'In-person' },
  'session.mode.online': { fr: 'En ligne', en: 'Online' },
  'session.mode.hybrid': { fr: 'Hybride', en: 'Hybrid' },

  // ===================== ABOUT PAGE =====================
  'aboutPage.hero.label': { fr: 'À propos', en: 'About' },
  'aboutPage.hero.title': { fr: 'À propos d\'AntiPlanning', en: 'About AntiPlanning' },
  'aboutPage.hero.subtitle': {
    fr: 'Une plateforme née de la conviction que la gestion de planning dans l\'éducation mérite mieux que des tableurs.',
    en: 'A platform born from the conviction that schedule management in education deserves better than spreadsheets.',
  },

  'aboutPage.mission.title': { fr: 'Notre mission', en: 'Our mission' },
  'aboutPage.mission.desc': {
    fr: 'Nous croyons que les équipes pédagogiques perdent trop de temps sur des tâches administratives répétitives. AntiPlanning est conçu pour automatiser la planification, éliminer les erreurs humaines et libérer du temps pour ce qui compte vraiment : l\'enseignement.',
    en: 'We believe that teaching teams spend too much time on repetitive administrative tasks. AntiPlanning is designed to automate scheduling, eliminate human errors and free up time for what really matters: teaching.',
  },

  'aboutPage.values.title': { fr: 'Nos valeurs', en: 'Our values' },
  'aboutPage.value.simplicity.title': { fr: 'Simplicité', en: 'Simplicity' },
  'aboutPage.value.simplicity.desc': {
    fr: 'Chaque fonctionnalité est pensée pour être intuitive. Pas de formation nécessaire, prise en main immédiate.',
    en: 'Every feature is designed to be intuitive. No training required, immediate adoption.',
  },
  'aboutPage.value.reliability.title': { fr: 'Fiabilité', en: 'Reliability' },
  'aboutPage.value.reliability.desc': {
    fr: 'Une infrastructure robuste et une détection de conflits en temps réel pour un planning toujours cohérent.',
    en: 'A robust infrastructure and real-time conflict detection for a consistently coherent schedule.',
  },
  'aboutPage.value.security.title': { fr: 'Sécurité', en: 'Security' },
  'aboutPage.value.security.desc': {
    fr: 'Vos données sont chiffrées, hébergées en Europe et conformes au RGPD. La sécurité n\'est pas une option.',
    en: 'Your data is encrypted, hosted in Europe and GDPR compliant. Security is not optional.',
  },
  'aboutPage.value.collaboration.title': { fr: 'Collaboration', en: 'Collaboration' },
  'aboutPage.value.collaboration.desc': {
    fr: 'Un outil qui connecte administrateurs, enseignants et étudiants autour d\'une source de vérité unique.',
    en: 'A tool that connects administrators, teachers and students around a single source of truth.',
  },

  'aboutPage.differentiators.title': { fr: 'Ce qui nous différencie', en: 'What sets us apart' },
  'aboutPage.diff.education.title': { fr: 'Conçu pour l\'éducation', en: 'Built for education' },
  'aboutPage.diff.education.desc': {
    fr: 'Pas un outil générique adapté à l\'éducation, mais une plateforme pensée dès le départ pour les établissements de formation.',
    en: 'Not a generic tool adapted for education, but a platform designed from the ground up for training institutions.',
  },
  'aboutPage.diff.conflicts.title': { fr: 'Zéro conflit garanti', en: 'Zero conflict guaranteed' },
  'aboutPage.diff.conflicts.desc': {
    fr: 'Notre moteur de détection vérifie chaque salle, enseignant et créneau en temps réel. Impossible de créer un doublon.',
    en: 'Our detection engine checks every room, teacher and slot in real time. Impossible to create a duplicate.',
  },
  'aboutPage.diff.onboarding.title': { fr: 'Onboarding instantané', en: 'Instant onboarding' },
  'aboutPage.diff.onboarding.desc': {
    fr: 'Créez votre établissement et commencez à planifier en moins de 5 minutes. Importez vos données existantes en un clic.',
    en: 'Create your institution and start scheduling in under 5 minutes. Import your existing data in one click.',
  },
  'aboutPage.diff.bilingual.title': { fr: 'Bilingue FR/EN', en: 'Bilingual FR/EN' },
  'aboutPage.diff.bilingual.desc': {
    fr: 'Interface entièrement disponible en français et en anglais, adaptée aux établissements internationaux.',
    en: 'Interface fully available in French and English, adapted for international institutions.',
  },

  'aboutPage.security.title': { fr: 'Sécurité & conformité RGPD', en: 'Security & GDPR compliance' },
  'aboutPage.security.hosting': { fr: 'Hébergement européen certifié', en: 'Certified European hosting' },
  'aboutPage.security.hosting.desc': {
    fr: 'Vos données sont stockées sur des serveurs certifiés en Europe, garantissant la conformité avec les réglementations locales.',
    en: 'Your data is stored on certified servers in Europe, ensuring compliance with local regulations.',
  },
  'aboutPage.security.encryption': { fr: 'Chiffrement TLS 1.3', en: 'TLS 1.3 encryption' },
  'aboutPage.security.encryption.desc': {
    fr: 'Toutes les communications entre votre navigateur et nos serveurs sont chiffrées avec le protocole TLS 1.3.',
    en: 'All communications between your browser and our servers are encrypted with the TLS 1.3 protocol.',
  },
  'aboutPage.security.gdpr': { fr: 'Conformité RGPD', en: 'GDPR compliance' },
  'aboutPage.security.gdpr.desc': {
    fr: 'Nous appliquons les meilleures pratiques en matière de protection des données personnelles conformément au RGPD.',
    en: 'We follow best practices for personal data protection in accordance with GDPR.',
  },
  'aboutPage.security.backups': { fr: 'Sauvegardes automatiques', en: 'Automatic backups' },
  'aboutPage.security.backups.desc': {
    fr: 'Vos données sont sauvegardées automatiquement et régulièrement pour garantir leur intégrité et leur disponibilité.',
    en: 'Your data is automatically and regularly backed up to ensure its integrity and availability.',
  },

  'aboutPage.cta.title': { fr: 'Envie d\'en savoir plus ?', en: 'Want to learn more?' },
  'aboutPage.cta.subtitle': {
    fr: 'Créez votre compte gratuitement ou contactez-nous pour une démonstration personnalisée.',
    en: 'Create your free account or contact us for a personalized demo.',
  },
}

export function useLang() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('antiplanning-lang')
    return (stored === 'en' || stored === 'fr') ? stored : 'fr'
  })

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'fr' ? 'en' : 'fr'
      localStorage.setItem('antiplanning-lang', next)
      return next
    })
  }, [])

  const t = useCallback((key: string): string => {
    return translations[key]?.[lang] ?? key
  }, [lang])

  return { lang, toggleLang, t }
}
