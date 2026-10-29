"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const apiBase = window.CORRETOR_CONFIG.apiBase.replace(/\/$/, "");
  const state = { token: "", roster: {}, draft: null, busy: false, photoReady: false, uncertain: false };
  const controls = ["btnLogin", "btnSair", "btnAtualizarAlunos", "cameraInput", "girarEsquerda", "girarDireita", "btnLer", "btnDescartar"];

  function message(text, type = "") {
    $("status").textContent = text;
    $("status").className = type;
    $("status").hidden = false;
  }

  function syncControls() {
    for (const id of controls) $(id).disabled = state.busy;
    $("identificacao").disabled = state.busy || Boolean(state.draft);
    $("btnAtualizarAlunos").disabled = state.busy || Boolean(state.draft);
    $("cameraInput").disabled = state.busy || Boolean(state.draft);
    $("girarEsquerda").disabled = state.busy || Boolean(state.draft);
    $("girarDireita").disabled = state.busy || Boolean(state.draft);
    $("btnLer").disabled = state.busy || Boolean(state.draft) || !state.photoReady;
    $("confirmado").disabled = state.busy;
    for (const select of document.querySelectorAll(".resposta select")) select.disabled = state.busy;
    const unresolved = [...document.querySelectorAll(".resposta select")].some((s) => s.value === "REVISAR");
    $("btnSalvar").disabled = state.busy || !state.draft || unresolved || !$("confirmado").checked || state.uncertain;
  }

  async function request(path, options = {}, authenticated = true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const headers = new Headers(options.headers || {});
      if (authenticated) headers.set("Authorization", `Bearer ${state.token}`);
      const response = await fetch(apiBase + path, { ...options, headers, signal: controller.signal, cache: "no-store", credentials: "omit" });
      let data;
      try { data = await response.json(); } catch (_) { throw new Error(`O servidor não retornou uma resposta válida (HTTP ${response.status}).`); }
      if (!response.ok) {
        const error = new Error(data.mensagem || `Erro HTTP ${response.status}`);
        error.status = response.status;
        if (authenticated && response.status === 401) clearSession();
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("O servidor demorou a responder. A confirmação não chegou. Sua leitura permanece aqui para conferir antes de tentar novamente.");
      throw error;
    } finally { clearTimeout(timer); }
  }

  async function run(action) {
    if (state.busy) return;
    state.busy = true;
    syncControls();
    try { await action(); } catch (error) { message(error.message || "Falha de conexão. Tente novamente.", "erro"); }
    finally { state.busy = false; syncControls(); }
  }

  function resetDraft() {
    state.draft = null;
    state.uncertain = false;
    $("revisaoPanel").hidden = true;
    $("listaRespostas").replaceChildren();
    $("imagemRevisao").removeAttribute("src");
    $("identidadeRevisao").textContent = "";
    $("confirmado").checked = false;
  }

  function resetPhoto() {
    state.photoReady = false;
    $("foto").width = $("foto").height = 1;
    $("cameraInput").value = "";
    $("fotoPanel").hidden = true;
  }

  function clearSession() {
    state.token = "";
    state.roster = {};
    sessionStorage.removeItem("corretorSession");
    resetDraft(); resetPhoto();
    $("turma").replaceChildren(new Option("Selecione a turma", ""));
    $("aluno").replaceChildren(new Option("Selecione o aluno", ""));
    $("disciplina").replaceChildren();
    $("origemLista").textContent = "Cadastro de alunos por turma.";
    $("appPanel").hidden = true;
    $("loginPanel").hidden = false;
    $("senha").value = "";
  }

  async function loadRoster(force = false) {
    const previous = { disciplina: $("disciplina").value, turma: $("turma").value, aluno: $("aluno").value };
    const data = await request("/alunos" + (force ? "?atualizar=1" : ""));
    state.roster = data.turmas;
    $("disciplina").replaceChildren(...data.disciplinas.map((d) => new Option(d, d)));
    if (data.disciplinas.includes(previous.disciplina)) $("disciplina").value = previous.disciplina;
    $("turma").replaceChildren(new Option("Selecione a turma", ""), ...Object.keys(state.roster).map((t) => new Option(t, t)));
    $("aluno").replaceChildren(new Option("Selecione o aluno", ""));
    if (Object.hasOwn(state.roster, previous.turma)) {
      $("turma").value = previous.turma;
      $("aluno").replaceChildren(new Option("Selecione o aluno", ""), ...state.roster[previous.turma].map((a) => new Option(a, a)));
      if (state.roster[previous.turma].includes(previous.aluno)) $("aluno").value = previous.aluno;
    }
    $("origemLista").textContent = data.aviso || "Cadastro consultado na aba Alunos. Edite a planilha e toque em Atualizar lista para buscar as mudanças.";
    $("appPanel").hidden = false;
    $("loginPanel").hidden = true;
    return data;
  }

  $("btnAtualizarAlunos").addEventListener("click", () => run(async () => {
    if (state.draft) return;
    message("Consultando o cadastro de alunos…");
    const data = await loadRoster(true);
    message(data.aviso || "Lista atualizada. Confira a turma e o aluno antes de ler a prova.", data.aviso ? "" : "sucesso");
  }));

  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    run(async () => {
      message("Entrando… A primeira conexão pode levar alguns instantes.");
      const data = await request("/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha: $("senha").value }) }, false);
      state.token = data.token;
      sessionStorage.setItem("corretorSession", JSON.stringify({ token: data.token, expires: data.expires_at }));
      $("senha").value = "";
      await loadRoster();
      message("Escolha a turma e o aluno para começar.", "sucesso");
    });
  });

  $("btnSair").addEventListener("click", () => {
    if (state.draft && !confirm("Há uma leitura sem confirmação de gravação. Deseja sair?")) return;
    run(async () => {
      await request("/logout", { method: "POST" });
      clearSession();
      message("Sessão encerrada.", "sucesso");
    });
  });

  $("turma").addEventListener("change", () => {
    $("aluno").replaceChildren(new Option("Selecione o aluno", ""), ...(state.roster[$("turma").value] || []).map((a) => new Option(a, a)));
  });

  $("cameraInput").addEventListener("change", () => run(async () => {
    resetDraft();
    state.photoReady = false;
    $("fotoPanel").hidden = true;
    const file = $("cameraInput").files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) throw new Error("A foto original deve ter até 20 MB. Escolha uma resolução menor na câmera.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Escolha uma imagem JPEG, PNG ou WebP.");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (img.naturalWidth * img.naturalHeight > 50_000_000) throw new Error("Use uma foto de até 50 megapixels.");
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      $("foto").width = Math.round(img.naturalWidth * scale);
      $("foto").height = Math.round(img.naturalHeight * scale);
      $("foto").getContext("2d").drawImage(img, 0, 0, $("foto").width, $("foto").height);
      state.photoReady = true;
      $("fotoPanel").hidden = false;
      message("Confira se a primeira questão está no topo e se as alternativas estão na ordem A–E.");
    } finally { URL.revokeObjectURL(url); }
  }));

  function rotate(direction) {
    if (state.busy || state.draft || !state.photoReady) return;
    const canvas = $("foto");
    const copy = document.createElement("canvas");
    copy.width = canvas.width; copy.height = canvas.height;
    copy.getContext("2d").drawImage(canvas, 0, 0);
    canvas.width = copy.height; canvas.height = copy.width;
    const context = canvas.getContext("2d");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(direction * Math.PI / 2);
    context.drawImage(copy, -copy.width / 2, -copy.height / 2);
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
  $("girarEsquerda").addEventListener("click", () => rotate(-1));
  $("girarDireita").addEventListener("click", () => rotate(1));

  function updateReview() {
    const selects = [...document.querySelectorAll(".resposta select")];
    const unresolved = selects.filter((s) => s.value === "REVISAR").length;
    const doubles = selects.filter((s) => s.value === "DUPLA").length;
    $("resumoRevisao").textContent = `${selects.length} questões · ${unresolved} para resolver · ${doubles} com marcação dupla`;
    for (const select of selects) select.closest(".resposta").classList.toggle("atencao", ["REVISAR", "DUPLA"].includes(select.value));
    syncControls();
  }

  function showReview(data) {
    state.draft = data;
    state.uncertain = false;
    $("identidadeRevisao").textContent = `${data.disciplina} · ${data.turma} · ${data.aluno}`;
    $("imagemRevisao").src = data.imagem_revisao;
    $("listaRespostas").replaceChildren();
    for (const detail of data.detalhes) {
      const row = document.createElement("div"); row.className = "resposta";
      const label = document.createElement("label"); label.htmlFor = `q${detail.questao}`; label.textContent = `Q${detail.questao}`;
      const select = document.createElement("select"); select.id = label.htmlFor;
      for (const option of ["A", "B", "C", "D", "E", "BRANCO", "DUPLA", "REVISAR"]) {
        const text = { BRANCO: "Em branco", DUPLA: "Marcação dupla", REVISAR: "Leitura duvidosa — escolha após conferir" }[option] || option;
        select.add(new Option(text, option));
      }
      select.value = detail.resposta;
      const note = document.createElement("p"); note.textContent = detail.motivo; note.id = `nota${detail.questao}`;
      select.setAttribute("aria-describedby", note.id);
      select.addEventListener("change", () => { $("confirmado").checked = false; updateReview(); });
      row.append(label, select, note); $("listaRespostas").append(row);
    }
    $("revisaoPanel").hidden = false;
    $("confirmado").checked = false;
    updateReview();
    $("revisaoPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("btnLer").addEventListener("click", () => run(async () => {
    if (!$("aluno").value || !$("turma").value || !$("quantidade").checkValidity()) throw new Error("Selecione a turma, o aluno e a quantidade correta de questões objetivas.");
    const blob = await new Promise((resolve) => $("foto").toBlob(resolve, "image/jpeg", .9));
    if (!blob) throw new Error("Não consegui preparar a foto. Capture novamente.");
    const form = new FormData();
    for (const id of ["disciplina", "turma", "aluno", "quantidade"]) form.append(id, $(id).value);
    form.append("imagem", blob, "gabarito.jpg");
    message("Lendo as marcações… Nenhuma resposta foi gravada ainda.");
    const data = await request("/processar_gabarito", { method: "POST", body: form });
    showReview(data);
    message("Leitura pronta. Confira as respostas abaixo antes de salvar.");
  }));

  $("confirmado").addEventListener("change", syncControls);
  $("btnSalvar").addEventListener("click", () => run(async () => {
    if (!state.draft || !$("confirmado").checked || state.uncertain) return;
    const answers = [...document.querySelectorAll(".resposta select")].map((s) => s.value);
    if (answers.includes("REVISAR")) throw new Error("Resolva todas as leituras duvidosas antes de salvar.");
    message("Aguardando confirmação do Google Sheets…");
    let data;
    try {
      data = await request("/salvar_gabarito", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leitura_id: state.draft.leitura_id, respostas: answers, confirmado: true }) });
    } catch (error) {
      if (error.status === 409) state.uncertain = true;
      throw error;
    }
    if (data.status !== "sucesso") throw new Error("A gravação não foi confirmada. Confira a planilha.");
    const name = state.draft.aluno;
    resetDraft(); resetPhoto(); $("aluno").value = "";
    message(`${data.mensagem}\nAluno: ${name}\nRespostas: ${answers.join(", ")}\nSelecione o próximo aluno.`, "sucesso");
    $("aluno").focus();
    $("status").scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  $("btnDescartar").addEventListener("click", () => {
    if (!confirm(state.uncertain ? "A gravação pode ter ocorrido. Confira a planilha antes de ler esta prova novamente. Deseja descartar esta revisão?" : "Descartar esta leitura sem salvar?")) return;
    resetDraft(); syncControls(); message("Leitura descartada. Você pode girar a foto, escolher outra ou ler novamente.");
  });

  window.addEventListener("beforeunload", (event) => {
    if (state.draft || state.busy) { event.preventDefault(); event.returnValue = ""; }
  });

  run(async () => {
    const url = new URL(apiBase);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Configure uma API HTTPS em config.js.");
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem("corretorSession") || "null"); } catch (_) { sessionStorage.removeItem("corretorSession"); }
    if (saved && saved.expires > Date.now() / 1000) {
      state.token = saved.token;
      await loadRoster();
      message("Sessão restaurada. Escolha o aluno para começar.", "sucesso");
    } else { clearSession(); }
  });
})();
