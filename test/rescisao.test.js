import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  anosCompletos,
  avosDeServico,
  calcularRescisao,
  decimoTerceiroProporcional,
  diasDeAviso,
  feriasProporcionais,
  lerEntrada,
  mesesCivisComQuinzeDias,
  parseDataLocal,
  saldoDeSalario,
  somarMeses,
} from "../src/rescisao.js";

/** @param {string} texto */
function data(texto) {
  const valor = parseDataLocal(texto);
  if (!valor) throw new Error(`data inválida no teste: ${texto}`);
  return valor;
}

/** @param {Record<string, string>} campos */
function entrada(campos) {
  const leitura = lerEntrada(new URLSearchParams(campos));
  if (!leitura.ok) throw new Error(leitura.erros.join(" "));
  return leitura.entrada;
}

/** @param {import("../src/rescisao.js").Resultado} resultado @param {string} titulo */
function valorDe(resultado, titulo) {
  return resultado.verbas.find((v) => v.titulo === titulo)?.valor;
}

describe("datas", () => {
  test("rejeita datas inexistentes", () => {
    assert.equal(parseDataLocal("2025-02-31"), null);
    assert.equal(parseDataLocal("31/01/2025"), null);
    assert.equal(parseDataLocal("0025-01-01"), null);
  });

  test("somarMeses não acumula deslocamento em meses curtos", () => {
    assert.deepEqual(somarMeses(data("2025-01-31"), 1), data("2025-02-28"));
    assert.deepEqual(somarMeses(data("2025-01-31"), 2), data("2025-03-31"));
  });

  test("anos completos viram no aniversário da admissão", () => {
    assert.equal(anosCompletos(data("2020-03-15"), data("2025-03-14")), 4);
    assert.equal(anosCompletos(data("2020-03-15"), data("2025-03-15")), 5);
  });
});

describe("saldo de salário", () => {
  test("conta os dias do mês do desligamento", () => {
    assert.deepEqual(saldoDeSalario(3000, data("2020-01-01"), data("2025-03-10")), { dias: 10, valor: 1000 });
  });

  test("mês inteiro vale 30 dias, mesmo em fevereiro ou em meses de 31", () => {
    assert.equal(saldoDeSalario(3000, data("2020-01-01"), data("2025-02-28")).dias, 30);
    assert.equal(saldoDeSalario(3000, data("2020-01-01"), data("2025-01-31")).dias, 30);
  });

  test("admissão no próprio mês limita os dias", () => {
    assert.equal(saldoDeSalario(3000, data("2025-03-05"), data("2025-03-20")).dias, 16);
  });
});

describe("aviso prévio", () => {
  const contrato = { s: "1000", f: "0", d: "2025-06-01" };

  test("30 dias mais 3 por ano completo, até 90", () => {
    assert.equal(diasDeAviso(entrada({ ...contrato, m: "sem_justa_causa", av: "indenizado", a: "2020-01-01" })), 45);
    assert.equal(diasDeAviso(entrada({ ...contrato, m: "sem_justa_causa", av: "indenizado", a: "2000-01-01" })), 90);
  });

  test("pedido de demissão não tem proporcionalidade", () => {
    assert.equal(diasDeAviso(entrada({ ...contrato, m: "pedido_demissao", av: "trabalhado", a: "2000-01-01" })), 30);
  });
});

describe("avos", () => {
  test("13º usa meses civis com 15 dias ou mais", () => {
    assert.equal(mesesCivisComQuinzeDias(data("2025-01-17"), data("2025-03-14")), 2);
  });

  test("férias contam meses a partir do período aquisitivo", () => {
    assert.equal(avosDeServico(data("2025-01-20"), data("2025-03-10")), 2);
    assert.equal(avosDeServico(data("2025-01-20"), data("2025-02-19")), 1);
    assert.equal(avosDeServico(data("2025-01-20"), data("2025-01-10")), 0);
  });

  test("13º separa os avos quando a projeção atravessa o ano", () => {
    const decimo = decimoTerceiroProporcional(1200, data("2020-01-01"), data("2025-12-10"), data("2026-01-24"));
    assert.deepEqual(decimo.porAno, [{ ano: 2025, avos: 12 }, { ano: 2026, avos: 1 }]);
    assert.equal(decimo.valor, 1300);
  });

  test("projeção que completa o período aquisitivo gera férias integrais", () => {
    const ferias = feriasProporcionais(3000, data("2024-03-01"), data("2025-02-10"), data("2025-03-12"));
    assert.equal(ferias.completouPeriodo, true);
    assert.equal(ferias.valorIntegral, 4000);
    assert.equal(ferias.avos, 0);
  });
});

