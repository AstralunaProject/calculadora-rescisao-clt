/**
 * INSS do segurado empregado e IRRF, tabelas de 2026.
 * INSS: Portaria Interministerial MPS/MF nº 13/2026 (gov.br/inss, "Tabela de contribuição mensal").
 * IRRF: Lei 15.191/2025 e redução da Lei 15.270/2025 (gov.br/receitafederal, "Tributação de 2026").
 */

export const ANO_TABELAS = 2026;

/** Limite superior e alíquota de cada faixa; cada alíquota incide só sobre a parte dentro da faixa. */
const FAIXAS_INSS = [
  { ate: 1621.0, aliquota: 0.075 },
  { ate: 2902.84, aliquota: 0.09 },
  { ate: 4354.27, aliquota: 0.12 },
  { ate: 8475.55, aliquota: 0.14 },
];

const FAIXAS_IRRF = [
  { ate: 2428.8, aliquota: 0, deduzir: 0 },
  { ate: 2826.65, aliquota: 0.075, deduzir: 182.16 },
  { ate: 3751.05, aliquota: 0.15, deduzir: 394.16 },
  { ate: 4664.68, aliquota: 0.225, deduzir: 675.49 },
  { ate: Infinity, aliquota: 0.275, deduzir: 908.73 },
];

export const DEDUCAO_DEPENDENTE = 189.59;
export const DESCONTO_SIMPLIFICADO = 607.2;

/** Arredonda para centavos tratando o erro binário de valores como 121,575. @param {number} valor */
export function arredondar(valor) {
  return Math.round(Number((valor * 100).toFixed(6))) / 100;
}

/** @param {number} base salário de contribuição do mês, ou o 13º calculado em separado */
export function calcularINSS(base) {
  let total = 0;
  let inicio = 0;
  for (const { ate, aliquota } of FAIXAS_INSS) {
    if (base <= inicio) break;
    total += (Math.min(base, ate) - inicio) * aliquota;
    inicio = ate;
  }
  return arredondar(total);
}

/**
 * Redução da Lei 15.270/2025 (art. 3º-A da Lei 9.250/95). Usa o rendimento tributável bruto,
 * não a base de cálculo, e nunca passa do imposto apurado pela tabela.
 * @param {number} rendimento @param {number} imposto
 */
function reducao(rendimento, imposto) {
  let valor = 0;
  if (rendimento <= 5000) valor = 312.89;
  else if (rendimento <= 7350) valor = Math.max(0, arredondar(978.62 - 0.133145 * rendimento));
  return Math.min(valor, imposto);
}

/**
 * IRRF retido na fonte. O 13º é tributado em separado, com a mesma regra (Lei 9.250/95, art. 3º-A, §3º).
 * O desconto simplificado substitui todas as deduções quando for maior que elas.
 * @param {{ rendimento: number, inss: number, dependentes?: number }} dados
 */
export function calcularIRRF({ rendimento, inss, dependentes = 0 }) {
  if (rendimento <= 0) return { base: 0, imposto: 0, reducao: 0, valor: 0 };
  const deducoes = Math.max(inss + DEDUCAO_DEPENDENTE * dependentes, DESCONTO_SIMPLIFICADO);
  const base = arredondar(Math.max(0, rendimento - deducoes));
  const faixa = FAIXAS_IRRF.find((f) => base <= f.ate) ?? FAIXAS_IRRF[FAIXAS_IRRF.length - 1];
  const imposto = Math.max(0, arredondar(base * faixa.aliquota - faixa.deduzir));
  const reduzido = reducao(rendimento, imposto);
  return { base, imposto, reducao: reduzido, valor: arredondar(imposto - reduzido) };
}
