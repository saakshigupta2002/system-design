/** A single step in the product tour. `target` is a `data-tour` value that
 *  anchors the spotlight; `null` centers the card with a plain dim overlay. */
export interface TourStep {
  target: string | null;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: "Welcome to SystemDesign",
    body: "A canvas for practicing system design interviews — sketch an architecture, stress-test it with a live simulation, and get scored. Here's a 60-second tour of the essentials.",
    placement: "center",
  },
  {
    target: "sidebar",
    title: "1 · The library",
    body: "Everything you build from lives here. Components to drag onto the canvas, Problems to attempt, a guided Learn path, and rapid-fire Drills.",
    placement: "right",
  },
  {
    target: "canvas",
    title: "2 · The canvas",
    body: "Drag components out here and connect them by dragging from one handle to another. This diagram is your design — wire up the request path end to end.",
    placement: "center",
  },
  {
    target: "topbar-file",
    title: "3 · File menu",
    body: "Save and load your designs, copy a shareable link, or export the diagram as a PNG, SVG, or JSON.",
    placement: "bottom",
  },
  {
    target: "topbar-canvas",
    title: "4 · Canvas menu",
    body: "Load a reference solution, drop in text notes, auto-tidy the layout, or clear everything and start fresh.",
    placement: "bottom",
  },
  {
    target: "simulate",
    title: "5 · Simulate",
    body: "Run traffic through your design to reveal bottlenecks and overloaded components, then open the right panel to score how well it holds up.",
    placement: "bottom",
  },
  {
    target: "right-panel",
    title: "6 · Inspect, simulate & score",
    body: "Selected-component details, simulation results, and your design score all live here — the feedback loop for improving a design.",
    placement: "left",
  },
  {
    target: "interview",
    title: "7 · Mock interview",
    body: "Practice out loud. Get scripted follow-up questions tailored to the selected problem, or an adaptive AI interviewer that probes your actual design.",
    placement: "bottom",
  },
  {
    target: "tour-button",
    title: "You're all set",
    body: "That's the tour. Pick a problem from the sidebar and start designing — and replay this walkthrough anytime from this Tour button.",
    placement: "bottom",
  },
];
