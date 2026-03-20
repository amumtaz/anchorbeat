# AnchorBeat Identity Lab

AnchorBeat is an open-source, browser-based identity lab for exploring human versus automated interaction signals in a single session.

It is intentionally lightweight: no build step, no backend, and easy to publish on GitHub Pages.

## What it does

- Runs a 45-second assessment flow in the browser
- Captures motion-path curvature and sample coverage
- Analyzes typing cadence, jitter, paste behavior, and mixed input patterns
- Collects lightweight browser and device metadata signals
- Produces a simple confidence score with integrity flags

## Project structure

```text
.
├── index.html
├── dist/
│   └── anchorbeat.js
├── LICENSE
└── README.md
```

## Run locally

Because this is a static project, you can simply open `index.html` in a browser.

For a local server, you can also use:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a new public GitHub repository, such as `anchorbeat`
2. Upload these files to the repository root
3. Commit to the `main` branch
4. In GitHub, open **Settings → Pages**
5. Under **Build and deployment**, choose **Deploy from a branch**
6. Select `main` and `/ (root)`
7. Save

Your site will publish at a GitHub Pages URL like:

```text
https://<your-username>.github.io/anchorbeat/
```

## Suggested repository metadata

- **Name:** `anchorbeat`
- **Description:** Open-source browser-based identity lab for exploring human vs automated interaction signals
- **Topics:** `opensource`, `javascript`, `browser`, `behavior-analysis`, `identity`, `github-pages`

## Notes

This repository is a public demo and experimental baseline. Some signals are heuristic and should not be treated as a production-grade fraud or identity decision engine without additional validation.

## License

MIT
