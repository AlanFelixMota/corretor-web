"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const apiBase = window.CORRETOR_CONFIG.apiBase.replace(/\/$/, "");
  const state = { token: "", roster: {}, draft: null, busy: false, photoReady: false, uncertain: false, progressAvailable: false };
  const progress = new window.CorretorProgresso(sessionStorage);
  const controls = ["btnLogin", "btnSair", "btnAtualizarAlunos", "btnAtualizarProgresso", "cameraInput", "girarEsquerda", "girarDireita", "btnLer", "btnDescartar", "btnCamera", "btnCapturar"];
  let cameraStream = null, cameraTimer = null, cameraGeneration = 0, cameraOpening = false;
  const framingCanvas = document.createElement("canvas");
  let stability = null;

  function message(text, type = "") {
    $("status").textContent = text;
    $("status").className = type;
    $("status").hidden = false;
  }

  function syncControls() {
    for (const id of controls) $(id).disabled = state.busy;
    const cameraActive = Boolean(cameraStream) || cameraOpening;
    $("identificacao").disabled = state.busy || Boolean(state.draft) || cameraActive;
    $("btnAtualizarAlunos").disabled = state.busy || Boolean(state.draft) || cameraActive;
    $("btnAtualizarProgresso").disabled = state.busy || Boolean(state.draft) || cameraActive || !$("turma").value;
    $("btnDesmarcar").disabled = state.busy || Boolean(state.draft) || cameraActive || !state.progressAvailable || !progress.assinatura($("disciplina").value, $("turma").value, $("aluno").value);
    $("cameraInput").disabled = state.busy || Boolean(state.draft) || cameraActive;
    $("btnCamera").disabled = state.busy || Boolean(state.draft) || cameraActive;
    $("btnCapturar").disabled = state.busy || !cameraStream || !$("cameraVideo").videoWidth;
    $("btnFecharCamera").disabled = !cameraActive;
    $("girarEsquerda").disabled = state.busy || Boolean(state.draft);
    $("girarDireita").disabled = state.busy || Boolean(state.draft);
    $("btnLer").disabled = state.busy || Boolean(state.draft) || !state.photoReady || cameraActive;
    $("confirmado").disabled = state.busy;
    $("orientacaoManual").disabled = state.busy || Boolean(state.draft);
    for (const select of document.querySelectorAll(".resposta select")) select.disabled = state.busy;
    const unresolved = [...document.querySelectorAll(".resposta select")].some((s) => s.value === "REVISAR");
    $("btnSalvar").disabled = state.busy || !state.draft || unresolved || !$("confirmado").checked || state.uncertain;
    $("btnSalvar").textContent = $("modoSequencia").checked ? "Salvar na planilha e próximo aluno" : "Salvar na planilha";
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
        error.code = data.codigo;
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
    $("orientacaoRevisao").textContent = "";
  }

  function resetPhoto() {
    state.photoReady = false;
    $("foto").width = $("foto").height = 1;
    $("cameraInput").value = "";
    $("fotoPanel").hidden = true;
    $("orientacaoManual").checked = false;
    $("orientacaoPanel").hidden = true;
  }

  function clearSession() {
    stopCamera();
    state.token = "";
    state.roster = {};
    state.progressAvailable = false;
    progress.limpar();
    sessionStorage.removeItem("corretorSession");
    resetDraft(); resetPhoto();
    $("turma").replaceChildren(new Option("Selecione a turma", ""));
    $("aluno").replaceChildren(new Option("Selecione o aluno", ""));
    $("disciplina").replaceChildren();
    $("origemLista").textContent = "Cadastro de alunos por turma.";
    $("appPanel").hidden = true;
    $("loginPanel").hidden = false;
    $("senha").value = "";
    $("buscaAluno").value = "";
    $("progressoTurma").textContent = "Selecione a turma para consultar o progresso.";
    $("alunoEmFoco").textContent = "Selecione o aluno antes de abrir a câmera.";
  }

  function renderStudents(selected = $("aluno").value) {
    const d = $("disciplina").value, t = $("turma").value, names = state.roster[t] || [];
    const filtered = progress.filtrar(names, d, t, $("buscaAluno").value, $("somentePendentes").checked);
    $("aluno").replaceChildren(new Option("Selecione o aluno", ""), ...filtered.map(a => new Option((progress.corrigido(d,t,a) ? "✓ " : "") + a, a)));
    if (filtered.includes(selected)) $("aluno").value = selected;
    const done = names.filter(a => progress.corrigido(d,t,a)).length;
    $("progressoTurma").textContent = t ? `${done} de ${names.length} marcados como corrigidos · ${names.length-done} pendentes` + (state.progressAvailable ? "" : " · progresso não confirmado; atualize a consulta") : "Selecione a turma para consultar o progresso.";
    const aluno = $("aluno").value;
    $("alunoEmFoco").textContent = aluno ? `${d} · ${t} · ${aluno}` : "Selecione o aluno antes de abrir a câmera.";
    $("btnDesmarcar").textContent = aluno && progress.corrigido(d,t,aluno) ? "Desmarcar na lista" : "Restaurar marcação";
    syncControls();
  }

  async function loadProgress() {
    const d = $("disciplina").value, t = $("turma").value;
    state.progressAvailable = false;
    if (!d || !t) { renderStudents(); return; }
    try {
      const data = await request(`/progresso?${new URLSearchParams({ disciplina:d, turma:t })}`);
      if (d !== $("disciplina").value || t !== $("turma").value) return;
      progress.atualizar(d, t, data.registros);
      state.progressAvailable = true;
      renderStudents();
    } catch (error) { renderStudents(); throw error; }
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
    state.progressAvailable = false;
    renderStudents();
    return data;
  }

  $("btnAtualizarAlunos").addEventListener("click", () => run(async () => {
    if (state.draft) return;
    message("Consultando o cadastro de alunos…");
    const data = await loadRoster(true);
    try { await loadProgress(); } catch (error) { message("Lista de alunos atualizada. " + error.message); return; }
    message(data.aviso || "Lista e progresso atualizados. Confira a turma e o aluno antes de ler a prova.", data.aviso ? "" : "sucesso");
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
    $("buscaAluno").value = "";
    state.progressAvailable = false; renderStudents("");
    void run(loadProgress);
  });
  $("disciplina").addEventListener("change", () => { state.progressAvailable = false; renderStudents(); void run(loadProgress); });
  $("aluno").addEventListener("change", () => renderStudents());
  $("buscaAluno").addEventListener("input", () => renderStudents());
  $("somentePendentes").addEventListener("change", () => renderStudents());
  $("modoSequencia").addEventListener("change", syncControls);
  $("btnAtualizarProgresso").addEventListener("click", () => run(async () => { await loadProgress(); message("Progresso consultado na planilha atual.", "sucesso"); }));
  $("btnDesmarcar").addEventListener("click", () => {
    if (state.busy || state.draft || cameraStream || cameraOpening || !state.progressAvailable) return;
    const d = $("disciplina").value, t = $("turma").value, a = $("aluno").value;
    if (!progress.assinatura(d,t,a)) return;
    const marcado = progress.corrigido(d,t,a);
    progress.alternar(d,t,a); renderStudents(a);
    message(marcado ? `${a} voltou para os pendentes nesta sessão. As respostas continuam na planilha; confira-as antes de registrar outra leitura.` : `Marcação de ${a} restaurada.`, "sucesso");
  });

  $("cameraInput").addEventListener("change", () => run(async () => {
    stopCamera();
    resetDraft();
    $("orientacaoManual").checked = false; $("orientacaoPanel").hidden = true;
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
    $("orientacaoManual").checked = false;
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
    $("orientacaoRevisao").textContent = data.orientacao?.origem === "manual" ? "Orientação conferida manualmente. Confira a ordem das questões e alternativas na imagem." : data.orientacao?.rotacao ? "A imagem foi girada automaticamente pela posição da numeração. Confira a orientação na imagem." : "Confira a questão 1 no topo e as alternativas A–E da esquerda para a direita.";
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

  function validateIdentity() {
    const quantidade = Number($("quantidade").value);
    if (!$("aluno").value || !$("turma").value || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 60) throw new Error("Selecione a turma, o aluno e a quantidade correta de questões objetivas.");
  }

  async function readPhoto() {
    validateIdentity();
    const blob = await new Promise((resolve) => $("foto").toBlob(resolve, "image/jpeg", .9));
    if (!blob) throw new Error("Não consegui preparar a foto. Capture novamente.");
    const form = new FormData();
    for (const id of ["disciplina", "turma", "aluno", "quantidade"]) form.append(id, $(id).value);
    form.append("orientacao_confirmada", String($("orientacaoManual").checked));
    form.append("imagem", blob, "gabarito.jpg");
    message("Lendo as marcações… Nenhuma resposta foi gravada ainda.");
    let data;
    try { data = await request("/processar_gabarito", { method: "POST", body: form }); }
    catch (error) {
      if (error.code === "ORIENTACAO_DUVIDOSA") { $("orientacaoPanel").hidden = false; $("fotoPanel").scrollIntoView({ behavior:"smooth", block:"start" }); }
      throw error;
    }
    showReview(data);
    message("Leitura pronta. Confira as respostas abaixo antes de salvar.");
  }
  $("btnLer").addEventListener("click", () => run(readPhoto));

  function stopCamera() {
    cameraGeneration++;
    clearTimeout(cameraTimer); cameraTimer = null;
    if (cameraStream) for (const track of cameraStream.getTracks()) track.stop();
    cameraStream = null; cameraOpening = false; stability = null;
    $("cameraVideo").srcObject = null;
    $("cameraPanel").hidden = true;
    $("cameraProgresso").value = 0;
  }

  async function captureCamera() {
    if (!cameraStream || state.busy || state.draft) return;
    const video = $("cameraVideo");
    if (video.readyState < 2 || !video.videoWidth) return;
    await run(async () => {
      validateIdentity();
      const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      $("foto").width = Math.round(video.videoWidth * scale);
      $("foto").height = Math.round(video.videoHeight * scale);
      $("foto").getContext("2d").drawImage(video, 0, 0, $("foto").width, $("foto").height);
      state.photoReady = true;
      $("fotoPanel").hidden = false;
      stopCamera();
      await readPhoto();
    });
  }

  function scanCamera(generation) {
    if (generation !== cameraGeneration || !cameraStream || document.hidden) return;
    const video = $("cameraVideo");
    try {
      if (video.readyState >= 2 && video.videoWidth && !state.busy) {
        const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
        framingCanvas.width = Math.round(video.videoWidth * scale);
        framingCanvas.height = Math.round(video.videoHeight * scale);
        const context = framingCanvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(video, 0, 0, framingCanvas.width, framingCanvas.height);
        const result = window.CorretorCamera.detect(context.getImageData(0, 0, framingCanvas.width, framingCanvas.height));
        const status = stability.update(result, performance.now());
        const overlay = $("cameraOverlay");
        overlay.width = framingCanvas.width; overlay.height = framingCanvas.height;
        const pen = overlay.getContext("2d");
        if (result.box) {
          pen.beginPath();
          result.box.corners.forEach((p, i) => pen[i ? "lineTo" : "moveTo"](p.x * overlay.width, p.y * overlay.height));
          pen.closePath(); pen.strokeStyle = status.progress > 0 ? "#30e6aa" : "#ffd15a"; pen.lineWidth = 3; pen.stroke();
        }
        $("cameraProgresso").value = status.progress;
        $("cameraStatus").textContent = !result.box ? "Mostre a borda inteira, aproxime e ajuste o foco. Primeira questão no topo." : status.phase === "moving" ? "Quadro detectado. Reduza um pouco o movimento para capturar…" : "Quadro detectado. Preparando captura automática; pequenos movimentos são aceitos…";
        $("btnCapturar").disabled = false;
        if (status.ready) { void captureCamera(); return; }
      }
      cameraTimer = setTimeout(() => scanCamera(generation), 180);
    } catch (_) {
      stopCamera(); syncControls();
      message("Não consegui analisar a câmera neste navegador. Use a opção de foto abaixo.", "erro");
    }
  }

  $("btnCamera").addEventListener("click", async () => {
    if (state.busy || state.draft || cameraStream || cameraOpening) return;
    try { validateIdentity(); } catch (error) { message(error.message, "erro"); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.CorretorCamera) {
      message("A câmera ao vivo não está disponível neste navegador. Abra o site no Chrome ou Safari, ou use uma foto.", "erro"); return;
    }
    cameraOpening = true;
    const generation = ++cameraGeneration;
    $("cameraPanel").hidden = false;
    $("cameraStatus").textContent = "Permita o acesso à câmera no navegador…";
    $("cameraPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    syncControls();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (generation !== cameraGeneration || document.hidden) { stream.getTracks().forEach(t => t.stop()); return; }
      cameraStream = stream; cameraOpening = false;
      for (const track of stream.getVideoTracks()) track.addEventListener("ended", () => {
        if (generation === cameraGeneration) { stopCamera(); syncControls(); message("A câmera foi interrompida. Toque em Abrir câmera para tentar novamente."); }
      });
      $("cameraVideo").srcObject = stream;
      await $("cameraVideo").play();
      if (generation !== cameraGeneration) return;
      resetPhoto();
      stability = new window.CorretorCamera.Stability();
      syncControls();
      message("Aponte para o quadro do aluno selecionado. A captura e a leitura serão automáticas.");
      scanCamera(generation);
    } catch (error) {
      if (generation !== cameraGeneration) return;
      stopCamera(); syncControls();
      message(error.name === "NotAllowedError" ? "Permita o acesso à câmera nas configurações do navegador ou use uma foto." : "Não consegui abrir a câmera. Feche outros aplicativos que a estejam usando ou use uma foto.", "erro");
    }
  });
  $("btnFecharCamera").addEventListener("click", () => { stopCamera(); syncControls(); message("Câmera fechada."); });
  $("btnCapturar").addEventListener("click", () => { void captureCamera(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (cameraStream || cameraOpening)) { stopCamera(); syncControls(); message("Câmera pausada ao sair da página. Toque em Abrir câmera para continuar."); }
  });
  window.addEventListener("pagehide", stopCamera);
  window.addEventListener("pageshow", syncControls);

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
    const saved = state.draft, name = saved.aluno;
    progress.salvo(saved.disciplina, saved.turma, name, saved.leitura_id);
    resetDraft(); resetPhoto(); $("buscaAluno").value = "";
    let aviso = "";
    try { await loadProgress(); } catch (_) { aviso = " O progresso não pôde ser atualizado; consulte novamente quando a conexão voltar."; }
    const next = $("modoSequencia").checked ? progress.proximo(state.roster[saved.turma] || [], saved.disciplina, saved.turma, name) : "";
    renderStudents(next);
    message(`${data.mensagem}\nAluno: ${name}\nRespostas: ${answers.join(", ")}\n${next ? `Próximo sugerido: ${next}. Confira a identificação e toque em Abrir câmera.` : "Selecione outro aluno ou atualize o progresso para conferir a turma."}${aviso}`, "sucesso");
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
