const express = require('express');
const cors = require('cors');
const pool = require('./src/db.cjs');

const app = express();
const PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 4000;

const COURSES = ['Python Basics', 'Web Development', 'Data Science', 'Machine Learning', 'Cybersecurity'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function computeOverallScore(quizScore, videoHours) {
  const videoScore = clamp(Number(videoHours) * 10, 0, 100);
  return Math.round(0.75 * clamp(Number(quizScore), 0, 100) + 0.25 * videoScore);
}

function inferProficiency(quizScore, videoHours) {
  const overall = computeOverallScore(quizScore, videoHours);
  if (overall >= 80) return 'Advanced';
  if (overall >= 60) return 'Intermediate';
  return 'Beginner';
}

function recommendCourse(course, proficiency, quizScore, videoHours) {
  const overall = computeOverallScore(quizScore, videoHours);

  if (proficiency === 'Beginner') {
    if (course === 'Python Basics') {
      return ['Python Basics', 'Rebuild the fundamentals with short, deliberate practice. Focus on syntax, repetition, and one concept per session.'];
    }
    return ['Python Basics', 'Reset to fundamentals first. Weak foundations get expensive later.'];
  }

  if (proficiency === 'Intermediate') {
    if (course === 'Python Basics') {
      return ['Web Development', 'You are ready to move from syntax into building. Work through HTML, CSS, and JavaScript with tiny projects.'];
    }
    if (course === 'Web Development') {
      return ['Data Science', 'Move into structured analysis next. Start reading data, cleaning it, and turning it into useful signals.'];
    }
    if (course === 'Data Science') {
      return ['Machine Learning', 'Your next edge is modeling. Start with supervised learning, evaluation, and feature engineering.'];
    }
    return ['Cybersecurity', 'Strengthen practical defense skills while you keep sharpening your technical depth.'];
  }

  if (course === 'Machine Learning') {
    return ['Cybersecurity', 'Go wider and harder: security awareness, hardening, and attack surfaces matter at this stage.'];
  }

  if (course === 'Cybersecurity') {
    return ['Machine Learning', 'You are strong enough to branch into models, evaluation, and automation.'];
  }

  if (overall >= 85) {
    return ['Machine Learning', 'You have enough control to handle advanced model work and bigger technical systems.'];
  }

  return ['Cybersecurity', 'Your execution is strong, but security thinking will make it sharper and more complete.'];
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      username VARCHAR(255) NOT NULL,
      course VARCHAR(100) NOT NULL,
      level VARCHAR(20) NOT NULL,
      video_hours DECIMAL(5,2) NOT NULL,
      quiz_score INT NOT NULL,
      overall_score INT NOT NULL,
      proficiency VARCHAR(20) NOT NULL,
      recommended_course VARCHAR(100) NOT NULL,
      study_plan TEXT NOT NULL,
      correct_count INT NOT NULL,
      total_questions INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function normalizeQuestionRow(row) {
  return {
    id: row.id,
    category: row.category,
    difficulty: row.difficulty,
    question: row.question,
    option_a: row.option_a,
    option_b: row.option_b,
    option_c: row.option_c,
    option_d: row.option_d,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/quizzes', async (req, res) => {
  try {
    const category = String(req.query.category || '').trim();
    const difficulty = String(req.query.difficulty || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 20);

    if (!COURSES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }

    if (!LEVELS.includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty.' });
    }

    const [rows] = await pool.query(
      `
      SELECT id, category, difficulty, question, option_a, option_b, option_c, option_d
      FROM quiz_questions
      WHERE category = ? AND difficulty = ?
      ORDER BY RAND()
      LIMIT ?
      `,
      [category, difficulty, limit]
    );

    res.json(rows.map(normalizeQuestionRow));
  } catch (error) {
    console.error('GET /api/quizzes failed:', error);
    res.status(500).json({ error: 'Failed to load quiz questions.' });
  }
});

app.get('/api/assessments', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const [rows] = await pool.query(
      `
      SELECT
        id, course, level, 0 AS age, 'Not provided' AS educationLevel, 'Not provided' AS learningStyle,
        video_hours AS timeSpent, quiz_score AS quizScore, overall_score AS examScore,
        proficiency, recommended_course AS recommendedCourse, study_plan AS studyPlan,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
      FROM quiz_attempts
      WHERE user_email = ?
      ORDER BY created_at ASC, id ASC
      `,
      [email]
    );

    res.json(rows);
  } catch (error) {
    console.error('GET /api/assessments failed:', error);
    res.status(500).json({ error: 'Failed to load assessments.' });
  }
});

