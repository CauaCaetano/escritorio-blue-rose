// =============================================================
// Painel lateral: aguardando você, time, atividade, negócios,
// contadores, cartão do agente e diálogo de detalhes.
// =============================================================
import {
  esc, hora, dataHora, api, avisar, copiarTexto, linksWhatsapp, formatarWhatsapp,
  ROTULO_ESTADO, ROTULO_STATUS, ROTULO_ETAPA,
} from './util.js';
import { retrato } from './pixel/personagem.js';

export class Painel {
  constructor(estado, { aoSelecionarAgente }) {
    this.estado = estado;
    this.aoSelecionarAgente = aoSelecionarAgente;
    this.el = {
      aguardando: document.getElementById('lista-aguardando'),
      selo: document.getElementById('selo-aguardando'),
      time: document.getElementById('lista-time'),
      log: document.getElementById('lista-log'),
      negocios: document.getElementById('lista-negocios'),
      contadores: document.getElementById('contadores'),
      dialogo: document.getElementById('detalhe'),
      detalhe: document.getElementById('detalhe-conteudo'),
    };
    this.detalheAberto = null;
    this.configurarAbas(document.querySelector('.painel .abas'), document.querySelectorAll('.painel .aba'));
    this.el.dialogo.addEventListener('click', (e) => { if (e.target === this.el.dialogo) this.el.dialogo.close(); });
    this.el.dialogo.addEventListener('close', () => { this.detalheAberto = null; });
  }