describe("calcularRescisao", () => {
  const contrato = { s: "3000", a: "2022-05-10", d: "2025-08-20", f: "10000", p: "on" };

  test("sem justa causa com aviso indenizado projetado", () => {
    const r = calcularRescisao(entrada({ ...contrato, m: "sem_justa_causa", av: "indenizado" }));
    assert.equal(r.diasAviso, 39);
    assert.deepEqual(r.dataEfetiva, data("2025-09-28"));
    assert.equal(valorDe(r, "Saldo de salário"), 2000);
    assert.equal(valorDe(r, "Aviso prévio indenizado"), 3900);
    assert.equal(valorDe(r, "13º salário proporcional"), 2250);
    assert.equal(valorDe(r, "Férias proporcionais + 1/3"), 1666.67);
    assert.equal(valorDe(r, "Multa de 40% do FGTS"), 4000);
    assert.equal(r.total, 13816.67);
  });

  test("sem projeção os avos param no último dia trabalhado", () => {
    const r = calcularRescisao(entrada({ ...contrato, p: "", m: "sem_justa_causa", av: "indenizado" }));
    assert.deepEqual(r.dataEfetiva, data("2025-08-20"));
    assert.equal(valorDe(r, "13º salário proporcional"), 2000);
  });

  test("acordo paga metade do aviso e multa de 20%", () => {
    const r = calcularRescisao(entrada({ ...contrato, m: "acordo", av: "indenizado" }));
    assert.equal(valorDe(r, "Aviso prévio indenizado"), 1950);
    assert.equal(valorDe(r, "Multa de 20% do FGTS"), 2000);
    assert.equal(r.total, 9866.67);
  });

  test("aviso trabalhado não entra no total", () => {
    const r = calcularRescisao(entrada({ ...contrato, m: "sem_justa_causa", av: "trabalhado" }));
    assert.equal(valorDe(r, "Aviso prévio indenizado"), undefined);
    assert.ok(r.observacoes.some((o) => o.startsWith("Aviso trabalhado de 39 dias")));
  });

  test("pedido de demissão com aviso não cumprido desconta um salário", () => {
    const r = calcularRescisao(entrada({ m: "pedido_demissao", av: "nao_cumprido", s: "3000", a: "2024-06-01", d: "2025-03-15" }));
    assert.equal(valorDe(r, "Saldo de salário"), 1500);
    assert.equal(valorDe(r, "13º salário proporcional"), 750);
    assert.equal(valorDe(r, "Férias proporcionais + 1/3"), 3333.33);
    assert.equal(r.verbas.some((v) => v.titulo.startsWith("Multa")), false);
    assert.equal(r.descontos[0]?.valor, 3000);
    assert.equal(r.total, 2583.33);
  });

  test("descontos nunca passam do valor das verbas", () => {
    const r = calcularRescisao(entrada({ m: "pedido_demissao", av: "nao_cumprido", s: "3000", a: "2025-03-01", d: "2025-03-05" }));
    assert.equal(r.bruto, 500);
    assert.equal(r.total, 0);
    assert.ok(r.observacoes.some((o) => o.includes("limitados")));
  });

  test("justa causa paga só saldo e férias vencidas, com o período antigo em dobro", () => {
    const r = calcularRescisao(entrada({ m: "justa_causa", av: "nenhum", s: "3000", a: "2020-01-01", d: "2025-03-15", fv: "2" }));
    assert.deepEqual(r.verbas.map((v) => v.valor), [1500, 4000, 8000]);
    assert.equal(r.diasAviso, 0);
    assert.equal(r.total, 13500);
  });

  test("adiantamento de 13º é descontado", () => {
    const r = calcularRescisao(entrada({ ...contrato, m: "sem_justa_causa", av: "indenizado", ad: "1000" }));
    assert.equal(r.total, 12816.67);
  });
});

describe("lerEntrada", () => {
  test("lista todos os campos obrigatórios em falta", () => {
    const leitura = lerEntrada(new URLSearchParams({ m: "sem_justa_causa", av: "indenizado" }));
    assert.equal(leitura.ok, false);
    if (!leitura.ok) {
      assert.deepEqual(leitura.erros, [
        "Informe um salário maior que zero.",
        "Informe um saldo de FGTS válido (zero ou maior).",
        "Informe a data de admissão.",
        "Informe a data de desligamento.",
      ]);
    }
  });

  test("recusa aviso incompatível com a modalidade", () => {
    const leitura = lerEntrada(new URLSearchParams({ m: "justa_causa", av: "indenizado", s: "1000", a: "2020-01-01", d: "2025-01-01" }));
    assert.equal(leitura.ok, false);
  });

  test("recusa mais férias vencidas do que anos de contrato", () => {
    const leitura = lerEntrada(new URLSearchParams({ m: "pedido_demissao", av: "trabalhado", s: "1000", a: "2024-06-01", d: "2025-03-01", fv: "1" }));
    assert.equal(leitura.ok, false);
  });

  test("FGTS é opcional quando a modalidade não tem multa", () => {
    const e = entrada({ m: "pedido_demissao", av: "trabalhado", s: "1000", a: "2024-06-01", d: "2025-03-01" });
    assert.equal(e.saldoFGTS, 0);
    assert.equal(e.projetarAviso, false);
  });
});
