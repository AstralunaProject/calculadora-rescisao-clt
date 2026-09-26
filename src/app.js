import {
  MODALIDADES,
  ROTULOS_AVISO,
  calcularRescisao,
  formatarData,
  formatarMoeda,
  lerEntrada,
} from "./rescisao.js";

/**
 * @typedef {import("./rescisao.js").Entrada} Entrada
 * @typedef {import("./rescisao.js").Resultado} Resultado
 * @typedef {import("./rescisao.js").Verba} Verba
 * @typedef {import("./rescisao.js").Modalidade} Modalidade
 */

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @param {{ new (): T }} tipo
 * @returns {T}
 */
function elemento(id, tipo) {
  const el = document.getElementById(id);
  if (!(el instanceof tipo)) throw new Error(`Elemento #${id} não encontrado no index.html`);
  return el;
}

const form = elemento("form", HTMLFormElement);
const modalidade = elemento("modalidade", HTMLSelectElement);
const tipoAviso = elemento("tipoAviso", HTMLSelectElement);
const campoAviso = elemento("campoAviso", HTMLDivElement);
const campoFgts = elemento("campoFgts", HTMLDivElement);
const campoProjecao = elemento("campoProjecao", HTMLDivElement);
const caixaErros = elemento("erros", HTMLDivElement);
const secaoResultado = elemento("resultado", HTMLElement);
const avisoStatus = elemento("status", HTMLParagraphElement);

/** @type {{ entrada: Entrada, resultado: Resultado } | null} */
let ultimoCalculo = null;

/** @param {HTMLSelectElement} select @param {[string, string][]} opcoes */
function preencherOpcoes(select, opcoes) {
  const anterior = select.value;
  select.replaceChildren(...opcoes.map(([valor, rotulo]) => new Option(rotulo, valor)));
  if (opcoes.some(([valor]) => valor === anterior)) select.value = anterior;
}

function atualizarCampos() {
  const regras = MODALIDADES[/** @type {Modalidade} */ (modalidade.value)];
  preencherOpcoes(tipoAviso, regras.avisos.map((aviso) => [aviso, ROTULOS_AVISO[aviso]]));
  campoAviso.hidden = regras.avisos.length === 1 && regras.avisos[0] === "nenhum";
  campoFgts.hidden = regras.multaFGTS === 0;
  campoProjecao.hidden = tipoAviso.value !== "indenizado";
}

function camposDoFormulario() {
  const campos = new URLSearchParams();
  for (const [nome, valor] of new FormData(form)) {
    if (typeof valor === "string" && valor !== "") campos.set(nome, valor);
  }
  return campos;
}

/** @param {URLSearchParams} campos */
function aplicarCampos(campos) {
  const m = campos.get("m");
  if (m && Object.hasOwn(MODALIDADES, m)) modalidade.value = m;
  atualizarCampos();
  for (const campo of form.elements) {
    if (!(campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement) || campo === modalidade) continue;
    const valor = campos.get(campo.name);
    if (campo instanceof HTMLInputElement && campo.type === "checkbox") campo.checked = valor === "on";
    else if (valor !== null) campo.value = valor;
  }
  atualizarCampos();
}

/** @param {string} titulo @param {string} detalhe @param {string} valor */
function itemDeLista(titulo, detalhe, valor) {
  const rotulo = document.createElement("div");
  rotulo.className = "label";
  const nome = document.createElement("span");
  nome.textContent = titulo;
  const obs = document.createElement("small");
  obs.textContent = detalhe;
  rotulo.append(nome, obs);

  const numero = document.createElement("span");
  numero.className = "value";
  numero.textContent = valor;

  const li = document.createElement("li");
  li.append(rotulo, numero);
  return li;
}

/** @param {string[]} erros */
function mostrarErros(erros) {
  const titulo = document.createElement("strong");
  titulo.textContent = "Verifique os campos:";
  const lista = document.createElement("ul");
  lista.append(...erros.map((erro) => Object.assign(document.createElement("li"), { textContent: erro })));
  caixaErros.replaceChildren(titulo, lista);
  caixaErros.hidden = false;
  secaoResultado.hidden = true;
}

