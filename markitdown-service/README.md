# MarkItDown service

Small FastAPI sidecar that wraps [MarkItDown](https://github.com/microsoft/markitdown)
to convert uploaded documents into Markdown. The NestJS backend calls it before
generating quizzes so PDFs become clean text instead of being sent as raw bytes
to a multimodal model.

## Endpoints

- `GET /health` → `{ "status": "ok" }`
- `POST /convert` (multipart, field `file`) → `{ "markdown": "...", "chars": 1234 }`

## Run

Via docker-compose (recommended): `docker compose up -d markitdown`, then it is
reachable from the `api` container at `http://markitdown:8000` and from the host
at `http://localhost:3001`.

Standalone:

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
curl -F file=@some.pdf http://localhost:8000/convert
```
