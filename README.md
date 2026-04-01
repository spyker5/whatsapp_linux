# WhatsApp Linux

Aplicativo desktop para Linux que encapsula o WhatsApp Web em uma janela nativa com:

- login por QR Code
- notificacoes do sistema
- suporte a camera e microfone
- envio de audios, imagens, documentos e outros arquivos
- icone na bandeja do sistema
- opcao de iniciar com o sistema
- empacotamento para Linux (`AppImage`, `deb` e `tar.gz`)

## Importante

Este projeto nao usa API oficial do WhatsApp para contas pessoais. Ele abre o site oficial `https://web.whatsapp.com` em um app Electron.

Isso significa:

- o login e feito com QR Code
- a compatibilidade com chamadas de voz e video depende do suporte do WhatsApp Web e do Chromium embutido no Electron
- recursos do WhatsApp podem mudar ao longo do tempo sem aviso

## Requisitos

- Node.js 22+
- npm 10+

## Instalar dependencias

```bash
npm install
```

## Executar em modo desenvolvimento

```bash
npm run dev
```

## Gerar instaladores Linux

```bash
npm run dist
```

Os artefatos serao gerados em `dist/`.

## Publicacao

O projeto inclui um workflow em [`.github/workflows/build-linux.yml`](/home/lucas/Documents/whatsapp_linux/.github/workflows/build-linux.yml) que:

- roda em `push` para `main`
- roda em `pull_request`
- pode ser disparado manualmente
- gera artefatos em releases publicadas

Para publicar no GitHub:

```bash
git init
git branch -m main
git add .
git commit -m "Initial release"
```

Depois conecte o repositório remoto e envie para o GitHub. O workflow fara o build automaticamente.

## Estrutura

- `src/main.js`: processo principal do Electron
- `src/preload.js`: ponte segura entre a janela e APIs expostas
- `src/loading.html`: tela de carregamento/fallback
- `assets/icon.svg`: icone base do app

## Observacoes de permissao

O app solicita e libera:

- camera
- microfone
- notificacoes
- seletor de arquivos

Se sua distribuicao Linux bloquear camera ou audio por sandbox do sistema, ajuste tambem as permissoes do ambiente grafico.

## Comportamento do app

- ao fechar a janela, o app continua na bandeja do sistema
- clique no icone da bandeja para abrir ou ocultar a janela
- o menu `Aplicativo` permite ativar `Iniciar com o sistema`
