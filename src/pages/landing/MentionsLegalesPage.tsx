import { useEffect } from 'react'
import { updatePageMeta } from '@/utils/seo'
import LandingLayout from '@/components/landing/LandingLayout'

export default function MentionsLegalesPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
    updatePageMeta({
      title: 'Mentions Légales',
      description: 'Mentions légales du site Anti-Planning, édité par OVENCIA SAS.',
      path: '/mentions-legales',
      keywords: 'mentions légales anti-planning, OVENCIA SAS, éditeur planning école',
    })
  }, [])

  const sectionStyle = { marginBottom: '2rem' }
  const h2Style = { fontSize: '1.25rem', fontWeight: 700 as const, color: '#1e293b', marginBottom: '0.75rem' }
  const pStyle = { color: '#475569', lineHeight: 1.7, marginBottom: '0.75rem', fontSize: '0.95rem' }

  return (
    <LandingLayout isDetailPage>
      <section className="landing-detail-hero">
        <div className="landing-detail-hero-inner">
          <h1>Mentions Légales</h1>
          <p>Dernière mise à jour : 15 mars 2026</p>
        </div>
      </section>

      <section style={{ padding: '3rem 0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 1.5rem' }}>

          <div style={sectionStyle}>
            <h2 style={h2Style}>1. Éditeur du site</h2>
            <p style={pStyle}>
              Le site <strong>anti-planning.com</strong> est édité par :
            </p>
            <p style={pStyle}>
              <strong>OVENCIA SAS</strong><br />
              Société par actions simplifiée au capital de 1 000 €<br />
              Siège social : 9 Jardin Fatima Bedar, 93200 Saint-Denis<br />
              SIRET : 790 870 760 000 36<br />
              N° TVA intracommunautaire : FR52790870760<br />
              RCS : Saint-Denis
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>2. Directeur de la publication</h2>
            <p style={pStyle}>
              Le directeur de la publication est <strong>Fahd MOUADDIB</strong>, en qualité de Président d'OVENCIA SAS.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>3. Hébergeur</h2>
            <p style={pStyle}>
              Le site est hébergé par :
            </p>
            <p style={pStyle}>
              <strong>Vercel Inc.</strong><br />
              440 N Barranca Ave, Covina, CA 91723, États-Unis<br />
              Site web : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: '#FF5B46' }}>vercel.com</a>
            </p>
            <p style={pStyle}>
              Les données applicatives (base de données, authentification, fichiers) sont hébergées par :
            </p>
            <p style={pStyle}>
              <strong>Supabase Inc.</strong><br />
              970 Toa Payoh North, #07-04, Singapour 318992<br />
              Site web : <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={{ color: '#FF5B46' }}>supabase.com</a>
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>4. Contact</h2>
            <p style={pStyle}>
              Pour toute question relative au site ou à son contenu, vous pouvez nous contacter :
            </p>
            <p style={pStyle}>
              Email : <a href="mailto:contact@anti-planning.com" style={{ color: '#FF5B46' }}>contact@anti-planning.com</a><br />
              Formulaire de contact : <a href="#/contact" style={{ color: '#FF5B46' }}>anti-planning.com/contact</a>
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>5. Propriété intellectuelle</h2>
            <p style={pStyle}>
              L'ensemble des contenus présents sur le site anti-planning.com (textes, images, logos, icônes, logiciels, base de données, structure) est protégé par le droit d'auteur et le droit de la propriété intellectuelle. Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation écrite préalable d'OVENCIA SAS.
            </p>
            <p style={pStyle}>
              La marque <strong>Anti-Planning</strong>, le logo et les éléments graphiques associés sont la propriété exclusive d'OVENCIA SAS.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>6. Données personnelles</h2>
            <p style={pStyle}>
              Les informations relatives au traitement des données personnelles sont détaillées dans notre{' '}
              <a href="#/privacy" style={{ color: '#FF5B46' }}>Politique de Confidentialité</a>.
            </p>
            <p style={pStyle}>
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression, de limitation, de portabilité et d'opposition concernant vos données personnelles. Vous pouvez exercer ces droits en nous contactant à l'adresse{' '}
              <a href="mailto:contact@anti-planning.com" style={{ color: '#FF5B46' }}>contact@anti-planning.com</a>.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>7. Cookies</h2>
            <p style={pStyle}>
              Le site utilise des cookies techniques nécessaires à son fonctionnement (authentification, préférences utilisateur) ainsi que des cookies de mesure d'audience (Google Analytics). Ces derniers sont configurés pour respecter les recommandations de la CNIL et ne collectent aucune donnée permettant l'identification directe des utilisateurs.
            </p>
            <p style={pStyle}>
              Vous pouvez à tout moment désactiver les cookies dans les paramètres de votre navigateur.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>8. Limitation de responsabilité</h2>
            <p style={pStyle}>
              OVENCIA SAS s'efforce de fournir sur le site des informations aussi précises que possible. Toutefois, elle ne pourra être tenue responsable des omissions, des inexactitudes ou des carences dans la mise à jour, qu'elles soient de son fait ou du fait des tiers partenaires qui lui fournissent ces informations.
            </p>
            <p style={pStyle}>
              OVENCIA SAS ne pourra être tenue responsable des dommages directs ou indirects causés au matériel de l'utilisateur lors de l'accès au site, résultant soit de l'utilisation d'un matériel ne répondant pas aux spécifications techniques requises, soit de l'apparition d'un bug ou d'une incompatibilité.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={h2Style}>9. Droit applicable</h2>
            <p style={pStyle}>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, les tribunaux de Bobigny seront seuls compétents.
            </p>
          </div>

        </div>
      </section>
    </LandingLayout>
  )
}
