/**
 * @typedef {"sem_justa_causa" | "rescisao_indireta" | "acordo" | "pedido_demissao" | "justa_causa"} Modalidade
 * @typedef {"indenizado" | "trabalhado" | "dispensado" | "nao_cumprido" | "nenhum"} TipoAviso
 *
 * @typedef {object} RegrasModalidade
 * @property {string} rotulo
 * @property {TipoAviso[]} avisos
 * @property {number} fracaoAviso
 * @property {number} multaFGTS
 * @property {number} saqueFGTS
 * @property {boolean} proporcionais
 * @property {boolean} seguroDesemprego
 *
 * @typedef {object} Entrada
 * @property {number} salario
 * @property {Date} admissao
 * @property {Date} desligamento
 * @property {Modalidade} modalidade
 * @property {TipoAviso} tipoAviso
 * @property {number} saldoFGTS
 * @property {number} feriasVencidas
 * @property {number} adiantamento13
 * @property {boolean} projetarAviso
 *
 * @typedef {object} Verba
 * @property {string} titulo
 * @property {string} detalhe
 * @property {number} valor
 *
 * @typedef {object} Resultado
 * @property {Verba[]} verbas
 * @property {Verba[]} descontos
 * @property {number} bruto
 * @property {number} total
 * @property {number} diasAviso
 * @property {Date} dataEfetiva
 * @property {string[]} observacoes
 */

/** @type {Record<Modalidade, RegrasModalidade>} */
export const MODALIDADES = {
  sem_justa_causa: {
    rotulo: "Demissão sem justa causa",
    avisos: ["indenizado", "trabalhado"],
    fracaoAviso: 1,
    multaFGTS: 0.4,
    saqueFGTS: 1,
    proporcionais: true,
    seguroDesemprego: true,
  },
  rescisao_indireta: {
    rotulo: "Rescisão indireta (art. 483 CLT)",
    avisos: ["indenizado"],
    fracaoAviso: 1,
    multaFGTS: 0.4,
    saqueFGTS: 1,
    proporcionais: true,
    seguroDesemprego: true,
  },
  acordo: {
    rotulo: "Acordo entre as partes (art. 484-A CLT)",
    avisos: ["indenizado", "trabalhado"],
    fracaoAviso: 0.5,
    multaFGTS: 0.2,
    saqueFGTS: 0.8,
    proporcionais: true,
    seguroDesemprego: false,
  },
  pedido_demissao: {
    rotulo: "Pedido de demissão",
    avisos: ["trabalhado", "dispensado", "nao_cumprido"],
    fracaoAviso: 0,
    multaFGTS: 0,
    saqueFGTS: 0,
    proporcionais: true,
    seguroDesemprego: false,
  },
  justa_causa: {
    rotulo: "Dispensa por justa causa (art. 482 CLT)",
    avisos: ["nenhum"],
    fracaoAviso: 0,
    multaFGTS: 0,
    saqueFGTS: 0,
    proporcionais: false,
    seguroDesemprego: false,
  },
};

/** @type {Record<TipoAviso, string>} */
export const ROTULOS_AVISO = {
  indenizado: "Indenizado",
  trabalhado: "Trabalhado",
  dispensado: "Dispensado pelo empregador",
  nao_cumprido: "Não cumprido (descontado)",
  nenhum: "Não se aplica",
};

const MS_POR_DIA = 86_400_000;

/** @param {string} texto */
export function parseDataLocal(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return null;
  const [ano, mes, dia] = partes.slice(1).map(Number);
  const data = new Date(ano, mes - 1, dia);
  // Rejeita datas como 2025-02-31, que o construtor de Date rola para março.
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
  return data;
}

/** @param {Date} data @param {number} dias */
export function somarDias(data, dias) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

/**
 * Âncora sempre na data original para não acumular deslocamento em meses curtos:
 * 31/01 + 1 mês = 28/02, mas 31/01 + 2 meses = 31/03.
 * @param {Date} data @param {number} meses
 */
