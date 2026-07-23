/** A single step in the product tour. `target` is a `data-tour` value that
 *  anchors the spotlight; `null` centers the card with a plain dim overlay.
 *  `sidebarTab`, when set, opens the sidebar and switches to that tab first so
 *  the step can showcase what lives inside it. */
export interface TourStep {
  target: string | null;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  sidebarTab?: "components" | "problems" | "learn" | "drills";
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: "Welcome to SystemDesign",
    body: "A canvas for practicing system design interviews — sketch an architecture, stress-test it with a live simulation, get scored, and rehearse the interview itself. Here's a quick tour of everything.",
    placement: "center",
  },

  // ── The four library tabs ───────────────────────────────────────────────
  {
    target: "sidebar",
    sidebarTab: "components",
    title: "Sidebar · Components",
    body: "Your building blocks — load balancers, caches, databases, queues and more. Drag any of them onto the canvas, or create your own custom component.",
    placement: "right",
  },
  {
    target: "sidebar",
    sidebarTab: "problems",
    title: "Sidebar · Problems",
    body: "Browse or search every design problem (URL Shortener, Chat System, Uber…). Pick one to attempt it, or create your own custom problem. The selected problem drives scoring and the interview questions.",
    placement: "right",
  },
  {
    target: "sidebar",
    sidebarTab: "learn",
    title: "Sidebar · Learn",
    body: "A guided path through the concepts: Concept Practice, worked Editorials that show how to approach and solve each problem, and Spot-the-Flaw exercises — with your progress tracked as you complete them.",
    placement: "right",
  },
  {
    target: "sidebar",
    sidebarTab: "drills",
    title: "Sidebar · Drills",
    body: "Deep-Dive Drills are spaced-repetition flashcards grouped by category. Practice a question, rate how well you knew it, and cards resurface for review when they're due — so the fundamentals stick.",
    placement: "right",
  },

  // ── The canvas & toolbar ────────────────────────────────────────────────
  {
    target: "canvas",
    title: "The canvas",
    body: "Drag components out here and connect them by dragging from one handle to another. This diagram is your design — wire up the request path end to end.",
    placement: "center",
  },
  {
    target: "topbar-file",
    title: "File menu",
    body: "Save and load your designs, copy a shareable link, or export the diagram as a PNG, SVG, or JSON.",
    placement: "bottom",
  },
  {
    target: "topbar-canvas",
    title: "Canvas menu",
    body: "Load a reference solution, drop in text notes, auto-tidy the layout, or clear everything and start fresh.",
    placement: "bottom",
  },
  {
    target: "simulate",
    title: "Simulate",
    body: "Run traffic through your design to reveal bottlenecks and overloaded components, then open the right panel to score how well it holds up.",
    placement: "bottom",
  },
  {
    target: "right-panel",
    title: "Inspect, simulate & score",
    body: "Selected-component details, simulation results, and your design score all live here — the feedback loop for improving a design.",
    placement: "left",
  },

  // ── Interview & AI ──────────────────────────────────────────────────────
  {
    target: "interview",
    title: "Practice Interview",
    body: "Open this menu for a guided, timed interview: it walks you through the phases of a real system-design round — requirements, estimation, high-level design and deep dives — keeping you on the clock like the real thing.",
    placement: "bottom",
  },
  {
    target: "interview",
    title: "Mock Interview",
    body: "Also in this menu: a mock interview that probes your design one question at a time. Scripted follow-ups are tailored to the selected problem, and with an API key an AI interviewer reacts to what you've actually built.",
    placement: "bottom",
  },
  {
    target: "ai",
    title: "AI assistant",
    body: "Bring your own API key to unlock an AI copilot that can review your design, suggest components, and answer questions as you work. Everything else runs fully offline without a key.",
    placement: "bottom",
  },

  {
    target: "tour-button",
    title: "You're all set",
    body: "That's the full tour. Pick a problem from the sidebar and start designing — and replay this walkthrough anytime from this Tour button.",
    placement: "bottom",
  },
];
