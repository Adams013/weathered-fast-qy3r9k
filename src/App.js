// src/App.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Search,
  MapPin,
  Clock,
  Users,
  Star,
  Heart,
  Filter,
  X,
  ChevronRight,
  Bell,
  Zap,
  Briefcase,
  Award,
  Upload,
  Edit3,
  Eye,
  Share2,
  Settings,
  LogOut,
} from "lucide-react";

/**
 * SwissStartup Connect - Single File App (Refactored + Bug fixes)
 *
 * Notes:
 * - Keeps the same structure/UX as your original code but fixed:
 *   - repeated expensive checks (extracted helpers)
 *   - controlled inputs on profile
 *   - real file input (local mock upload)
 *   - dynamic company job counts
 *   - graceful fallback/mocks if API unreachable
 * - The `API_BASE` and endpoints mirror your original app. Calls will attempt fetch;
 *   on network/API failure we return mock data so UI remains functional.
 */

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://your-api-domain.com"
    : "http://localhost:5000";

////////////////////////////////////////////////////////////////////////////////
// Simple API client with graceful fallback to mock data
////////////////////////////////////////////////////////////////////////////////
const apiClient = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    };
    const cfg = {
      ...options,
      headers,
    };

    try {
      const resp = await fetch(`${API_BASE}/api${endpoint}`, cfg);
      const text = await resp.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (err) {
        data = text;
      }
      if (!resp.ok) {
        const err =
          data?.error || data?.message || resp.statusText || "API Error";
        throw new Error(err);
      }
      return data;
    } catch (err) {
      // When API fails, throw to let caller decide. Some callers will handle fallback.
      throw err;
    }
  },

  // Auth
  async login(email, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  // Jobs
  async getJobs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/jobs${qs ? `?${qs}` : ""}`);
  },

  async getJob(id) {
    return this.request(`/jobs/${id}`);
  },

  // Applications
  async applyToJob(jobId, coverLetter = "") {
    return this.request("/applications", {
      method: "POST",
      body: JSON.stringify({ jobId, coverLetter }),
    });
  },

  async getMyApplications() {
    return this.request("/applications/my");
  },

  // Saved jobs
  async saveJob(jobId) {
    return this.request("/saved-jobs", {
      method: "POST",
      body: JSON.stringify({ jobId }),
    });
  },

  async unsaveJob(jobId) {
    return this.request(`/saved-jobs/${jobId}`, {
      method: "DELETE",
    });
  },

  async getSavedJobs() {
    return this.request("/saved-jobs");
  },

  // Companies
  async getCompanies() {
    return this.request("/companies");
  },

  // Profile
  async updateProfile(profileData) {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  // Resume upload (file) - expects FormData
  async uploadResume(formData) {
    const token = localStorage.getItem("token");
    const resp = await fetch(`${API_BASE}/api/users/upload-resume`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!resp.ok) throw new Error("Upload failed");
    return resp.json();
  },
};

////////////////////////////////////////////////////////////////////////////////
// Local mock/fallback data and helpers (used when api unreachable)
////////////////////////////////////////////////////////////////////////////////
const MOCK_JOBS = [
  {
    id: "job-1",
    title: "Frontend Engineer",
    company: "TechFlow AG",
    location: "Zurich",
    type: "Full-time",
    stage: "Seed",
    tags: ["React", "TypeScript"],
    description:
      "Build beautiful interactive UI components. Be part of a small team shipping fast.",
    salary: "CHF 95k-110k",
    equity: "0.2%",
    applicants: 5,
    logo: "ðŸš€",
    postedDays: 3,
    funding: "CHF 2M",
    benefits: ["Equity package", "Flexible hours", "Learning budget"],
    requirements: ["React experience", "TypeScript", "Startup mentality"],
    idSlug: "frontend-engineer-techflow",
  },
  {
    id: "job-2",
    title: "Product Designer",
    company: "Designly",
    location: "Remote",
    type: "Part-time",
    stage: "Series A",
    tags: ["Figma", "UX"],
    description:
      "Design delightful product experiences and collaborate with PMs & engineers.",
    salary: "CHF 60k-80k",
    equity: "0.05%",
    applicants: 12,
    logo: "ðŸŽ¨",
    postedDays: 7,
    funding: "CHF 5M",
    benefits: ["Remote first", "Equipment budget"],
    requirements: ["Portfolio", "Figma expertise"],
  },
  {
    id: "job-3",
    title: "Machine Learning Intern",
    company: "AiSwiss",
    location: "Lausanne",
    type: "Internship",
    stage: "Pre-seed",
    tags: ["AI/ML", "Python"],
    description:
      "Work on ML models to accelerate product features in healthcare domain.",
    salary: "CHF 2k/month",
    equity: "0.01%",
    applicants: 2,
    logo: "ðŸ¤–",
    postedDays: 1,
    funding: "CHF 300k",
    benefits: ["Mentorship", "Stipend"],
    requirements: ["Python", "Statistics"],
  },
];

const MOCK_COMPANIES = [
  {
    id: "c-1",
    name: "TechFlow AG",
    logo: "ðŸš€",
    employees: 18,
    funding: "CHF 2M",
    stage: "Seed",
  },
  {
    id: "c-2",
    name: "Designly",
    logo: "ðŸŽ¨",
    employees: 12,
    funding: "CHF 5M",
    stage: "Series A",
  },
  {
    id: "c-3",
    name: "AiSwiss",
    logo: "ðŸ¤–",
    employees: 6,
    funding: "CHF 300k",
    stage: "Pre-seed",
  },
];

////////////////////////////////////////////////////////////////////////////////
// Utilities & small components (kept local for easy reading)
////////////////////////////////////////////////////////////////////////////////
const prettyDateDiffDays = (timestamp) =>
  Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24)
  );

function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

////////////////////////////////////////////////////////////////////////////////
// Main App
////////////////////////////////////////////////////////////////////////////////
export default function App() {
  // UI state
  const [activeTab, setActiveTab] = useState("jobs");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounced(searchTerm, 300);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // auth & user
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // data
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]); // array of jobIds
  const [applications, setApplications] = useState([]); // { id, jobId, status, appliedAt }
  const [notifications, setNotifications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);

  // UI modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // forms
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    type: "student",
  });

  // profile local editing state
  const [profileEdit, setProfileEdit] = useState({
    name: "",
    email: "",
    university: "",
    major: "",
    skillsInput: "",
    skills: [],
  });

  // file upload local state (mock)
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploadMessage, setResumeUploadMessage] = useState("");

  // Filters metadata
  const filtersMeta = [
    {
      category: "Location",
      options: ["Zurich", "Geneva", "Basel", "Lausanne", "Remote"],
    },
    {
      category: "Type",
      options: ["Full-time", "Part-time", "Internship", "Freelance"],
    },
    {
      category: "Skills",
      options: ["React", "Python", "AI/ML", "Figma", "TypeScript"],
    },
    {
      category: "Stage",
      options: ["Pre-seed", "Seed", "Series A", "Series B"],
    },
  ];

  // Derived helpers (memoized)
  const hasApplied = (jobId) => applications.some((a) => a.jobId === jobId);
  const isSaved = (jobId) => savedJobs.includes(jobId);

  // Filtered jobs according to search + selectedFilters
  const filteredJobs = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch =
        !term ||
        job.title?.toLowerCase().includes(term) ||
        job.company?.toLowerCase().includes(term) ||
        job.tags?.some((t) => t.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      if (selectedFilters.length === 0) return true;

      return selectedFilters.every((f) => {
        return (
          job.location === f ||
          job.type === f ||
          (job.tags || []).includes(f) ||
          job.stage === f
        );
      });
    });
  }, [jobs, debouncedSearch, selectedFilters]);

  // load initial data (tries API, falls back to mock)
  useEffect(() => {
    loadFromStorageAuth();
    loadJobs();
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // set profileEdit from user
    if (user) {
      setProfileEdit((p) => ({
        ...p,
        name: user.name || "",
        email: user.email || "",
        university: user.profile?.university || "",
        major: user.profile?.major || "",
        skills: user.profile?.skills || [],
      }));
    }
  }, [user]);

  async function loadFromStorageAuth() {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    if (token && userRaw) {
      try {
        const parsed = JSON.parse(userRaw);
        setIsLoggedIn(true);
        setUser(parsed);
        // try to load user-specific things
        await loadUserData(); // no await needed but helpful
      } catch (err) {
        console.warn("Bad user in localStorage", err);
      }
    }
  }

  async function loadJobs() {
    setLoading(true);
    try {
      const data = await apiClient.getJobs({ search: debouncedSearch });
      // Expecting array; if not, fallback
      if (Array.isArray(data) && data.length > 0) {
        setJobs(data);
      } else {
        // fallback: mock
        setJobs(MOCK_JOBS);
      }
    } catch (err) {
      // fallback to mock
      setJobs(MOCK_JOBS);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const data = await apiClient.getCompanies();
      if (Array.isArray(data) && data.length > 0) {
        setCompanies(data);
      } else {
        setCompanies(MOCK_COMPANIES);
      }
    } catch (err) {
      setCompanies(MOCK_COMPANIES);
    }
  }

  async function loadUserData() {
    // Loads saved jobs & applications. If API fails, keep local/mock values.
    try {
      setLoading(true);
      const [savedJobsData, appsData] = await Promise.all([
        apiClient.getSavedJobs().catch(() => null),
        apiClient.getMyApplications().catch(() => null),
      ]);

      if (Array.isArray(savedJobsData)) {
        setSavedJobs(savedJobsData.map((s) => s.jobId));
      } else {
        // fallback to stored savedJobs in localStorage
        const sLocal = JSON.parse(localStorage.getItem("savedJobs") || "[]");
        setSavedJobs(sLocal);
      }

      if (Array.isArray(appsData)) {
        setApplications(appsData);
      } else {
        const aLocal = JSON.parse(localStorage.getItem("applications") || "[]");
        setApplications(aLocal);
      }

      // notifications: a simple mock set
      setNotifications((prev) =>
        prev.length === 0
          ? [
              {
                id: 1,
                message:
                  "New job matching your skills: Frontend Engineer at TechFlow AG",
                time: "2 hours ago",
                read: false,
              },
              {
                id: 2,
                message: "Your application for Product Designer was viewed",
                time: "1 day ago",
                read: false,
              },
            ]
          : prev
      );
    } finally {
      setLoading(false);
    }
  }

  // Auth handlers (these attempt API; if fail, do local mock)
  async function handleLogin(e) {
    e?.preventDefault?.();
    setLoading(true);
    try {
      // try API
      let resp;
      try {
        resp = await apiClient.login(loginForm.email, loginForm.password);
      } catch (err) {
        // fallback: demo accounts
        if (
          loginForm.email === "student@example.com" &&
          loginForm.password === "password123"
        ) {
          resp = {
            token: "demo-student-token",
            user: {
              name: "Student Demo",
              email: "student@example.com",
              type: "student",
              profile: {
                university: "ETH Zurich",
                major: "Computer Science",
                skills: ["React", "Python"],
              },
            },
          };
        } else if (
          loginForm.email === "startup@example.com" &&
          loginForm.password === "password123"
        ) {
          resp = {
            token: "demo-startup-token",
            user: {
              name: "Startup Demo",
              email: "startup@example.com",
              type: "startup",
              profile: {},
            },
          };
        } else {
          throw err;
        }
      }

      localStorage.setItem("token", resp.token);
      localStorage.setItem("user", JSON.stringify(resp.user));
      setIsLoggedIn(true);
      setUser(resp.user);
      setShowLoginModal(false);
      setLoginForm({ email: "", password: "" });
      await loadUserData();
      setActiveTab("jobs");
    } catch (err) {
      alert("Login failed: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e?.preventDefault?.();
    setLoading(true);
    try {
      // try API register
      let resp;
      try {
        resp = await apiClient.register(registerForm);
      } catch (err) {
        // fallback: create demo user locally
        const fakeUser = {
          name: registerForm.name || "New User",
          email: registerForm.email,
          type: registerForm.type || "student",
          profile: {},
        };
        resp = { token: "demo-new-token", user: fakeUser };
      }

      localStorage.setItem("token", resp.token);
      localStorage.setItem("user", JSON.stringify(resp.user));
      setIsLoggedIn(true);
      setUser(resp.user);
      setShowLoginModal(false);
      setRegisterForm({ name: "", email: "", password: "", type: "student" });
      await loadUserData();
    } catch (err) {
      alert("Registration failed: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
    setSavedJobs([]);
    setApplications([]);
    setNotifications([]);
    setActiveTab("jobs");
  }

  // Application
  async function handleApply(jobId) {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    if (hasApplied(jobId)) {
      return;
    }

    try {
      setLoading(true);
      // try API
      try {
        await apiClient.applyToJob(jobId);
        // When API success we'll reload from server; but here we just push local entry
      } catch (err) {
        // fallback: local mock
        const newApp = {
          id: `app-${Date.now()}`,
          jobId,
          status: "pending",
          appliedAt: new Date().toISOString(),
        };
        const next = [...applications, newApp];
        setApplications(next);
        localStorage.setItem("applications", JSON.stringify(next));
      }
      await loadUserData();
      alert("Application submitted successfully!");
    } catch (err) {
      alert("Failed to submit application: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  // Save / Unsave
  async function toggleSavedJob(jobId) {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    try {
      setLoading(true);
      if (isSaved(jobId)) {
        try {
          await apiClient.unsaveJob(jobId);
        } catch (err) {
          // fallback to local removal
          const removed = savedJobs.filter((id) => id !== jobId);
          setSavedJobs(removed);
          localStorage.setItem("savedJobs", JSON.stringify(removed));
          return;
        }
        const removed = savedJobs.filter((id) => id !== jobId);
        setSavedJobs(removed);
        localStorage.setItem("savedJobs", JSON.stringify(removed));
      } else {
        try {
          await apiClient.saveJob(jobId);
        } catch (err) {
          // fallback local add
          const next = [...savedJobs, jobId];
          setSavedJobs(next);
          localStorage.setItem("savedJobs", JSON.stringify(next));
          return;
        }
        const next = [...savedJobs, jobId];
        setSavedJobs(next);
        localStorage.setItem("savedJobs", JSON.stringify(next));
      }
    } catch (err) {
      alert("Failed to update saved jobs: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  // Profile update (attempt API, fallback to localStorage)
  async function handleProfileSave() {
    if (!user) return;
    const profilePayload = {
      name: profileEdit.name,
      profile: {
        university: profileEdit.university,
        major: profileEdit.major,
        skills: profileEdit.skills,
      },
    };
    try {
      setLoading(true);
      try {
        const updated = await apiClient.updateProfile(profilePayload);
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
      } catch (err) {
        // fallback: update local user
        const nextUser = {
          ...user,
          name: profileEdit.name,
          email: profileEdit.email,
          profile: profilePayload.profile,
        };
        setUser(nextUser);
        localStorage.setItem("user", JSON.stringify(nextUser));
      }
      alert("Profile saved");
    } catch (err) {
      alert("Failed to save profile: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  // Resume upload via hidden file input and FormData
  async function handleResumeFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    // Attempt to upload via API; fallback to local mock (store filename)
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("resume", file);
      try {
        await apiClient.uploadResume(formData);
        setResumeUploadMessage("Resume uploaded successfully (server).");
      } catch (err) {
        // fallback local: simulate upload success & store file name in user object
        const nextUser = {
          ...(user || {}),
          resume: { filename: file.name, uploadedAt: new Date().toISOString() },
        };
        setUser(nextUser);
        localStorage.setItem("user", JSON.stringify(nextUser));
        setResumeUploadMessage("Resume stored locally (mock).");
      }
    } catch (err) {
      setResumeUploadMessage("Upload failed: " + (err.message || ""));
    } finally {
      setLoading(false);
      setTimeout(() => setResumeUploadMessage(""), 4000);
    }
  }

  // Filter helpers
  const addFilter = (f) => {
    if (!selectedFilters.includes(f))
      setSelectedFilters([...selectedFilters, f]);
  };
  const removeFilter = (f) =>
    setSelectedFilters(selectedFilters.filter((x) => x !== f));
  const clearFilters = () => {
    setSelectedFilters([]);
    setSearchTerm("");
    loadJobs();
  };

  // Mark notification read
  const markNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // company job counts dynamic
  const companyJobCounts = useMemo(() => {
    const counts = {};
    for (const j of jobs) {
      counts[j.company] = (counts[j.company] || 0) + 1;
    }
    return counts;
  }, [jobs]);

  // UI bits for Login/Register forms (kept here)
  const LoginModal = ({ open }) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {isRegistering ? "Join SwissStartup Connect" : "Welcome Back"}
            </h2>
            <button
              onClick={() => setShowLoginModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  required
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I am a
                </label>
                <select
                  value={registerForm.type}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, type: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="student">Student/Graduate</option>
                  <option value="startup">Startup Recruiter</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="text-blue-600"
                >
                  Sign In
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  placeholder="student@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  placeholder="password123"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                <strong>Demo Accounts:</strong>
                <br />
                Student: student@example.com / password123
                <br />
                Startup: startup@example.com / password123
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="text-blue-600"
                >
                  Join Now
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  };

  // JobCard (compact)
  const JobCard = ({ job }) => {
    return (
      <div
        key={job.id}
        className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer"
        onClick={() => setSelectedJob(job)}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex space-x-4 flex-1">
              <div className="text-3xl">{job.logo || "ðŸš€"}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                    {job.title}
                  </h3>
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                    {job.stage || "Seed"}
                  </span>
                </div>
                <p className="text-lg text-gray-600 mb-2">{job.company}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Briefcase className="w-4 h-4" />
                    <span>{job.type}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{job.postedDays || 2}d ago</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(job.tags || ["React", "TypeScript"]).map((tag) => (
                    <span
                      key={tag}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-gray-600 line-clamp-2">{job.description}</p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSavedJob(job.id);
              }}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${
                  isSaved(job.id) ? "fill-red-500 text-red-500" : ""
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-4 text-sm">
              <span className="font-medium text-green-600">{job.salary}</span>
              <span className="text-purple-600">
                + {job.equity || "0.1%"} equity
              </span>
              <span className="text-gray-500">
                {job.applicants || 0} applicants
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApply(job.id);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  hasApplied(job.id)
                    ? "bg-green-100 text-green-700 cursor-not-allowed"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
                disabled={hasApplied(job.id)}
              >
                {hasApplied(job.id) ? "Applied" : "Quick Apply"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedJob(job);
                }}
                className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Job detail modal component
  const JobDetailModal = ({ job, onClose }) => {
    if (!job) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex space-x-4">
                <div className="text-4xl">{job.logo || "ðŸš€"}</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {job.title}
                  </h2>
                  <p className="text-lg text-gray-600">{job.company}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{job.applicants || 0} applicants</span>
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">About the Role</h3>
                <p className="text-gray-600">{job.description}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                <ul className="space-y-2">
                  {(
                    job.requirements || [
                      "React experience",
                      "TypeScript",
                      "Startup mentality",
                    ]
                  ).map((req, idx) => (
                    <li
                      key={idx}
                      className="flex items-center space-x-2 text-gray-600"
                    >
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">What We Offer</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    job.benefits || [
                      "Equity package",
                      "Flexible hours",
                      "Learning budget",
                      "Free lunch",
                    ]
                  ).map((b, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 text-gray-600"
                    >
                      <Award className="w-4 h-4 text-green-500" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-green-600">
                      {job.salary}
                    </div>
                    <div className="text-purple-600">
                      + {job.equity || "0.1%"} equity
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Funding</div>
                    <div className="font-medium">{job.funding || "CHF 5M"}</div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleApply(job.id)}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                    hasApplied(job.id)
                      ? "bg-green-100 text-green-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
                  }`}
                  disabled={hasApplied(job.id)}
                >
                  {hasApplied(job.id) ? "Application Submitted" : "Apply Now"}
                </button>
                <button
                  onClick={() => toggleSavedJob(job.id)}
                  className={`px-6 py-3 rounded-lg border transition-all ${
                    isSaved(job.id)
                      ? "bg-red-50 border-red-200 text-red-600"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isSaved(job.id) ? "fill-current" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Simple header component
  const Header = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <a href="#" className="text-2xl font-bold text-blue-600">
            SwissStartup Connect
          </a>

          <div className="hidden lg:flex items-center space-x-8">
            <button
              onClick={() => setActiveTab("jobs")}
              className={`text-gray-600 hover:text-blue-600 transition ${
                activeTab === "jobs" ? "text-blue-600 font-medium" : ""
              }`}
            >
              Jobs
            </button>
            <button
              onClick={() => setActiveTab("companies")}
              className={`text-gray-600 hover:text-blue-600 transition ${
                activeTab === "companies" ? "text-blue-600 font-medium" : ""
              }`}
            >
              Companies
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`text-gray-600 hover:text-blue-600 transition ${
                activeTab === "saved" ? "text-blue-600 font-medium" : ""
              }`}
            >
              Saved
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`text-gray-600 hover:text-blue-600 transition ${
                activeTab === "applications" ? "text-blue-600 font-medium" : ""
              }`}
            >
              Applications
            </button>
          </div>

          <div className="hidden lg:flex items-center space-x-4">
            {isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab("profile")}
                  className="text-gray-600 hover:text-blue-600 flex items-center space-x-2"
                >
                  <span>{user?.name}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 px-3 py-2 rounded-lg"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="text-gray-600 hover:text-blue-600"
                >
                  Log In
                </button>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden flex flex-col items-center py-4 space-y-4 bg-white border-t">
            <button
              onClick={() => {
                setActiveTab("jobs");
                setMobileMenuOpen(false);
              }}
              className="text-gray-600 hover:text-blue-600 transition"
            >
              Jobs
            </button>
            <button
              onClick={() => {
                setActiveTab("companies");
                setMobileMenuOpen(false);
              }}
              className="text-gray-600 hover:text-blue-600 transition"
            >
              Companies
            </button>
            <button
              onClick={() => {
                setActiveTab("saved");
                setMobileMenuOpen(false);
              }}
              className="text-gray-600 hover:text-blue-600 transition"
            >
              Saved
            </button>
            <button
              onClick={() => {
                setActiveTab("applications");
                setMobileMenuOpen(false);
              }}
              className="text-gray-600 hover:text-blue-600 transition"
            >
              Applications
            </button>
            {isLoggedIn ? (
              <div className="flex flex-col items-center space-y-4 w-full px-6">
                <button
                  onClick={() => {
                    setActiveTab("profile");
                    setMobileMenuOpen(false);
                  }}
                  className="text-gray-600 hover:text-blue-600 w-full text-center py-2 rounded-full border"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white w-full text-center px-5 py-2 rounded-full hover:bg-red-700 transition"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 w-full px-6">
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="text-gray-600 hover:text-blue-600 w-full text-center py-2 rounded-full border"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setMobileMenuOpen(false);
                  }}
                  className="bg-blue-600 text-white w-full text-center px-5 py-2 rounded-full hover:bg-blue-700 transition"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        )}
      </header>
    );
  };

  // Companies list (grid)
  const CompaniesGrid = () => {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Featured Startups
          </h2>
          <p className="text-gray-600">
            Discover Swiss startups that are changing the world
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company.id || company.name}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 p-6"
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">{company.logo}</div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {company.name}
                </h3>
                <p className="text-gray-500 text-sm">
                  {company.employees} employees
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Stage</span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                    {company.stage}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Funding</span>
                  <span className="font-medium text-green-600">
                    {company.funding}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Open roles</span>
                  <span className="font-medium">
                    {companyJobCounts[company.name] || 0}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => {
                    setActiveTab("jobs");
                    setSearchTerm(company.name);
                  }}
                  className="w-full bg-blue-50 text-blue-600 py-2 rounded-lg"
                >
                  View Jobs ({companyJobCounts[company.name] || 0})
                </button>
                <button className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50">
                  Follow Company
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Saved jobs view
  const SavedJobsView = () => {
    const savedList = jobs.filter((j) => savedJobs.includes(j.id));
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Your Saved Jobs
        </h2>
        {savedList.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              No saved jobs yet. Start exploring!
            </p>
            <button
              onClick={() => setActiveTab("jobs")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {savedList.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex space-x-3">
                    <div className="text-2xl">{job.logo || "ðŸš€"}</div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {job.title}
                      </h3>
                      <p className="text-gray-600">{job.company}</p>
                      <p className="text-sm text-gray-500">{job.location}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSavedJob(job.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Heart className="w-5 h-5 fill-current" />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-600 font-medium">
                    {job.salary}
                  </span>
                  <button
                    onClick={() => handleApply(job.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Applications view
  const ApplicationsView = () => {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            My Applications
          </h2>
          <p className="text-gray-600">
            Track your job applications and their status
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No applications yet</p>
            <button
              onClick={() => setActiveTab("jobs")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => {
              const job = jobs.find((j) => j.id === app.jobId);
              if (!job) return null;
              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex space-x-4 flex-1">
                      <div className="text-3xl">{job.logo || "ðŸš€"}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-800">
                            {job.title}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              app.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : app.status === "reviewed"
                                ? "bg-blue-100 text-blue-700"
                                : app.status === "accepted"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {app.status.charAt(0).toUpperCase() +
                              app.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-lg text-gray-600 mb-2">
                          {job.company}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              Applied{" "}
                              {prettyDateDiffDays(app.appliedAt || Date.now())}d
                              ago
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Job</span>
                      </button>
                      <button className="text-gray-500 hover:text-gray-700">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Profile view (with controlled inputs) - student fields editable
  const ProfileView = () => {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Profile Settings
          </h2>
          <p className="text-gray-600">
            Manage your profile information and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">
                Personal Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileEdit.name}
                    onChange={(e) =>
                      setProfileEdit({ ...profileEdit, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileEdit.email}
                    onChange={(e) =>
                      setProfileEdit({ ...profileEdit, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {user?.type === "student" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        University
                      </label>
                      <input
                        type="text"
                        value={profileEdit.university}
                        onChange={(e) =>
                          setProfileEdit({
                            ...profileEdit,
                            university: e.target.value,
                          })
                        }
                        placeholder="ETH Zurich"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Major
                      </label>
                      <input
                        type="text"
                        value={profileEdit.major}
                        onChange={(e) =>
                          setProfileEdit({
                            ...profileEdit,
                            major: e.target.value,
                          })
                        }
                        placeholder="Computer Science"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Skills
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(profileEdit.skills || []).map((s) => (
                          <span
                            key={s}
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                          >
                            {s}
                            <button
                              onClick={() =>
                                setProfileEdit({
                                  ...profileEdit,
                                  skills: profileEdit.skills.filter(
                                    (x) => x !== s
                                  ),
                                })
                              }
                              className="text-blue-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a skill..."
                          value={profileEdit.skillsInput}
                          onChange={(e) =>
                            setProfileEdit({
                              ...profileEdit,
                              skillsInput: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          onClick={() => {
                            if (!profileEdit.skillsInput) return;
                            const next = Array.from(
                              new Set([
                                ...(profileEdit.skills || []),
                                profileEdit.skillsInput,
                              ])
                            );
                            setProfileEdit({
                              ...profileEdit,
                              skills: next,
                              skillsInput: "",
                            });
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6">
                <button
                  onClick={handleProfileSave}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>

            {user?.type === "student" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold mb-4">Resume / CV</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Upload your resume or CV</p>
                  <p className="text-sm text-gray-500 mb-4">
                    PDF, DOC, or DOCX up to 5MB
                  </p>
                  <input
                    id="resume-input"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() =>
                      document.getElementById("resume-input").click()
                    }
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg"
                  >
                    Choose File
                  </button>
                </div>
                {resumeUploadMessage && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center justify-between">
                    <span className="text-green-700">
                      âœ“ {resumeUploadMessage}
                    </span>
                    <button className="text-blue-600">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {user?.resume && (
                  <div className="mt-4 text-sm text-gray-600">
                    Current: {user.resume.filename} (uploaded{" "}
                    {new Date(user.resume.uploadedAt).toLocaleDateString()})
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Profile Views</span>
                  <span className="font-medium">24</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Applications</span>
                  <span className="font-medium">{applications.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Saved Jobs</span>
                  <span className="font-medium">{savedJobs.length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">Job Preferences</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Location
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option>Zurich</option>
                    <option>Remote</option>
                    <option>Lausanne</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Top hero area + search
  const Hero = () => {
    return (
      <section className="bg-white">
        <div className="container mx-auto px-6 py-20 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-gray-900">
            Where Ambition Meets Opportunity
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            The #1 platform connecting Switzerland's brightest students with
            innovative startups. Your next big career move is just a click away.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            <div className="max-w-2xl mx-auto relative">
              <div className="flex bg-white rounded-full shadow-lg overflow-hidden">
                <div className="flex-1 flex items-center">
                  <Search className="w-5 h-5 text-gray-400 ml-4" />
                  <input
                    type="text"
                    placeholder="Search jobs, companies, or skills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-4 text-gray-800 border-0 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-gray-100 px-6 py-4 text-gray-600 hover:bg-gray-200 flex items-center space-x-2"
                >
                  <Filter className="w-5 h-5" />
                  <span>Filters</span>
                  {selectedFilters.length > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {selectedFilters.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={loadJobs}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-white font-medium"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // Filters panel
  const FiltersPanel = () => {
    if (!showFilters) return null;
    return (
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {selectedFilters.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {selectedFilters.map((filter) => (
                  <span
                    key={filter}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center space-x-1"
                  >
                    <span>{filter}</span>
                    <button
                      onClick={() => removeFilter(filter)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {filtersMeta.map((group) => (
              <div key={group.category}>
                <h4 className="font-medium text-gray-700 mb-2">
                  {group.category}
                </h4>
                <div className="space-y-1">
                  {group.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => addFilter(opt)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <Hero />
      <FiltersPanel />
      <LoginModal open={showLoginModal} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === "jobs" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {filteredJobs.length} Jobs Found
                </h2>
                <select className="bg-white border border-gray-300 rounded-lg px-4 py-2">
                  <option>Most Recent</option>
                  <option>Highest Salary</option>
                  <option>Most Equity</option>
                </select>
              </div>

              <div className="space-y-6">
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
                {filteredJobs.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">
                      No jobs found matching your criteria
                    </p>
                    <button
                      onClick={clearFilters}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span>Featured Companies</span>
                </h3>
                <div className="space-y-4">
                  {companies.slice(0, 3).map((company) => (
                    <div
                      key={company.id || company.name}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="text-2xl">{company.logo}</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {company.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {company.employees} employees
                        </div>
                        <div className="text-sm text-green-600">
                          {company.funding} raised
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {companyJobCounts[company.name] || 0} jobs
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  <span>Startup Career Tips</span>
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-white/50 rounded-lg">
                    <div className="font-medium text-purple-700">
                      Equity Matters
                    </div>
                    <div className="text-gray-600">
                      Ask about equity packages - they can be worth more than
                      salary!
                    </div>
                  </div>
                  <div className="p-3 bg-white/50 rounded-lg">
                    <div className="font-medium text-purple-700">
                      Growth Opportunity
                    </div>
                    <div className="text-gray-600">
                      Startups offer rapid career advancement and diverse
                      experience.
                    </div>
                  </div>
                  <div className="p-3 bg-white/50 rounded-lg">
                    <div className="font-medium text-purple-700">
                      Learn Fast
                    </div>
                    <div className="text-gray-600">
                      Direct exposure to all aspects of business operations.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job detail modal */}
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />

        {/* Companies */}
        {activeTab === "companies" && <CompaniesGrid />}

        {/* Saved */}
        {activeTab === "saved" && <SavedJobsView />}

        {/* Applications */}
        {activeTab === "applications" && isLoggedIn && <ApplicationsView />}

        {/* Profile */}
        {activeTab === "profile" && isLoggedIn && <ProfileView />}

        {/* Prompt if not logged in and user tries to access sensitive tabs */}
        {(activeTab === "applications" || activeTab === "profile") &&
          !isLoggedIn && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                Please sign in to access this section
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg"
              >
                Sign In
              </button>
            </div>
          )}
      </main>
    </div>
  );
}
