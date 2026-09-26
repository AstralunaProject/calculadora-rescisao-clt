# Calculadora de Rescisão CLT

> Estime suas verbas rescisórias em qualquer modalidade de desligamento. Rápido, mobile-first, em pt-BR e sem enviar nenhum dado a servidor.

[**Abrir a calculadora →**](https://astralunaproject.github.io/calculadora-rescisao-clt/)

---

## O que calcula

| Verba | Sem justa causa | Rescisão indireta | Acordo (484-A) | Pedido de demissão | Justa causa |
|---|:-:|:-:|:-:|:-:|:-:|
| Saldo de salário | ✓ | ✓ | ✓ | ✓ | ✓ |
| Aviso prévio indenizado | ✓ | ✓ | metade | — | — |
| 13º proporcional | ✓ | ✓ | ✓ | ✓ | — |
| Férias vencidas + 1/3 (e em dobro) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Férias proporcionais + 1/3 | ✓ | ✓ | ✓ | ✓ | — |
| Multa do FGTS | 40% | 40% | 20% | — | — |
| Desconto do aviso não cumprido | — | — | — | ✓ | — |

Detalhes que a calculadora trata:

- **Projeção do aviso indenizado** no tempo de serviço (art. 487 §1º CLT + OJ 82 SDI-1 TST), com os avos de 13º separados por ano quando a projeção entra no ano seguinte e férias integrais quando ela completa o período aquisitivo.
- **Avos de férias contados pelo período aquisitivo**, não pelo mês civil (art. 146, parágrafo único), e avos de 13º pelo mês civil com a regra dos 15 dias (Lei 4.090/62).
- **Saldo de salário no mês comercial**: mês trabalhado inteiro vale 30 dias, inclusive em fevereiro.
- **Dois períodos de férias vencidas**: o mais antigo sai em dobro, porque o prazo concessivo dele já acabou (art. 137).
- **Adiantamento de 13º** já recebido é descontado; descontos nunca passam do valor das verbas.
- Observações sobre saque do FGTS e seguro-desemprego de acordo com a modalidade.

## Recursos

- **Link compartilhável**: os dados ficam depois do `#` da URL, parte que o navegador nunca envia ao servidor.
- **Copiar resumo** em texto, pronto para colar em mensagem ou e-mail.
- **Imprimir / PDF** com layout próprio para impressão.
- **Funciona offline** depois da primeira visita (service worker) e pode ser instalado como app.
- Tema claro/escuro automático, layout responsivo, `aria-live` no resultado e campos com rótulos associados.

## Privacidade

Tudo roda no seu dispositivo. Não há backend, analytics nem chamadas de rede além do carregamento dos arquivos da própria página.

## Aviso importante

É uma **estimativa simplificada**. Não considera:

- Descontos de INSS e IRRF
- Adicionais (insalubridade, periculosidade, noturno), horas extras, comissões e médias variáveis
- Contratos por prazo determinado (arts. 479 e 480 CLT) e contrato de experiência
- Redução da jornada no aviso trabalhado (art. 488 CLT)
- Estabilidades provisórias e verbas previstas em convenção coletiva

**Não substitui** o cálculo oficial do empregador nem orientação jurídica. Em caso de dúvida, procure um advogado ou o sindicato da sua categoria.

## Bases legais

| Regra | Norma |
|---|---|
| Aviso prévio proporcional (30 + 3 dias/ano, até 90) | Lei 12.506/2011 |
| Proporcionalidade só a favor do empregado (pedido de demissão = 30 dias) | Jurisprudência do TST |
| Projeção do aviso indenizado | CLT, art. 487 §1º; OJ 82 da SDI-1 do TST |
| Desconto do aviso não cumprido pelo empregado | CLT, art. 487 §2º |
| Rescisão por acordo | CLT, art. 484-A |
| Rescisão indireta | CLT, art. 483 |
| Justa causa | CLT, art. 482; Súmula 171 do TST |
| 13º proporcional e regra dos 15 dias | Lei 4.090/62, arts. 1º §2º e 3º |
| Férias proporcionais | CLT, art. 146; Súmula 261 do TST |
| Férias + 1/3 constitucional | CF/88, art. 7º, XVII; CLT, arts. 130 e 142 |
| Férias em dobro | CLT, art. 137 |
| Multa do FGTS | Lei 8.036/90, art. 18 §1º |

## Desenvolvimento

O site é estático: `index.html`, `style.css` e módulos ES em `src/`, sem etapa de build. As regras de cálculo ficam isoladas em `src/rescisao.js` e a interface em `src/app.js`. Os tipos são escritos em JSDoc e verificados pelo TypeScript em modo `strict`.

```sh
npm install
npm run check      # typecheck + testes
```

Para abrir localmente, sirva a pasta por HTTP (módulos ES não carregam via `file://`):

```sh
python3 -m http.server 8000
# http://localhost:8000
```

## Deploy (GitHub Pages)

**Settings → Pages → Deploy from a branch**, branch `main`, pasta `/ (root)`. A página fica em `https://<usuario>.github.io/<repo>/`.

## Roadmap

- [ ] Contrato por prazo determinado e de experiência
- [ ] Descontos de INSS e IRRF com tabelas anuais
- [ ] Médias de horas extras e comissões

Sugestões e PRs são bem-vindos.

## Licença

[MIT](LICENSE) © AstralunaProject
