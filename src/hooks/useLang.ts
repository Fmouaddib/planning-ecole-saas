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
  'features.zoom.title': { fr: 'Visio Zoom, Teams & Meet', en: 'Zoom, Teams & Meet Video' },
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
  'plan.pro.f1': { fr: 'Jusqu\'à 50 profs', en: 'Up to 50 teachers' },
  'plan.pro.f2': { fr: 'Salles illimitées', en: 'Unlimited rooms' },
  'plan.pro.f3': { fr: 'Séances illimitées', en: 'Unlimited bookings' },
  'plan.pro.f4': { fr: 'Détection de conflits', en: 'Conflict detection' },
  'plan.pro.f5': { fr: 'Intégration Teams & Zoom', en: 'Teams & Zoom integration' },
  'plan.pro.f6': { fr: 'Support prioritaire', en: 'Priority support' },
  'plan.ecole.f1': { fr: 'Jusqu\'à 15 profs', en: 'Up to 15 teachers' },
  'plan.ecole.f2': { fr: 'Jusqu\'à 200 étudiants', en: 'Up to 200 students' },
  'plan.ecole.f3': { fr: 'Intégration Teams & Zoom', en: 'Teams & Zoom integration' },
  'plan.ecole.f4': { fr: 'Séances illimitées', en: 'Unlimited sessions' },
  'plan.ecole.f5': { fr: 'Classes virtuelles', en: 'Virtual classrooms' },
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

  'featuresPage.zoom.title': { fr: 'Visio unifiée Zoom, Teams & Meet', en: 'Unified Video: Zoom, Teams & Meet' },
  'featuresPage.zoom.desc': {
    fr: 'Ajoutez vos liens Microsoft Teams ou Zoom directement dans vos séances. Le lien est accessible par les étudiants depuis leur planning personnel.',
    en: 'Add your Microsoft Teams or Zoom links directly to your sessions. The link is accessible by students from their personal schedule.',
  },
  'featuresPage.zoom.b1': { fr: 'Compatible Zoom, Microsoft Teams et Google Meet', en: 'Compatible with Zoom, Microsoft Teams and Google Meet' },
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

  // ===================== VISIO PAGE =====================
  'visio.title': { fr: 'Classes virtuelles', en: 'Virtual classrooms' },
  'visio.subtitle': { fr: 'Gérez vos sessions en ligne et vos salles virtuelles', en: 'Manage your online sessions and virtual rooms' },
  'visio.tab.upcoming': { fr: 'Prochaines visios', en: 'Upcoming sessions' },
  'visio.tab.rooms': { fr: 'Salles virtuelles', en: 'Virtual rooms' },
  'visio.tab.stats': { fr: 'Statistiques', en: 'Statistics' },
  'visio.search.sessions': { fr: 'Rechercher une session...', en: 'Search sessions...' },
  'visio.search.rooms': { fr: 'Rechercher une salle...', en: 'Search rooms...' },
  'visio.filter.allPlatforms': { fr: 'Toutes les plateformes', en: 'All platforms' },
  'visio.platform.teams': { fr: 'Teams', en: 'Teams' },
  'visio.platform.zoom': { fr: 'Zoom', en: 'Zoom' },
  'visio.platform.other': { fr: 'Autre', en: 'Other' },
  'visio.newRoom': { fr: 'Nouvelle salle virtuelle', en: 'New virtual room' },
  'visio.editRoom': { fr: 'Modifier la salle virtuelle', en: 'Edit virtual room' },
  'visio.deleteRoom': { fr: 'Supprimer la salle virtuelle', en: 'Delete virtual room' },
  'visio.deleteConfirm': { fr: 'Supprimer la salle virtuelle', en: 'Delete virtual room' },
  'visio.form.name': { fr: 'Nom', en: 'Name' },
  'visio.form.platform': { fr: 'Plateforme', en: 'Platform' },
  'visio.form.url': { fr: 'URL de la réunion', en: 'Meeting URL' },
  'visio.form.default': { fr: 'Salle par défaut', en: 'Default room' },
  'visio.empty.sessions': { fr: 'Aucune session en ligne à venir', en: 'No upcoming online sessions' },
  'visio.empty.sessions.desc': { fr: 'Les sessions en ligne avec un lien de visioconférence apparaîtront ici.', en: 'Online sessions with a video conference link will appear here.' },
  'visio.empty.rooms': { fr: 'Aucune salle virtuelle', en: 'No virtual rooms' },
  'visio.empty.rooms.desc': { fr: 'Créez des salles virtuelles pour stocker vos liens Teams/Zoom réutilisables.', en: 'Create virtual rooms to store your reusable Teams/Zoom links.' },
  'visio.action.copy': { fr: 'Copier le lien', en: 'Copy link' },
  'visio.action.join': { fr: 'Rejoindre', en: 'Join' },
  'visio.action.copied': { fr: 'Lien copié dans le presse-papier', en: 'Link copied to clipboard' },
  'visio.stats.total': { fr: 'Total sessions', en: 'Total sessions' },
  'visio.stats.teams': { fr: 'Sessions Teams', en: 'Teams sessions' },
  'visio.stats.zoom': { fr: 'Sessions Zoom', en: 'Zoom sessions' },
  'visio.stats.upcoming': { fr: 'Sessions à venir', en: 'Upcoming sessions' },
  'visio.stats.distribution': { fr: 'Répartition par plateforme', en: 'Distribution by platform' },
  'visio.badge.inProgress': { fr: 'en cours', en: 'in progress' },
  'visio.badge.upcoming': { fr: 'à venir', en: 'upcoming' },

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

  // ===================== NEW FEATURE CARDS =====================
  'features.attendance.title': { fr: 'Suivi des présences', en: 'Attendance Tracking' },
  'features.attendance.desc': {
    fr: 'Marquez les présences en temps réel et suivez les taux d\'assiduité avec des statistiques détaillées.',
    en: 'Mark attendance in real time and track attendance rates with detailed statistics.',
  },
  'features.grades.title': { fr: 'Notes et bulletins', en: 'Grades & Transcripts' },
  'features.grades.desc': {
    fr: 'Saisissez les notes, calculez les moyennes pondérées et générez les bulletins PDF en 1 clic.',
    en: 'Enter grades, calculate weighted averages and generate PDF transcripts in 1 click.',
  },
  'features.teacherCollab.title': { fr: 'Collaboration enseignants', en: 'Teacher Collaboration' },
  'features.teacherCollab.desc': {
    fr: 'Gérez les disponibilités, remplacements et affectations avec une messagerie intégrée.',
    en: 'Manage availabilities, replacements and assignments with integrated messaging.',
  },
  'features.import.title': { fr: 'Import CSV / Excel', en: 'CSV / Excel Import' },
  'features.import.desc': {
    fr: 'Importez vos données existantes en masse : étudiants, enseignants, classes et matières.',
    en: 'Bulk import your existing data: students, teachers, classes and subjects.',
  },
  'features.chat.title': { fr: 'Messagerie temps réel', en: 'Real-time Messaging' },
  'features.chat.desc': {
    fr: 'Échangez instantanément entre admin, profs et étudiants via des canaux de classe, de matière et des messages directs.',
    en: 'Communicate instantly between admin, teachers and students via class channels, subject channels and direct messages.',
  },

  // ===================== FEATURES PAGE - NEW BLOCKS =====================
  'featuresPage.attendance.title': { fr: 'Suivi des présences et absences', en: 'Attendance and absence tracking' },
  'featuresPage.attendance.desc': {
    fr: 'Fini les feuilles d\'émargement papier. Marquez les présences directement depuis le planning, suivez les retards et absences en temps réel, et générez des rapports automatiques pour les parents et l\'administration.',
    en: 'No more paper sign-in sheets. Mark attendance directly from the schedule, track late arrivals and absences in real time, and generate automatic reports for parents and administration.',
  },
  'featuresPage.attendance.b1': { fr: 'Marquage en 1 clic : présent, absent, retard, excusé', en: '1-click marking: present, absent, late, excused' },
  'featuresPage.attendance.b2': { fr: 'Statistiques d\'assiduité par étudiant et par classe', en: 'Attendance statistics by student and class' },
  'featuresPage.attendance.b3': { fr: 'Signalement automatique aux contacts parents', en: 'Automatic reporting to parent contacts' },
  'featuresPage.attendance.b4': { fr: 'Historique complet consultable par l\'étudiant', en: 'Complete history viewable by the student' },
  'featuresPage.attendance.b5': { fr: 'Export des rapports de présences en PDF', en: 'Export attendance reports as PDF' },

  'featuresPage.grades.title': { fr: 'Notes, évaluations et bulletins', en: 'Grades, evaluations and transcripts' },
  'featuresPage.grades.desc': {
    fr: 'Un système complet de notation avec 6 types d\'évaluations, coefficients par matière, calcul automatique des moyennes pondérées et génération de bulletins PDF prêts à envoyer aux familles.',
    en: 'A complete grading system with 6 evaluation types, subject coefficients, automatic weighted average calculation and PDF transcript generation ready to send to families.',
  },
  'featuresPage.grades.b1': { fr: '6 types : examen, devoir, projet, oral, quiz, contrôle continu', en: '6 types: exam, assignment, project, oral, quiz, continuous assessment' },
  'featuresPage.grades.b2': { fr: 'Coefficients par matière et par évaluation', en: 'Coefficients by subject and evaluation' },
  'featuresPage.grades.b3': { fr: 'Moyennes pondérées calculées automatiquement', en: 'Automatically calculated weighted averages' },
  'featuresPage.grades.b4': { fr: 'Bulletins PDF générés et envoyés en 1 clic', en: 'PDF transcripts generated and sent in 1 click' },
  'featuresPage.grades.b5': { fr: 'Portail étudiant : consultation des notes en temps réel', en: 'Student portal: real-time grade viewing' },

  'featuresPage.teacherCollab.title': { fr: 'Collaboration enseignants V2', en: 'Teacher Collaboration V2' },
  'featuresPage.teacherCollab.desc': {
    fr: 'Coordonnez vos équipes enseignantes sans effort. Demandes de disponibilité groupées, gestion des remplacements en cas d\'absence, affectations validées par les profs, et messagerie planning intégrée.',
    en: 'Coordinate your teaching teams effortlessly. Grouped availability requests, replacement management for absences, teacher-validated assignments, and integrated planning messaging.',
  },
  'featuresPage.teacherCollab.b1': { fr: 'Demandes de disponibilité groupées avec réponses en ligne', en: 'Grouped availability requests with online responses' },
  'featuresPage.teacherCollab.b2': { fr: 'Gestion des remplacements : candidature et sélection', en: 'Replacement management: application and selection' },
  'featuresPage.teacherCollab.b3': { fr: 'Affectations de séances avec validation enseignant', en: 'Session assignments with teacher validation' },
  'featuresPage.teacherCollab.b4': { fr: 'Messagerie planning entre admin et enseignants', en: 'Planning messaging between admin and teachers' },
  'featuresPage.teacherCollab.b5': { fr: 'Notifications email et in-app en temps réel', en: 'Real-time email and in-app notifications' },

  'featuresPage.import.title': { fr: 'Import CSV et Excel', en: 'CSV and Excel Import' },
  'featuresPage.import.desc': {
    fr: 'Importez vos données existantes en quelques secondes. Notre parseur intelligent détecte automatiquement les formats et valide les données avant l\'import. Téléchargez nos templates pré-formatés pour un import sans erreur.',
    en: 'Import your existing data in seconds. Our smart parser automatically detects formats and validates data before import. Download our pre-formatted templates for error-free import.',
  },
  'featuresPage.import.b1': { fr: 'Support CSV (auto-détection séparateur) et Excel XLSX', en: 'CSV (auto-detect separator) and Excel XLSX support' },
  'featuresPage.import.b2': { fr: 'Validation et prévisualisation avant import', en: 'Validation and preview before import' },
  'featuresPage.import.b3': { fr: 'Templates téléchargeables pré-formatés', en: 'Downloadable pre-formatted templates' },
  'featuresPage.import.b4': { fr: 'Import étudiants, enseignants, classes et matières', en: 'Import students, teachers, classes and subjects' },

  'featuresPage.pwa.title': { fr: 'PWA et notifications push', en: 'PWA & Push Notifications' },
  'featuresPage.pwa.desc': {
    fr: 'Installez AntiPlanning comme une application native sur votre smartphone ou ordinateur. Recevez les notifications push en temps réel pour ne rien manquer : changements de planning, nouvelles affectations, messages.',
    en: 'Install AntiPlanning as a native app on your smartphone or computer. Receive real-time push notifications so you never miss anything: schedule changes, new assignments, messages.',
  },
  'featuresPage.pwa.b1': { fr: 'Application installable sur mobile et desktop', en: 'Installable app on mobile and desktop' },
  'featuresPage.pwa.b2': { fr: 'Notifications push en temps réel', en: 'Real-time push notifications' },
  'featuresPage.pwa.b3': { fr: 'Fonctionne hors-ligne (mode dégradé)', en: 'Works offline (degraded mode)' },
  'featuresPage.pwa.b4': { fr: 'Aucune installation depuis un store requise', en: 'No app store installation required' },

  'featuresPage.chat.title': { fr: 'Messagerie intégrée temps réel', en: 'Built-in Real-time Messaging' },
  'featuresPage.chat.desc': {
    fr: 'Fini les groupes WhatsApp, les emails perdus et les informations qui n\'arrivent jamais. AntiPlanning intègre une messagerie complète avec canaux par classe et par matière, messages directs, partage de fichiers et indicateurs de présence — le tout sans quitter votre planning.',
    en: 'No more WhatsApp groups, lost emails and information that never arrives. AntiPlanning integrates complete messaging with class and subject channels, direct messages, file sharing and presence indicators — all without leaving your schedule.',
  },
  'featuresPage.chat.b1': { fr: 'Canaux par classe et par matière, créés automatiquement', en: 'Class and subject channels, auto-created' },
  'featuresPage.chat.b2': { fr: 'Messages directs entre tous les membres du centre', en: 'Direct messages between all center members' },
  'featuresPage.chat.b3': { fr: 'Partage de fichiers, @mentions et réactions emoji', en: 'File sharing, @mentions and emoji reactions' },
  'featuresPage.chat.b4': { fr: 'Indicateurs de présence en ligne et de frappe', en: 'Online presence and typing indicators' },
  'featuresPage.chat.b5': { fr: 'Badges non-lus et notifications temps réel', en: 'Unread badges and real-time notifications' },

  // ===================== PRICING PAGE - NEW SECTION HEADERS & ROWS =====================
  'pricingPage.section.planning': { fr: 'Planning', en: 'Scheduling' },
  'pricingPage.section.pedagogy': { fr: 'Pédagogie', en: 'Pedagogy' },
  'pricingPage.section.collaboration': { fr: 'Collaboration', en: 'Collaboration' },
  'pricingPage.section.technical': { fr: 'Technique', en: 'Technical' },

  'pricingPage.row.attendance': { fr: 'Suivi des présences', en: 'Attendance tracking' },
  'pricingPage.row.grades': { fr: 'Notes et évaluations', en: 'Grades and evaluations' },
  'pricingPage.row.bulletins': { fr: 'Bulletins PDF', en: 'PDF transcripts' },
  'pricingPage.row.certificates': { fr: 'Certificats de scolarité', en: 'Enrollment certificates' },
  'pricingPage.row.parentContacts': { fr: 'Contacts parents / tuteurs', en: 'Parent / guardian contacts' },
  'pricingPage.row.absenceReports': { fr: 'Signalement absences aux familles', en: 'Absence reporting to families' },
  'pricingPage.row.teacherCollab': { fr: 'Collaboration enseignants', en: 'Teacher collaboration' },
  'pricingPage.row.replacements': { fr: 'Gestion des remplacements', en: 'Replacement management' },
  'pricingPage.row.assignments': { fr: 'Affectations de séances', en: 'Session assignments' },
  'pricingPage.row.planningMessages': { fr: 'Messages planning', en: 'Planning messages' },
  'pricingPage.row.csvImport': { fr: 'Import CSV / Excel', en: 'CSV / Excel import' },
  'pricingPage.row.chat': { fr: 'Messagerie temps réel', en: 'Real-time messaging' },
  'pricingPage.row.pwa': { fr: 'Application installable (PWA)', en: 'Installable app (PWA)' },
  'pricingPage.row.pushNotif': { fr: 'Notifications push', en: 'Push notifications' },
  'pricingPage.row.billing': { fr: 'Facturation en ligne (Stripe)', en: 'Online billing (Stripe)' },

  // Addon section
  'pricingPage.addons.title': { fr: 'Options supplémentaires', en: 'Add-on options' },
  'pricingPage.addons.subtitle': {
    fr: 'Ajoutez des packs pour étendre les capacités de votre plan.',
    en: 'Add packs to extend your plan capabilities.',
  },
  'pricingPage.addon.email.title': { fr: 'Packs Email', en: 'Email Packs' },
  'pricingPage.addon.email.desc': { fr: 'Notifications et rappels automatiques', en: 'Automatic notifications and reminders' },
  'pricingPage.addon.email.included': { fr: 'Inclus dans Enterprise', en: 'Included in Enterprise' },
  'pricingPage.addon.teacher.title': { fr: 'Packs Professeurs', en: 'Teacher Packs' },
  'pricingPage.addon.teacher.desc': { fr: 'Ajoutez des comptes enseignants', en: 'Add teacher accounts' },
  'pricingPage.addon.student.title': { fr: 'Packs Étudiants', en: 'Student Packs' },
  'pricingPage.addon.student.desc': { fr: 'Ajoutez des comptes étudiants', en: 'Add student accounts' },
  'pricingPage.addon.pedagogy.title': { fr: 'Pack Pédagogique', en: 'Pedagogy Pack' },
  'pricingPage.addon.pedagogy.desc': { fr: 'Présences + Notes + Bulletins', en: 'Attendance + Grades + Transcripts' },
  'pricingPage.addon.perMonth': { fr: '/mois', en: '/mo' },

  // ===================== NEW TESTIMONIALS =====================
  'testimonial.4.quote': {
    fr: 'Avec AntiPlanning, nous avons économisé 2 jours de travail administratif par semaine. Les bulletins se génèrent en 1 clic et les parents reçoivent tout automatiquement.',
    en: 'With AntiPlanning, we saved 2 days of administrative work per week. Transcripts are generated in 1 click and parents receive everything automatically.',
  },
  'testimonial.4.name': { fr: 'Laurent Chevalier', en: 'Laurent Chevalier' },
  'testimonial.4.role': { fr: 'Directeur administratif — Centre Horizon', en: 'Administrative Director — Horizon Center' },
  'testimonial.5.quote': {
    fr: 'Quand un professeur est absent, je trouve un remplaçant en 3 clics grâce au module de collaboration. Avant, cela prenait une demi-journée de coups de fil.',
    en: 'When a teacher is absent, I find a replacement in 3 clicks thanks to the collaboration module. Before, it took half a day of phone calls.',
  },
  'testimonial.5.name': { fr: 'Patricia Delorme', en: 'Patricia Delorme' },
  'testimonial.5.role': { fr: 'Coordinatrice pédagogique — Académie Progrès', en: 'Educational Coordinator — Progrès Academy' },
  'testimonial.6.quote': {
    fr: 'Mes élèves reçoivent une notification push dès que le planning change. Plus personne ne se trompe de salle ou d\'horaire. C\'est un vrai gain de temps.',
    en: 'My students get a push notification as soon as the schedule changes. No one gets the wrong room or time anymore. It\'s a real time saver.',
  },
  'testimonial.6.name': { fr: 'Antoine Rousseau', en: 'Antoine Rousseau' },
  'testimonial.6.role': { fr: 'Enseignant — École Numérique de Paris', en: 'Teacher — Paris Digital School' },
  'testimonial.7.quote': {
    fr: 'Depuis qu\'on utilise la messagerie intégrée, on a supprimé 12 groupes WhatsApp. Profs, étudiants et admin échangent dans un seul outil, c\'est beaucoup plus pro et on ne perd plus aucune info.',
    en: 'Since we started using the built-in messaging, we deleted 12 WhatsApp groups. Teachers, students and admin communicate in one tool, it\'s much more professional and we never lose information anymore.',
  },
  'testimonial.7.name': { fr: 'Nadia Bensalem', en: 'Nadia Bensalem' },
  'testimonial.7.role': { fr: 'Directrice — Institut Avenir Lyon', en: 'Director — Avenir Institute Lyon' },

  // ===================== NEW FAQ =====================
  'faq.7.q': { fr: 'Comment fonctionne le suivi des présences ?', en: 'How does attendance tracking work?' },
  'faq.7.a': {
    fr: 'L\'administrateur ou l\'enseignant marque les présences directement depuis le planning en 1 clic (présent, absent, retard, excusé). Les statistiques sont calculées automatiquement et les parents peuvent être alertés en cas d\'absence.',
    en: 'The administrator or teacher marks attendance directly from the schedule in 1 click (present, absent, late, excused). Statistics are calculated automatically and parents can be alerted in case of absence.',
  },
  'faq.8.q': { fr: 'Comment sont générés les bulletins ?', en: 'How are transcripts generated?' },
  'faq.8.a': {
    fr: 'Les bulletins sont générés automatiquement à partir des notes saisies, avec calcul des moyennes pondérées par matière et par coefficient. Ils sont exportés en PDF et peuvent être envoyés directement aux contacts des étudiants.',
    en: 'Transcripts are automatically generated from entered grades, with weighted average calculation by subject and coefficient. They are exported as PDF and can be sent directly to student contacts.',
  },
  'faq.9.q': { fr: 'Comment gérer les remplacements d\'enseignants ?', en: 'How to manage teacher replacements?' },
  'faq.9.a': {
    fr: 'Le module de collaboration permet à l\'admin de créer une demande de remplacement. Les enseignants qualifiés pour la matière reçoivent une notification et peuvent se porter candidats. L\'admin sélectionne le remplaçant en 1 clic.',
    en: 'The collaboration module allows the admin to create a replacement request. Teachers qualified for the subject receive a notification and can apply. The admin selects the replacement in 1 click.',
  },
  'faq.10.q': { fr: 'AntiPlanning fonctionne-t-il sur mobile ?', en: 'Does AntiPlanning work on mobile?' },
  'faq.10.a': {
    fr: 'Oui ! AntiPlanning est une PWA (Progressive Web App) installable sur votre smartphone. Vous recevez les notifications push en temps réel et pouvez consulter votre planning même hors-ligne.',
    en: 'Yes! AntiPlanning is a PWA (Progressive Web App) that you can install on your smartphone. You receive real-time push notifications and can view your schedule even offline.',
  },
  'faq.11.q': { fr: 'La messagerie intégrée remplace-t-elle WhatsApp ?', en: 'Does the built-in messaging replace WhatsApp?' },
  'faq.11.a': {
    fr: 'Oui ! La messagerie AntiPlanning centralise tous les échanges de votre établissement. Les canaux sont créés automatiquement pour chaque classe et matière, avec messages directs, partage de fichiers et indicateurs de présence. Plus besoin de gérer des groupes WhatsApp séparés.',
    en: 'Yes! AntiPlanning messaging centralizes all your institution\'s communications. Channels are automatically created for each class and subject, with direct messages, file sharing and presence indicators. No more managing separate WhatsApp groups.',
  },

  // ===================== LANDING - SOCIAL PROOF =====================
  'landing.hero.proof.establishments': { fr: '250+ établissements', en: '250+ institutions' },
  'landing.hero.proof.sessions': { fr: '5 000+ séances/semaine', en: '5,000+ sessions/week' },
  'landing.hero.proof.uptime': { fr: '99.9% uptime', en: '99.9% uptime' },

  // ===================== LANDING - PAIN POINTS =====================
  'landing.pain.title': { fr: 'Vous reconnaissez-vous ?', en: 'Sound familiar?' },
  'landing.pain.subtitle': {
    fr: 'Les problèmes que nos utilisateurs ont résolus en adoptant AntiPlanning.',
    en: 'The problems our users solved by adopting AntiPlanning.',
  },
  'landing.pain.1.before': { fr: 'Excel pour le planning ?', en: 'Excel for scheduling?' },
  'landing.pain.1.after': { fr: 'Calendrier intelligent avec détection de conflits', en: 'Smart calendar with conflict detection' },
  'landing.pain.2.before': { fr: 'Absences signalées trop tard ?', en: 'Absences reported too late?' },
  'landing.pain.2.after': { fr: 'Suivi en direct, alertes parents automatiques', en: 'Live tracking, automatic parent alerts' },
  'landing.pain.3.before': { fr: 'Bulletins qui prennent des semaines ?', en: 'Transcripts taking weeks?' },
  'landing.pain.3.after': { fr: 'Bulletins PDF générés et envoyés en 1 clic', en: 'PDF transcripts generated and sent in 1 click' },
  'landing.pain.4.before': { fr: 'WhatsApp, mails, SMS, téléphone… ?', en: 'WhatsApp, emails, texts, phone calls…?' },
  'landing.pain.4.after': { fr: 'Messagerie intégrée avec canaux par classe', en: 'Built-in messaging with class channels' },

  // ===================== LANDING - TRUST BADGES =====================
  'landing.trust.rgpd': { fr: 'Conforme RGPD', en: 'GDPR Compliant' },
  'landing.trust.tls': { fr: 'Chiffrement TLS 1.3', en: 'TLS 1.3 Encryption' },
  'landing.trust.europe': { fr: 'Hébergé en Europe', en: 'Hosted in Europe' },
  'landing.trust.pwa': { fr: 'App installable (PWA)', en: 'Installable App (PWA)' },
  'landing.trust.stripe': { fr: 'Paiement Stripe sécurisé', en: 'Secure Stripe Payment' },

  // ===================== SHOWCASE - NEW BLOCKS =====================
  'showcase.attendance.label': { fr: 'Suivi des présences', en: 'Attendance tracking' },
  'showcase.attendance.title': { fr: 'Suivez l\'assiduité en temps réel', en: 'Track attendance in real time' },
  'showcase.attendance.desc': {
    fr: 'Marquez les présences directement depuis chaque séance. Les statistiques se calculent automatiquement et les parents sont alertés en cas d\'absence répétée.',
    en: 'Mark attendance directly from each session. Statistics are calculated automatically and parents are alerted in case of repeated absence.',
  },
  'showcase.attendance.b1': { fr: 'Marquage présent / absent / retard / excusé', en: 'Present / absent / late / excused marking' },
  'showcase.attendance.b2': { fr: 'Statistiques d\'assiduité par classe et par étudiant', en: 'Attendance statistics by class and student' },
  'showcase.attendance.b3': { fr: 'Signalement automatique aux contacts parents', en: 'Automatic reporting to parent contacts' },
  'showcase.attendance.b4': { fr: 'Export des rapports de présences', en: 'Attendance report export' },

  'showcase.grades.label': { fr: 'Notes et bulletins', en: 'Grades & transcripts' },
  'showcase.grades.title': { fr: 'Évaluez et générez les bulletins', en: 'Evaluate and generate transcripts' },
  'showcase.grades.desc': {
    fr: '6 types d\'évaluations, coefficients par matière, moyennes pondérées automatiques. Générez les bulletins PDF de toute une classe en un seul clic.',
    en: '6 evaluation types, subject coefficients, automatic weighted averages. Generate PDF transcripts for an entire class in a single click.',
  },
  'showcase.grades.b1': { fr: '6 types d\'évaluations avec coefficients', en: '6 evaluation types with coefficients' },
  'showcase.grades.b2': { fr: 'Moyennes pondérées calculées automatiquement', en: 'Automatically calculated weighted averages' },
  'showcase.grades.b3': { fr: 'Bulletins PDF générés en masse', en: 'Bulk PDF transcript generation' },
  'showcase.grades.b4': { fr: 'Envoi aux contacts étudiants en 1 clic', en: 'Send to student contacts in 1 click' },

  'showcase.teacherCollab.label': { fr: 'Collaboration enseignants', en: 'Teacher collaboration' },
  'showcase.teacherCollab.title': { fr: 'Coordonnez votre équipe pédagogique', en: 'Coordinate your teaching team' },
  'showcase.teacherCollab.desc': {
    fr: 'Demandez les disponibilités, gérez les remplacements et affectez les séances. Tout se fait via notifications et messagerie intégrée.',
    en: 'Request availabilities, manage replacements and assign sessions. Everything is done via notifications and integrated messaging.',
  },
  'showcase.teacherCollab.b1': { fr: 'Demandes de disponibilité groupées', en: 'Grouped availability requests' },
  'showcase.teacherCollab.b2': { fr: 'Remplacements en 3 clics', en: 'Replacements in 3 clicks' },
  'showcase.teacherCollab.b3': { fr: 'Affectations validées par l\'enseignant', en: 'Teacher-validated assignments' },
  'showcase.teacherCollab.b4': { fr: 'Messagerie planning intégrée', en: 'Integrated planning messaging' },

  'showcase.chat.label': { fr: 'Messagerie temps réel', en: 'Real-time messaging' },
  'showcase.chat.title': { fr: 'Communiquez sans quitter votre planning', en: 'Communicate without leaving your schedule' },
  'showcase.chat.desc': {
    fr: 'Messages directs, canaux de classe et de matière, partage de fichiers et indicateurs de présence. Toute la communication de votre établissement, centralisée et sécurisée.',
    en: 'Direct messages, class and subject channels, file sharing and presence indicators. All your institution\'s communication, centralized and secure.',
  },
  'showcase.chat.b1': { fr: 'Canaux automatiques par classe et matière', en: 'Automatic channels per class and subject' },
  'showcase.chat.b2': { fr: 'Messages directs avec statut en ligne', en: 'Direct messages with online status' },
  'showcase.chat.b3': { fr: 'Partage de fichiers et @mentions', en: 'File sharing and @mentions' },
  'showcase.chat.b4': { fr: 'Badges non-lus sur chaque canal', en: 'Unread badges on every channel' },

  // ===================== CTA ENHANCEMENTS =====================
  'cta.urgency': { fr: 'Rejoint par 50+ établissements ce mois-ci', en: 'Joined by 50+ institutions this month' },
  'cta.demo': { fr: 'Demander une démo', en: 'Request a demo' },

  // ===================== HERO SUBTITLE ENHANCED =====================
  'hero.subtitle.enhanced': {
    fr: 'La plateforme tout-en-un pour planifier, communiquer, suivre les présences et coordonner votre établissement.',
    en: 'The all-in-one platform to schedule, communicate, track attendance and coordinate your institution.',
  },

  // ===================== ONLINE SCHOOL PAGE - NEW BLOCKS =====================
  'onlineSchoolPage.portal.title': { fr: 'Portail étudiant complet', en: 'Complete student portal' },
  'onlineSchoolPage.portal.desc': {
    fr: 'Chaque étudiant dispose d\'un tableau de bord personnalisé avec ses KPIs, son historique de présences, ses notes et bulletins. Les notifications push le tiennent informé en temps réel.',
    en: 'Each student has a personalized dashboard with their KPIs, attendance history, grades and transcripts. Push notifications keep them informed in real time.',
  },
  'onlineSchoolPage.portal.b1': { fr: 'Dashboard avec 5 KPIs personnalisés', en: 'Dashboard with 5 personalized KPIs' },
  'onlineSchoolPage.portal.b2': { fr: 'Historique complet des présences', en: 'Complete attendance history' },
  'onlineSchoolPage.portal.b3': { fr: 'Consultation des notes et bulletins', en: 'View grades and transcripts' },
  'onlineSchoolPage.portal.b4': { fr: 'Notifications en temps réel', en: 'Real-time notifications' },

  'onlineSchoolPage.pwa.title': { fr: 'Notifications push et alertes', en: 'Push notifications and alerts' },
  'onlineSchoolPage.pwa.desc': {
    fr: 'AntiPlanning est une PWA installable : recevez les notifications push en temps réel sur votre appareil. Changements de planning, nouvelles notes, messages — tout arrive instantanément.',
    en: 'AntiPlanning is an installable PWA: receive real-time push notifications on your device. Schedule changes, new grades, messages — everything arrives instantly.',
  },
  'onlineSchoolPage.pwa.b1': { fr: 'Notifications push temps réel', en: 'Real-time push notifications' },
  'onlineSchoolPage.pwa.b2': { fr: 'PWA installable sur smartphone et desktop', en: 'PWA installable on smartphone and desktop' },
  'onlineSchoolPage.pwa.b3': { fr: 'Mode hors-ligne pour consultation', en: 'Offline mode for viewing' },
  'onlineSchoolPage.pwa.b4': { fr: 'Aucune installation via store requise', en: 'No app store installation required' },

  // ===================== ABOUT PAGE - NUMBERS =====================
  'aboutPage.numbers.title': { fr: 'AntiPlanning en chiffres', en: 'AntiPlanning in numbers' },
  'aboutPage.numbers.establishments': { fr: '250+', en: '250+' },
  'aboutPage.numbers.establishments.label': { fr: 'Établissements', en: 'Institutions' },
  'aboutPage.numbers.sessions': { fr: '5 000+', en: '5,000+' },
  'aboutPage.numbers.sessions.label': { fr: 'Séances / semaine', en: 'Sessions / week' },
  'aboutPage.numbers.users': { fr: '15 000+', en: '15,000+' },
  'aboutPage.numbers.users.label': { fr: 'Utilisateurs actifs', en: 'Active users' },
  'aboutPage.numbers.uptime': { fr: '99.9%', en: '99.9%' },
  'aboutPage.numbers.uptime.label': { fr: 'Disponibilité', en: 'Uptime' },

  // ===================== ABOUT PAGE - NEW DIFFERENTIATOR =====================
  'aboutPage.diff.pwa.title': { fr: 'App installable (PWA)', en: 'Installable App (PWA)' },
  'aboutPage.diff.pwa.desc': {
    fr: 'Installez AntiPlanning comme une app native sur votre appareil. Notifications push, accès hors-ligne et lancement rapide depuis l\'écran d\'accueil.',
    en: 'Install AntiPlanning as a native app on your device. Push notifications, offline access and quick launch from home screen.',
  },

  // ===================== HOW IT WORKS - ENHANCED STEPS =====================
  'howItWorksPage.step3.b5': { fr: 'Marquez les présences directement depuis le planning', en: 'Mark attendance directly from the schedule' },
  'howItWorksPage.step3.b6': { fr: 'Saisissez les notes et générez les bulletins', en: 'Enter grades and generate transcripts' },

  // ===================== HOW IT WORKS - ENHANCED PERSONAS =====================
  'howItWorksPage.persona.admin.desc.v2': {
    fr: 'Pilotez la planification, gérez les utilisateurs, suivez les présences, générez les bulletins et supervisez les rapports depuis un tableau de bord centralisé.',
    en: 'Manage scheduling, users, attendance tracking, transcript generation and report supervision from a centralized dashboard.',
  },
  'howItWorksPage.persona.teacher.desc.v2': {
    fr: 'Consultez votre planning, marquez les présences, saisissez les notes, gérez vos disponibilités et échangez via la messagerie planning.',
    en: 'Check your schedule, mark attendance, enter grades, manage your availabilities and communicate via planning messaging.',
  },
  'howItWorksPage.persona.student.desc.v2': {
    fr: 'Visualisez votre emploi du temps, consultez vos notes et bulletins, suivez votre assiduité et recevez les notifications push en temps réel.',
    en: 'View your timetable, check your grades and transcripts, track your attendance and receive real-time push notifications.',
  },
  'howItWorksPage.persona.coordinator.desc.v2': {
    fr: 'Supervisez les plannings, suivez les statistiques de présences et de notes, gérez les remplacements et générez des rapports pour votre direction.',
    en: 'Supervise schedules, track attendance and grade statistics, manage replacements and generate reports for management.',
  },

  // ===================== FOOTER - NEW LINKS & TRUST =====================
  'footer.attendance': { fr: 'Suivi des présences', en: 'Attendance Tracking' },
  'footer.grades': { fr: 'Notes et bulletins', en: 'Grades & Transcripts' },
  'footer.chat': { fr: 'Messagerie temps réel', en: 'Real-time Messaging' },
  'footer.trust.rgpd': { fr: 'RGPD', en: 'GDPR' },
  'footer.trust.ssl': { fr: 'SSL/TLS', en: 'SSL/TLS' },
  'footer.trust.eu': { fr: 'Hébergé en UE', en: 'EU Hosted' },

  // ===================== NAVBAR =====================
  'nav.badge.new': { fr: 'Nouveau', en: 'New' },

  // ===================== CHECKOUT SUCCESS =====================
  'checkout.verifying.title': { fr: 'Vérification en cours...', en: 'Verifying payment...' },
  'checkout.verifying.subtitle': { fr: 'Activation de votre option...', en: 'Activating your addon...' },
  'checkout.success.addon.title': { fr: 'Option activée !', en: 'Addon activated!' },
  'checkout.success.addon.subtitle': { fr: 'Votre nouvelle fonctionnalité est prête à être utilisée.', en: 'Your new feature is ready to use.' },
  'checkout.success.plan.title': { fr: 'Abonnement activé !', en: 'Subscription activated!' },
  'checkout.success.plan.subtitle': { fr: 'Toutes les fonctionnalités de votre plan sont débloquées.', en: 'All features from your plan are now unlocked.' },
  'checkout.success.cta.discover': { fr: 'Découvrir la fonctionnalité', en: 'Discover the feature' },
  'checkout.success.cta.dashboard': { fr: 'Retour au tableau de bord', en: 'Back to dashboard' },
  'checkout.success.fallback': { fr: 'L\'activation peut prendre quelques instants.', en: 'Activation may take a moment.' },
  'checkout.success.nextSteps': { fr: 'Prochaines étapes', en: 'Next steps' },
  'checkout.success.step.attendance': { fr: 'Marquez les présences de vos prochaines séances', en: 'Mark attendance for your upcoming sessions' },
  'checkout.success.step.grades': { fr: 'Créez votre première évaluation', en: 'Create your first evaluation' },
  'checkout.success.step.teacher': { fr: 'Envoyez une demande de disponibilité', en: 'Send an availability request' },
  'checkout.success.step.email': { fr: 'Configurez vos templates email', en: 'Configure your email templates' },
  'checkout.success.step.student': { fr: 'Importez vos étudiants', en: 'Import your students' },
  'checkout.success.confirmed': { fr: 'Votre paiement a été confirmé.', en: 'Your payment has been confirmed.' },
  'checkout.success.cta.access': { fr: 'Accéder à mon espace', en: 'Access my space' },
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
