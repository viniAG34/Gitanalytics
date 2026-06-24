import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.api.v1.rotas.analise import router as router_de_analise
from app.config import configurar_logging

configurar_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="python-service", docs_url=None, redoc_url=None)

app.include_router(router_de_analise)


@app.exception_handler(Exception)
async def tratador_de_erro_global(request: object, exc: Exception) -> JSONResponse:
    logger.error("Erro inesperado: %s", exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Erro interno."})


@app.get("/health")
async def verificar_saude() -> dict[str, str]:
    return {"status": "ok"}
