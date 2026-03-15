import { useEffect } from 'react'
import { updatePageMeta } from '@/utils/seo'
import LandingLayout from '@/components/landing/LandingLayout'

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
    updatePageMeta({
      title: 'Conditions Generales d\'Utilisation',
      description: 'Conditions generales d\'utilisation d\'Anti-Planning.',
      path: '/terms',
      keywords: 'CGU anti-planning, conditions utilisation, mentions legales planning ecole',
    })
  }, [])

  const sectionStyle = { marginBottom: '2rem' }
  const h2Style = { fontSize: '1.25rem', fontWeight: 700 as const, color: '#1e293b', marginBottom: '0.75rem' }
  const pStyle = { color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem', fontSize: '0.95rem' }

  return (
    <LandingLayout isDetailPage>
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <h1>Conditions Générales d'Utilisation</h1>
          <p>Dernière mise à jour : 9 mars 2026</p>
        </div>
      </section>

      <section style={{ padding: '3rem 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 1.5rem' }}>

          <div style={sectionStyle}>
            <h2 style={h2Style}>1. Objet</h2>
            <p style={pStyle}>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation
              du service AntiPlanning (ci-après « le Service »), application SaaS de gestion de planning
              éditée par AntiPlanning SAS.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>2. Description du Service</h2>
            <p style={pStyle}>
              AntiPlanning est une plateforme en ligne permettant aux écoles et centres de formation de :
            </p>
            <ul style={{ ...pStyle, paddingLeft: '1.5rem' }}>
              <li>Créer et gérer des emplois du temps</li>
              <li>Gérer les salles, enseignants et étudiants</li>
              <li>Suivre les présences et les notes</li>
              <li>Communiquer via messagerie intégrée</li>
              <li>Générer des bulletins scolaires</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>3. Inscription et compte</h2>
            <p style={pStyle}>
              L'utilisation du Service nécessite la création d'un compte. L'utilisateur s'engage à fournir
              des informations exactes et à maintenir la confidentialité de ses identifiants de connexion.
              Chaque établissement dispose d'un code d'inscription unique pour permettre l'accès à ses membres.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>4. Abonnements et paiement</h2>
            <p style={pStyle}>
              Le Service propose plusieurs formules d'abonnement (Gratuit, École en ligne, Pro, Enterprise).
              Les tarifs sont indiqués en euros hors taxes. La facturation est mensuelle ou annuelle selon
              l'option choisie. Le paiement est géré par Stripe, prestataire de paiement sécurisé.
            </p>
            <p style={pStyle}>
              Vous pouvez résilier votre abonnement à tout moment. La résiliation prend effet à la fin
              de la période de facturation en cours. Aucun remboursement prorata n'est effectué.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>5. Propriété intellectuelle</h2>
            <p style={pStyle}>
              Le Service, son interface, son code source et ses contenus sont la propriété exclusive
              d'AntiPlanning SAS. Toute reproduction ou utilisation non autorisée est interdite.
              Les données saisies par l'utilisateur restent sa propriété.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>6. Disponibilité du Service</h2>
            <p style={pStyle}>
              AntiPlanning s'efforce d'assurer une disponibilité de 99,9% pour les abonnements Enterprise.
              Des interruptions pour maintenance peuvent survenir, avec notification préalable lorsque possible.
              AntiPlanning ne saurait être tenu responsable des interruptions indépendantes de sa volonté.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>7. Responsabilité</h2>
            <p style={pStyle}>
              Le Service est fourni « en l'état ». AntiPlanning ne garantit pas que le Service
              sera exempt d'erreurs ou d'interruptions. La responsabilité d'AntiPlanning est limitée
              au montant des sommes versées par l'utilisateur au cours des 12 derniers mois.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>8. Résiliation</h2>
            <p style={pStyle}>
              AntiPlanning se réserve le droit de suspendre ou résilier l'accès d'un utilisateur en cas
              de violation des présentes CGU, d'utilisation frauduleuse ou abusive du Service.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>9. Droit applicable</h2>
            <p style={pStyle}>
              Les présentes CGU sont soumises au droit français. Tout litige sera de la compétence
              exclusive des tribunaux de Paris, sauf disposition légale contraire.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>10. Contact</h2>
            <p style={pStyle}>
              Pour toute question relative aux présentes CGU, contactez-nous à{' '}
              <a href="mailto:contact@anti-planning.com" style={{ color: '#FF5B46' }}>contact@anti-planning.com</a>.
            </p>
          </div>

        </div>
      </section>
    </LandingLayout>
  )
}
