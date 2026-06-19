"""StudyQuest MarkItDown sidecar.

Converts uploaded documents (PDF and the other formats MarkItDown supports) into
Markdown so the NestJS backend can feed clean text to the quiz generator instead
of shipping raw PDF bytes to a multimodal model.
"""

import os
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile
from markitdown import MarkItDown

app = FastAPI(title="StudyQuest MarkItDown service", version="1.0.0")

# MarkItDown is stateless and cheap to reuse across requests.
_converter = MarkItDown()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/convert")
async def convert(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Archivo vacío")

    # MarkItDown picks the right parser from the file extension, so preserve it.
    suffix = os.path.splitext(file.filename or "")[1].lower() or ".pdf"

    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        result = _converter.convert(tmp_path)
    except Exception as exc:  # noqa: BLE001 - surface any parser failure to the caller
        raise HTTPException(
            status_code=422, detail=f"No se pudo convertir el documento: {exc}"
        ) from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    markdown = result.text_content or ""
    return {"markdown": markdown, "chars": len(markdown)}
