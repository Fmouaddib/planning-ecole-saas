import { useState, useCallback } from 'react'

type Lang = 'fr' | 'en'

const translations: Record<string, Record<Lang, string>> = {
  // Navbar
  'nav.features': { fr: 'Fonctionnalités', en: 'Features' },
  'nav.pricing': { fr: 'Tarifs', en: 'Pricing' },
  'nav.login': { fr: 'Connexion', en: 'Login' },
  'nav.start': { fr: 'Commencer', en: 'Get Started' },

  // Hero
  'hero.title': { fr: 'Révolutionnez votre gestion de planning', en: 'Revolutionize your schedule management' },
  'hero.subtitle': {
    fr: 'La plateforme intelligente qui simplifie la planification des cours, la gestion des salles et la coordination des équipes pour votre établissement.',
    en: 'The intelligent platform that simplifies course scheduling, room management and team coordination for your institution.',
  },
  'hero.cta.primary': { fr: 'Commencer gratuitement', en: 'Start for free' },
  'hero.cta.secondary': { fr: 'Voir les fonctionnalités', en: 'See features' },

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
  'features.zoom.title': { fr: 'Intégration Zoom', en: 'Zoom Integration' },
  'features.zoom.desc': {
    fr: 'Créez automatiquement des liens Zoom pour vos cours en ligne et réunions hybrides.',
    en: 'Automatically create Zoom links for your online classes and hybrid meetings.',
  },
  'features.email.title': { fr: 'Emails automatiques', en: 'Automatic Emails' },
  'features.email.desc': {
    fr: 'Notifications et rappels automatiques envoyés aux enseignants et étudiants concernés.',
    en: 'Automatic notifications and reminders sent to relevant teachers and students.',
  },

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

  // Plan names
  'plan.free': { fr: 'Gratuit', en: 'Free' },
  'plan.pro': { fr: 'Pro', en: 'Pro' },
  'plan.enterprise': { fr: 'Enterprise', en: 'Enterprise' },

  // Plan features
  'plan.free.f1': { fr: 'Jusqu\'à 5 utilisateurs', en: 'Up to 5 users' },
  'plan.free.f2': { fr: '3 salles maximum', en: '3 rooms maximum' },
  'plan.free.f3': { fr: '50 réservations/mois', en: '50 bookings/month' },
  'plan.free.f4': { fr: 'Calendrier de base', en: 'Basic calendar' },
  'plan.pro.f1': { fr: 'Jusqu\'à 50 utilisateurs', en: 'Up to 50 users' },
  'plan.pro.f2': { fr: 'Salles illimitées', en: 'Unlimited rooms' },
  'plan.pro.f3': { fr: 'Réservations illimitées', en: 'Unlimited bookings' },
  'plan.pro.f4': { fr: 'Détection de conflits', en: 'Conflict detection' },
  'plan.pro.f5': { fr: 'Intégration Zoom', en: 'Zoom integration' },
  'plan.pro.f6': { fr: 'Support prioritaire', en: 'Priority support' },
  'plan.enterprise.f1': { fr: 'Utilisateurs illimités', en: 'Unlimited users' },
  'plan.enterprise.f2': { fr: 'Multi-établissements', en: 'Multi-campus' },
  'plan.enterprise.f3': { fr: 'API & webhooks', en: 'API & webhooks' },
  'plan.enterprise.f4': { fr: 'SSO / SAML', en: 'SSO / SAML' },
  'plan.enterprise.f5': { fr: 'SLA garanti 99.9%', en: '99.9% SLA guarantee' },
  'plan.enterprise.f6': { fr: 'Account manager dédié', en: 'Dedicated account manager' },

  // CTA section
  'cta.title': { fr: 'Prêt à transformer votre planning ?', en: 'Ready to transform your schedule?' },
  'cta.subtitle': {
    fr: 'Rejoignez des centaines d\'établissements qui font confiance à AntiPlanning.',
    en: 'Join hundreds of institutions that trust AntiPlanning.',
  },
  'cta.button': { fr: 'Commencer gratuitement', en: 'Start for free' },

  // Footer
  'footer.tagline': {
    fr: 'La gestion de planning intelligente pour l\'éducation.',
    en: 'Smart schedule management for education.',
  },
  'footer.product': { fr: 'Produit', en: 'Product' },
  'footer.legal': { fr: 'Légal', en: 'Legal' },
  'footer.features': { fr: 'Fonctionnalités', en: 'Features' },
  'footer.pricing': { fr: 'Tarifs', en: 'Pricing' },
  'footer.terms': { fr: 'Conditions d\'utilisation', en: 'Terms of Service' },
  'footer.privacy': { fr: 'Politique de confidentialité', en: 'Privacy Policy' },
  'footer.copyright': { fr: '© 2026 AntiPlanning. Tous droits réservés.', en: '© 2026 AntiPlanning. All rights reserved.' },

  // Auth back link
  'auth.back': { fr: '← Retour à l\'accueil', en: '← Back to home' },
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
