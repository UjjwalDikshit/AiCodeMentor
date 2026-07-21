from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.errors import ok
from app.loaders import LOADERS
from app.services.infra import DocumentInfraService

router = APIRouter(prefix="/documents", tags=["documents"])


class LoadDocumentRequest(BaseModel):
    """Infrastructure loader probe — not a product ingest pipeline."""

    path: str = Field(..., min_length=1)
    loader: str = Field(default="txt", description="txt|md|json|csv|pdf|docx|directory|github")


@router.get("")
@router.get("/")
async def list_document_loaders() -> dict:
    return DocumentInfraService().list_loaders()


@router.post("")
@router.post("/")
async def load_document_preview(body: LoadDocumentRequest) -> dict:
    """Load a local file via registered loaders (infra preview only)."""
    key = body.loader.lower()
    if key not in LOADERS:
        return {
            "success": False,
            "message": f"Unknown loader '{body.loader}'",
            "data": {},
            "meta": {"available": sorted(LOADERS.keys())},
        }

    loader = LOADERS[key]
    if key == "github":
        result = loader(body.path)
        return ok(message="GitHub loader placeholder", data=result)

    content = loader(body.path)
    preview = content if isinstance(content, (dict, list)) else str(content)[:2000]
    return ok(
        message="Document loaded (infrastructure preview)",
        data={"loader": key, "path": body.path, "preview": preview},
        meta={"note": "No RAG indexing performed"},
    )
