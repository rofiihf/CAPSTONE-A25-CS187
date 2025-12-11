// src/scripts/data/dummy-roadmap.js
// Dummy data untuk pengujian roadmap frontend.

// existing course & learning path data (yang sudah kamu punya)
export const COURSES = [
  {
    id: "course-ai-001",
    title: "Belajar Dasar AI",
    level: "1",
    estimated_hours: 10,
    text: "Kelas ini memberikan pemahaman dasar tentang AI dan sub-bidangnya.",
    modules: [
      "Belajar Mempermudah Pekerjaan dengan AI",
      "Daftar Referensi",
      "Infrastruktur Data di Industri",
      "Model Maintenance",
      "Hidup Semakin Mudah dengan Bantuan Mesin",
      "Rangkuman Data untuk AI",
      "Prasyarat Kemampuan",
      "Pengenalan Deep Learning"
    ]
  },
  {
    id: "course-ml-001",
    title: "Belajar Machine Learning untuk Pemula",
    level: "2",
    estimated_hours: 90,
    text: "Pengantar Machine Learning: pipeline, algoritma dasar, dan evaluasi.",
    modules: [
      "Grid Search",
      "Membuat Tujuan, Mengejar Impian!",
      "Strategi Hyperparameter Tuning",
      "Data Collecting",
      "Random Forest",
      "Komponen Utama dalam Machine Learning",
      "SMOTE",
      "Contoh Algoritma Regresi - SVR"
    ]
  },
  {
    id: "course-dl-001",
    title: "Belajar Fundamental Deep Learning",
    level: "3",
    estimated_hours: 110,
    text: "Deep learning fundamentals: RNN, CNN, arsitektur dasar dan regulasi.",
    modules: [
      "Semakin Tahu Semakin Penasaran",
      "Akhirnya Bisa Publish!",
      "Collaborative Filtering",
      "Pengenalan TensorFlow Serving",
      "Penanganan Overfitting",
      "Text Preprocessing",
      "Arsitektur Deep Learning",
      "Algoritma RNN"
    ]
  }
];

export const LEARNING_PATHS = [
  {
    id: "lp-ai-engineer",
    type: "learning_path",
    title: "AI Engineer",
    description: "Roadmap untuk menjadi AI Engineer: dari dasar AI hingga deep learning.",
    courses: [
      { ref: "course-ai-001", title: "Belajar Dasar AI", level: "1", estimated_hours: 10, modules: COURSES[0].modules },
      { ref: "course-ml-001", title: "Belajar Machine Learning untuk Pemula", level: "2", estimated_hours: 90, modules: COURSES[1].modules },
      { ref: "course-dl-001", title: "Belajar Fundamental Deep Learning", level: "3", estimated_hours: 110, modules: COURSES[2].modules }
    ]
  },
  {
    id: "lp-frontend",
    type: "learning_path",
    title: "Front-End Web Developer",
    description: "Roadmap Front-End: JS → Framework → Advanced topics.",
    courses: [
      { ref: "course-fe-001", title: "Belajar Dasar Pemrograman JavaScript", level: "1", estimated_hours: 46, modules: ["Variable & Tipe Data", "DOM dasar", "Function", "Event"] },
      { ref: "course-fe-002", title: "Belajar Fundamental Front-End Web Development", level: "3", estimated_hours: 80, modules: ["ES6", "Web Component", "Build Tools"] },
      { ref: "course-fe-003", title: "Belajar Pengembangan Web Intermediate", level: "4", estimated_hours: 80, modules: ["Web Performance", "Caching", "Progressive Enhancement"] }
    ]
  }
];

