
import { useEffect, useState } from "react";
import "./App.css";
import AIStudio from "./AIStudio";

const API_BASE_URL = "http://127.0.0.1:8000";

type Workflow = {
  icon: string;
  title: string;
  description: string;
  tag: string;
};

const defaultWorkflows: Workflow[] = [
  {
    icon: "🎙️",
    title: "Podcast to Shorts",
    description:
      "Find interesting moments in long videos and turn them into Shorts.",
    tag: "VIDEO CLIPPING",
  },
  {
    icon: "✨",
    title: "AI Video Generator",
    description:
      "Create faceless videos using AI scripts, narration and visuals.",
    tag: "TEXT TO VIDEO",
  },
  {
    icon: "📚",
    title: "Educational Videos",
    description:
      "Create educational, facts and storytelling videos automatically.",
    tag: "AI STORYTELLING",
  },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [apiStatus, setApiStatus] = useState("Connecting...");
  const [apiWorkflows, setApiWorkflows] = useState<string[]>([]);

  const navigation = [
    { name: "Dashboard", icon: "⌂" },
    { name: "AI Studio", icon: "✧" },
    { name: "Clip Extractor", icon: "▤" },
    { name: "Content Library", icon: "▣" },
    { name: "YouTube Manager", icon: "▶" },
    { name: "Scheduler", icon: "◷" },
    { name: "Analytics", icon: "▥" },
  ];

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const healthResponse = await fetch(
          `${API_BASE_URL}/api/health`
        );

        if (!healthResponse.ok) {
          throw new Error("Backend health check failed");
        }

        const healthData = await healthResponse.json();

        console.log("Backend health:", healthData);

        setApiStatus("Connected");

        const workflowResponse = await fetch(
          `${API_BASE_URL}/api/workflows`
        );

        if (workflowResponse.ok) {
          const workflowData = await workflowResponse.json();

          console.log("Workflows received:", workflowData);

          setApiWorkflows(workflowData.workflows || []);
        }
      } catch (error) {
        console.error("Backend connection error:", error);
        setApiStatus("Offline");
      }
    };

    checkBackend();
  }, []);

  const visibleWorkflows = defaultWorkflows.filter((workflow) => {
    return (
      apiWorkflows.length === 0 ||
      apiWorkflows.includes(workflow.title)
    );
  });

  const handleWorkflow = (workflow: string) => {
    setSelectedWorkflow(workflow);
    setActivePage("AI Studio");
  };

  return (
    <div className="app-layout">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">C</div>

          <div>
            <h2>
              ClipForge<span> AI</span>
            </h2>
            <small>VIDEO AUTOMATION</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav>
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              }`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">

          <div className="plan-card">
            <span>✦ YOUR WORKSPACE</span>
            <h3>Free development</h3>
            <p>Your AI video studio is being built.</p>
          </div>

          <div className="profile">
            <div className="avatar">CF</div>

            <div>
              <strong>ClipForge User</strong>
              <small>Creator account</small>
            </div>

            <span className="profile-menu">•••</span>
          </div>

        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">

        {/* TOPBAR */}

        <header className="topbar">

          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">

            <span className="system-status">
              <span
                className={`status-dot ${
                  apiStatus === "Connected" ? "" : "offline"
                }`}
              ></span>

              {apiStatus === "Connected"
                ? "System ready"
                : apiStatus}
            </span>

            <button className="notification">♧</button>

            <div className="top-avatar">CF</div>

          </div>
        </header>

        {/* PAGE CONTENT */}

        <div className="page-content">

          {activePage === "AI Studio" ? (

            <AIStudio />

          ) : (

            <>

              {/* WELCOME SECTION */}

              <section className="welcome-section">

                <div>
                  <span className="eyebrow">
                    YOUR AI VIDEO WORKSPACE
                  </span>

                  <h1>
                    Turn ideas into <span>viral clips.</span>
                  </h1>

                  <p>
                    Create, edit and publish engaging videos
                    with the power of AI.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => {
                    setSelectedWorkflow("AI Video Generator");
                    setActivePage("AI Studio");
                  }}
                >
                  + Create New Video
                </button>

              </section>

              {/* STATISTICS */}

              <section className="stats-grid">

                <div className="stat-card">
                  <div className="stat-heading">
                    <span>Videos Created</span>
                    <span className="stat-icon purple">▣</span>
                  </div>

                  <h2>0</h2>
                  <small>Start creating your first video</small>
                </div>

                <div className="stat-card">
                  <div className="stat-heading">
                    <span>Total Clips</span>
                    <span className="stat-icon blue">▤</span>
                  </div>

                  <h2>0</h2>
                  <small>AI-generated clips will appear here</small>
                </div>

                <div className="stat-card">
                  <div className="stat-heading">
                    <span>YouTube Uploads</span>
                    <span className="stat-icon red">▶</span>
                  </div>

                  <h2>0</h2>
                  <small>Connect your YouTube channel later</small>
                </div>

                <div className="stat-card">
                  <div className="stat-heading">
                    <span>Processing Time</span>
                    <span className="stat-icon green">◷</span>
                  </div>

                  <h2>
                    0 <small>min</small>
                  </h2>

                  <small>Video processing statistics</small>
                </div>

              </section>

              {/* AI WORKFLOWS */}

              <section className="section">

                <div className="section-heading">

                  <div>
                    <h2>Create with AI</h2>
                    <p>
                      Choose how you want to create your next video.
                    </p>
                  </div>

                  <span className="view-label">
                    {visibleWorkflows.length} WORKFLOWS
                  </span>

                </div>

                <div className="workflow-grid">

                  {visibleWorkflows.map((workflow) => (

                    <div
                      className="workflow-card"
                      key={workflow.title}
                    >

                      <div className="workflow-top">

                        <span className="workflow-icon">
                          {workflow.icon}
                        </span>

                        <span className="workflow-tag">
                          {workflow.tag}
                        </span>

                      </div>

                      <h3>{workflow.title}</h3>

                      <p>{workflow.description}</p>

                      <button
                        className="workflow-button"
                        onClick={() =>
                          handleWorkflow(workflow.title)
                        }
                      >
                        Start creating <span>→</span>
                      </button>

                    </div>

                  ))}

                </div>

              </section>

              {/* SELECTED WORKFLOW */}

              {selectedWorkflow && (

                <div className="selection-banner">

                  <div>
                    <strong>{selectedWorkflow}</strong>

                    <p>
                      Workflow selected. AI generation
                      will be connected in a later phase.
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedWorkflow("")}
                  >
                    Dismiss
                  </button>

                </div>

              )}

              {/* BOTTOM SECTION */}

              <section className="bottom-grid">

                {/* RECENT PROJECTS */}

                <div className="section panel">

                  <div className="section-heading">

                    <div>
                      <h2>Recent Projects</h2>
                      <p>Your latest video projects.</p>
                    </div>

                    <span className="view-label">
                      VIEW ALL →
                    </span>

                  </div>

                  <div className="empty-state">

                    <div className="empty-icon">▧</div>

                    <h3>No projects yet</h3>

                    <p>
                      Your generated videos will appear here.
                    </p>

                  </div>

                </div>

                {/* YOUTUBE CONNECTION */}

                <div className="section panel youtube-panel">

                  <div className="section-heading">

                    <div>
                      <h2>YouTube Connection</h2>
                      <p>Manage your publishing channel.</p>
                    </div>

                    <span className="youtube-icon">▶</span>

                  </div>

                  <div className="connection-status">
                    <span className="status-dot offline"></span>
                    Not connected
                  </div>

                  <p className="connection-description">
                    Connect your YouTube channel to enable
                    automated video publishing.
                  </p>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      setActivePage("YouTube Manager")
                    }
                  >
                    Configure YouTube →
                  </button>

                </div>

              </section>

              {/* FOOTER */}

              <footer>
                <span>ClipForge AI © 2026</span>
                <span>Built for creators, powered by AI.</span>
              </footer>

            </>

          )}

        </div>

      </main>

    </div>
  );
}

export default App;
