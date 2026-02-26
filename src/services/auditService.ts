/**
 * Service d'audit pour loguer les actions dans l'application
 * Les logs sont stockés dans la table audit_log de Supabase
 * (table créée par super-admin-migration.sql)
 */

import type { AuditLogEntry } from '@/types'
import { supabase } from '@/lib/supabase'

export class AuditService {
  /**
   * Loguer une action dans le journal d'audit
   * Silencieux en cas d'erreur (ne doit jamais bloquer l'UX)
   */
  static async logAction(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_log')
        .insert({
          action: entry.action,
          entity_type: entry.resourceType,
          entity_id: entry.resourceId || null,
          user_id: entry.userId,
          user_email: entry.userEmail || null,
          details: entry.details || null,
          ip_address: entry.ipAddress || null,
        })

      if (error) {
        console.warn('Audit log failed (non-blocking):', error.message)
      }
    } catch (error) {
      // L'audit ne doit jamais bloquer le flux principal
      console.warn('Audit log error (non-blocking):', error)
    }
  }

  /**
   * Loguer une connexion utilisateur
   */
  static async logLogin(userId: string, email: string, _establishmentId: string): Promise<void> {
    await this.logAction({
      action: 'user.login',
      resourceType: 'user',
      resourceId: userId,
      establishmentId: _establishmentId,
      userId,
      userEmail: email,
      details: { timestamp: new Date().toISOString() },
    })
  }

  /**
   * Loguer une déconnexion utilisateur
   */
  static async logLogout(userId: string, email: string, _establishmentId: string): Promise<void> {
    await this.logAction({
      action: 'user.logout',
      resourceType: 'user',
      resourceId: userId,
      establishmentId: _establishmentId,
      userId,
      userEmail: email,
    })
  }

  /**
   * Loguer une opération CRUD
   */
  static async logCrud(
    operation: 'created' | 'updated' | 'deleted',
    resourceType: string,
    resourceId: string,
    userId: string,
    _establishmentId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.logAction({
      action: `${resourceType}.${operation}`,
      resourceType,
      resourceId,
      establishmentId: _establishmentId,
      userId,
      details,
    })
  }
}
