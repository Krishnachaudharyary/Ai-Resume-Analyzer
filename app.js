const skillBank = [
  "python", "java", "javascript", "typescript", "react", "node.js", "node", "express",
  "html", "css", "sql", "mysql", "postgresql", "mongodb", "aws", "azure", "gcp",
  "docker", "kubernetes", "git", "github", "linux", "machine learning", "tensorflow",
  "pytorch", "scikit-learn", "pandas", "numpy", "excel", "tableau", "power bi",
  "data analysis", "nlp", "rest api", "graphql", "django", "flask", "fastapi",
  "spring boot", "c++", "c#", "php", "laravel", "figma", "ui/ux", "agile", "jira",
  "ci/cd", "jenkins", "terraform", "microservices", "redux", "next.js"
];

const actionVerbs = [
  "developed", "built", "designed", "implemented", "deployed", "optimized", "improved",
  "created", "led", "managed", "analyzed", "automated", "integrated", "launched",
  "reduced", "increased", "delivered", "collaborated", "engineered", "tested"
];

const sectionPatterns = {
  summary: /\b(summary|profile|objective|about)\b/i,
  skills: /\b(skills|technical skills|technologies)\b/i,
  education: /\b(education|degree|university|college|bachelor|master|b\.tech|m\.tech)\b/i,
  experience: /\b(experience|employment|work history|internship|intern)\b/i,
  projects: /\b(projects|portfolio)\b/i,
  certifications: /\b(certifications|certificate|certified)\b/i
};

const state = {
  resumeText: "",
  parsed: null,
  analysis: null,
  rankFiles: []
};

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  viewTitle: document.querySelector("#viewTitle"),
  resumeFile: document.querySelector("#resumeFile"),
  resumeFileName: document.querySelector("#resumeFileName"),
  rankFiles: document.querySelector("#rankFiles"),
  rankFileName: document.querySelector("#rankFileName"),
  resumeText: document.querySelector("#resumeText"),
  jobText: document.querySelector("#jobText"),
  analyzeBtn: document.querySelector("#analyzeBtn"),
  matchBtn: document.querySelector("#matchBtn"),
  rankBtn: document.querySelector("#rankBtn"),
  mainScore: document.querySelector("#mainScore"),
  resumeScore: document.querySelector("#resumeScore"),
  atsScore: document.querySelector("#atsScore"),
  experienceLevel: document.querySelector("#experienceLevel"),
  keywordDensity: document.querySelector("#keywordDensity"),
  parsedDetails: document.querySelector("#parsedDetails"),
  strengthsList: document.querySelector("#strengthsList"),
  weaknessesList: document.querySelector("#weaknessesList"),
  atsList: document.querySelector("#atsList"),
  suggestions: document.querySelector("#suggestions"),
  matchScore: document.querySelector("#matchScore"),
  matchingSkills: document.querySelector("#matchingSkills"),
  missingSkills: document.querySelector("#missingSkills"),
  skillRecommendations: document.querySelector("#skillRecommendations"),
  rankingBody: document.querySelector("#rankingBody")
};

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
    els.views.forEach((view) => view.classList.toggle("active", view.id === target));
    els.viewTitle.textContent = tab.textContent === "Analyze" ? "Resume Analysis" : tab.textContent;
  });
});

els.resumeFile.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  els.resumeFileName.textContent = file.name;
  els.resumeText.value = "Extracting resume text...";
  try {
    const text = await extractText(file);
    els.resumeText.value = text.trim() || fallbackText(file);
  } catch (error) {
    els.resumeText.value = fallbackText(file);
  }
});

els.rankFiles.addEventListener("change", (event) => {
  state.rankFiles = [...event.target.files];
  els.rankFileName.textContent = state.rankFiles.length
    ? `${state.rankFiles.length} file(s) selected`
    : "No files selected";
});

els.analyzeBtn.addEventListener("click", () => {
  runAnalysis();
});

els.matchBtn.addEventListener("click", () => {
  if (!state.analysis) runAnalysis();
  renderMatch();
});

els.rankBtn.addEventListener("click", async () => {
  await rankCandidates();
});

function fallbackText(file) {
  return `Could not fully extract ${file.name} in this browser. Paste the resume text here and run the analyzer.`;
}