export function somarMeses(data, meses) {
  const alvo = new Date(data.getFullYear(), data.getMonth() + meses, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(data.getDate(), ultimoDia));
  return alvo;
}

/** @param {Date} inicio @param {Date} fim */
function diasEntre(inicio, fim) {
  return Math.round((fim.getTime() - inicio.getTime()) / MS_POR_DIA);
}

/** @param {Date} data */
export function formatarData(data) {
  return data.toLocaleDateString("pt-BR");
}

/** @param {number} valor */
export function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** @param {number} valor */
function centavos(valor) {
  return Math.round(valor * 100) / 100;
}

/** @param {Date} inicio @param {Date} fim */
export function anosCompletos(inicio, fim) {
  let anos = fim.getFullYear() - inicio.getFullYear();
  if (somarMeses(inicio, anos * 12) > fim) anos--;
  return Math.max(0, anos);
}

/**
 * O último dia trabalhado conta como dia de serviço: quem entrou em 15/03/2020 e saiu
 * em 14/03/2025 completou 5 anos.
 * @param {Date} admissao @param {Date} ultimoDia
 */
export function anosDeServico(admissao, ultimoDia) {
  return anosCompletos(admissao, somarDias(ultimoDia, 1));
}

/**
 * 13º salário: cada mês civil com 15 dias ou mais de trabalho conta como 1/12
 * (Lei 4.090/62, art. 1º, §2º).
 * @param {Date} inicio @param {Date} fim
 */
export function mesesCivisComQuinzeDias(inicio, fim) {
  let meses = 0;
  for (let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1); cursor <= fim; ) {
    const proximo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const de = inicio > cursor ? inicio : cursor;
    const ate = fim < proximo ? fim : somarDias(proximo, -1);
    if (diasEntre(de, ate) + 1 >= 15) meses++;
    cursor = proximo;
  }
  return meses;
}

/**
 * Férias: os avos contam meses de serviço a partir do início do período aquisitivo,
 * não meses civis, mais 1/12 para fração superior a 14 dias (CLT, art. 146, parágrafo único).
 * @param {Date} inicio @param {Date} fim último dia de serviço, inclusivo
 */
export function avosDeServico(inicio, fim) {
  const diaSeguinte = somarDias(fim, 1);
  if (diaSeguinte <= inicio) return 0;
  let meses = 0;
  while (somarMeses(inicio, meses + 1) <= diaSeguinte) meses++;
  const sobra = diasEntre(somarMeses(inicio, meses), diaSeguinte);
  return meses + (sobra >= 15 ? 1 : 0);
}

/**
 * Lei 12.506/2011: 30 dias + 3 por ano completo, até 90. O TST firmou que a
 * proporcionalidade só beneficia o empregado; quando é ele quem pede demissão, o prazo é de 30 dias.
 * @param {Entrada} entrada
 */
export function diasDeAviso({ modalidade, admissao, desligamento }) {
  if (modalidade === "justa_causa") return 0;
  if (modalidade === "pedido_demissao") return 30;
  return Math.min(90, 30 + 3 * anosDeServico(admissao, desligamento));
}

/**
 * O aviso indenizado integra o tempo de serviço (CLT, art. 487, §1º; OJ 82 da SDI-1 do TST).
 * No acordo do art. 484-A só o pagamento cai pela metade; a projeção usa o prazo integral.
 * @param {Entrada} entrada @param {number} diasAviso
 */
export function dataEfetiva(entrada, diasAviso) {
  if (entrada.tipoAviso === "indenizado" && entrada.projetarAviso) {
    return somarDias(entrada.desligamento, diasAviso);
  }
  return new Date(entrada.desligamento);
}

