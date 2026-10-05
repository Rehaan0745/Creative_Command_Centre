from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
import json
import re

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "ccc.db"

app = Flask(__name__)


# ---------------------------------------------------------
# DATABASE
# ---------------------------------------------------------

def now():
    return datetime.now(timezone.utc).isoformat()


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db()

    conn.executescript("""
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brief TEXT DEFAULT '',
        audience TEXT DEFAULT '',
        keywords TEXT DEFAULT '',
        brand_voice TEXT DEFAULT '',
        constraints TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT DEFAULT '',
        content TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()


# ---------------------------------------------------------
# EVENT LOGGING
# ---------------------------------------------------------

def log_event(project_id, event_type, metadata=None):

    conn = db()

    conn.execute(
        """
        INSERT INTO events
        (project_id, event_type, metadata, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (
            project_id,
            event_type,
            json.dumps(metadata or {}),
            now()
        )
    )

    conn.commit()
    conn.close()


# ---------------------------------------------------------
# PROJECT HELPERS
# ---------------------------------------------------------

def get_project(project_id):

    conn = db()

    row = conn.execute(
        "SELECT * FROM projects WHERE id=?",
        (project_id,)
    ).fetchone()

    conn.close()

    if row:
        return dict(row)

    return None


# ---------------------------------------------------------
# LOCAL DRAFT GENERATOR
# ---------------------------------------------------------

def generate_local_draft(project):

    name = project["name"].strip()

    brief = project["brief"].strip()

    audience = (
        project["audience"].strip()
        or "the target audience"
    )

    keywords = [
        x.strip()
        for x in re.split(
            r",|\n",
            project["keywords"]
        )
        if x.strip()
    ]

    voice = (
        project["brand_voice"].strip()
        or "clear, useful and professional"
    )

    constraints = project["constraints"].strip()

    keyword_line = (
        ", ".join(keywords[:8])
        if keywords
        else "the main topic"
    )

    constraint_line = (
        constraints
        if constraints
        else
        "Keep the message concise and focused on the reader's needs."
    )

    title = f"{name}: A practical guide"

    content = f"""# {title}

## Opening

If you are trying to solve a problem around
{brief.lower() if brief else 'this topic'},
the most useful approach is to make the next
step simple, practical and measurable.

## What matters

This piece is written for {audience}.

The goal is to explain the subject without
unnecessary complexity while keeping the reader
focused on an actionable outcome.

## Key points

- Start with the user's actual problem rather
  than the tool or technology.

- Explain the value in concrete terms.

- Use examples that match the intended audience.

- Keep terminology consistent with the project
  context.

- End with a clear next step.

## Topic focus

This draft should naturally cover:

{keyword_line}

## Conclusion

A strong result comes from connecting the
problem, the solution and the next action into
one clear story.

The reader should finish knowing what to do next
and why it matters.

### Brand and project constraints

Tone: {voice}

Constraints: {constraint_line}
"""

    return title, content


# ---------------------------------------------------------
# HOME PAGE
# ---------------------------------------------------------

@app.route("/")
def index():

    return render_template("index.html")


# ---------------------------------------------------------
# GET ALL PROJECTS
# ---------------------------------------------------------

@app.route("/api/projects", methods=["GET"])
def list_projects():

    conn = db()

    rows = conn.execute(
        """
        SELECT
            p.*,

            (
                SELECT COUNT(*)
                FROM drafts d
                WHERE d.project_id = p.id
            ) AS draft_count,

            (
                SELECT COUNT(*)
                FROM events e
                WHERE e.project_id = p.id
            ) AS event_count

        FROM projects p

        ORDER BY p.updated_at DESC
        """
    ).fetchall()

    conn.close()

    return jsonify([
        dict(row)
        for row in rows
    ])


# ---------------------------------------------------------
# CREATE PROJECT
# ---------------------------------------------------------

@app.route("/api/projects", methods=["POST"])
def create_project():

    data = request.get_json(force=True)

    name = (
        data.get("name") or ""
    ).strip()

    if not name:

        return jsonify({
            "error": "Project name is required"
        }), 400

    timestamp = now()

    conn = db()

    cursor = conn.execute(
        """
        INSERT INTO projects
        (
            name,
            brief,
            audience,
            keywords,
            brand_voice,
            constraints,
            created_at,
            updated_at
        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            name,
            data.get("brief", ""),
            data.get("audience", ""),
            data.get("keywords", ""),
            data.get("brand_voice", ""),
            data.get("constraints", ""),
            timestamp,
            timestamp
        )
    )

    project_id = cursor.lastrowid

    conn.commit()
    conn.close()

    log_event(
        project_id,
        "project_created"
    )

    return jsonify({
        "id": project_id,
        "message": "Project created"
    }), 201


# ---------------------------------------------------------
# GET PROJECT DETAILS
# ---------------------------------------------------------

@app.route(
    "/api/projects/<int:project_id>",
    methods=["GET"]
)
def project_detail(project_id):

    project = get_project(project_id)

    if not project:

        return jsonify({
            "error": "Project not found"
        }), 404

    conn = db()

    drafts = conn.execute(
        """
        SELECT *
        FROM drafts

        WHERE project_id=?

        ORDER BY created_at DESC
        """,
        (project_id,)
    ).fetchall()

    events = conn.execute(
        """
        SELECT *
        FROM events

        WHERE project_id=?

        ORDER BY created_at DESC
        """,
        (project_id,)
    ).fetchall()

    conn.close()

    drafts = [
        dict(row)
        for row in drafts
    ]

    events = [
        dict(row)
        for row in events
    ]

    for event in events:

        try:

            event["metadata"] = json.loads(
                event["metadata"]
            )

        except Exception:

            pass

    return jsonify({
        "project": project,
        "drafts": drafts,
        "events": events
    })


# ---------------------------------------------------------
# UPDATE PROJECT CONTEXT
# ---------------------------------------------------------

@app.route(
    "/api/projects/<int:project_id>",
    methods=["PUT"]
)
def update_project(project_id):

    if not get_project(project_id):

        return jsonify({
            "error": "Project not found"
        }), 404

    data = request.get_json(force=True)

    name = (
        data.get("name") or ""
    ).strip()

    if not name:

        return jsonify({
            "error": "Project name is required"
        }), 400

    conn = db()

    conn.execute(
        """
        UPDATE projects

        SET
            name=?,
            brief=?,
            audience=?,
            keywords=?,
            brand_voice=?,
            constraints=?,
            updated_at=?

        WHERE id=?
        """,
        (
            name,
            data.get("brief", ""),
            data.get("audience", ""),
            data.get("keywords", ""),
            data.get("brand_voice", ""),
            data.get("constraints", ""),
            now(),
            project_id
        )
    )

    conn.commit()
    conn.close()

    log_event(
        project_id,
        "context_updated"
    )

    return jsonify({
        "message": "Context saved"
    })


# ---------------------------------------------------------
# GENERATE DRAFT
# ---------------------------------------------------------

@app.route(
    "/api/projects/<int:project_id>/generate",
    methods=["POST"]
)
def generate(project_id):

    project = get_project(project_id)

    if not project:

        return jsonify({
            "error": "Project not found"
        }), 404

    title, content = generate_local_draft(
        project
    )

    timestamp = now()

    conn = db()

    cursor = conn.execute(
        """
        INSERT INTO drafts
        (
            project_id,
            title,
            content,
            created_at
        )

        VALUES (?, ?, ?, ?)
        """,
        (
            project_id,
            title,
            content,
            timestamp
        )
    )

    draft_id = cursor.lastrowid

    conn.execute(
        """
        UPDATE projects

        SET updated_at=?

        WHERE id=?
        """,
        (
            timestamp,
            project_id
        )
    )

    conn.commit()
    conn.close()

    log_event(
        project_id,
        "draft_generated",
        {
            "draft_id": draft_id,
            "generator": "local_v1"
        }
    )

    return jsonify({
        "id": draft_id,
        "title": title,
        "content": content
    })


# ---------------------------------------------------------
# LOG WORKFLOW EVENT
# ---------------------------------------------------------

@app.route(
    "/api/projects/<int:project_id>/event",
    methods=["POST"]
)
def event(project_id):

    if not get_project(project_id):

        return jsonify({
            "error": "Project not found"
        }), 404

    data = request.get_json(force=True)

    event_type = (
        data.get("event_type") or ""
    ).strip()

    if not event_type:

        return jsonify({
            "error": "event_type is required"
        }), 400

    log_event(
        project_id,
        event_type,
        data.get("metadata", {})
    )

    return jsonify({
        "message": "Event logged"
    })


# ---------------------------------------------------------
# METRICS
# ---------------------------------------------------------

@app.route(
    "/api/projects/<int:project_id>/metrics",
    methods=["GET"]
)
def metrics(project_id):

    if not get_project(project_id):

        return jsonify({
            "error": "Project not found"
        }), 404

    conn = db()

    events = conn.execute(
        """
        SELECT
            event_type,
            created_at

        FROM events

        WHERE project_id=?

        ORDER BY created_at ASC
        """,
        (project_id,)
    ).fetchall()

    conn.close()

    event_types = [
        event["event_type"]
        for event in events
    ]

    # Context Leakage Score
    context_reentry = sum(
        1
        for event in event_types
        if event in (
            "manual_context_reentry",
            "manual_brief_reentry",
            "manual_brand_reentry"
        )
    )

    def first_time(event_type):

        for event in events:

            if event["event_type"] == event_type:

                try:

                    return datetime.fromisoformat(
                        event["created_at"]
                    )

                except Exception:

                    return None

        return None

    started = first_time(
        "workflow_started"
    )

    published = first_time(
        "published"
    )

    elapsed_seconds = None

    if started and published:

        elapsed_seconds = max(
            0,
            int(
                (
                    published - started
                ).total_seconds()
            )
        )

    return jsonify({

        "context_leakage_score":
            context_reentry,

        "time_to_publish_seconds":
            elapsed_seconds,

        "event_count":
            len(events),

        "workflow_started":
            bool(started),

        "published":
            bool(published)
    })


# ---------------------------------------------------------
# INITIALIZE DATABASE
# ---------------------------------------------------------

init_db()


# ---------------------------------------------------------
# RUN SERVER
# ---------------------------------------------------------

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )
