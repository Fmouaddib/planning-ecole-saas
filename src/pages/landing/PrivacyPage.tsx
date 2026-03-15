import { useEffect } from 'react'
import { updatePageMeta } from '@/utils/seo'
import LandingLayout from '@/components/landing/LandingLayout'

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
    updatePageMeta({
      title: 'Politique de Confidentialite',
      description: 'Politique de confidentialite d\'Anti-Planning. Protection des donnees personnelles et conformite RGPD.',
      path: '/privacy',
      keywords: 'politique confidentialite anti-planning, RGPD formation, protection donnees ecole, donnees personnelles',
    })
  }, [])

  const sectionStyle = { marginBottom: '2rem' }
  const h2Style = { fontSize: '1.25rem', fontWeight: 700 as const, color: '#1e293b', marginBottom: '0.75rem' }
  const pStyle = { color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem', fontSize: '0.95rem' }

  return (
    <LandingLayout isDetailPage>
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <h1>Politique de Confidentialité</h1>
          <p>Dernière mise à jour : 9 mars 2026</p>
        </div>
      </section>

      <section style={{ padding: '3rem 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 1.5rem' }}>

          <div style={sectionStyle}>
            <h2 style={h2Style}>1. Responsable du traitement</h2>
            <p style={pStyle}>
              Le responsable du traitement des données est AntiPlanning SAS, éditeur de l'application
              AntiPlanning accessible à l'adresse anti-planning.com.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>2. Données collectées</h2>
            <p style={pStyle}>Nous collectons les données suivantes :</p>
            <ul style={{ ...pStyle, paddingLeft: '1.5rem' }}>
              <li><strong>Données d'inscription</strong> : nom, prénom, adresse email, mot de passe (chiffré)</li>
              <li><strong>Données d'établissement</strong> : nom, adresse, téléphone, email de contact</li>
              <li><strong>Données d'utilisation</strong> : emplois du temps, présences, notes, messages</li>
              <li><strong>Données techniques</strong> : adresse IP, navigateur, données de connexion</li>
              <li><strong>Données de paiement</strong> : gérées exclusivement par Stripe (nous ne stockons aucun numéro de carte)</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>3. Finalités du traitement</h2>
            <p style={pStyle}>Vos données sont utilisées pour :</p>
            <ul style={{ ...pStyle, paddingLeft: '1.5rem' }}>
              <li>Fournir et améliorer le Service</li>
              <li>Gérer votre compte et votre abonnement</li>
              <li>Envoyer des notifications liées au Service (rappels de séances, etc.)</li>
              <li>Assurer la sécurité et prévenir la fraude</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>4. Base légale</h2>
            <p style={pStyle}>
              Le traitement de vos données repose sur l'exécution du contrat (fourniture du Service),
              votre consentement (emails marketing) et nos intérêts légitimes (amélioration du Service, sécurité).
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>5. Hébergement et sécurité</h2>
            <p style={pStyle}>
              Vos données sont hébergées par Supabase (infrastructure cloud européenne) avec chiffrement
              en transit (TLS/SSL) et au repos. L'application est déployée sur Vercel.
              Les paiements sont sécurisés par Stripe (certifié PCI DSS Level 1).
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>6. Durée de conservation</h2>
            <p style={pStyle}>
              Les données sont conservées pendant la durée de votre abonnement, puis 3 ans après la
              résiliation pour les obligations légales. Les données de paiement sont conservées
              conformément aux obligations fiscales (10 ans).
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>7. Vos droits (RGPD)</h2>
            <p style={pStyle}>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul style={{ ...pStyle, paddingLeft: '1.5rem' }}>
              <li><strong>Accès</strong> : obtenir une copie de vos données personnelles</li>
              <li><strong>Rectification</strong> : corriger vos données inexactes</li>
              <li><strong>Suppression</strong> : demander l'effacement de vos données</li>
              <li><strong>Portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Opposition</strong> : vous opposer au traitement de vos données</li>
              <li><strong>Limitation</strong> : demander la limitation du traitement</li>
            </ul>
            <p style={pStyle}>
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:privacy@anti-planning.com" style={{ color: '#FF5B46' }}>privacy@anti-planning.com</a>.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>8. Cookies</h2>
            <p style={pStyle}>
              Nous utilisons des cookies techniques nécessaires au fonctionnement du Service
              (authentification, préférences de langue et de thème). Nous utilisons Google Analytics
              pour mesurer l'audience du site. Vous pouvez désactiver les cookies dans les paramètres
              de votre navigateur.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>9. Sous-traitants</h2>
            <p style={pStyle}>Nous faisons appel aux sous-traitants suivants :</p>
            <ul style={{ ...pStyle, paddingLeft: '1.5rem' }}>
              <li><strong>Supabase</strong> (base de données, authentification) — UE</li>
              <li><strong>Vercel</strong> (hébergement frontend) — International</li>
              <li><strong>Stripe</strong> (paiements) — UE/International</li>
              <li><strong>Brevo</strong> (emails transactionnels) — France</li>
              <li><strong>Google Analytics</strong> (mesure d'audience) — International</li>
            </ul>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>10. Contact DPO</h2>
            <p style={pStyle}>
              Pour toute question relative à la protection de vos données, contactez notre DPO à{' '}
              <a href="mailto:privacy@anti-planning.com" style={{ color: '#FF5B46' }}>privacy@anti-planning.com</a>.
            </p>
            <p style={pStyle}>
              Vous pouvez également adresser une réclamation à la CNIL (Commission Nationale de
              l'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: '#FF5B46' }}>www.cnil.fr</a>.
            </p>
          </div>

        </div>
      </section>
    </LandingLayout>
  )
}
