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


## License

MIT