async function extractText(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "txt") return file.text();
  if (extension === "docx" && window.mammoth) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
  if (extension === "pdf") {
    return extractPdfText(file);
  }
  return file.text();
}

async function extractPdfText(file) {
  const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs";
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n");
}

function runAnalysis() {
  const text = els.resumeText.value.trim();
  state.resumeText = text;
  state.parsed = parseResume(text);
  state.analysis = analyzeResume(text, state.parsed);
  renderAnalysis();
}

function parseResume(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "Not found";
  const phone = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3,5}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4}/)?.[0] || "Not found";
  const name = guessName(lines, email);
  const skills = extractSkills(text);
  const links = [...text.matchAll(/https?:\/\/[^\s),]+|(?:github|linkedin)\.com\/[^\s),]+/gi)].map((match) => match[0]);

  return {
    name,
    email,
    phone,
    skills,
    education: sectionPatterns.education.test(text) ? "Found" : "Missing",
    experience: sectionPatterns.experience.test(text) ? "Found" : "Missing",
    certifications: sectionPatterns.certifications.test(text) ? "Found" : "Missing",
    projects: sectionPatterns.projects.test(text) ? "Found" : "Missing",
    links: links.length ? links.join(", ") : "Not found"
  };
}

function guessName(lines, email) {
  const badWords = /resume|curriculum|vitae|profile|summary|email|phone|contact/i;
  const candidate = lines.slice(0, 6).find((line) => {
    const words = line.split(/\s+/);
    return words.length >= 2 && words.length <= 4 && !badWords.test(line) && !/@|\d/.test(line);
  });
  if (candidate) return candidate;
  if (email !== "Not found") return email.split("@")[0].replace(/[._-]/g, " ");
  return "Not found";
}

function extractSkills(text) {
  const normalized = text.toLowerCase();
  return [...new Set(skillBank.filter((skill) => normalized.includes(skill.toLowerCase())))]
    .map((skill) => skill === "node" ? "Node.js" : titleCase(skill));
}