app.post('/api/assessments/submit', async (req, res) => {
  try {
    const {
      userEmail,
      username,
      course,
      level,
      videoHours,
      answers,
    } = req.body || {};

    const safeEmail = String(userEmail || '').trim().toLowerCase();
    const safeUsername = String(username || '').trim();
    const safeCourse = String(course || '').trim();
    const safeLevel = LEVELS.includes(String(level || '').trim()) ? String(level).trim() : 'Beginner';
    const safeHours = Number(videoHours);

    if (!safeEmail || !safeUsername) {
      return res.status(400).json({ error: 'User identity is required.' });
    }
    if (!COURSES.includes(safeCourse)) {
      return res.status(400).json({ error: 'Invalid course.' });
    }
    if (!Number.isFinite(safeHours) || safeHours < 0) {
      return res.status(400).json({ error: 'Video hours must be a non-negative number.' });
    }
    if (!Array.isArray(answers) || answers.length !== 5) {
      return res.status(400).json({ error: 'Exactly 5 quiz answers are required.' });
    }

    const questionIds = answers.map((item) => Number(item.questionId)).filter(Number.isFinite);
    if (questionIds.length !== 5) {
      return res.status(400).json({ error: 'Invalid quiz answer payload.' });
    }

    const [rows] = await pool.query(
      `SELECT id, correct_option FROM quiz_questions WHERE id IN (?, ?, ?, ?, ?)`,
      questionIds
    );

    const correctById = new Map(rows.map((row) => [Number(row.id), String(row.correct_option).toUpperCase()]));
    let correctCount = 0;

    for (const item of answers) {
      const qid = Number(item.questionId);
      const selected = String(item.selectedOption || '').toUpperCase();
      if (correctById.get(qid) === selected) {
        correctCount += 1;
      }
    }

    const totalQuestions = 5;
    const quizScore = Math.round((correctCount / totalQuestions) * 100);
    const overallScore = computeOverallScore(quizScore, safeHours);
    const proficiency = inferProficiency(quizScore, safeHours);
    const [recommendedCourse, studyPlan] = recommendCourse(safeCourse, proficiency, quizScore, safeHours);

    const [insertResult] = await pool.query(
      `
      INSERT INTO quiz_attempts (
        user_email, username, course, level, video_hours, quiz_score, overall_score,
        proficiency, recommended_course, study_plan, correct_count, total_questions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        safeEmail,
        safeUsername,
        safeCourse,
        safeLevel,
        safeHours,
        quizScore,
        overallScore,
        proficiency,
        recommendedCourse,
        studyPlan,
        correctCount,
        totalQuestions,
      ]
    );

    const assessment = {
      id: String(insertResult.insertId),
      course: safeCourse,
      level: safeLevel,
      age: 0,
      educationLevel: 'Not provided',
      learningStyle: 'Not provided',
      timeSpent: safeHours,
      quizScore,
      examScore: overallScore,
      proficiency,
      recommendedCourse,
      studyPlan,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      assessment,
      correctCount,
      totalQuestions,
      quizScore,
      overallScore,
      videoScore: Math.round(clamp(safeHours * 10, 0, 100)),
    });
  } catch (error) {
    console.error('POST /api/assessments/submit failed:', error);
    res.status(500).json({ error: 'Failed to save assessment.' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

ensureTables()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server listening on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database tables:', error);
    process.exit(1);
  });
