/* =========================================================
   CREATIVE COMMAND CENTER
   GitHub Pages MVP
   Browser-only demo using localStorage
   ========================================================= */


/* ---------------------------------------------------------
   DEMO DATA
   --------------------------------------------------------- */

const DEFAULT_PROJECT = {
    name: "CCC Product Launch",

    description:
        "Launch Creative Command Center as a workflow orchestration platform for freelance creators and small creative teams.",

    brief:
        "Launch Creative Command Center as a workflow orchestration platform for freelance creators and small creative teams. The campaign should communicate how persistent context reduces repetitive work and context switching.",

    audience:
        "Freelance creators, content strategists and small marketing teams.",

    keywords:
        "AI workflow, content operations, creative productivity, persistent context",

    voice:
        "Clear, intelligent, practical, confident."
};


/* ---------------------------------------------------------
   APPLICATION STATE
   --------------------------------------------------------- */

let project;
let workflowStartedAt = null;

let state = {
    draftGenerated: false,
    draftApproved: false,
    published: false,
    contextSaves: 0,
    events: []
};


/* ---------------------------------------------------------
   INITIALIZATION
   --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    loadApplication();

    populateProject();

    renderEvents();

    updateMetrics();

    setupAutosave();

});


/* ---------------------------------------------------------
   LOCAL STORAGE
   --------------------------------------------------------- */

function loadApplication() {

    const storedProject =
        localStorage.getItem("ccc_project");

    const storedState =
        localStorage.getItem("ccc_state");

    const storedWorkflow =
        localStorage.getItem("ccc_workflow_start");

    project =
        storedProject
            ? JSON.parse(storedProject)
            : { ...DEFAULT_PROJECT };

    state =
        storedState
            ? JSON.parse(storedState)
            : {
                draftGenerated: false,
                draftApproved: false,
                published: false,
                contextSaves: 0,
                events: []
            };

    workflowStartedAt =
        storedWorkflow
            ? Number(storedWorkflow)
            : null;

}


function saveApplication() {

    localStorage.setItem(
        "ccc_project",
        JSON.stringify(project)
    );

    localStorage.setItem(
        "ccc_state",
        JSON.stringify(state)
    );

    if (workflowStartedAt) {

        localStorage.setItem(
            "ccc_workflow_start",
            workflowStartedAt.toString()
        );

    }

}


/* ---------------------------------------------------------
   PROJECT DISPLAY
   --------------------------------------------------------- */

function populateProject() {

    const projectName =
        document.getElementById("project-name");

    const projectDescription =
        document.getElementById("project-description");

    const brief =
        document.getElementById("brief");

    const audience =
        document.getElementById("audience");

    const keywords =
        document.getElementById("keywords");

    const voice =
        document.getElementById("voice");


    if (projectName) {
        projectName.textContent =
            project.name;
    }

    if (projectDescription) {
        projectDescription.textContent =
            project.description;
    }

    if (brief) {
        brief.value =
            project.brief;
    }

    if (audience) {
        audience.value =
            project.audience;
    }

    if (keywords) {
        keywords.value =
            project.keywords;
    }

    if (voice) {
        voice.value =
            project.voice;
    }

}


/* ---------------------------------------------------------
   CONTEXT
   --------------------------------------------------------- */

function saveContext() {

    project.brief =
        document.getElementById("brief").value.trim();

    project.audience =
        document.getElementById("audience").value.trim();

    project.keywords =
        document.getElementById("keywords").value.trim();

    project.voice =
        document.getElementById("voice").value.trim();


    state.contextSaves += 1;


    addEvent(
        "Persistent context updated",
        "Project context synchronized"
    );


    saveApplication();

    updateMetrics();


    const status =
        document.getElementById("save-status");

    if (status) {

        status.textContent =
            "Context synced ✓";

        status.classList.add("saved");

        setTimeout(() => {

            status.textContent =
                "Context synced";

            status.classList.remove("saved");

        }, 2000);

    }


    showToast(
        "Persistent context saved"
    );

}


/* ---------------------------------------------------------
   AUTOSAVE
   --------------------------------------------------------- */

function setupAutosave() {

    const fields = [
        "brief",
        "audience",
        "keywords",
        "voice"
    ];


    fields.forEach(id => {

        const element =
            document.getElementById(id);

        if (!element) return;


        element.addEventListener(
            "input",
            () => {

                project[id] =
                    element.value;

                localStorage.setItem(
                    "ccc_project",
                    JSON.stringify(project)
                );

            }
        );

    });

}


