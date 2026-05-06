// src/client/src/calculators/misc/random_number_generator.ts
/**
 * Génère des nombres aléatoires dans un intervalle spécifié
 * @param min Valeur minimale incluse
 * @param max Valeur maximale incluse
 * @param count Nombre de nombres à générer
 * @param unique Si true, génère des nombres uniques (sans doublons)
 * @returns Tableau de nombres aléatoires
 */
export function generateRandomNumbers(min: number, max: number, count: number, unique: boolean): number[] {
    // Validation des paramètres
    if (!isValidRange(min, max, count, unique)) {
      throw new Error('Invalid range or parameters')
    }
  
    const numbers: number[] = []
  
    if (unique) {
      // Créer un pool de tous les nombres possibles
      const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i)
      
      // Piocher sans remise
      for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * pool.length)
        numbers.push(pool.splice(index, 1)[0])
      }
    } else {
      // Génération avec remise
      for (let i = 0; i < count; i++) {
        numbers.push(Math.floor(Math.random() * (max - min + 1)) + min)
      }
    }
  
    return numbers
  }
  
  /**
   * Vérifie si les paramètres de génération sont valides
   */
  export function isValidRange(min: number, max: number, count: number, unique: boolean): boolean {
    // Vérifier que min <= max
    if (min > max) {
      return false
    }
    
    // Vérifier que count est positif
    if (count <= 0) {
      return false
    }
    
    // Pour les nombres uniques, vérifier que count <= (max - min + 1)
    if (unique && count > (max - min + 1)) {
      return false
    }
    
    return true
  }
  
  /**
   * Formate un nombre avec des séparateurs de milliers
   */
  export function formatNumber(num: number): string {
    if (isNaN(num)) return '-'
    if (num === Infinity) return '∞'
    if (num === -Infinity) return '-∞'
    
    return num.toLocaleString('en-US')
  }