// --------------------------------------------------
// NEW: subskills mapping yang kamu kirim (gunakan numeric mapped course IDs)
// --------------------------------------------------
// FRONTEND_SUBSKILLS (updated) - replace the previous FRONTEND_SUBSKILLS object
export const FRONTEND_SUBSKILLS = {
  job_role: "Front-End Web Developer",
  version: "v1_enhanced",
  description: "Roadmap for Front-End with course mapping (human-readable names)",
  subskills: [
    {
      id: "html_css_fundamentals_fe",
      name: "HTML & CSS Fundamentals",
      estimated_hours: 45,
      priority: 1,
      prerequisites: [],
      next_steps: ["javascript_basics_fe"],
      keywords: ["html", "css", "flexbox", "grid"],
      // mapped_courses now uses course NAMES grouped by level
      mapped_courses: {
        beginner: [
          "Belajar Dasar Pemrograman JavaScript",
          "Belajar Dasar Pemrograman Web"
        ],
        intermediate: [
          "Belajar Fundamental Front-End Web Development"
        ],
        advanced: [
          "Belajar Pengembangan Web Intermediate"
        ]
      },
      levels: {
        beginner: {
          description: "struktur HTML & CSS dasar",
          indicators: ["tags dasar", "box model"]
        },
        intermediate: {
          description: "responsive & layout",
          indicators: ["flexbox", "grid"]
        },
        advanced: {
          description: "performance & accessibility",
          indicators: ["critical css"]
        }
      }
    },
    {
      id: "javascript_basics_fe",
      name: "JavaScript Basics",
      estimated_hours: 40,
      priority: 2,
      prerequisites: ["html_css_fundamentals_fe"],
      next_steps: ["framework_foundations_fe", "web_application_fe"],
      keywords: ["javascript", "dom", "es6"],
      mapped_courses: {
        beginner: [
          "Belajar Dasar Pemrograman JavaScript",
          "Belajar Dasar Pemrograman Web"
        ],
        intermediate: [
          "Belajar Fundamental Front-End Web Development"
        ],
        advanced: [
          "Belajar Pengembangan Web Intermediate"
        ]
      },
      levels: {
        beginner: { description: "js dasar", indicators: ["variables", "loops"] },
        intermediate: { description: "es6 & dom", indicators: ["fetch", "promise"] },
        advanced: { description: "advanced js", indicators: ["closure", "memory"] }
      }
    },
    {
      id: "framework_foundations_fe",
      name: "Front-End Framework Foundations",
      estimated_hours: 80,
      priority: 3,
      prerequisites: ["javascript_basics_fe"],
      next_steps: ["web_application_fe"],
      keywords: ["react", "vue", "components", "hooks"],
      mapped_courses: {
        beginner: [
          "Belajar Fundamental Front-End Web Development",
          "Belajar Membuat Front-End Web untuk Pemula"
        ],
        intermediate: [
          "Belajar Pengembangan Web Intermediate"
        ],
        advanced: [
          "Belajar Pengembangan Web Intermediate"
        ]
      },
      levels: {
        beginner: { description: "komponen & state", indicators: ["props", "state"] },
        intermediate: { description: "lifecycle & hooks", indicators: ["useEffect"] },
        advanced: { description: "architecture & ssr", indicators: ["ssr", "code splitting"] }
      }
    },
    {
      id: "version_control_fe",
      name: "Git Basics Version Control",
      estimated_hours: 30,
      priority: 1,
      prerequisites: [],
      next_steps: ["javascript_basics_fe"],
      keywords: ["git", "github", "branch"],
      mapped_courses: {
        beginner: [
          "Belajar Dasar Pemrograman Web"
        ],
        intermediate: [
          "Belajar Membuat Front-End Web untuk Pemula"
        ],
        advanced: [
          "Belajar Pengembangan Web Intermediate"
        ]
      },
      levels: {
        beginner: { description: "git basic", indicators: ["commit", "push"] },
        intermediate: { description: "branching", indicators: ["merge conflict"] },
        advanced: { description: "workflow", indicators: ["gitflow"] }
      }
    },
    {
      id: "ui_ux_principles_fe",
      name: "Basic of UI/UX Web",
      estimated_hours: 40,
      priority: 2,
      prerequisites: ["html_css_fundamentals_fe"],
      next_steps: ["framework_foundations_fe"],
      keywords: ["ui", "ux", "accessibility"],
      mapped_courses: {
        beginner: [
          "Belajar Fundamental Front-End Web Development"
        ],
        intermediate: [
          "Belajar Membuat Front-End Web untuk Pemula"
        ],
        advanced: [
          "Belajar Pengembangan Web Intermediate"
        ]
      },
      levels: {
        beginner: { description: "prinsip UI dasar", indicators: ["layout"] },
        intermediate: { description: "usability testing", indicators: ["wireframe"] },
        advanced: { description: "a/b testing", indicators: ["analytics"] }
      }
    },
    {
      id: "web_application_fe",
      name: "Web Application Engineering",
      estimated_hours: 46,
      priority: 4,
      prerequisites: ["javascript_basics_fe"],
      next_steps: [],
      keywords: ["performance", "webpack", "testing"],
      mapped_courses: {
        beginner: [
          "Belajar Dasar Pemrograman JavaScript"
        ],
        intermediate: [
          "Belajar Fundamental Front-End Web Development",
          "Belajar Pengembangan Web Intermediate"
        ],
        advanced: [
          "Belajar Pengembangan Web Intermediate"
        ]
      },
      levels: {
        beginner: { description: "api & debugging", indicators: ["fetch api"] },
        intermediate: { description: "build tools", indicators: ["webpack", "vite"] },
        advanced: { description: "security & perf", indicators: ["csp", "bundle optimization"] }
      }
    }
  ]
};


// --------------------------------------------------
// Helper to build message compatible with bubbleRoadmap
// --------------------------------------------------
function courseIdToName(id) {
  // return string name for numeric ids (e.g. 39 -> "39")
  return String(id);
}

export function makeRoadmapMessageForLearningPath(lpId) {
  const lp = LEARNING_PATHS.find(x => x.id === lpId);
  if (!lp) return null;

  // Default roadmap = learning path object
  let roadmapObj = { ...lp };

  // Jika meminta front-end, tambahkan struktur subskills human-readable
  if (lpId === "lp-frontend") {
    roadmapObj = {
      ...lp,
      // attach the enhanced subskills structure
      subskills: FRONTEND_SUBSKILLS.subskills.map(s => {
        const mapped = s.mapped_courses || {};
        return {
          id: s.id,
          name: s.name,
          estimated_hours: s.estimated_hours,
          priority: s.priority,
          keywords: s.keywords,
          levels: s.levels,
          // mapped_courses already contains course NAMES grouped by level in your dummy
          mapped_courses: {
            beginner: (mapped.beginner || []).slice(),
            intermediate: (mapped.intermediate || []).slice(),
            advanced: (mapped.advanced || []).slice()
          }
        };
      })
    };
  }

  return {
    id: `roadmap-lp-${lpId}`,
    sender: "bot",
    type: "roadmap",
    text: lp.description || `Roadmap: ${lp.title}`,
    timestamp: new Date().toISOString(),
    roadmap: roadmapObj
  };
}


export function makeRoadmapMessageForCourse(courseId) {
  const c = COURSES.find(x => x.id === courseId);
  if (!c) return null;
  return {
    id: `roadmap-course-${courseId}`,
    sender: "bot",
    type: "roadmap",
    text: `Detail course: ${c.title}`,
    timestamp: new Date().toISOString(),
    roadmap: {
      title: c.title,
      level: c.level,
      estimated_hours: c.estimated_hours,
      modules: c.modules,
      text: c.text
    }
  };
}

export default {
  COURSES,
  LEARNING_PATHS,
  FRONTEND_SUBSKILLS
};