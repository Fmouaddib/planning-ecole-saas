/**
 * Utilitaires de calcul et formatage des prix HT/TTC
 * TVA française à 20% — tous les prix stockés sont HT
 */

export const TVA_RATE = 0.20

/** Calcule le prix TTC à partir d'un prix HT */
export function priceTTC(ht: number): number {
  return Math.round(ht * (1 + TVA_RATE) * 100) / 100
}

/** Formate un prix avec le symbole € */
export function formatPrice(amount: number): string {
  return amount % 1 === 0 ? `${amount}` : amount.toFixed(2).replace('.', ',')
}

/** Formate un prix HT avec mention "HT" */
export function formatHT(ht: number): string {
  return `${formatPrice(ht)}€ HT`
}

/** Formate un prix TTC à partir d'un HT */
export function formatTTC(ht: number): string {
  return `${formatPrice(priceTTC(ht))}€ TTC`
}
