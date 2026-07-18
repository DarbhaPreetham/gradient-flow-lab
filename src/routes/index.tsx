import { createFileRoute } from "@tanstack/react-router";
import App from "../App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChromaWeave — A Meditative Color Tapestry Puzzle" },
      { name: "description", content: "Drag, swap, and weave gradients of light into living tapestries. A zen color puzzle for all ages." },
      { property: "og:title", content: "ChromaWeave — A Meditative Color Tapestry Puzzle" },
      { property: "og:description", content: "Drag, swap, and weave gradients of light into living tapestries. A zen color puzzle for all ages." },
    ],
  }),
  component: Index,
});

function Index() {
  return <App />;
}
