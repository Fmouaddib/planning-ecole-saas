/**
 * Service d'onboarding self-service
 * Gère la création de centre et l'inscription par code
 */

import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/utils'

/** Format attendu : XX-YYYY (2 lettres, tiret, 1-6 caractères alphanumériques) ex: IS-PARIS, FP-LYON */
const ENROLLMENT_CODE_REGEX = /^[A-Z]{2}-[A-Z0-9]{1,9}$/i

export interface CreateCenterResult {
  center_id: string
  enrollment_code: string
  center_name: string
}

export interface JoinCenterResult {
  center_id: string
  center_name: string
}

export class OnboardingService {
  /**
   * Valide le format d'un code d'inscription
   */
  static isValidCodeFormat(code: string): boolean {
    return ENROLLMENT_CODE_REGEX.test(code.trim())
  }

  /**
   * Créer un centre avec l'utilisateur courant comme admin
   * L'utilisateur doit être authentifié (signUp terminé)
   */
  static async createCenterWithAdmin(params: {
    centerName: string
    acronym?: string
    address?: string
    postalCode?: string
    city?: string
    phone?: string
    email?: string
  }): Promise<CreateCenterResult> {
    try {
      const { data, error } = await supabase.rpc('create_center_with_admin', {
        p_center_name: params.centerName,
        p_acronym: params.acronym || null,
        p_address: params.address || null,
        p_postal_code: params.postalCode || null,
        p_city: params.city || null,
        p_phone: params.phone || null,
        p_email: params.email || null,
      })

      if (error) throw error
      return data as CreateCenterResult
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Rejoindre un centre existant via son code d'inscription
   * L'utilisateur doit être authentifié (signUp terminé)
   */
  static async joinCenterByCode(code: string, role: string = 'student'): Promise<JoinCenterResult> {
    try {
      const { data, error } = await supabase.rpc('join_center_by_code', {
        p_enrollment_code: code.trim(),
        p_role: role,
      })

      if (error) throw error
      return data as JoinCenterResult
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Attendre que le profil existe (trigger handle_new_user)
   * Retry avec backoff exponentiel
   */
  static async waitForProfile(userId: string, maxRetries = 8): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (data) return true
      await new Promise(r => setTimeout(r, 500 * Math.pow(1.5, i)))
    }
    return false
  }

  /**
   * Envoyer un email de bienvenue après création du centre
   */
  static async sendWelcomeEmail(params: {
    email: string
    firstName: string
    centerName: string
    enrollmentCode: string
  }): Promise<void> {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: [{ email: params.email, name: params.firstName }],
          subject: `Bienvenue sur AntiPlanning, ${params.firstName} !`,
          htmlContent: buildWelcomeEmailHtml(params),
          tags: ['welcome', 'onboarding'],
        },
      })
    } catch (err) {
      // Ne pas bloquer l'onboarding si l'email échoue
      console.warn('[OnboardingService] Welcome email failed:', err)
    }
  }
}

function buildWelcomeEmailHtml(params: {
  firstName: string
  centerName: string
  enrollmentCode: string
}): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="text-align:center;padding:32px 24px;background:linear-gradient(135deg,#FF5B46,#FBA625);border-radius:16px 16px 0 0;">
      <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="color:#fff;font-weight:800;font-size:24px;">A</span>
      </div>
      <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px;">Bienvenue sur AntiPlanning !</h1>
      <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0;">Votre espace ${params.centerName} est prêt</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px 24px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
      <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">
        Bonjour <strong>${params.firstName}</strong>,
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Félicitations ! Votre établissement <strong>${params.centerName}</strong> est créé et prêt à être utilisé.
      </p>

      <!-- Code d'inscription -->
      <div style="background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
        <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin:0 0 8px;">Code d'inscription de votre établissement</p>
        <p style="color:#FF5B46;font-size:28px;font-weight:800;letter-spacing:4px;margin:0;font-family:monospace;">${params.enrollmentCode}</p>
        <p style="color:#94a3b8;font-size:13px;margin:8px 0 0;">Partagez ce code avec vos enseignants et étudiants</p>
      </div>

      <!-- Steps -->
      <h3 style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 16px;">Pour bien démarrer :</h3>
      <div style="margin:0 0 24px;">
        <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
          <div style="width:28px;height:28px;background:#FF5B46;color:#fff;border-radius:50%;font-weight:700;font-size:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">1</div>
          <div>
            <p style="color:#1e293b;font-weight:600;margin:0;font-size:14px;">Configurez vos salles</p>
            <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Ajoutez vos salles de cours avec leurs équipements</p>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
          <div style="width:28px;height:28px;background:#FF5B46;color:#fff;border-radius:50%;font-weight:700;font-size:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">2</div>
          <div>
            <p style="color:#1e293b;font-weight:600;margin:0;font-size:14px;">Invitez vos enseignants</p>
            <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Partagez le code d'inscription ou invitez-les par email</p>
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="width:28px;height:28px;background:#FF5B46;color:#fff;border-radius:50%;font-weight:700;font-size:13px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">3</div>
          <div>
            <p style="color:#1e293b;font-weight:600;margin:0;font-size:14px;">Créez votre premier cours</p>
            <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Planifiez une séance dans le calendrier</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0 16px;">
        <a href="https://anti-planning.com/#/login" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#FF5B46,#FBA625);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;">
          Accéder à mon espace
        </a>
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0;">
        Une question ? Contactez-nous à <a href="mailto:contact@anti-planning.com" style="color:#FF5B46;">contact@anti-planning.com</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <p style="margin:0;">AntiPlanning — Planning intelligent pour écoles</p>
      <p style="margin:4px 0 0;"><a href="https://anti-planning.com" style="color:#94a3b8;">anti-planning.com</a></p>
    </div>
  </div>
</body>
</html>`
}
