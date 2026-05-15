import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function getBasePath() {
  const repository = process.env.GITHUB_REPOSITORY;

  if (!process.env.GITHUB_ACTIONS || !repository) {
    return "/";
  }

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    return "/";
  }

  if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return "/";
  }

  return `/${repo}/`;
}

export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 4173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