  configurarAbas(nav, secoes) {
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-aba]');
      if (!b) return;
      for (const x of nav.querySelectorAll('button')) x.setAttribute('aria-selected', String(x === b));
      for (const s of secoes) s.hidden = s.dataset.aba !== b.dataset.aba;
    });
  }

  // ---------------------------------------------------------------
  // Contadores
  // ---------------------------------------------------------------
  renderContadores() {
    const c = this.estado.contadores;
    const itens = [
      ['negocios', 'Negócios'], ['emAndamento', 'Em andamento'], ['aguardando', 'Aguardando você'],
      ['aprovados', 'Aprovados'], ['propostas', 'Propostas'], ['previas', 'Prévias'],
    ];
    this.el.contadores.innerHTML = itens.map(([k, rotulo]) =>
      `<div class="contador ${k === 'aguardando' && c[k] > 0 ? 'destaque' : ''}"><b>${c[k] ?? 0}</b><span>${rotulo}</span></div>`).join('');
    this.el.selo.textContent = c.aguardando ?? 0;
    this.el.selo.classList.toggle('ativo', (c.aguardando ?? 0) > 0);
  }

  // ---------------------------------------------------------------
  // Fila "Aguardando você" (mantém o formulário de ajuste aberto
  // mesmo quando a lista é atualizada)
  // ---------------------------------------------------------------
  renderAguardando() {
    const lista = [...this.estado.negocios.values()]
      .filter((n) => n.status === 'aguardando_aprovacao')
      .sort((a, b) => a.atualizado_em.localeCompare(b.atualizado_em));

    const existentes = new Map([...this.el.aguardando.querySelectorAll('.card')].map((c) => [Number(c.dataset.id), c]));
    for (const [id, card] of existentes) if (!lista.some((n) => n.id === id)) card.remove();
    this.el.aguardando.querySelector('.vazio')?.remove();

    if (!lista.length) {
      this.el.aguardando.innerHTML = `<div class="vazio"><span class="pixel-emoji">🌹</span>Nada aguardando você agora.<br>Faça um pedido ao Gerente para começar.</div>`;
      return;
    }
    lista.forEach((n, i) => {
      let card = existentes.get(n.id);
      if (!card) card = this.criarCardAguardando(n);
      card.querySelector('.meta').textContent = [n.tipo, n.cidade, n.instagram].filter(Boolean).join(' · ');
      card.querySelector('.motivo').textContent = n.motivo || '';
      card.querySelector('.mensagem').textContent = n.mensagem || '(sem mensagem)';
      if (this.el.aguardando.children[i] !== card) this.el.aguardando.insertBefore(card, this.el.aguardando.children[i] || null);
    });
  }

  criarCardAguardando(n) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = n.id;
    card.innerHTML = `
      <h4>${esc(n.nome)}</h4>
      <div class="meta"></div>
      <p class="motivo"></p>
      <div class="mensagem"></div>
      <div class="acoes">
        <button type="button" class="botao sucesso" data-acao="aprovar">Aprovar</button>
        <button type="button" class="botao" data-acao="ajuste">Pedir ajuste</button>
        <button type="button" class="botao fantasma" data-acao="detalhes">Ver detalhes</button>
      </div>
      <form class="form-ajuste">
        <textarea name="comentario" maxlength="500" placeholder="O que precisa mudar? Ex.: deixar a mensagem mais curta e informal" required></textarea>
        <div class="acoes">
          <button type="submit" class="botao primario">Enviar ajuste ao Redator</button>
          <button type="button" class="botao fantasma" data-acao="cancelar">Cancelar</button>
        </div>
      </form>`;
    const form = card.querySelector('.form-ajuste');
    card.addEventListener('click', async (e) => {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (acao === 'aprovar') this.aprovar(n.id, e.target);
      if (acao === 'ajuste') { form.classList.add('aberto'); form.comentario.focus(); }
      if (acao === 'cancelar') form.classList.remove('aberto');
      if (acao === 'detalhes') this.abrirDetalhe(n.id);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.pedirAjuste(n.id, form.comentario.value, form.querySelector('[type=submit]'));
    });
    return card;
  }

  async aprovar(id, botao) {
    if (botao) botao.disabled = true;
    try {
      await api(`/api/negocios/${id}/aprovar`, { metodo: 'POST' });
      avisar('Aprovado! Agora é só exportar a mensagem: o envio é feito por você.');
      this.abrirDetalhe(id);
    } catch (e) {
      avisar(e.message, 'erro');
      if (botao) botao.disabled = false;
    }
  }

  async pedirAjuste(id, comentario, botao) {
    if (!comentario.trim()) return avisar('Escreva o que precisa ser ajustado.', 'erro');
    if (botao) botao.disabled = true;
    try {
      await api(`/api/negocios/${id}/ajuste`, { metodo: 'POST', corpo: { comentario } });
      avisar('Ajuste enviado. O Gerente vai levar para o Redator.');
      if (this.detalheAberto === id) this.el.dialogo.close();
    } catch (e) {
      avisar(e.message, 'erro');
      if (botao) botao.disabled = false;
    }
  }

  // ---------------------------------------------------------------
  // Time
  // ---------------------------------------------------------------
  renderTime() {
    for (const a of this.estado.agentes.values()) {
      let li = this.el.time.querySelector(`li[data-id="${a.id}"]`);
      if (!li) {
        li = document.createElement('li');
        li.dataset.id = a.id;
        li.innerHTML = `<span class="avatar"></span><div><div><span class="nome"></span> <span class="cargo"></span> <span class="chip"></span></div><div class="status"></div></div><div class="fila"></div>`;
        li.querySelector('.avatar').appendChild(retrato(a.visual, 44));
        li.querySelector('.nome').textContent = a.nome;
        li.querySelector('.cargo').textContent = `· ${a.cargo}`;
        li.title = `${a.especialidade}: ${a.papel}`;
        li.addEventListener('click', () => this.aoSelecionarAgente(a.id));
        this.el.time.appendChild(li);
      }
      const chip = li.querySelector('.chip');
      chip.className = `chip ${a.estado}`;
      chip.textContent = ROTULO_ESTADO[a.estado] || a.estado;
      li.querySelector('.status').textContent = a.status;
      li.querySelector('.fila').textContent = a.fila ? `Fila: ${a.fila}` : '';
    }
  }

  /** Conteúdo do cartão que aparece ao clicar no personagem */
  htmlCartaoAgente(a) {
    return `
      <button type="button" class="fechar" aria-label="Fechar">×</button>
      <h3>${esc(a.nome)} <span class="chip ${a.estado}">${esc(ROTULO_ESTADO[a.estado] || a.estado)}</span></h3>
      <div class="cargo">${esc(a.cargo)} · ${esc(a.especialidade)}</div>
      <p class="papel">${esc(a.papel)}</p>
      <div><strong>Agora:</strong> ${esc(a.status)}</div>
      <div style="margin-top:4px;color:var(--texto-suave)">Tarefas na fila: ${a.fila}</div>`;
  }

  // ---------------------------------------------------------------
  // Log de atividade (mais novo no topo)
  // ---------------------------------------------------------------
  renderLogCompleto() {
    this.el.log.innerHTML = '';
    for (const l of this.estado.log) this.adicionarLog(l);
  }

  adicionarLog(l) {
    const li = document.createElement('li');
    li.className = l.tipo;
    const a = l.agente ? this.estado.agentes.get(l.agente) : null;
    // Linhas sem agente são ações suas (o texto já começa com "Você...")
    const quem = a ? `<span class="quem" style="color:${a.visual.camisa}">${esc(a.nome)} · ${esc(a.cargo)}:</span> ` : '';
    li.innerHTML = `<time datetime="${esc(l.criado_em)}">${hora(l.criado_em)}</time><div class="texto">${quem}${esc(l.texto)}</div>`;
    this.el.log.prepend(li);
    while (this.el.log.children.length > 200) this.el.log.lastElementChild.remove();
  }

  // ---------------------------------------------------------------
  // Todos os negócios
  // ---------------------------------------------------------------
  renderNegocios() {
    const lista = [...this.estado.negocios.values()].sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em));
    if (!lista.length) {
      this.el.negocios.innerHTML = `<div class="vazio">Nenhum negócio ainda.</div>`;
      return;
    }
    this.el.negocios.innerHTML = lista.map((n) => `
      <li data-id="${n.id}">
        <div>
          <strong>${esc(n.nome)}</strong>
          <div class="meta">${esc(n.tipo || '')} · ${esc(n.cidade || '')} · ${esc(ROTULO_ETAPA[n.etapa] || n.etapa || '')}</div>
        </div>
        <span class="status-negocio ${esc(n.status)}">${n.status === 'aprovado' ? '✉ Pronto para enviar' : esc(ROTULO_STATUS[n.status] || n.status)}</span>
      </li>`).join('');
    for (const li of this.el.negocios.querySelectorAll('li')) {
      li.addEventListener('click', () => this.abrirDetalhe(Number(li.dataset.id)));
    }
  }

  // ---------------------------------------------------------------
  // Detalhes de um negócio (proposta, mensagem, prévia, respostas...)
  // ---------------------------------------------------------------
  /** Etapa 5: botões de exportar a mensagem aprovada (nunca envia sozinho) */
  ligarEnvio(raiz, n) {
    const secao = raiz.querySelector('[data-aba="enviar"].aba-detalhe');
    const campoWhats = secao.querySelector('[name=whatsapp]');
    const campoMsg = secao.querySelector('[name=mensagem]');
    let numero = n.whatsapp;

    secao.querySelector('[data-salvar-whats]').addEventListener('click', async () => {
      try {
        const r = await api(`/api/negocios/${n.id}/whatsapp`, { metodo: 'PATCH', corpo: { whatsapp: campoWhats.value } });
        numero = r.whatsapp;
        campoWhats.value = formatarWhatsapp(numero);
        avisar(numero ? 'WhatsApp salvo.' : 'WhatsApp removido.');
      } catch (e) { avisar(e.message, 'erro'); }
    });

    secao.querySelectorAll('[data-exportar]').forEach((b) => b.addEventListener('click', async () => {
      const via = b.dataset.exportar;
      const mensagem = campoMsg.value.trim();
      if (!mensagem) return avisar('A mensagem está vazia.', 'erro');
      if (via === 'copiar') {
        avisar(await copiarTexto(mensagem) ? 'Mensagem copiada! Cole no WhatsApp e envie você mesmo.' : 'Não consegui copiar; selecione o texto e copie.', 'info');
      } else {
        // Abre na hora (antes de qualquer espera) para o navegador não bloquear a janela
        const links = linksWhatsapp(numero, mensagem);
        window.open(via === 'whatsapp_web' ? links.web : links.app, '_blank', 'noopener');
      }
      // Guarda no histórico que você exportou
      api(`/api/negocios/${n.id}/exportar`, { metodo: 'POST', corpo: { via, mensagem } }).catch((e) => avisar(e.message, 'erro'));
    }));
  }

  async abrirDetalhe(id, abaInicial = 'proposta') {
    let d;
    try {
      d = await api(`/api/negocios/${id}`);
    } catch (e) {
      return avisar(e.message, 'erro');
    }
    this.detalheAberto = id;
    const n = d.negocio;
    const origem = (o) => (o ? `<span class="origem ${o === 'api' ? 'api' : ''}">${o === 'api' ? 'IA real' : 'simulado'}</span>` : '');
    const aguardando = n.status === 'aguardando_aprovacao';
    const aprovado = n.status === 'aprovado' && d.proposta;

    this.el.detalhe.innerHTML = `
      <header>
        <div>
          <h2>${esc(n.nome)}</h2>
          <div class="meta">${esc([n.tipo, n.cidade, n.instagram].filter(Boolean).join(' · '))}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="status-negocio ${esc(n.status)}">${esc(ROTULO_STATUS[n.status] || n.status)}</span>
          <button type="button" class="botao fantasma" data-fechar aria-label="Fechar">✕</button>
        </div>
      </header>
      ${n.analise ? `<div class="analise"><strong>Análise do Prospector:</strong> ${esc(n.analise)}</div>` : ''}
      ${n.observacoes ? `<div class="meta" style="margin-bottom:10px">Observações: ${esc(n.observacoes)}</div>` : ''}
      <nav class="abas" role="tablist">
        ${aprovado ? '<button type="button" data-aba="enviar">✉ Enviar</button>' : ''}
        <button type="button" data-aba="proposta">Proposta</button>
        <button type="button" data-aba="mensagem">Mensagem</button>
        <button type="button" data-aba="previa">Prévia</button>
        <button type="button" data-aba="respostas">Respostas</button>
        <button type="button" data-aba="historico">Histórico</button>
      </nav>
      ${aprovado ? `
      <section class="aba-detalhe envio" data-aba="enviar">
        <p class="aviso-envio">🔒 <strong>Nada é enviado automaticamente.</strong> Os botões só preparam o texto:
          no WhatsApp, você confere e clica em enviar.</p>
        <label class="campo">WhatsApp do negócio (opcional)
          <span class="linha-pedido">
            <input name="whatsapp" inputmode="tel" maxlength="20" placeholder="(16) 99999-9999" value="${esc(formatarWhatsapp(n.whatsapp))}">
            <button type="button" class="botao" data-salvar-whats>Salvar</button>
          </span>
        </label>
        <label class="campo">Mensagem aprovada (pode editar antes de exportar)
          <textarea name="mensagem" rows="7">${esc(d.proposta.mensagem)}</textarea>
        </label>
        <div class="acoes">
          <button type="button" class="botao" data-exportar="copiar">📋 Copiar mensagem</button>
          <button type="button" class="botao sucesso" data-exportar="whatsapp_web">Abrir no WhatsApp Web</button>
          <button type="button" class="botao" data-exportar="whatsapp_app">Abrir no WhatsApp (celular)</button>
        </div>
        <p class="nota-form">Sem número, o WhatsApp abre para você escolher o contato.</p>
      </section>` : ''}
      <section class="aba-detalhe" data-aba="proposta">
        ${d.proposta ? `<p class="meta">Versão ${d.proposta.versao} ${origem(d.proposta.origem)}</p><pre>${esc(d.proposta.proposta)}</pre>` : '<div class="vazio">O Redator ainda não escreveu a proposta.</div>'}
      </section>
      <section class="aba-detalhe" data-aba="mensagem">
        ${d.proposta ? `<p class="meta">Mensagem de primeiro contato ${origem(d.proposta.origem)} — nada é enviado automaticamente.</p><pre>${esc(d.proposta.mensagem)}</pre>` : '<div class="vazio">Ainda não há mensagem.</div>'}
      </section>
      <section class="aba-detalhe" data-aba="previa">
        ${d.previa ? `
          <div class="previa-caixa">
            <div class="barra">
              <span class="meta">Versão ${d.previa.versao} ${origem(d.previa.origem)}${d.previa.arquivo ? ` · salva em <code>previas/${esc(d.previa.arquivo)}</code>` : ''}</span>
              <span style="flex:1"></span>
              <button type="button" class="botao" data-tela="celular">📱 Celular</button>
              <button type="button" class="botao" data-tela="computador">🖥 Computador</button>
              <a class="botao" href="/api/negocios/${n.id}/previa" target="_blank" rel="noopener">Abrir em nova aba</a>
            </div>
            <iframe class="celular" sandbox="allow-same-origin" src="/api/negocios/${n.id}/previa?v=${d.previa.versao}" title="Prévia da página"></iframe>
          </div>` : '<div class="vazio">O Dev ainda não montou a prévia.</div>'}
      </section>
      <section class="aba-detalhe" data-aba="respostas">
        ${d.respostas ? `<p class="meta">Respostas prontas do Atendente ${origem(d.respostas.origem)}</p><dl class="faq">${d.respostas.conteudo.map((r) => `<dt>${esc(r.pergunta)}</dt><dd>${esc(r.resposta)}</dd>`).join('')}</dl>` : '<div class="vazio">O Atendente ainda não preparou as respostas.</div>'}
        ${d.revisoes.length ? `<h4>Revisões</h4><ul class="linha-tempo">${d.revisoes.map((r) => `<li><time>${dataHora(r.criado_em)}</time>${r.aprovada ? '✅' : '↩️'} ${esc(r.notas)}</li>`).join('')}</ul>` : ''}
      </section>
      <section class="aba-detalhe" data-aba="historico">
        <ul class="linha-tempo">${d.historico.map((h) => `<li><time>${dataHora(h.criado_em)}</time>${esc(h.texto)}</li>`).join('') || '<li>Sem histórico.</li>'}</ul>
        ${d.decisoes.length ? `<h4>Suas decisões</h4><ul class="linha-tempo">${d.decisoes.map((x) => `<li><time>${dataHora(x.criado_em)}</time>${x.decisao === 'aprovado' ? 'Aprovado' : `Ajuste: “${esc(x.comentario)}”`}</li>`).join('')}</ul>` : ''}
      </section>
      ${aguardando ? `
        <form class="form-ajuste aberto" data-form-detalhe style="border-top:1px solid var(--borda);padding-top:12px;margin-top:14px">
          <textarea name="comentario" maxlength="500" placeholder="Se quiser pedir ajuste, escreva aqui o que mudar"></textarea>
          <div class="acoes">
            <button type="button" class="botao sucesso" data-aprovar>Aprovar</button>
            <button type="submit" class="botao">Pedir ajuste</button>
          </div>
        </form>` : ''}
    `;

    const raiz = this.el.detalhe;
    const abas = raiz.querySelector('.abas');
    const secoes = raiz.querySelectorAll('.aba-detalhe');
    const mostrar = (nome) => {
      for (const b of abas.querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.aba === nome));
      for (const s of secoes) s.hidden = s.dataset.aba !== nome;
    };
    abas.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) mostrar(b.dataset.aba); });
    mostrar(aprovado && abaInicial === 'proposta' ? 'enviar' : abaInicial);
    if (aprovado) this.ligarEnvio(raiz, n);

    raiz.querySelector('[data-fechar]').addEventListener('click', () => this.el.dialogo.close());
    raiz.querySelectorAll('[data-tela]').forEach((b) => b.addEventListener('click', () => {
      raiz.querySelector('iframe').classList.toggle('celular', b.dataset.tela === 'celular');
    }));
    const form = raiz.querySelector('[data-form-detalhe]');
    if (form) {
      form.querySelector('[data-aprovar]').addEventListener('click', (e) => this.aprovar(n.id, e.target));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.pedirAjuste(n.id, form.comentario.value, form.querySelector('[type=submit]'));
      });
    }
    if (!this.el.dialogo.open) this.el.dialogo.showModal();
  }
}