/**
 * Salário/30 por dia, no padrão do mês comercial: quem trabalhou o mês inteiro
 * recebe 30 dias, inclusive em fevereiro ou em meses de 31 dias.
 * @param {number} salario @param {Date} admissao @param {Date} desligamento
 */
export function saldoDeSalario(salario, admissao, desligamento) {
  const primeiroDia = new Date(desligamento.getFullYear(), desligamento.getMonth(), 1);
  const inicio = admissao > primeiroDia ? admissao : primeiroDia;
  const ultimoDiaDoMes = new Date(desligamento.getFullYear(), desligamento.getMonth() + 1, 0).getDate();
  const mesInteiro = inicio.getDate() === 1 && desligamento.getDate() === ultimoDiaDoMes;
  const dias = mesInteiro ? 30 : Math.min(30, diasEntre(inicio, desligamento) + 1);
  return { dias, valor: (salario / 30) * dias };
}

/**
 * Separa os avos por ano civil: a projeção do aviso pode avançar para o ano seguinte,
 * e os meses do ano do desligamento continuam devidos.
 * @param {number} salario @param {Date} admissao @param {Date} desligamento @param {Date} efetiva
 */
export function decimoTerceiroProporcional(salario, admissao, desligamento, efetiva) {
  const inicioDoAno = new Date(desligamento.getFullYear(), 0, 1);
  const inicio = admissao > inicioDoAno ? admissao : inicioDoAno;
  const porAno = [];
  for (let ano = inicio.getFullYear(); ano <= efetiva.getFullYear(); ano++) {
    const de = ano === inicio.getFullYear() ? inicio : new Date(ano, 0, 1);
    const ate = ano === efetiva.getFullYear() ? efetiva : new Date(ano, 11, 31);
    porAno.push({ ano, avos: Math.min(12, mesesCivisComQuinzeDias(de, ate)) });
  }
  const avos = porAno.reduce((soma, p) => soma + p.avos, 0);
  return { porAno, avos, valor: (salario / 12) * avos };
}

/**
 * Se a projeção do aviso completar o período aquisitivo em curso, ele vira férias
 * integrais e os avos seguintes começam um novo período. Períodos completos até o
 * último dia trabalhado entram como férias vencidas.
 * @param {number} salario @param {Date} admissao @param {Date} desligamento @param {Date} efetiva
 */
export function feriasProporcionais(salario, admissao, desligamento, efetiva) {
  const anos = anosDeServico(admissao, desligamento);
  const inicioPeriodo = somarMeses(admissao, 12 * anos);
  const fimPeriodo = somarMeses(admissao, 12 * (anos + 1));
  const completouPeriodo = efetiva >= somarDias(fimPeriodo, -1);
  const avos = completouPeriodo
    ? avosDeServico(fimPeriodo, efetiva)
    : Math.min(12, avosDeServico(inicioPeriodo, efetiva));
  return {
    completouPeriodo,
    avos,
    valorIntegral: completouPeriodo ? salario * (4 / 3) : 0,
    valor: (salario / 12) * avos * (4 / 3),
  };
}

/** @param {string} valor @returns {valor is Modalidade} */
function ehModalidade(valor) {
  return Object.hasOwn(MODALIDADES, valor);
}

/** @param {string} valor @returns {valor is TipoAviso} */
function ehTipoAviso(valor) {
  return Object.hasOwn(ROTULOS_AVISO, valor);
}

/**
 * Os nomes dos campos são curtos porque viram o link compartilhável.
 * @param {URLSearchParams} campos
 * @returns {{ ok: true, entrada: Entrada } | { ok: false, erros: string[] }}
 */
