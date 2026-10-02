// =============================================================
// Contatos que chegam pelo formulário do site
// -------------------------------------------------------------
// O site (estático, no GitHub Pages) grava o pedido na tabela
// leads_site do Supabase. A chave pública do site só pode INSERIR
// (RLS); quem lê é este servidor, com a service_role do .env.
//
// A cada 2 minutos buscamos os pedidos novos e cada um vira um
// negócio (fonte "site") que segue o fluxo normal do time e para
// em "aguardando aprovação". A resposta ao cliente é sempre sua.
// =============================================================
import * as db from './db.js';
import { supabaseConfigurado, obterCliente } from './supabase.js';
import { normalizarWhatsapp } from './whatsapp.js';

const INTERVALO_MS = 2 * 60 * 1000;
const limpo = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export class LeadsSite {
  constructor(esc) {
    this.esc = esc;
    this.timer = null;
    this.ocupado = false;
    this.ultimoErro = null;
  }

  iniciar() {
    if (!supabaseConfigurado()) return;
    this.checar();
    this.timer = setInterval(() => this.checar(), INTERVALO_MS);
    this.timer.unref?.();
  }

  parar() { clearInterval(this.timer); }

  /** Converte um pedido do site nos dados de um negócio */
  static paraNegocio(lead) {
    let whatsapp = null;
    try { whatsapp = lead.whatsapp ? normalizarWhatsapp(lead.whatsapp) : null; } catch { whatsapp = null; }
    const interesses = Array.isArray(lead.interesses) ? lead.interesses.map((i) => limpo(i, 40)).filter(Boolean) : [];
    const contato = limpo(lead.nome, 120);
    const observacoes = [
      `Pedido pelo site: "${limpo(lead.mensagem, 1000)}"`,
      interesses.length ? `Interesse: ${interesses.join(', ')}.` : '',
      `Contato: ${contato}${lead.whatsapp && !whatsapp ? ` (WhatsApp informado: ${limpo(lead.whatsapp, 30)})` : ''}.`,
      lead.origem ? `Chegou pelo link: ${limpo(lead.origem, 80)}.` : '',
      lead.idioma === 'en' ? 'Escreveu pela versão em inglês do site.' : '',
    ].filter(Boolean).join(' ');
    return {
      nome: limpo(lead.negocio, 120) || `Contato do site: ${contato}`,
      whatsapp,
      observacoes,
      fonte: 'site',
    };
  }

  /** Busca pedidos ainda não importados. Devolve quantos viraram negócio. */
  async checar() {
    if (!supabaseConfigurado() || this.ocupado) return 0;
    this.ocupado = true;
    let criados = 0;
    try {
      const sb = obterCliente();
      const { data, error } = await sb.from('leads_site').select('*')
        .is('importado_em', null).order('criado_em', { ascending: true }).limit(20);
      if (error) throw new Error(error.message);
      const importados = new Set(db.lerAjuste('leads_importados', []) || []);
      for (const lead of data || []) {
        // Proteção extra contra duplicar se a marcação no Supabase falhar
        if (!importados.has(lead.id)) {
          const n = this.esc.receberLeadSite(LeadsSite.paraNegocio(lead));
          importados.add(lead.id);
          db.salvarAjuste('leads_importados', [...importados].slice(-500));
          criados++;
          const { error: e2 } = await sb.from('leads_site')
            .update({ importado_em: new Date().toISOString(), negocio_id: n.id }).eq('id', lead.id);
          if (e2) throw new Error(e2.message);
        }
      }
      this.ultimoErro = null;
    } catch (e) {
      if (this.ultimoErro !== e.message) {
        this.esc.log({ tipo: 'erro', texto: `Contatos do site indisponíveis: ${e.message}. Tento de novo em 2 minutos.` });
      }
      this.ultimoErro = e.message;
    } finally {
      this.ocupado = false;
    }
    return criados;
  }
}