function analyzeResume(text, parsed) {
  const words = text.toLowerCase().match(/\b[a-z][a-z+#.]*\b/g) || [];
  const hasText = words.length > 20;
  const missingSections = Object.entries(sectionPatterns)
    .filter(([, pattern]) => !pattern.test(text))
    .map(([section]) => titleCase(section));
  const foundSections = Object.entries(sectionPatterns)
    .filter(([, pattern]) => pattern.test(text))
    .map(([section]) => titleCase(section));
  const actionVerbCount = actionVerbs.filter((verb) => text.toLowerCase().includes(verb)).length;
  const skillCount = parsed.skills.length;
  const keywordDensity = words.length ? Math.round((skillCount / words.length) * 1000) / 10 : 0;
  const years = [...text.matchAll(/(\d+)\+?\s*(?:years|yrs)/gi)].map((match) => Number(match[1]));
  const maxYears = years.length ? Math.max(...years) : estimateYearsFromDates(text);
  const grammarIssues = findGrammarIssues(text);
  const atsIssues = checkAts(text);

  let score = 35;
  score += Math.min(foundSections.length * 7, 36);
  score += Math.min(skillCount * 2, 14);
  score += parsed.email !== "Not found" ? 4 : -4;
  score += parsed.phone !== "Not found" ? 4 : -4;
  score += parsed.links.toLowerCase().includes("github") ? 3 : -2;
  score += actionVerbCount >= 5 ? 8 : actionVerbCount >= 2 ? 4 : -4;
  score -= missingSections.length * 3;
  score -= grammarIssues.length * 2;
  score = clamp(score, hasText ? 0 : 10, 100);

  const atsScore = clamp(100 - atsIssues.filter((issue) => issue.type === "bad").length * 9 - missingSections.length * 4, 0, 100);
  const strengths = buildStrengths(parsed, foundSections, actionVerbCount, skillCount);
  const weaknesses = buildWeaknesses(parsed, missingSections, actionVerbCount, grammarIssues);

  return {
    score,
    atsScore,
    missingSections,
    grammarIssues,
    atsIssues,
    strengths,
    weaknesses,
    keywordDensity,
    experienceLevel: maxYears >= 5 ? "Senior" : maxYears >= 2 ? "Mid-level" : "Entry-level",
    suggestions: buildSuggestions(text, parsed, missingSections, actionVerbCount)
  };
}

function estimateYearsFromDates(text) {
  const years = [...text.matchAll(/\b(20\d{2}|19\d{2})\b/g)].map((match) => Number(match[1]));
  if (years.length < 2) return 0;
  return Math.min(12, Math.max(...years) - Math.min(...years));
}

function findGrammarIssues(text) {
  const issues = [];
  if (/\bi\b/.test(text)) issues.push("Use uppercase I for first-person references.");
  if (/\s{2,}/.test(text)) issues.push("Extra spacing detected.");
  if (/\b(responsible for|worked on|helped with)\b/i.test(text)) issues.push("Replace passive phrases with specific outcomes.");
  return issues;
}

function checkAts(text) {
  const checks = [
    { label: "Readable file text", ok: text.length > 80 },
    { label: "Standard section headings", ok: sectionPatterns.skills.test(text) && sectionPatterns.experience.test(text) },
    { label: "Contact information", ok: /@/.test(text) && /\d{7,}/.test(text.replace(/\D/g, "")) },
    { label: "No table markers detected", ok: !/[|]{2,}|┌|┬|┼/.test(text) },
    { label: "No image-only warning signs", ok: text.split(/\s+/).length > 80 },
    { label: "Keyword coverage", ok: extractSkills(text).length >= 5 },
    { label: "Resume length", ok: text.split(/\s+/).length >= 180 && text.split(/\s+/).length <= 1000 }
  ];
  return checks.map((check) => ({
    text: `${check.ok ? "Pass" : "Review"}: ${check.label}`,
    type: check.ok ? "good" : "bad"
  }));
}

function buildStrengths(parsed, foundSections, actionVerbCount, skillCount) {
  const strengths = [];
  if (skillCount >= 5) strengths.push("Good technical skills coverage.");
  if (foundSections.includes("Projects")) strengths.push("Projects section included.");
  if (foundSections.includes("Summary")) strengths.push("Professional summary present.");
  if (actionVerbCount >= 3) strengths.push("Uses several action verbs.");
  if (parsed.links.toLowerCase().includes("github")) strengths.push("GitHub link included.");
  return strengths.length ? strengths : ["Resume has enough content to begin analysis."];
}

function buildWeaknesses(parsed, missingSections, actionVerbCount, grammarIssues) {
  const weaknesses = missingSections.map((section) => `Missing ${section.toLowerCase()} section.`);
  if (!parsed.links.toLowerCase().includes("github")) weaknesses.push("Missing GitHub link.");
  if (actionVerbCount < 3) weaknesses.push("Few action verbs found.");
  weaknesses.push(...grammarIssues);
  return weaknesses.length ? weaknesses : ["No major weaknesses detected."];
}

function buildSuggestions(text, parsed, missingSections, actionVerbCount) {
  const suggestions = [];
  if (/\bworked on\b/i.test(text) || actionVerbCount < 3) {
    suggestions.push({
      current: "Worked on web development.",
      suggested: "Developed and deployed a responsive web application using React and Node.js, improving page load time by 35%."
    });
  }
  if (missingSections.includes("Certifications")) {
    suggestions.push({
      current: "Certifications section is missing.",
      suggested: "Add relevant certifications such as AWS Cloud Practitioner, Docker Foundations, or role-specific credentials."
    });
  }
  if (!parsed.links.toLowerCase().includes("github")) {
    suggestions.push({
      current: "Portfolio links are incomplete.",
      suggested: "Add GitHub, LinkedIn, and portfolio links near your contact information."
    });
  }
  if (parsed.skills.length < 5) {
    suggestions.push({
      current: "Skills section has limited keywords.",
      suggested: "Group skills by category, such as Languages, Frameworks, Databases, Cloud, and Tools."
    });
  }
  return suggestions.slice(0, 4);
}

function renderAnalysis() {
  const { parsed, analysis } = state;
  els.mainScore.textContent = analysis.score;
  els.resumeScore.textContent = `${analysis.score}/100`;
  els.atsScore.textContent = `${analysis.atsScore}%`;
  els.experienceLevel.textContent = analysis.experienceLevel;
  els.keywordDensity.textContent = `${analysis.keywordDensity}%`;

  renderDetails(parsed);
  renderList(els.strengthsList, analysis.strengths);
  renderList(els.weaknessesList, analysis.weaknesses);
  renderList(els.atsList, analysis.atsIssues.map((item) => item.text));
  renderSuggestions(analysis.suggestions);
}

function renderDetails(parsed) {
  const rows = [
    ["Name", parsed.name],
    ["Email", parsed.email],
    ["Phone", parsed.phone],
    ["Skills", parsed.skills.join(", ") || "Not found"],
    ["Education", parsed.education],
    ["Experience", parsed.experience],
    ["Certifications", parsed.certifications],
    ["Projects", parsed.projects],
    ["Links", parsed.links]
  ];
  els.parsedDetails.innerHTML = rows.map(([key, value]) => `<dt>${key}</dt><dd>${escapeHtml(value)}</dd>`).join("");
}

function renderList(element, items) {
  element.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderSuggestions(items) {
  els.suggestions.innerHTML = "";
  if (!items.length) {
    els.suggestions.innerHTML = "<p>No rewrite suggestions needed yet.</p>";
    return;
  }
  const template = document.querySelector("#suggestionTemplate");
  items.forEach((item) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".current").textContent = item.current;
    node.querySelector(".suggested").textContent = item.suggested;
    els.suggestions.appendChild(node);
  });
}

function renderMatch() {
  const resumeSkills = state.parsed?.skills || extractSkills(els.resumeText.value);
  const requiredSkills = extractSkills(els.jobText.value);
  const matching = requiredSkills.filter((skill) => resumeSkills.includes(skill));
  const missing = requiredSkills.filter((skill) => !resumeSkills.includes(skill));
  const matchScore = requiredSkills.length ? Math.round((matching.length / requiredSkills.length) * 100) : 0;

  els.matchScore.textContent = `${matchScore}%`;
  renderChips(els.matchingSkills, matching);
  renderChips(els.missingSkills, missing);
  renderList(
    els.skillRecommendations,
    missing.length
      ? missing.slice(0, 6).map((skill) => `Learn ${skill} or add a project that demonstrates it.`)
      : ["No major skill gaps found for the detected job keywords."]
  );
}

function renderChips(element, items) {
  element.innerHTML = items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>None found</li>";
}

async function rankCandidates() {
  if (!state.rankFiles.length) return;
  els.rankingBody.innerHTML = `<tr><td colspan="4">Ranking candidates...</td></tr>`;
  const jobText = els.jobText.value;
  const results = [];

  for (const file of state.rankFiles) {
    let text = "";
    try {
      text = await extractText(file);
    } catch {
      text = "";
    }
    const parsed = parseResume(text || file.name);
    const analysis = analyzeResume(text || file.name, parsed);
    const required = extractSkills(jobText);
    const matching = required.filter((skill) => parsed.skills.includes(skill));
    const matchScore = required.length ? Math.round((matching.length / required.length) * 100) : analysis.score;
    results.push({
      candidate: parsed.name !== "Not found" ? parsed.name : file.name.replace(/\.[^.]+$/, ""),
      score: Math.round((analysis.score * 0.45) + (analysis.atsScore * 0.2) + (matchScore * 0.35)),
      skills: parsed.skills.slice(0, 5).join(", ") || "Not found"
    });
  }

  results.sort((a, b) => b.score - a.score);
  els.rankingBody.innerHTML = results.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.candidate)}</td>
      <td>${item.score}</td>
      <td>${escapeHtml(item.skills)}</td>
    </tr>
  `).join("");
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase()).replace("Ui/ux", "UI/UX").replace("Aws", "AWS").replace("Sql", "SQL");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.resumeText.value = `Alice Johnson
alice@example.com | +1 555 234 8910 | github.com/alice | linkedin.com/in/alice

Professional Summary
Software developer with 3 years of experience building web applications and data products.

Technical Skills
Python, SQL, React, Node.js, Git, Machine Learning, Pandas, AWS

Experience
Developed analytics dashboards for sales teams using React and SQL.
Improved data processing workflows and reduced manual reporting time by 30%.

Projects
Built a machine learning resume classifier using Python and scikit-learn.

Education
B.S. Computer Science`;

els.jobText.value = `We are hiring a software engineer with Python, SQL, React, Docker, AWS, Kubernetes, Git, and machine learning experience.`;
runAnalysis();
renderMatch();
