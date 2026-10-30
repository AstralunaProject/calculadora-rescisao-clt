import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

const TAGS = {
  HTMLButtonElement: "button",
  HTMLDivElement: "div",
  HTMLElement: null,
  HTMLFormElement: "form",
  HTMLInputElement: "input",
  HTMLParagraphElement: "p",
  HTMLSelectElement: "select",
  HTMLSpanElement: "span",
  HTMLUListElement: "ul",
};

test("ids do index.html são únicos", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});

test("todo elemento usado pelo app.js existe no index.html com a tag esperada", () => {
  const usados = [...app.matchAll(/elemento\("([A-Za-z]+)", (HTML[A-Za-z]*Element)\)/g)];
  assert.ok(usados.length > 0);
  for (const [, id, tipo] of usados) {
    const tag = new RegExp(`<([a-z]+)\\b[^>]*\\bid="${id}"`).exec(html)?.[1];
    assert.ok(tag, `#${id} não existe no index.html`);
    assert.ok(Object.hasOwn(TAGS, tipo), `tipo ${tipo} não mapeado no teste`);
    const esperado = TAGS[/** @type {keyof typeof TAGS} */ (tipo)];
    if (esperado) assert.equal(tag, esperado, `#${id} deveria ser <${esperado}>`);
  }
});
