import jStat from 'jstat'

export function calculateTrendMock(rows: any[]) {
  if (rows.length < 2) return null
  const validRows = rows.filter(r => (r.cases + r.controls) > 0)
  if (validRows.length === 0) return null

  if (validRows.length === 1) {
    return {
      levels: [{
        ...validRows[0],
        proportion: validRows[0].cases / (validRows[0].cases + validRows[0].controls || 1),
        oddsRatio: null,
        orLower: null,
        orUpper: null,
        relativeRisk: null,
        rrLower: null,
        rrUpper: null
      }],
      chiSquare: 0,
      pValue: 1,
      trendDirection: 'none' as const
    }
  }



  const sorted = [...validRows].sort((a, b) => a.dose - b.dose)
  const ref = sorted[0]

  const refOdds = ref.controls > 0 ? ref.cases / ref.controls : null
  const refTotal = ref.cases + ref.controls
  const refProp = refTotal > 0 ? ref.cases / refTotal : null

  const levels = sorted.map(row => {
    const total = row.cases + row.controls
    const proportion = total > 0 ? row.cases / total : 0

    // --- OR ---
    let oddsRatio: number | null = null
    let orLower: number | null = null
    let orUpper: number | null = null

    if (
      row.controls > 0 &&
      ref.controls > 0 &&
      row.cases > 0 &&
      ref.cases > 0 &&
      refOdds
    ) {
      oddsRatio = (row.cases / row.controls) / refOdds

      const lnOR = Math.log(oddsRatio)
      const se = Math.sqrt(
        1 / row.cases +
        1 / row.controls +
        1 / ref.cases +
        1 / ref.controls
      )
      const z = 1.96

      orLower = Math.exp(lnOR - z * se)
      orUpper = Math.exp(lnOR + z * se)
    }

    // --- RR ---
    let relativeRisk: number | null = null
    let rrLower: number | null = null
    let rrUpper: number | null = null

    if (
      refProp &&
      refProp > 0 &&
      row.cases > 0 &&
      ref.cases > 0
    ) {
      relativeRisk = proportion / refProp

      const lnRR = Math.log(relativeRisk)
      const se = Math.sqrt(
        (1 - proportion) / row.cases +
        (1 - refProp) / ref.cases
      )
      const z = 1.96

      rrLower = Math.exp(lnRR - z * se)
      rrUpper = Math.exp(lnRR + z * se)
    }

    return {
      ...row,
      proportion,
      oddsRatio,
      orLower,
      orUpper,
      relativeRisk,
      rrLower,
      rrUpper
    }
  })

  // --- Trend ---
  let sumW = 0, sumWx = 0, sumWp = 0, sumWxp = 0

  sorted.forEach(r => {
    const n = r.cases + r.controls
    sumW += n
    sumWx += n * r.dose
    sumWp += r.cases
    sumWxp += r.cases * r.dose
  })

  const xBar = sumWx / sumW
  const pBar = sumWp / sumW

  let sumWxxc = 0
  sorted.forEach(r => {
    const n = r.cases + r.controls
    sumWxxc += n * (r.dose - xBar) ** 2
  })

  const variance = pBar * (1 - pBar) * sumWxxc
  const numerator = sumWxp - sumWp * xBar

  const chiSquare = variance > 0 ? (numerator ** 2) / variance : 0
  const pValue = 1 - jStat.chisquare.cdf(chiSquare, 1)

  let trendDirection: 'positive' | 'negative' | 'none' = 'none'
  if (Math.abs(numerator) > 1e-12) {
    trendDirection = numerator > 0 ? 'positive' : 'negative'
  }

  return { levels, chiSquare, pValue, trendDirection }
}