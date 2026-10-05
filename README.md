# Creative Command Center

## A Unified Content Workflow Orchestrator

Creative Command Center (CCC) is an MVP designed to test one core hypothesis:

> Persistent project context can reduce repeated context entry and improve the workflow of creative professionals working across multiple tools.

CCC is not intended to replace existing creative tools.

Instead, it acts as a persistent context and workflow layer between them.

---

## MVP Goal

The first version focuses on proving the value of persistent context.

The workflow is:

1. Create a project.
2. Enter project context once.
3. Save the context.
4. Start a workflow.
5. Generate a draft using the stored context.
6. Review the draft.
7. Publish the draft.
8. Measure workflow events and context leakage.

---

## Core Context Object

Each project stores:

- Project name
- Project brief
- Target audience
- Keywords
- Brand voice
- Constraints

This information remains attached to the project and can be reused throughout the workflow.

---

## Current Technology Stack

### Frontend

- HTML
- CSS
- JavaScript

### Backend

- Python
- Flask

### Database

- SQLite

### AI

The initial MVP uses a local deterministic draft generator.

A real LLM API can be integrated later.

---

## Project Structure

```text
Creative_Command_Centre/
│
├── app.py
├── requirements.txt
├── requirements-dev.txt
├── .gitignore
├── README.md
│
├── templates/
│   └── index.html
│
└── static/
    ├── styles.css
    └── app.js