/** @param {Entrada} entrada */
function descreverContrato(entrada) {
  const aviso = ROTULOS_AVISO[entrada.tipoAviso].toLowerCase();
  const partes = [
    MODALIDADES[entrada.modalidade].rotulo,
    `salário de ${formatarMoeda(entrada.salario)}`,
    `de ${formatarData(entrada.admissao)} a ${formatarData(entrada.desligamento)}`,
  ];
  if (entrada.tipoAviso !== "nenhum") partes.push(`aviso ${aviso}`);
  return partes.join(" · ");
}

/** @param {Entrada} entrada @param {Resultado} resultado */
function renderizar(entrada, resultado) {
  elemento("resumo", HTMLParagraphElement).textContent = descreverContrato(entrada);
  elemento("verbas", HTMLUListElement).replaceChildren(
    ...resultado.verbas.map((v) => itemDeLista(v.titulo, v.detalhe, formatarMoeda(v.valor))),
  );
  elemento("descontos", HTMLUListElement).replaceChildren(
    ...resultado.descontos.map((d) => itemDeLista(d.titulo, d.detalhe, `− ${formatarMoeda(d.valor)}`)),
  );
  elemento("blocoDescontos", HTMLDivElement).hidden = resultado.descontos.length === 0;
  elemento("total", HTMLSpanElement).textContent = formatarMoeda(resultado.total);
  elemento("observacoes", HTMLUListElement).replaceChildren(
    ...resultado.observacoes.map((texto) => Object.assign(document.createElement("li"), { textContent: texto })),
  );
  avisoStatus.textContent = "";
  secaoResultado.hidden = false;
}

function calcular() {
  caixaErros.hidden = true;
  const campos = camposDoFormulario();
  const leitura = lerEntrada(campos);
  if (!leitura.ok) {
    mostrarErros(leitura.erros);
    return false;
  }
  const resultado = calcularRescisao(leitura.entrada);
  ultimoCalculo = { entrada: leitura.entrada, resultado };
  renderizar(leitura.entrada, resultado);
  // replaceState evita poluir o histórico a cada novo cálculo.
  history.replaceState(null, "", `#${campos}`);
  return true;
}

/** @param {Entrada} entrada @param {Resultado} resultado */
function resumoEmTexto(entrada, resultado) {
  /** @param {Verba} v @param {string} sinal */
  const linha = (v, sinal) => `- ${v.titulo} (${v.detalhe}): ${sinal}${formatarMoeda(v.valor)}`;
  return [
    "Rescisão trabalhista (estimativa)",
    descreverContrato(entrada),
    "",
    ...resultado.verbas.map((v) => linha(v, "")),
    ...resultado.descontos.map((d) => linha(d, "− ")),
    "",
    `Total estimado: ${formatarMoeda(resultado.total)}`,
    "",
    ...resultado.observacoes.map((o) => `* ${o}`),
    "",
    location.href,
  ].join("\n");
}

/** @param {string} texto @param {string} mensagem */
async function copiar(texto, mensagem) {
  try {
    await navigator.clipboard.writeText(texto);
    avisoStatus.textContent = mensagem;
  } catch {
    avisoStatus.textContent = "Não foi possível copiar automaticamente. Copie o endereço pela barra do navegador.";
  }
}

for (const [valor, regras] of Object.entries(MODALIDADES)) {
  modalidade.append(new Option(regras.rotulo, valor));
}
atualizarCampos();

modalidade.addEventListener("change", atualizarCampos);
tipoAviso.addEventListener("change", atualizarCampos);

form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  if (calcular()) secaoResultado.scrollIntoView({ behavior: "smooth", block: "start" });
});

elemento("copiarLink", HTMLButtonElement).addEventListener("click", () => copiar(location.href, "Link copiado."));
elemento("copiarResumo", HTMLButtonElement).addEventListener("click", () => {
  if (ultimoCalculo) copiar(resumoEmTexto(ultimoCalculo.entrada, ultimoCalculo.resultado), "Resumo copiado.");
});
elemento("imprimir", HTMLButtonElement).addEventListener("click", () => window.print());

function carregarDoLink() {
  if (location.hash.length <= 1) return;
  aplicarCampos(new URLSearchParams(location.hash.slice(1)));
  calcular();
}

carregarDoLink();
window.addEventListener("hashchange", carregarDoLink);

if ("serviceWorker" in navigator) {
  // Sem o service worker o app segue funcionando; só perde o uso offline.
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