/* ---------------------------------------------------------
   WORKFLOW
   --------------------------------------------------------- */

function startWorkflow() {

    if (!workflowStartedAt) {

        workflowStartedAt =
            Date.now();

        localStorage.setItem(
            "ccc_workflow_start",
            workflowStartedAt.toString()
        );

        addEvent(
            "Workflow started",
            "Creative workflow initiated"
        );

    }


    setWorkflowStep(
        "step-project",
        true
    );

    setWorkflowStep(
        "step-context",
        true
    );


    document
        .getElementById("workflow-section")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });


    showToast(
        "Workflow started"
    );


    setTimeout(() => {

        document
            .getElementById("draft-section")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

    }, 700);


    saveApplication();

}


/* ---------------------------------------------------------
   GENERATE DRAFT
   --------------------------------------------------------- */

function generateDraft() {

    saveContext();


    const draft =
        createCreativeDraft();


    const output =
        document.getElementById("draft-output");


    output.innerHTML = `

        <div class="generated-draft">

            <div class="draft-tag">
                GENERATED FROM PERSISTENT CONTEXT
            </div>

            <h3>${escapeHTML(draft.title)}</h3>

            <p class="draft-hook">
                ${escapeHTML(draft.hook)}
            </p>

            <p>
                ${escapeHTML(draft.body)}
            </p>

            <div class="draft-meta">

                <div>
                    <span>Audience</span>
                    <strong>
                        ${escapeHTML(project.audience)}
                    </strong>
                </div>

                <div>
                    <span>Voice</span>
                    <strong>
                        ${escapeHTML(project.voice)}
                    </strong>
                </div>

            </div>

        </div>

    `;


    state.draftGenerated = true;
    state.draftApproved = false;
    state.published = false;


    setWorkflowStep(
        "step-draft",
        true
    );

    setWorkflowStep(
        "step-review",
        false
    );

    setWorkflowStep(
        "step-publish",
        false
    );

    setWorkflowStep(
        "step-measure",
        false
    );


    document.getElementById(
        "review-status"
    ).textContent = "Pending";


    addEvent(
        "Creative draft generated",
        "Draft created using persistent project context"
    );


    saveApplication();

    updateMetrics();

    showToast(
        "Draft generated from project context"
    );

}


/* ---------------------------------------------------------
   LOCAL DEMO GENERATOR
   --------------------------------------------------------- */

function createCreativeDraft() {

    const projectName =
        project.name || "Creative Command Center";

    const audience =
        project.audience ||
        "creative professionals";

    const keywords =
        project.keywords ||
        "creative productivity";

    const voice =
        project.voice ||
        "clear and practical";


    return {

        title:
            `${projectName}: Stop Starting From Zero`,

        hook:
            `Your creative work should remember what you already decided.`,

        body:
            `For ${audience}, creative work often means moving between briefs, documents, AI tools, design software and publishing platforms. Every switch can force you to rebuild the same context. Creative Command Center keeps the project's audience, goals, keywords and ${voice.toLowerCase()} direction connected throughout the workflow. Instead of starting from zero in every tool, creators can move from project to draft to review to publication with the same source of truth. Built around ${keywords}, the workflow is designed to make creative operations faster, more consistent and easier to measure.`

    };

}


/* ---------------------------------------------------------
   APPROVE DRAFT
   --------------------------------------------------------- */

function approveDraft() {

    if (!state.draftGenerated) {

        showToast(
            "Generate a draft before approving it"
        );

        return;

    }


    state.draftApproved = true;


    setWorkflowStep(
        "step-draft",
        true
    );

    setWorkflowStep(
        "step-review",
        true
    );


    document.getElementById(
        "review-status"
    ).textContent = "Approved ✓";


    addEvent(
        "Draft approved",
        "Human review completed"
    );


    saveApplication();

    showToast(
        "Draft approved"
    );

}


/* ---------------------------------------------------------
   PUBLISH
   --------------------------------------------------------- */

