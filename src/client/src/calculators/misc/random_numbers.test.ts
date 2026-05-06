// src/client/src/calculators/misc/random_number_generator.test.ts
import { describe, it, expect, vi } from 'vitest'
import { generateRandomNumbers, isValidRange, formatNumber } from './random_numbers'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateRandomNumbers', () => {
  it('génère des nombres dans l\'intervalle spécifié (non uniques)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456)
    
    const numbers = generateRandomNumbers(1, 10, 5, false)
    
    expect(numbers.length).toBe(5)
    numbers.forEach(num => {
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(10)
    })
    // Le calcul est : Math.floor(0.123456 * (10-1+1)) + 1 = Math.floor(1.23456) + 1 = 1 + 1 = 2
    expect(numbers).toEqual([2, 2, 2, 2, 2])
  })
  
  it('génère des nombres dans l\'intervalle spécifié (uniques)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456)
    
    const numbers = generateRandomNumbers(1, 10, 5, true)
    
    expect(numbers.length).toBe(5)
    expect(new Set(numbers).size).toBe(5) // Vérifie l'unicité
    
    numbers.forEach(num => {
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(10)
    })
    
    // Le premier nombre est 2 (comme dans le cas non unique)
    // Le pool initial est [1,2,3,4,5,6,7,8,9,10]
    // Après avoir pris 2, le pool devient [1,3,4,5,6,7,8,9,10]
    // Avec Math.random() = 0.123456, l'index suivant est 0.123456 * 9 = 1.11 -> 1 (arrondi inférieur)
    // Donc le deuxième nombre est 3 (l'élément à l'index 1)
    // Ensuite, le pool est [1,4,5,6,7,8,9,10], index = 0.123456 * 8 = 0.98 -> 0, donc 1
    // Et ainsi de suite...
    expect(numbers).toEqual([2, 3, 1, 4, 5])
  })
  
  it('génère des nombres corrects avec min=0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const numbers = generateRandomNumbers(0, 5, 10, false)
    
    expect(numbers.length).toBe(10)
    numbers.forEach(num => {
      expect(num).toBeGreaterThanOrEqual(0)
      expect(num).toBeLessThanOrEqual(5)
    })
    // Calcul : Math.floor(0.5 * (5-0+1)) + 0 = Math.floor(3) = 3
    expect(numbers).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3])
  })
  
  it('génère des nombres corrects avec min/max négatifs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const numbers = generateRandomNumbers(-10, -5, 5, false)
    
    expect(numbers.length).toBe(5)
    numbers.forEach(num => {
      expect(num).toBeGreaterThanOrEqual(-10)
      expect(num).toBeLessThanOrEqual(-5)
    })
    // Calcul : Math.floor(0.5 * (-5 - (-10) + 1)) + (-10) = Math.floor(0.5 * 6) - 10 = 3 - 10 = -7
    expect(numbers).toEqual([-7, -7, -7, -7, -7])
  })
  
  it('gère correctement le cas min = max', () => {
    const numbers = generateRandomNumbers(5, 5, 10, false)
    
    expect(numbers.length).toBe(10)
    numbers.forEach(num => expect(num).toBe(5))
  })
  
  it('renvoie des nombres uniques quand demandé', () => {
    const numbers = generateRandomNumbers(1, 10, 5, true)
    expect(new Set(numbers).size).toBe(5)
  })
  
  it('gère correctement le cas où count = 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75)
    const numbers = generateRandomNumbers(1, 100, 1, false)
    expect(numbers.length).toBe(1)
    // Calcul : Math.floor(0.75 * (100-1+1)) + 1 = Math.floor(75) + 1 = 75 + 1 = 76
    expect(numbers[0]).toBe(76)
  })
  
  it('génère des nombres différents à chaque appel (non unique)', () => {
    const numbers1 = generateRandomNumbers(1, 10, 1000, false)
    const uniqueNumbers = new Set(numbers1)
    
    // Avec 1000 appels et un intervalle de 10 nombres, il est extrêmement improbable
    // que tous les nombres soient identiques
    expect(uniqueNumbers.size).toBeGreaterThan(1)
  })
})

describe('isValidRange', () => {
  it('valide correctement une plage valide', () => {
    expect(isValidRange(1, 10, 5, false)).toBe(true)
    expect(isValidRange(1, 10, 10, true)).toBe(true)
    expect(isValidRange(-5, 5, 10, false)).toBe(true)
  })
  
  it('rejette min > max', () => {
    expect(isValidRange(10, 1, 5, false)).toBe(false)
    expect(isValidRange(5, -5, 10, false)).toBe(false)
  })
  
  it('rejette trop de nombres uniques demandés', () => {
    expect(isValidRange(1, 10, 11, true)).toBe(false)
    expect(isValidRange(5, 10, 7, true)).toBe(false)
  })
  
  it('accepte count = range size pour les nombres uniques', () => {
    expect(isValidRange(1, 10, 10, true)).toBe(true)
    expect(isValidRange(5, 10, 6, true)).toBe(true)
  })
  
  it('rejette count négatif ou nul', () => {
    expect(isValidRange(1, 10, 0, false)).toBe(false)
    expect(isValidRange(1, 10, -5, false)).toBe(false)
  })
})

