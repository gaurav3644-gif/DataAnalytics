# PiTensor Analytics - Homepage

This project is a static homepage with an Analytics Lab that can call a real OpenAI backend for structured insight generation.

Features included:

- Marketing homepage with clear positioning and calls to action
- Analytics Lab for CSV upload and demo data exploration
- Automatic KPI extraction for rows, columns, numeric fields, and missing values
- Trend chart rendering for selected metrics
- AI-style insight summaries, anomaly hints, and simple forecasts
- OpenAI-backed structured analysis endpoint
- Data preview table for the first five rows

Files:

- `index.html` - page structure
- `styles.css` - layout and visual design
- `script.js` - interactive analytics logic
- `server.js` - local Node server and OpenAI proxy

Setup:

1. Set your OpenAI key in the shell:

```powershell
$env:OPENAI_API_KEY="your_api_key_here"
```

2. Optional: set a model override if you want something other than the default:

```powershell
$env:OPENAI_MODEL="gpt-5.1"
```

3. Start the local server:

```powershell
node server.js
```

4. Open `http://127.0.0.1:8000` in your browser.

If the OpenAI request fails, the app falls back to local heuristic insights so the UI still works.

## Docker deployment

The service can build from the repository-root `Dockerfile.txt`:

```powershell
docker build -f Dockerfile.txt -t pitensor .
docker run --rm -p 8000:8000 pitensor
```

The container listens on `0.0.0.0` and uses port `8000` by default. Hosting services can override `PORT` as needed.