export function lerEntrada(campos) {
  const texto = (/** @type {string} */ nome) => (campos.get(nome) ?? "").trim();
  const numero = (/** @type {string} */ nome, /** @type {number} */ vazio) => {
    if (texto(nome) === "") return vazio;
    const valor = Number(texto(nome));
    return Number.isFinite(valor) ? valor : NaN;
  };

  const modalidade = texto("m");
  const tipoAviso = texto("av");
  const salario = numero("s", NaN);
  const saldoFGTS = numero("f", NaN);
  const adiantamento13 = numero("ad", 0);
  const feriasVencidas = numero("fv", 0);
  const admissao = parseDataLocal(texto("a"));
  const desligamento = parseDataLocal(texto("d"));
  const regras = ehModalidade(modalidade) ? MODALIDADES[modalidade] : null;

  const erros = [];
  if (!regras) {
    erros.push("Selecione a modalidade de rescisão.");
  } else if (!ehTipoAviso(tipoAviso) || !regras.avisos.includes(tipoAviso)) {
    erros.push("Selecione o tipo de aviso prévio.");
  }
  if (!(salario > 0)) erros.push("Informe um salário maior que zero.");
  if (regras && regras.multaFGTS > 0 && !(saldoFGTS >= 0)) {
    erros.push("Informe um saldo de FGTS válido (zero ou maior).");
  }
  if (!(adiantamento13 >= 0)) erros.push("O adiantamento de 13º deve ser zero ou maior.");
  if (![0, 1, 2].includes(feriasVencidas)) erros.push("Férias vencidas: escolha entre 0 e 2 períodos.");
  if (!admissao) erros.push("Informe a data de admissão.");
  if (!desligamento) erros.push("Informe a data de desligamento.");
  if (admissao && desligamento) {
    if (desligamento < admissao) {
      erros.push("A data de desligamento não pode ser anterior à admissão.");
    } else if (feriasVencidas > anosDeServico(admissao, desligamento)) {
      erros.push("Há mais períodos de férias vencidas do que anos completos de contrato.");
    }
  }

  if (erros.length > 0 || !ehModalidade(modalidade) || !ehTipoAviso(tipoAviso) || !admissao || !desligamento) {
    return { ok: false, erros };
  }
  return {
    ok: true,
    entrada: {
      salario,
      admissao,
      desligamento,
      modalidade,
      tipoAviso,
      saldoFGTS: MODALIDADES[modalidade].multaFGTS > 0 ? saldoFGTS : 0,
      feriasVencidas,
      adiantamento13,
      projetarAviso: texto("p") === "on",
    },
  };
}

/**
 * @param {Verba[]} lista @param {string} titulo @param {string} detalhe @param {number} valor
 */
function incluir(lista, titulo, detalhe, valor) {
  if (valor > 0) lista.push({ titulo, detalhe, valor: centavos(valor) });
}