function publishProject() {

    if (!state.draftGenerated) {

        showToast(
            "Generate a draft first"
        );

        return;

    }


    if (!state.draftApproved) {

        showToast(
            "Approve the draft before publishing"
        );

        return;

    }


    state.published = true;


    setWorkflowStep(
        "step-publish",
        true
    );


    setTimeout(() => {

        setWorkflowStep(
            "step-measure",
            true
        );

    }, 300);


    addEvent(
        "Project published",
        "Creative output published successfully"
    );


    saveApplication();

    updateMetrics();


    showToast(
        "Project published successfully"
    );

}


/* ---------------------------------------------------------
   WORKFLOW STEP UI
   --------------------------------------------------------- */

function setWorkflowStep(
    stepId,
    completed
) {

    const step =
        document.getElementById(stepId);

    if (!step) return;


    if (completed) {

        step.classList.add(
            "completed"
        );

    } else {

        step.classList.remove(
            "completed"
        );

    }

}


/* ---------------------------------------------------------
   EVENTS
   --------------------------------------------------------- */

function addEvent(
    title,
    description
) {

    const event = {

        title,

        description,

        timestamp:
            Date.now()

    };


    state.events.unshift(
        event
    );


    if (state.events.length > 12) {

        state.events =
            state.events.slice(0, 12);

    }


    renderEvents();

}


function renderEvents() {

    const container =
        document.getElementById(
            "event-trace"
        );

    if (!container) return;


    if (
        !state.events ||
        state.events.length === 0
    ) {

        container.innerHTML = `

            <div class="event">

                <div class="event-dot"></div>

                <div>
                    <strong>
                        Project initialized
                    </strong>

                    <span>
                        Creative Command Center
                    </span>
                </div>

                <time>
                    Now
                </time>

            </div>

        `;

        return;

    }


    container.innerHTML =
        state.events
            .map(event => {

                return `

                    <div class="event">

                        <div class="event-dot"></div>

                        <div>

                            <strong>
                                ${escapeHTML(event.title)}
                            </strong>

                            <span>
                                ${escapeHTML(event.description)}
                            </span>

                        </div>

                        <time>
                            ${formatRelativeTime(
                                event.timestamp
                            )}
                        </time>

                    </div>

                `;

            })
            .join("");

}


/* ---------------------------------------------------------
   METRICS
   --------------------------------------------------------- */

function updateMetrics() {

    const leakage =
        calculateLeakageScore();


    const leakageElement =
        document.getElementById(
            "leakage-score"
        );

    const publishElement =
        document.getElementById(
            "publish-time"
        );

    const savesElement =
        document.getElementById(
            "context-saves"
        );


    if (leakageElement) {

        leakageElement.textContent =
            `${leakage}%`;

    }


    if (savesElement) {

        savesElement.textContent =
            state.contextSaves || 0;

    }


    if (
        publishElement &&
        workflowStartedAt &&
        state.published
    ) {

        const seconds =
            Math.max(
                1,
                Math.round(
                    (Date.now() -
                        workflowStartedAt) /
                    1000
                )
            );


        publishElement.textContent =
            formatDuration(seconds);

    }

}


/* ---------------------------------------------------------
   CONTEXT LEAKAGE
   --------------------------------------------------------- */

function calculateLeakageScore() {

    /*
        Demo metric.

        In the MVP:
        - 0% means context is preserved.
        - A small value can appear if the user creates
          a workflow without saving context.
    */


    if (
        state.draftGenerated ||
        state.published
    ) {

        return 0;

    }


    if (state.contextSaves > 0) {

        return 0;

    }


    return 12;

}


/* ---------------------------------------------------------
   TIME FORMAT
   --------------------------------------------------------- */

function formatDuration(
    seconds
) {

    if (seconds < 60) {

        return `${seconds}s`;

    }


    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;


    return `${minutes}m ${remainingSeconds}s`;

}


/* ---------------------------------------------------------
   RELATIVE TIME
   --------------------------------------------------------- */

function formatRelativeTime(
    timestamp
) {

    const difference =
        Date.now() - timestamp;


    const seconds =
        Math.floor(
            difference / 1000
        );


    if (seconds < 5) {

        return "Now";

    }


    if (seconds < 60) {

        return `${seconds}s ago`;

    }


    const minutes =
        Math.floor(seconds / 60);


    if (minutes < 60) {

        return `${minutes}m ago`;

    }


    const hours =
        Math.floor(minutes / 60);


    return `${hours}h ago`;

}


/* ---------------------------------------------------------
   NEW PROJECT
   --------------------------------------------------------- */

