# TAFE NSW Course Search — Load Test

A small [k6](https://k6.io/) load test for TAF NSW course search API.

## What it actually does

The test ([tests/api.tests.js](tests/api.tests.js)) does roughly what a real visitor would:

1. Picks a random course from a small list — things like *carpentry*, *nursing*, *cyber security*.
2. Builds a search request against `https://www.tafensw.edu.au/api/course/_search`, scoped to courses that are currently published (the date filters are generated on the fly).
3. Fires the request and checks two things:
   - the response came back with a `200 OK`, and
   - the results actually include the course we searched for.
4. Waits a second, then does it all again — like a user pausing between searches.

The test data lives in [data/courses.data.json](data/courses.data.json).

## The traffic pattern

By default the test runs for about three minutes:

| Stage        | Duration | Virtual users | Why                         |
|--------------|----------|---------------|-----------------------------|
| Ramp up      | 30s      | 0 → 5         | Let the service warm up     |
| Steady state | 2m       | 5             | The actual measurement      |
| Ramp down    | 30s      | 5 → 0         | Cool down gracefully        |

## What counts as passing

The test fails if any of these thresholds are breached:

- **Speed** — 95% of requests finish in under 500ms.
- **Errors** — fewer than 1% of requests fail.
- **Correctness** — more than 99% of the checks pass.

## Running it locally

You'll need k6 installed ([install guide](https://grafana.com/docs/k6/latest/set-up/install-k6/)). Then, from the project root:

```bash
mkdir -p results
k6 run tests/api.tests.js
```

When it finishes you'll get:

- a summary printed to the terminal,
- a raw JSON dump at `results/summary.json`, and
- a nice HTML report at `results/result.html` — open it in a browser.

## Running it in CI

Every push and pull request to `main` runs the test automatically via GitHub Actions ([.github/workflows/k6-load-test.yml](.github/workflows/k6-load-test.yml)).

The workflow installs k6, runs the test, and publishes the results two ways:

- The HTML report is uploaded as a downloadable artifact (`k6-html-report`) on every run.
- On `main`, the latest report is also published to **GitHub Pages** so we can just open a link instead of downloading anything.

CI is deliberately set up to keep going even if the thresholds fail — that way we always get a report to look at.

## Project layout

```
.
├── tests/
│   └── api.tests.js          # the k6 test
├── data/
│   └── courses.data.json     # sample search queries
├── results/                  # generated reports (git-ignored)
└── .github/workflows/
    └── k6-load-test.yml       # CI + Pages publishing
```
