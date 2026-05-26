# Calculadora de Rescisão CLT

> Estime suas verbas rescisórias em demissão sem justa causa. Rápido, mobile-first, em pt-BR — e 100% offline.

[**Abrir a calculadora →**](https://astralunaproject.github.io/calculadora-rescisao-clt/)

---

## O que é

Web app estático (um único `index.html` com HTML, CSS e JavaScript inline, sem framework, sem backend) que calcula no próprio navegador as verbas devidas em **rescisão sem justa causa** pela CLT brasileira:

- Saldo de salário
- Aviso prévio indenizado (com projeção no tempo de serviço, conforme art. 487 §1º CLT + OJ 82 SDI-1 TST)
- 13º salário proporcional (Lei 4.090/62, regra dos 15 dias)
- Férias vencidas + 1/3 constitucional (opcional)
- Férias proporcionais + 1/3 (Súmula 261 TST)
- Multa de 40% sobre o saldo do FGTS (Lei 8.036/90, art. 18 §1º)

O **aviso prévio trabalhado** aparece apenas como linha informativa, não soma ao total — durante ele o salário continua sendo pago normalmente.

## Privacidade

Tudo roda no seu dispositivo. **Nenhum dado é enviado a servidor**, não há analytics, não há chamadas de rede. Pode usar offline depois de carregar a página uma vez.

## Como usar

Acesse a [versão publicada no GitHub Pages](https://astralunaproject.github.io/calculadora-rescisao-clt/) ou:

1. Baixe/clone o repositório.
2. Abra `index.html` direto no navegador (não precisa de servidor).

Preencha salário, data de admissão, data de desligamento, tipo de aviso prévio, saldo de FGTS (consulte no app FGTS) e marque "tenho férias vencidas" se for o caso. Clique em **Calcular** para ver as verbas discriminadas e o total estimado.

### Configurações avançadas

Por padrão, o aviso prévio indenizado é **projetado no tempo de serviço** (art. 487 §1º CLT + OJ 82 SDI-1 TST), o que pode gerar avos extras de 13º e férias proporcionais. É possível desligar a projeção em "Configurações avançadas" — use apenas se tiver motivo específico.

## Aviso importante

Esta é uma **estimativa simplificada**, criada como ferramenta de referência rápida.

**Não considera:**
- Justa causa, pedido de demissão, rescisão por acordo (Lei 13.467/2017), término de contrato a prazo, rescisão indireta
- Descontos de INSS e IRRF
- Adicionais (insalubridade, periculosidade, noturno)
- Horas extras, comissões, médias variáveis
- Detecção automática de férias vencidas em dobro (art. 137 CLT)
- Cálculo da redução do aviso trabalhado (art. 488 CLT: 2h/dia ou 7 dias)

**Não substitui** cálculo oficial pelo empregador nem orientação jurídica profissional. Em caso de dúvida sobre seus direitos, consulte um advogado ou o sindicato da sua categoria.

## Bases legais aplicadas

| Regra | Norma |
|---|---|
| Aviso prévio proporcional (30 + 3 dias/ano, cap 90) | Lei 12.506/2011 |
| Projeção do aviso indenizado no tempo de serviço | CLT, art. 487 §1º; OJ 82 da SDI-1 do TST |
| Aviso trabalhado (redução de 2h/dia ou 7 dias) — apenas informado | CLT, art. 488 |
| 13º salário proporcional e regra dos 15 dias | Lei 4.090/62, art. 1º §2º |
| Férias proporcionais (direito garantido) | Súmula 261 do TST |
| Férias + 1/3 constitucional | CF/88, art. 7º, XVII; CLT, art. 130 e 142 |
| Multa de 40% sobre FGTS | Lei 8.036/90, art. 18 §1º |
| Férias vencidas em dobro (apenas alerta textual) | CLT, art. 137; STF, inconstitucionalidade da Súmula 450 TST |

Cada função no `index.html` cita a base legal correspondente nos comentários.

## Tecnologia

- HTML5 + CSS3 + JavaScript ES6 baunilha, tudo inline em um único arquivo
- Sem dependências, sem build, sem framework
- Suporta light/dark mode automaticamente (via `prefers-color-scheme`)
- Layout responsivo (otimizado para celulares)
- Acessibilidade: labels associados, `aria-live` no bloco de resultado, contraste adequado

## Deploy (GitHub Pages)

1. **Settings → Pages** no repositório.
2. **Source:** `Deploy from a branch`.
3. **Branch:** `main` · **Folder:** `/ (root)` · **Save**.
4. Após ~1 min a URL fica disponível em `https://<usuario>.github.io/<repo>/`.

O repositório precisa ser **público** (ou ter GitHub Pro) para servir páginas pelo Pages.

## Roadmap

- [ ] Adicionar cálculo de outras modalidades (pedido de demissão, rescisão por acordo, justa causa)
- [ ] Compartilhar resultado por URL (sem enviar nada a servidor — só param na própria URL)
- [ ] Exportar memória de cálculo como PDF
- [ ] Internacionalização

Sugestões e PRs são bem-vindos.

## Licença

A definir.