describe('formatNumber', () => {
  it('formate correctement les nombres entiers', () => {
    expect(formatNumber(123)).toBe('123')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(-42)).toBe('-42')
  })
  
  it('formate correctement les grands nombres', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
    expect(formatNumber(-1000000)).toBe('-1,000,000')
  })
  
  it('gère les cas limites', () => {
    expect(formatNumber(NaN)).toBe('-')
    expect(formatNumber(Infinity)).toBe('∞')
    expect(formatNumber(-Infinity)).toBe('-∞')
  })
})

describe('Cas limites', () => {
  it('gère correctement min = 0, max = 0', () => {
    const numbers = generateRandomNumbers(0, 0, 5, false)
    expect(numbers).toEqual([0, 0, 0, 0, 0])
  })
  
  it('gère correctement min = 1, max = 1 avec unique', () => {
    const numbers = generateRandomNumbers(1, 1, 1, true)
    expect(numbers).toEqual([1])
  })
  
  it('échoue avec min = 1, max = 1 et count = 2 avec unique', () => {
    expect(() => generateRandomNumbers(1, 1, 2, true)).toThrow()
  })
  
  it('génère des nombres corrects pour un grand intervalle', () => {
    const numbers = generateRandomNumbers(1, 1000000, 10, false)
    
    expect(numbers.length).toBe(10)
    numbers.forEach(num => {
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(1000000)
    })
  })
  
  it('génère des nombres corrects pour un intervalle négatif large', () => {
    const numbers = generateRandomNumbers(-1000000, -1, 10, false)
    
    expect(numbers.length).toBe(10)
    numbers.forEach(num => {
      expect(num).toBeGreaterThanOrEqual(-1000000)
      expect(num).toBeLessThanOrEqual(-1)
    })
  })
  
  it('vérifie que chaque nombre apparaît au moins une fois', () => {
    const counts = new Array(10).fill(0)
    const SAMPLE_SIZE = 20000
    
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const num = generateRandomNumbers(1, 10, 1, false)[0]
      counts[num - 1]++
    }
    
    // Avec un échantillon suffisamment grand, chaque nombre devrait apparaître
    counts.forEach(count => {
      expect(count).toBeGreaterThan(0)
    })
  })
  
  it('vérifie que les nombres uniques sont bien sans doublons', () => {
    const numbers = generateRandomNumbers(1, 100, 50, true)
    const uniqueNumbers = new Set(numbers)
    
    expect(numbers.length).toBe(50)
    expect(uniqueNumbers.size).toBe(50)
  })
  
  it('vérifie que les nombres non uniques peuvent avoir des doublons', () => {
    const numbers = generateRandomNumbers(1, 5, 100, false)
    const uniqueNumbers = new Set(numbers)
    
    expect(numbers.length).toBe(100)
    expect(uniqueNumbers.size).toBeLessThan(100)
  })
  
  it('vérifie la distribution avec un test plus robuste', () => {
    const counts = new Array(10).fill(0)
    const SAMPLE_SIZE = 20000
    
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const num = generateRandomNumbers(1, 10, 1, false)[0]
      counts[num - 1]++
    }
    
    // Calcul du chi-carré pour vérifier la distribution
    const expected = SAMPLE_SIZE / 10
    let chiSquare = 0
    counts.forEach(count => {
      chiSquare += Math.pow(count - expected, 2) / expected
    })
    
    // Pour 9 degrés de liberté (10-1), la valeur critique à 95% est 16.92
    const CRITICAL_VALUE = 16.92
    
    expect(chiSquare).toBeLessThan(CRITICAL_VALUE)
  })
})

describe('Math.random integration', () => {
  it('utilise correctement Math.random pour la formule (non unique)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const numbers = generateRandomNumbers(1, 10, 5, false)
    
    // Calcul : Math.floor(0.5 * (10-1+1)) + 1 = Math.floor(5) + 1 = 5 + 1 = 6
    numbers.forEach(num => expect(num).toBe(6))
  })
  
  it('utilise correctement Math.random pour la formule (unique)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const numbers = generateRandomNumbers(1, 5, 3, true)
    
    // Le premier nombre est Math.floor(0.1 * 5) + 1 = 0 + 1 = 1
    // Le pool devient [2,3,4,5]
    // Le deuxième nombre est Math.floor(0.1 * 4) = 0 -> 2
    // Le pool devient [3,4,5]
    // Le troisième nombre est Math.floor(0.1 * 3) = 0 -> 3
    expect(numbers).toEqual([1, 2, 3])
  })
  
  it('génère min quand Math.random() = 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const numbers = generateRandomNumbers(5, 15, 5, false)
    
    // Calcul : Math.floor(0 * (15-5+1)) + 5 = 0 + 5 = 5
    numbers.forEach(num => expect(num).toBe(5))
  })
  
  it('génère max quand Math.random() approche 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    const numbers = generateRandomNumbers(5, 15, 5, false)
    
    // Calcul : Math.floor(0.999999 * (15-5+1)) + 5 = Math.floor(10.999989) + 5 = 10 + 5 = 15
    numbers.forEach(num => expect(num).toBe(15))
  })
  
  it('ne génère jamais max + 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    const numbers = generateRandomNumbers(5, 15, 100, false)
    
    numbers.forEach(num => {
      expect(num).toBeGreaterThanOrEqual(5)
      expect(num).toBeLessThanOrEqual(15)
    })
  })
  
  it('génère correctement avec Math.random() = 0.9999999999999999', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999999999999999)
    const numbers = generateRandomNumbers(1, 100, 10, false)
    
    numbers.forEach(num => {
      expect(num).toBeGreaterThanOrEqual(1)
      expect(num).toBeLessThanOrEqual(100)
    })
  })
})