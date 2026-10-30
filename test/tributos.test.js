import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { calcularRescisao, lerEntrada } from "../src/rescisao.js";
import { arredondar, calcularINSS, calcularIRRF } from "../src/tributos.js";

describe("INSS 2026", () => {
  test("aplica cada alíquota só sobre a parte dentro da faixa", () => {
    assert.equal(calcularINSS(1621), 121.58);
    assert.equal(calcularINSS(3000), 248.6);
    assert.equal(calcularINSS(4500), 431.51);
  });

  test("para no teto de R$ 8.475,55", () => {
    assert.equal(calcularINSS(8475.55), 988.09);
    assert.equal(calcularINSS(20000), 988.09);
  });

  test("zero não tem contribuição", () => {
    assert.equal(calcularINSS(0), 0);
  });
});

describe("IRRF 2026", () => {
  test("reproduz o exemplo 4 da Receita Federal (Lei 15.270/2025)", () => {
    assert.deepEqual(calcularIRRF({ rendimento: 6000, inss: 649.6 }), { base: 5350.4, imposto: 562.63, reducao: 179.75, valor: 382.88 });
  });

  test("a redução usa o rendimento bruto, não a base (exemplo 5 da Receita)", () => {
    const r = calcularIRRF({ rendimento: 7607.2, inss: 0 });
    assert.equal(r.base, 7000);
    assert.equal(r.reducao, 0);
    assert.equal(r.valor, 1016.27);
  });

  test("rendimento de até R$ 5.000 fica isento", () => {
    const r = calcularIRRF({ rendimento: 5000, inss: 0 });
    assert.equal(r.imposto, 312.89);
    assert.equal(r.valor, 0);
  });

  test("usa o desconto simplificado quando ele é maior que as deduções", () => {
    assert.equal(calcularIRRF({ rendimento: 3000, inss: 248.6 }).base, 2392.8);
    assert.equal(calcularIRRF({ rendimento: 3000, inss: 248.6, dependentes: 2 }).base, 2372.22);
  });

  test("arredonda meio centavo para cima", () => {
    assert.equal(arredondar(121.575), 121.58);
    assert.equal(arredondar(1.005), 1.01);
  });
});

/** @param {Record<string, string>} campos */
function rescisao(campos) {
  const leitura = lerEntrada(new URLSearchParams({ m: "sem_justa_causa", av: "indenizado", a: "2025-02-01", d: "2026-10-15", f: "0", p: "on", ...campos }));
  if (!leitura.ok) throw new Error(leitura.erros.join(" "));
  return calcularRescisao(leitura.entrada);
}

/** @param {import("../src/rescisao.js").Resultado} r @param {string} titulo */
const desconto = (r, titulo) => r.descontos.find((d) => d.titulo === titulo)?.valor ?? 0;

describe("rescisão com INSS e IRRF", () => {
  test("salário de R$ 3.000: só INSS, sem IRRF", () => {
    const r = rescisao({ s: "3000" });
    assert.equal(r.bruto, 10883.33);
    assert.equal(desconto(r, "INSS sobre o saldo de salário"), 112.5);
    assert.equal(desconto(r, "INSS sobre o 13º"), 223.19);
    assert.equal(desconto(r, "IRRF sobre o saldo de salário"), 0);
    assert.equal(desconto(r, "IRRF sobre o 13º"), 0);
    assert.equal(r.total, 10547.64);
  });

  test("salário de R$ 6.000: IRRF do 13º com redução parcial", () => {
    const r = rescisao({ s: "6000" });
    assert.equal(r.bruto, 21766.67);
    assert.equal(desconto(r, "INSS sobre o saldo de salário"), 248.6);
    assert.equal(desconto(r, "INSS sobre o 13º"), 571.51);
    assert.equal(desconto(r, "IRRF sobre o 13º"), 190.47);
    assert.equal(r.total, 20756.09);
  });

  test("salário de R$ 9.000: IRRF do 13º sem redução", () => {
    const r = rescisao({ s: "9000" });
    assert.equal(r.bruto, 32650);
    assert.equal(desconto(r, "INSS sobre o saldo de salário"), 431.51);
    assert.equal(desconto(r, "IRRF sobre o saldo de salário"), 0);
    assert.equal(desconto(r, "INSS sobre o 13º"), 956.51);
    assert.equal(desconto(r, "IRRF sobre o 13º"), 1096.98);
    assert.equal(r.total, 30165);
  });

  test("aviso indenizado e férias não têm desconto", () => {
    const r = rescisao({ s: "9000" });
    const titulos = r.descontos.map((d) => d.titulo).join(" ");
    assert.doesNotMatch(titulos, /aviso|férias/i);
    assert.ok(r.observacoes.some((o) => o.includes("não têm INSS nem IRRF")));
  });

  test("dependentes reduzem o IRRF", () => {
    assert.ok(desconto(rescisao({ s: "9000", dp: "2" }), "IRRF sobre o 13º") < 1096.98);
  });

  test("rejeita número de dependentes inválido", () => {
    for (const dp of ["-1", "1.5", "21", "x"]) {
      const leitura = lerEntrada(new URLSearchParams({ m: "sem_justa_causa", av: "indenizado", s: "3000", a: "2025-02-01", d: "2026-10-15", f: "0", dp }));
      assert.equal(leitura.ok, false, dp);
    }
  });
});