/** @param {Entrada} entrada @returns {Resultado} */
export function calcularRescisao(entrada) {
  const { salario, admissao, desligamento, modalidade, tipoAviso, saldoFGTS } = entrada;
  const regras = MODALIDADES[modalidade];
  const diasAviso = diasDeAviso(entrada);
  const efetiva = dataEfetiva(entrada, diasAviso);
  const projetado = efetiva > desligamento;

  /** @type {Verba[]} */
  const verbas = [];
  /** @type {Verba[]} */
  const descontos = [];
  const observacoes = [];

  const saldo = saldoDeSalario(salario, admissao, desligamento);
  incluir(verbas, "Saldo de salário", `${saldo.dias} dia(s) no mês do desligamento`, saldo.valor);

  if (tipoAviso === "indenizado") {
    const diasPagos = diasAviso * regras.fracaoAviso;
    const detalhe = regras.fracaoAviso < 1
      ? `metade de ${diasAviso} dias (art. 484-A, I, "a")`
      : `${diasAviso} dias (Lei 12.506/2011)`;
    incluir(verbas, "Aviso prévio indenizado", detalhe, (salario / 30) * diasPagos);
  }

  if (regras.proporcionais) {
    const decimo = decimoTerceiroProporcional(salario, admissao, desligamento, efetiva);
    const detalhe = decimo.porAno.map((p) => `${p.avos}/12 de ${p.ano}`).join(" + ");
    incluir(verbas, "13º salário proporcional", `${detalhe} (Lei 4.090/62)`, decimo.valor);
  }

  if (entrada.feriasVencidas > 0) {
    incluir(verbas, "Férias vencidas + 1/3", "1 período aquisitivo (CLT, art. 146)", salario * (4 / 3));
  }
  if (entrada.feriasVencidas > 1) {
    // Com dois períodos completos sem gozo, o prazo concessivo do mais antigo já acabou.
    incluir(verbas, "Férias vencidas em dobro + 1/3", "período fora do prazo concessivo (CLT, art. 137)", salario * (8 / 3));
  }

  if (regras.proporcionais) {
    const ferias = feriasProporcionais(salario, admissao, desligamento, efetiva);
    incluir(verbas, "Férias integrais + 1/3", "período aquisitivo completado pela projeção do aviso", ferias.valorIntegral);
    incluir(verbas, "Férias proporcionais + 1/3", `${ferias.avos}/12 (CLT, art. 146; Súmula 261 TST)`, ferias.valor);
  }

  if (regras.multaFGTS > 0) {
    const percentual = Math.round(regras.multaFGTS * 100);
    incluir(verbas, `Multa de ${percentual}% do FGTS`, `sobre o saldo informado de ${formatarMoeda(saldoFGTS)}`, saldoFGTS * regras.multaFGTS);
  }

  const bruto = centavos(verbas.reduce((soma, v) => soma + v.valor, 0));

  incluir(descontos, "Adiantamento de 13º já recebido", "abatido do 13º", entrada.adiantamento13);
  if (tipoAviso === "nao_cumprido") {
    incluir(descontos, "Aviso prévio não cumprido", "30 dias de salário (CLT, art. 487, §2º)", salario);
  }
  const somaDescontos = descontos.reduce((soma, d) => soma + d.valor, 0);
  // O empregador só compensa até o que tem a pagar; o excedente não vira dívida na rescisão.
  const totalDescontos = Math.min(bruto, somaDescontos);
  if (totalDescontos < somaDescontos) {
    observacoes.push(`Os descontos foram limitados ao valor das verbas (${formatarMoeda(bruto)}).`);
  }

  if (projetado) {
    observacoes.push(`Data efetiva com a projeção do aviso: ${formatarData(efetiva)} (${diasAviso} dias após ${formatarData(desligamento)}).`);
  }
  if (tipoAviso === "trabalhado") {
    const inicio = somarDias(desligamento, -(diasAviso - 1));
    observacoes.push(
      `Aviso trabalhado de ${diasAviso} dias, de ${formatarData(inicio)} a ${formatarData(desligamento)}. ` +
      "O salário do período já é pago normalmente e não entra no total.",
    );
  }
  if (tipoAviso === "dispensado") {
    observacoes.push("Com o aviso dispensado pelo empregador, não há desconto nem pagamento pelo período.");
  }
  if (regras.saqueFGTS === 1) {
    observacoes.push("FGTS: saque liberado do saldo da conta, além da multa. Quem optou pelo saque-aniversário recebe apenas a multa.");
  } else if (regras.saqueFGTS > 0) {
    observacoes.push("FGTS: movimentação de até 80% do saldo da conta (CLT, art. 484-A, §1º).");
  } else {
    observacoes.push("FGTS: esta modalidade não libera o saque do saldo.");
  }
  observacoes.push(
    regras.seguroDesemprego
      ? "Pode haver direito ao seguro-desemprego, conforme o tempo de trabalho e as solicitações anteriores."
      : "Esta modalidade não dá direito ao seguro-desemprego.",
  );

  return {
    verbas,
    descontos,
    bruto,
    total: centavos(bruto - totalDescontos),
    diasAviso,
    dataEfetiva: efetiva,
    observacoes,
  };
}
