let currentProjectId = null;
let latestDraft = "";

const $ = id => document.getElementById(id);

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function loadProjects(selectFirst = true) {
  const projects = await api("/api/projects");

  const list = $("projectList");
  list.innerHTML = "";

  projects.forEach(p => {
    const el = document.createElement("div");

    el.className =
      "project-item" +
      (p.id === currentProjectId ? " active" : "");

    el.textContent = p.name;

    el.onclick = () => loadProject(p.id);

    list.appendChild(el);
  });

  if (projects.length && selectFirst && !currentProjectId) {
    await loadProject(projects[0].id);
  } else if (!projects.length) {
    $("emptyState").classList.remove("hidden");
    $("workspace").classList.add("hidden");
  }
}

async function loadProject(id) {
  currentProjectId = id;

  const data = await api(`/api/projects/${id}`);

  const p = data.project;

  $("emptyState").classList.add("hidden");
  $("workspace").classList.remove("hidden");

  $("pageTitle").textContent = p.name;
  $("projectHeading").textContent = p.name;

  $("projectUpdated").textContent =
    "Last context update: " +
    new Date(p.updated_at).toLocaleString();

  $("name").value = p.name || "";
  $("brief").value = p.brief || "";
  $("audience").value = p.audience || "";
  $("keywords").value = p.keywords || "";
  $("brand_voice").value = p.brand_voice || "";
  $("constraints").value = p.constraints || "";

  const latest = data.drafts[0];

  latestDraft = latest ? latest.content : "";

  if (latest) {
    $("draftOutput").textContent = latest.content;
  } else {
    $("draftOutput").innerHTML =
      '<div class="placeholder">Generate a draft and it will appear here.</div>';
  }

  renderEvents(data.events);
  updateSteps(data.events);
  updateMetrics();

  await loadProjects(false);
}

async function createProject() {
  const name = $("newName").value.trim();

  if (!name) {
    alert("Give the project a name.");
    return;
  }

  const result = await api("/api/projects", {
    method: "POST",

    body: JSON.stringify({
      name,
      brief: $("newBrief").value
    })
  });

  closeModal();

  $("newName").value = "";
  $("newBrief").value = "";

  currentProjectId = result.id;

  await loadProjects(false);
  await loadProject(result.id);
}

async function saveContext() {
  if (!currentProjectId) return;

  await api(`/api/projects/${currentProjectId}`, {
    method: "PUT",

    body: JSON.stringify({
      name: $("name").value,
      brief: $("brief").value,
      audience: $("audience").value,
      keywords: $("keywords").value,
      brand_voice: $("brand_voice").value,
      constraints: $("constraints").value
    })
  });

  await loadProject(currentProjectId);

  toast("Context saved");
}

async function startWorkflow() {
  if (!currentProjectId) return;

  await saveContext();

  await api(`/api/projects/${currentProjectId}/event`, {
    method: "POST",

    body: JSON.stringify({
      event_type: "workflow_started"
    })
  });

  await loadProject(currentProjectId);
}

async function generateDraft() {
  if (!currentProjectId) return;

  await saveContext();

  $("draftOutput").textContent =
    "Generating from persistent context...";

  const draft = await api(
    `/api/projects/${currentProjectId}/generate`,
    {
      method: "POST",
      body: "{}"
    }
  );

  latestDraft = draft.content;

  $("draftOutput").textContent = draft.content;

  await loadProject(currentProjectId);
}

async function reviewDraft() {
  if (!currentProjectId) return;

  await api(`/api/projects/${currentProjectId}/event`, {
    method: "POST",

    body: JSON.stringify({
      event_type: "human_review"
    })
  });

  await loadProject(currentProjectId);
}

async function publishDraft() {
  if (!currentProjectId) return;

  await api(`/api/projects/${currentProjectId}/event`, {
    method: "POST",

    body: JSON.stringify({
      event_type: "published"
    })
  });

  await loadProject(currentProjectId);
}

async function updateMetrics() {
  if (!currentProjectId) return;

  const m = await api(
    `/api/projects/${currentProjectId}/metrics`
  );

  $("leakage").textContent =
    m.context_leakage_score;

  $("eventCount").textContent =
    m.event_count;

  $("timePublish").textContent =
    m.time_to_publish_seconds == null
      ? "—"
      : formatDuration(m.time_to_publish_seconds);
}

function updateSteps(events) {
  [
    "stepContext",
    "stepDraft",
    "stepReview",
    "stepPublish"
  ].forEach(x => {
    $(x).classList.remove("active");
  });

  const types = events.map(e => e.event_type);

  if (
    types.includes("context_updated") ||
    types.includes("project_created")
  ) {
    $("stepContext").classList.add("active");
  }

  if (types.includes("draft_generated")) {
    $("stepDraft").classList.add("active");
  }

  if (types.includes("human_review")) {
    $("stepReview").classList.add("active");
  }

  if (types.includes("published")) {
    $("stepPublish").classList.add("active");
  }
}

function renderEvents(events) {
  const box = $("events");

  box.innerHTML = "";

  if (!events.length) {
    box.innerHTML =
      '<div class="muted">No workflow events yet.</div>';

    return;
  }

  events.forEach(e => {
    const row = document.createElement("div");

    row.className = "event";

    row.innerHTML = `
      <span class="event-type">
        ${escapeHtml(e.event_type.replaceAll("_", " "))}
      </span>

      <span class="event-time">
        ${new Date(e.created_at).toLocaleString()}
      </span>
    `;

    box.appendChild(row);
  });
}

function formatDuration(sec) {
  const min = Math.floor(sec / 60);
  const s = sec % 60;

  return min
    ? `${min}m ${s}s`
    : `${s}s`;
}

function copyDraft() {
  if (!latestDraft) return;

  navigator.clipboard.writeText(latestDraft);

  toast("Draft copied");
}

function openCreate() {
  $("modal").classList.remove("hidden");

  $("newName").focus();
}

function closeModal() {
  $("modal").classList.add("hidden");
}

function toast(message) {
  const el = document.createElement("div");

  el.textContent = message;

  el.style.cssText =
    "position:fixed;" +
    "right:22px;" +
    "bottom:22px;" +
    "background:#15161c;" +
    "color:#fff;" +
    "padding:11px 14px;" +
    "border-radius:9px;" +
    "font-size:12px;" +
    "z-index:20";

  document.body.appendChild(el);

  setTimeout(() => el.remove(), 1800);
}

function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,

    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c])
  );
}

window.addEventListener(
  "DOMContentLoaded",
  () => loadProjects()
);
