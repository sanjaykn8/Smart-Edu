from __future__ import annotations

import mimetypes
import os
import sqlite3
import traceback
import uuid
from collections import Counter
from datetime import datetime
from http import HTTPStatus
from http.cookies import SimpleCookie
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import parse_qs

import pandas as pd
from jinja2 import Environment, FileSystemLoader, select_autoescape
from wsgiref.simple_server import make_server

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
DATA_PATH = BASE_DIR / "Learning_Data.csv"
DB_PATH = BASE_DIR / "database.db"

COURSES = ["Python Basics", "Web Development", "Data Science", "Machine Learning", "Cybersecurity"]
LEVELS = ["Beginner", "Intermediate", "Advanced"]
EDUCATION_LEVELS = ["High School", "Undergraduate", "Postgraduate"]
LEARNING_STYLES = ["Visual", "Auditory", "Kinesthetic", "Reading/Writing"]

SESSION_COOKIE = "sid"
SESSIONS: Dict[str, Dict[str, Any]] = {}
CURRENT_SESSION: Dict[str, Any] = {}

jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def load_dataset() -> pd.DataFrame:
    if DATA_PATH.exists():
        df = pd.read_csv(DATA_PATH)
        df = df.copy()
        for col in ["Age", "Time_Spent_on_Videos", "Quiz_Scores", "Final_Exam_Score", "Feedback_Score"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        return df
    return pd.DataFrame()


DATASET = load_dataset()


def compute_course_insights(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
    if df.empty or "Course_Name" not in df.columns:
        return {
            course: {"count": 0, "avg_quiz": 0, "avg_exam": 0, "avg_time": 0, "avg_efficiency": 0, "top_proficiency": "N/A"}
            for course in COURSES
        }

    work = df.copy()
    time_series = work["Time_Spent_on_Videos"].fillna(0)
    max_time = float(time_series.max() or 1)
    work["Efficiency_Score"] = (
        0.4 * work["Final_Exam_Score"].fillna(0)
        + 0.4 * work["Quiz_Scores"].fillna(0)
        + 0.2 * (time_series / max_time) * 100
    )

    prof = pd.Series(dtype=object)
    if "Proficiency_Level" in work.columns:
        prof = work.groupby("Course_Name")["Proficiency_Level"].agg(lambda s: Counter(s.astype(str)).most_common(1)[0][0])

    grouped = work.groupby("Course_Name").agg(
        count=("Course_Name", "size"),
        avg_quiz=("Quiz_Scores", "mean"),
        avg_exam=("Final_Exam_Score", "mean"),
        avg_time=("Time_Spent_on_Videos", "mean"),
        avg_efficiency=("Efficiency_Score", "mean"),
    )

    insights: Dict[str, Dict[str, Any]] = {}
    for course in COURSES:
        if course in grouped.index:
            row = grouped.loc[course]
            insights[course] = {
                "count": int(row["count"]),
                "avg_quiz": round(float(row["avg_quiz"]), 1),
                "avg_exam": round(float(row["avg_exam"]), 1),
                "avg_time": round(float(row["avg_time"]), 1),
                "avg_efficiency": round(float(row["avg_efficiency"]), 1),
                "top_proficiency": str(prof.get(course, "N/A")).title(),
            }
        else:
            insights[course] = {"count": 0, "avg_quiz": 0, "avg_exam": 0, "avg_time": 0, "avg_efficiency": 0, "top_proficiency": "N/A"}
    return insights


COURSE_INSIGHTS = compute_course_insights(DATASET)


def connect_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_schema() -> None:
    conn = connect_db()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            course TEXT NOT NULL,
            level TEXT NOT NULL,
            age INTEGER,
            education_level TEXT,
            learning_style TEXT,
            time_spent REAL,
            quiz_score INTEGER,
            exam_score INTEGER,
            proficiency TEXT,
            recommended_course TEXT,
            study_plan TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    for table, column, col_type in [
        ("users", "created_at", "TEXT"),
        ("users", "password_hash", "TEXT"),
        ("user_progress", "education_level", "TEXT"),
        ("user_progress", "learning_style", "TEXT"),
        ("user_progress", "recommended_course", "TEXT"),
        ("user_progress", "study_plan", "TEXT"),
        ("user_progress", "created_at", "TEXT"),
    ]:
        cur.execute(f"PRAGMA table_info({table})")
        columns = {row[1] for row in cur.fetchall()}
        if column not in columns:
            try:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
            except sqlite3.OperationalError:
                pass

    conn.commit()
    conn.close()


ensure_schema()


def current_timestamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def normalize_level(level: str) -> str:
    if not level:
        return "Beginner"
    level = level.strip().lower()
    if level.startswith("adv"):
        return "Advanced"
    if level.startswith("int"):
        return "Intermediate"
    return "Beginner"


def infer_proficiency(quiz_score: int, exam_score: int, time_spent: float) -> str:
    time_factor = clamp(time_spent / 5.0, 0, 20)
    total = 0.45 * clamp(exam_score, 0, 100) + 0.40 * clamp(quiz_score, 0, 100) + 0.15 * time_factor
    if total >= 78:
        return "Advanced"
    if total >= 52:
        return "Intermediate"
    return "Beginner"


def recommend_course(course: str, proficiency: str, quiz_score: int, exam_score: int, time_spent: float) -> Tuple[str, str]:
    course = course or "Python Basics"
    quiz_score = int(clamp(quiz_score, 0, 100))
    exam_score = int(clamp(exam_score, 0, 100))

    if proficiency == "Beginner":
        next_course = "Python Basics" if course != "Python Basics" else "Web Development"
        plan = "Start with short practice loops, core syntax, and one concept per session."
    elif proficiency == "Intermediate":
        next_course = "Data Science" if exam_score >= quiz_score else "Web Development"
        if course == "Data Science":
            next_course = "Machine Learning"
        plan = "Push into project work: build, review mistakes, and repeat with tighter feedback."
    else:
        next_course = "Machine Learning" if exam_score >= 80 else "Cybersecurity"
        if course == "Machine Learning":
            next_course = "Cybersecurity" if quiz_score < 85 else "Machine Learning"
        plan = "Work on capstone-level problems and stop studying passively. Build in public."

    if time_spent < 2:
        plan += " Your study time is too thin; the result will stay shallow unless that changes."
    elif time_spent > 8:
        plan += " Good volume, but structure matters more than raw hours."

    return next_course, plan


def get_or_create_session(environ) -> Tuple[str, Dict[str, Any], bool]:
    cookie = SimpleCookie(environ.get("HTTP_COOKIE", ""))
    sid = cookie.get(SESSION_COOKIE)
    if sid and sid.value in SESSIONS:
        return sid.value, SESSIONS[sid.value], False
    new_sid = uuid.uuid4().hex
    SESSIONS[new_sid] = {"messages": []}
    return new_sid, SESSIONS[new_sid], True


def flash(session_data: Dict[str, Any], category: str, message: str) -> None:
    session_data.setdefault("messages", []).append((category, message))


def get_flashed_messages(session_data: Dict[str, Any], with_categories: bool = False):
    messages = session_data.pop("messages", [])
    if with_categories:
        return messages
    return [message for _, message in messages]


def url_for(name: str, **kwargs) -> str:
    mapping = {
        "home": "/",
        "login": "/login",
        "register": "/register",
        "logout": "/logout",
        "select_course": "/select-course",
        "assessment": "/assessment",
        "dashboard": "/dashboard",
        "static": "/static/",
    }
    if name == "static":
        filename = kwargs.get("filename", "")
        return "/static/" + filename.lstrip("/")
    return mapping.get(name, "/")


def render_template(template_name: str, **context: Any) -> str:
    base_context = {
        "theme_courses": COURSES,
        "theme_levels": LEVELS,
        "course_insights": COURSE_INSIGHTS,
        "education_levels": EDUCATION_LEVELS,
        "learning_styles": LEARNING_STYLES,
        "year": datetime.now().year,
        "url_for": url_for,
        "session": CURRENT_SESSION,
        "get_flashed_messages": lambda with_categories=False: get_flashed_messages(CURRENT_SESSION, with_categories=with_categories),
    }
    base_context.update(context)
    template = jinja_env.get_template(template_name)
    return template.render(**base_context)


def parse_form(environ) -> Dict[str, str]:
    try:
        length = int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError:
        length = 0
    raw = environ["wsgi.input"].read(length).decode("utf-8") if length else ""
    parsed = parse_qs(raw)
    return {k: v[0] if v else "" for k, v in parsed.items()}


def redirect(location: str, sid: str, new_session: bool) -> Tuple[str, List[Tuple[str, str]], bytes]:
    headers = [("Location", location), ("Content-Type", "text/html; charset=utf-8")]
    if new_session:
        headers.append(("Set-Cookie", f"{SESSION_COOKIE}={sid}; HttpOnly; Path=/; SameSite=Lax"))
    return "302 Found", headers, b""


def html_response(body: str, sid: str, new_session: bool, status: str = "200 OK") -> Tuple[str, List[Tuple[str, str]], bytes]:
    headers = [("Content-Type", "text/html; charset=utf-8")]
    if new_session:
        headers.append(("Set-Cookie", f"{SESSION_COOKIE}={sid}; HttpOnly; Path=/; SameSite=Lax"))
    return status, headers, body.encode("utf-8")


def serve_static(path: str, sid: str, new_session: bool) -> Tuple[str, List[Tuple[str, str]], bytes]:
    file_path = (STATIC_DIR / path[len("/static/"):]).resolve()
    if not str(file_path).startswith(str(STATIC_DIR.resolve())) or not file_path.exists() or not file_path.is_file():
        return html_response("Not found", sid, new_session, "404 Not Found")
    content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    headers = [("Content-Type", content_type)]
    if new_session:
        headers.append(("Set-Cookie", f"{SESSION_COOKIE}={sid}; HttpOnly; Path=/; SameSite=Lax"))
    return "200 OK", headers, file_path.read_bytes()


def handle_home(session_data: Dict[str, Any]) -> str:
    if session_data.get("user_email"):
        return "redirect:/dashboard"
    return render_template("index.html")


def handle_register(session_data: Dict[str, Any], method: str, form: Dict[str, str]) -> str:
    if session_data.get("user_email"):
        return "redirect:/dashboard"
    if method == "POST":
        username = form.get("username", "").strip()
        email = form.get("email", "").strip().lower()
        password = form.get("password", "")
        if not username or not email or not password:
            flash(session_data, "danger", "All fields are required.")
        else:
            conn = connect_db()
            try:
                conn.execute(
                    "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                    (username, email, generate_password_hash(password), current_timestamp()),
                )
                conn.commit()
                flash(session_data, "success", "Account created. Log in now.")
                return "redirect:/login"
            except sqlite3.IntegrityError:
                flash(session_data, "danger", "That email is already registered.")
            finally:
                conn.close()
    return render_template("register.html")


def generate_password_hash(password: str) -> str:
    # Lightweight salted hash using stdlib only.
    import hashlib
    salt = os.environ.get("PASSWORD_SALT", "smart-education-salt")
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


def check_password_hash(stored_hash: str, password: str) -> bool:
    return stored_hash == generate_password_hash(password)


def handle_login(session_data: Dict[str, Any], method: str, form: Dict[str, str]) -> str:
    if session_data.get("user_email"):
        return "redirect:/dashboard"
    if method == "POST":
        email = form.get("email", "").strip().lower()
        password = form.get("password", "")
        conn = connect_db()
        try:
            user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        finally:
            conn.close()
        if user and check_password_hash(user["password_hash"], password):
            session_data.clear()
            session_data["messages"] = []
            session_data["user_email"] = user["email"]
            session_data["username"] = user["username"]
            flash(session_data, "success", f"Welcome back, {user['username']}.")
            return "redirect:/dashboard"
        flash(session_data, "danger", "Invalid email or password.")
    return render_template("login.html")


def handle_logout(session_data: Dict[str, Any]) -> str:
    session_data.clear()
    session_data["messages"] = []
    flash(session_data, "info", "Logged out.")
    return "redirect:/"


def handle_select_course(session_data: Dict[str, Any], method: str, form: Dict[str, str]) -> str:
    if not session_data.get("user_email"):
        return "redirect:/login"
    if method == "POST":
        course = form.get("course", "").strip()
        level = normalize_level(form.get("level", ""))
        if course not in COURSES:
            flash(session_data, "danger", "Pick a valid course.")
        else:
            session_data["current_course"] = course
            session_data["current_level"] = level
            return "redirect:/assessment"
    return render_template("select_course.html", username=session_data.get("username"), selected_course=session_data.get("current_course"))


def handle_assessment(session_data: Dict[str, Any], method: str, form: Dict[str, str]) -> str:
    if not session_data.get("user_email"):
        return "redirect:/login"
    if not session_data.get("current_course"):
        return "redirect:/select-course"

    if method == "POST":
        try:
            age = int(form.get("age", 0))
            education_level = form.get("education_level", EDUCATION_LEVELS[0])
            learning_style = form.get("learning_style", LEARNING_STYLES[0])
            time_spent = float(form.get("time_spent", 0))
            quiz_score = int(form.get("quiz_score", 0))
            exam_score = int(form.get("exam_score", 0))

            if age < 10 or age > 100:
                raise ValueError("Age must be between 10 and 100.")
            if time_spent < 0:
                raise ValueError("Time spent cannot be negative.")
            if not 0 <= quiz_score <= 100 or not 0 <= exam_score <= 100:
                raise ValueError("Scores must be between 0 and 100.")

            proficiency = infer_proficiency(quiz_score, exam_score, time_spent)
            recommended_course, study_plan = recommend_course(
                session_data["current_course"], proficiency, quiz_score, exam_score, time_spent
            )

            conn = connect_db()
            conn.execute(
                """
                INSERT INTO user_progress (
                    user_email, course, level, age, education_level, learning_style,
                    time_spent, quiz_score, exam_score, proficiency,
                    recommended_course, study_plan, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_data["user_email"],
                    session_data["current_course"],
                    session_data.get("current_level", "Beginner"),
                    age,
                    education_level,
                    learning_style,
                    time_spent,
                    quiz_score,
                    exam_score,
                    proficiency,
                    recommended_course,
                    study_plan,
                    current_timestamp(),
                ),
            )
            conn.commit()
            conn.close()

            session_data["last_result"] = {
                "proficiency": proficiency,
                "recommended_course": recommended_course,
                "study_plan": study_plan,
                "quiz_score": quiz_score,
                "exam_score": exam_score,
            }
            flash(session_data, "success", f"Assessment saved. Proficiency: {proficiency}.")
            return "redirect:/dashboard"
        except ValueError as exc:
            flash(session_data, "danger", str(exc))
        except Exception as exc:  # noqa: BLE001
            flash(session_data, "danger", f"Could not save assessment: {exc}")
    return render_template("assessment.html", username=session_data.get("username"), course=session_data.get("current_course"), level=session_data.get("current_level"))


def handle_dashboard(session_data: Dict[str, Any]) -> str:
    if not session_data.get("user_email"):
        return "redirect:/login"

    conn = connect_db()
    try:
        rows = conn.execute(
            """
            SELECT course, level, age, education_level, learning_style, time_spent,
                   quiz_score, exam_score, proficiency, recommended_course, study_plan, created_at
            FROM user_progress
            WHERE user_email = ?
            ORDER BY datetime(created_at) DESC, id DESC
            """,
            (session_data["user_email"],),
        ).fetchall()
    finally:
        conn.close()

    latest = rows[0] if rows else None
    attempts = len(rows)
    avg_quiz = round(sum(r["quiz_score"] for r in rows) / attempts, 1) if rows else 0
    avg_exam = round(sum(r["exam_score"] for r in rows) / attempts, 1) if rows else 0
    avg_time = round(sum(float(r["time_spent"] or 0) for r in rows) / attempts, 1) if rows else 0
    prof_counts = Counter(r["proficiency"] for r in rows)
    dominant = prof_counts.most_common(1)[0][0] if prof_counts else "N/A"
    latest_result = session_data.pop("last_result", None)

    return render_template(
        "dashboard.html",
        username=session_data.get("username"),
        latest=latest,
        progress=rows,
        attempts=attempts,
        avg_quiz=avg_quiz,
        avg_exam=avg_exam,
        avg_time=avg_time,
        dominant=dominant,
        latest_result=latest_result,
    )


ROUTES = {
    "/": ("home", {"GET"}),
    "/register": ("register", {"GET", "POST"}),
    "/login": ("login", {"GET", "POST"}),
    "/logout": ("logout", {"GET"}),
    "/select-course": ("select_course", {"GET", "POST"}),
    "/assessment": ("assessment", {"GET", "POST"}),
    "/dashboard": ("dashboard", {"GET"}),
}


def application(environ, start_response):
    global CURRENT_SESSION
    sid, session_data, new_session = get_or_create_session(environ)
    CURRENT_SESSION = session_data
    path = environ.get("PATH_INFO", "/")
    method = environ.get("REQUEST_METHOD", "GET").upper()

    try:
        if path.startswith("/static/"):
            status, headers, body = serve_static(path, sid, new_session)
        else:
            form = parse_form(environ) if method == "POST" else {}
            if path not in ROUTES:
                status, headers, body = html_response("<h1>404 Not Found</h1>", sid, new_session, "404 Not Found")
                start_response(status, headers)
                return [body]

            route_name, allowed_methods = ROUTES[path]
            if method not in allowed_methods:
                status, headers, body = html_response("Method not allowed", sid, new_session, "405 Method Not Allowed")
                start_response(status, headers)
                return [body]

            if route_name == "home":
                result = handle_home(session_data)
            elif route_name == "register":
                result = handle_register(session_data, method, form)
            elif route_name == "login":
                result = handle_login(session_data, method, form)
            elif route_name == "logout":
                result = handle_logout(session_data)
            elif route_name == "select_course":
                result = handle_select_course(session_data, method, form)
            elif route_name == "assessment":
                result = handle_assessment(session_data, method, form)
            elif route_name == "dashboard":
                result = handle_dashboard(session_data)
            else:
                result = ""

            if isinstance(result, str) and result.startswith("redirect:"):
                location = result.split(":", 1)[1]
                status, headers, body = redirect(location, sid, new_session)
            else:
                status, headers, body = html_response(result, sid, new_session)

        start_response(status, headers)
        return [body]
    except Exception:
        error = "<h1>500 Server Error</h1><pre>" + traceback.format_exc() + "</pre>"
        status, headers, body = html_response(error, sid, new_session, "500 Internal Server Error")
        start_response(status, headers)
        return [body]


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3155"))
    print(f"Serving on http://127.0.0.1:{port}")
    with make_server("0.0.0.0", port, application) as httpd:
        httpd.serve_forever()