function createProject() {

    const modal =
        document.getElementById(
            "project-modal"
        );

    if (!modal) return;


    modal.classList.remove(
        "hidden"
    );


    setTimeout(() => {

        document
            .getElementById(
                "new-project-name"
            )
            ?.focus();

    }, 100);

}


function closeModal() {

    document
        .getElementById(
            "project-modal"
        )
        ?.classList.add(
            "hidden"
        );

}


function saveNewProject() {

    const name =
        document
            .getElementById(
                "new-project-name"
            )
            .value
            .trim();


    const description =
        document
            .getElementById(
                "new-project-description"
            )
            .value
            .trim();


    if (!name) {

        showToast(
            "Enter a project name"
        );

        return;

    }


    project = {

        name,

        description:
            description ||
            "New creative project.",

        brief:
            description ||
            "Define the project brief here.",

        audience:
            "Define the target audience.",

        keywords:
            "creative, workflow, productivity",

        voice:
            "Clear, practical, confident."

    };


    state = {

        draftGenerated: false,

        draftApproved: false,

        published: false,

        contextSaves: 0,

        events: []

    };


    workflowStartedAt =
        null;


    localStorage.removeItem(
        "ccc_workflow_start"
    );


    addEvent(
        "New project created",
        name
    );


    saveApplication();

    populateProject();

    updateMetrics();

    resetWorkflowUI();

    closeModal();


    document.getElementById(
        "new-project-name"
    ).value = "";


    document.getElementById(
        "new-project-description"
    ).value = "";


    showToast(
        "New project created"
    );

}


/* ---------------------------------------------------------
   RESET DEMO
   --------------------------------------------------------- */

function resetDemo() {

    const confirmed =
        window.confirm(
            "Reset the Creative Command Center demo?"
        );


    if (!confirmed) return;


    localStorage.removeItem(
        "ccc_project"
    );

    localStorage.removeItem(
        "ccc_state"
    );

    localStorage.removeItem(
        "ccc_workflow_start"
    );


    project =
        { ...DEFAULT_PROJECT };


    state = {

        draftGenerated: false,

        draftApproved: false,

        published: false,

        contextSaves: 0,

        events: []

    };


    workflowStartedAt =
        null;


    populateProject();

    renderEvents();

    updateMetrics();

    resetWorkflowUI();


    document.getElementById(
        "draft-output"
    ).innerHTML = `

        <div class="empty-state">

            <div class="empty-icon">
                ✦
            </div>

            <h3>
                Your creative output will appear here.
            </h3>

            <p>
                Generate a draft using the persistent
                project context.
            </p>

        </div>

    `;


    document.getElementById(
        "review-status"
    ).textContent =
        "Pending";


    saveApplication();


    showToast(
        "Demo reset"
    );

}


/* ---------------------------------------------------------
   RESET WORKFLOW UI
   --------------------------------------------------------- */

function resetWorkflowUI() {

    [
        "step-draft",
        "step-review",
        "step-publish",
        "step-measure"
    ]
        .forEach(id => {

            setWorkflowStep(
                id,
                false
            );

        });


    setWorkflowStep(
        "step-project",
        true
    );

    setWorkflowStep(
        "step-context",
        true
    );

}


/* ---------------------------------------------------------
   COPY DRAFT
   --------------------------------------------------------- */

function copyDraft() {

    const output =
        document.getElementById(
            "draft-output"
        );


    if (!output) return;


    const text =
        output.innerText.trim();


    if (!text) {

        showToast(
            "Nothing to copy yet"
        );

        return;

    }


    navigator.clipboard
        .writeText(text)
        .then(() => {

            showToast(
                "Draft copied to clipboard"
            );

        })
        .catch(() => {

            showToast(
                "Copy unavailable in this browser"
            );

        });

}


/* ---------------------------------------------------------
   SCROLL
   --------------------------------------------------------- */

function scrollToSection(
    id
) {

    document
        .getElementById(id)
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

}


/* ---------------------------------------------------------
   TOAST
   --------------------------------------------------------- */

let toastTimeout;


function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) return;


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimeout
    );


    toastTimeout =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2600);

}


/* ---------------------------------------------------------
   HTML ESCAPING
   --------------------------------------------------------- */

function escapeHTML(
    value
) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* ---------------------------------------------------------
   LIVE METRIC REFRESH
   --------------------------------------------------------- */

setInterval(() => {

    updateMetrics();

    renderEvents();

}, 1000);
