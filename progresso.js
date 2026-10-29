"use strict";
(() => {
  const key = (disciplina, turma, aluno) => JSON.stringify([disciplina, turma, aluno]);
  const normalize = text => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  class Progresso {
    constructor(storage) {
      this.storage = storage;
      this.registros = new Map();
      try { this.excecoes = new Map(JSON.parse(storage.getItem("corretorDesmarcados") || "[]")); }
      catch (_) { this.excecoes = new Map(); }
    }
    persistir() { try { this.storage.setItem("corretorDesmarcados", JSON.stringify([...this.excecoes])); } catch (_) {} }
    atualizar(disciplina, turma, registros) {
      const prefixo = JSON.stringify([disciplina, turma]);
      this.registros.set(prefixo, { ...registros });
      for (const [k, assinatura] of this.excecoes) {
        let d, t, aluno;
        try { [d, t, aluno] = JSON.parse(k); } catch (_) { this.excecoes.delete(k); continue; }
        if (d === disciplina && t === turma && registros[aluno] !== assinatura) this.excecoes.delete(k);
      }
      this.persistir();
    }
    assinatura(d, t, a) { const r = this.registros.get(JSON.stringify([d, t])); return r && Object.hasOwn(r, a) ? r[a] : null; }
    corrigido(d, t, a) { const assinatura = this.assinatura(d,t,a); return Boolean(assinatura && this.excecoes.get(key(d,t,a)) !== assinatura); }
    alternar(d,t,a) {
      const assinatura = this.assinatura(d,t,a); if (!assinatura) return;
      if (this.corrigido(d,t,a)) this.excecoes.set(key(d,t,a),assinatura); else this.excecoes.delete(key(d,t,a));
      this.persistir();
    }
    salvo(d,t,a,id) {
      const registros = { ...(this.registros.get(JSON.stringify([d,t])) || {}) };
      registros[a] = "confirmado:"+id;
      this.excecoes.delete(key(d,t,a)); this.registros.set(JSON.stringify([d,t]),registros); this.persistir();
    }
    filtrar(nomes, d, t, busca, pendentes) { return nomes.filter(a => normalize(a).includes(normalize(busca)) && (!pendentes || !this.corrigido(d,t,a))); }
    proximo(nomes, d, t, atual) {
      const inicio = nomes.indexOf(atual);
      for (let i=1;i<=nomes.length;i++) { const aluno=nomes[(inicio+i+nomes.length)%nomes.length]; if(aluno!==atual&&!this.corrigido(d,t,aluno))return aluno; }
      return "";
    }
    limpar() { this.registros.clear();this.excecoes.clear();try {this.storage.removeItem("corretorDesmarcados");}catch(_){} }
  }
  window.CorretorProgresso = Progresso;
})();
