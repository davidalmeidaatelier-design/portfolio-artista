# Portfólio — projeto inicial

Este é o esqueleto do site conforme a arquitetura combinada: Astro (modo híbrido) + Sanity como CMS, PT/EN, pronto para receber venda de obras no futuro.

## Como rodar localmente

1. **Instalar dependências**
   ```
   npm install
   ```

2. **Criar o projeto no Sanity** (gratuito, leva 2 minutos)
   ```
   npm install -g sanity
   cd sanity
   sanity init
   ```
   Isso vai gerar um `projectId`. Copie-o.

3. **Configurar variáveis de ambiente**
   Copie `.env.example` para `.env` na raiz do projeto e preencha `SANITY_PROJECT_ID`.

4. **Rodar o Studio (editor de conteúdo)**
   ```
   cd sanity && sanity dev
   ```
   Abre em `localhost:3333` — é ali que você vai cadastrar obras, projetos e eventos da trajetória.

5. **Rodar o site**
   ```
   npm run dev
   ```
   Abre em `localhost:4321`.

## O que já está pronto

- Schemas completos no Sanity: Obra, Série, Projeto, Evento de trajetória, Sobre, Configurações
- Campos bilíngues (PT/EN) em todos os textos
- Campos de venda futura já modelados (inativos por padrão)
- Páginas: início, listagem de obras por série, obra individual, projetos (agrupados por status), projeto individual, trajetória, sobre, contato
- Design system em `src/styles/global.css` (cores, tipografia, espaçamento)
- Estrutura pronta para o modo híbrido (SSR sob demanda quando a venda for ativada)

## O que falta fazer (próximas etapas do plano)

- Réplica das páginas em inglês dentro de `src/pages/en/` (o padrão já está definido nas páginas em português — é repetir a estrutura trocando os textos e o parâmetro `locale`)
- Lightbox para ampliação das imagens em alta resolução
- Deploy na Vercel + apontamento de DNS do domínio atual
- Cadastro do conteúdo real no Sanity Studio
- Integração de Instagram/YouTube/newsletter no rodapé ou em seção própria
- Quando decidido: ativar Stripe Checkout nas páginas de obra marcadas como `disponivelParaVenda`

## Publicação

Recomendado: Vercel (plano gratuito cobre este projeto). Basta conectar o repositório e apontar o domínio atual via DNS — o WordPress atual não precisa ser mexido além disso.
