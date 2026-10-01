// =============================================================
// Aplicativo de desktop do Escritório BLUE ROSE (Electron)
// -------------------------------------------------------------
// Abre o mesmo servidor do projeto dentro do app e mostra o
// escritório numa janela própria, sem precisar de terminal.
//
// Os dados do usuário (configurações .env com a chave da API, banco
// SQLite e prévias) ficam em uma pasta da conta do Windows, FORA do
// executável. Assim o .exe pode ser compartilhado sem expor nada.
// =============================================================
import { app, BrowserWindow, Menu, shell, dialog } from 'electron';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');

// Só uma janela do escritório por vez
if (!app.requestSingleInstanceLock()) app.quit();

let janela = null;
let pastaDados = '';

/** Pede ao sistema uma porta livre (evita conflito com "npm start") */
function portaLivre() {
  return new Promise((resolver, rejeitar) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', rejeitar);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolver(port));
    });
  });
}

/** Espera o servidor aceitar conexões */
async function esperarServidor(porta, tentativas = 100) {
  for (let i = 0; i < tentativas; i++) {
    const ok = await new Promise((r) => {
      const s = net.connect(porta, '127.0.0.1', () => { s.destroy(); r(true); });
      s.on('error', () => r(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('O servidor do escritório não respondeu.');
}

/** Prepara a pasta de dados e o .env do usuário (criado a partir do exemplo) */
function prepararDados() {
  pastaDados = app.getPath('userData');
  fs.mkdirSync(pastaDados, { recursive: true });
  const env = path.join(pastaDados, '.env');
  if (!fs.existsSync(env)) {
    const exemplo = fs.readFileSync(path.join(RAIZ, '.env.example'), 'utf8');
    fs.writeFileSync(env, exemplo, 'utf8');
  }
  return env;
}

function criarMenu() {
  const abrir = (alvo) => () => shell.openPath(alvo);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Escritório',
      submenu: [
        { label: 'Configurar chave da API (.env)…', click: abrir(path.join(pastaDados, '.env')) },
        { label: 'Abrir pasta das prévias', click: abrir(path.join(pastaDados, 'previas')) },
        { label: 'Abrir pasta de dados', click: abrir(pastaDados) },
        { type: 'separator' },
        { label: 'Recarregar', accelerator: 'F5', click: () => janela?.reload() },
        { label: 'Tela cheia', accelerator: 'F11', click: () => janela?.setFullScreen(!janela.isFullScreen()) },
        { type: 'separator' },
        { label: 'Sair', role: 'quit' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Como ligar a IA real',
          click: () => dialog.showMessageBox(janela, {
            type: 'info',
            title: 'Ligar a IA real',
            message: 'Como ligar a IA real',
            detail: '1. Crie a chave em console.anthropic.com (API Keys) e adicione créditos.\n'
              + '2. Menu Escritório → "Configurar chave da API (.env)…".\n'
              + '3. Cole a chave depois de ANTHROPIC_API_KEY= e salve.\n'
              + '4. Feche e abra o aplicativo de novo.',
          }),
        },
        { label: 'Site da BLUE ROSE', click: () => shell.openExternal('https://cauacaetano.github.io/blue-rose-automacao-express/') },
        { label: 'Código no GitHub', click: () => shell.openExternal('https://github.com/CauaCaetano/escritorio-blue-rose') },
      ],
    },
  ]));
}

async function iniciar() {
  const env = prepararDados();
  const porta = await portaLivre();

  // Configurações lidas pelo servidor (server/config.js)
  process.env.DOTENV_CONFIG_PATH = env;
  process.env.PORT = String(porta);
  process.env.HOST = '127.0.0.1';
  process.env.DB_PATH = path.join(pastaDados, 'escritorio.db');
  process.env.PASTA_PREVIAS = path.join(pastaDados, 'previas');

  // Sobe o servidor do projeto dentro do próprio app
  await import(pathToFileURL(path.join(RAIZ, 'server', 'index.js')).href);
  await esperarServidor(porta);

  criarMenu();
  janela = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Escritório BLUE ROSE',
    backgroundColor: '#090d1c',
    icon: path.join(RAIZ, 'build', 'icon.png'),
    autoHideMenuBar: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  janela.maximize();
  await janela.loadURL(`http://127.0.0.1:${porta}/`);

  // Links externos (ex.: WhatsApp Web) abrem no navegador padrão, nunca dentro do app
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  janela.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${porta}`)) { e.preventDefault(); shell.openExternal(url); }
  });
}

app.on('second-instance', () => {
  if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); }
});

app.whenReady().then(iniciar).catch((erro) => {
  dialog.showErrorBox('Escritório BLUE ROSE', `Não foi possível iniciar: ${erro.message}`);
  app.quit();
});

app.on('window-all-closed', () => app.quit());
