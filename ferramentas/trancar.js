// =====================================================================
// TRANCAR O PROMPT
//
// Pega o prompt.md, embaralha ele com a sua senha e guarda o resultado
// embaralhado dentro do index.html. Sem a senha, nem abrindo o
// código-fonte da página o prompt aparece: é só letra sem sentido.
//
// COMO USAR (no Terminal, dentro desta pasta):
//   node ferramentas/trancar.js "a-sua-senha-aqui"
//
// Faça isso toda vez que você mudar o prompt.md ou trocar a senha.
// Depois: git add -A && git commit -m "prompt novo" && git push
//
// IMPORTANTE: o prompt.md NÃO vai pro GitHub (está no .gitignore).
// Ele é a sua cópia de trabalho, em texto puro, e fica só no seu
// computador. Se ele for pro GitHub, a tranca perde a graça.
// =====================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const senha = process.argv[2];
if (!senha) {
  console.error('\nFalta a senha. Use assim:\n  node ferramentas/trancar.js "a-sua-senha-aqui"\n');
  process.exit(1);
}
if (senha.length < 10) {
  console.error('\nEssa senha é curta demais. Use pelo menos 10 caracteres.\n');
  process.exit(1);
}

const raiz = path.join(__dirname, '..');
const prompt = fs.readFileSync(path.join(raiz, 'prompt.md'), 'utf8').trim();

// Quantas voltas o computador dá pra transformar a senha em chave.
// Quanto mais voltas, mais devagar fica pra alguém tentar adivinhar no
// chute. 600 mil deixa a aluna esperando menos de um segundo.
const VOLTAS = 600000;

// O "sal" e o "tempero" mudam a cada vez que você tranca, então dois
// arquivos com a mesma senha nunca ficam iguais.
const sal = crypto.randomBytes(16);
const tempero = crypto.randomBytes(12);

const chave = crypto.pbkdf2Sync(senha, sal, VOLTAS, 32, 'sha256');

const maquina = crypto.createCipheriv('aes-256-gcm', chave, tempero);
const embaralhado = Buffer.concat([maquina.update(prompt, 'utf8'), maquina.final()]);
// O navegador espera a "etiqueta de conferência" grudada no fim.
const comEtiqueta = Buffer.concat([embaralhado, maquina.getAuthTag()]);

const pacote = Buffer.from(JSON.stringify({
  v: 1,
  voltas: VOLTAS,
  sal: sal.toString('base64'),
  tempero: tempero.toString('base64'),
  texto: comEtiqueta.toString('base64'),
})).toString('base64');

// Troca o conteúdo entre as marcas dentro do index.html.
const arquivo = path.join(raiz, 'index.html');
let html = fs.readFileSync(arquivo, 'utf8');
const marcaIni = '<script type="text/plain" id="prompt-trancado">';
const marcaFim = '</script>';
const ini = html.indexOf(marcaIni);
if (ini === -1) {
  console.error('\nNão achei o bloco prompt-trancado no index.html.\n');
  process.exit(1);
}
const fim = html.indexOf(marcaFim, ini);
html = html.slice(0, ini + marcaIni.length) + '\n' + pacote + '\n' + html.slice(fim);
fs.writeFileSync(arquivo, html);

console.log('\nPronto, o prompt foi trancado dentro do index.html.');
console.log(`  ${prompt.length} caracteres de prompt viraram ${pacote.length} de código embaralhado.`);
console.log('\nA senha que abre é a que você acabou de usar. Guarde ela.');
console.log('Agora é só: git add -A && git commit -m "prompt trancado" && git push\n');
