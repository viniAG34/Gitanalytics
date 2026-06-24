from fastapi import APIRouter

from app.schemas.entrada import RepoAnalysisRequest, UserAnalysisRequest
from app.schemas.saida import RepoAnalysisResponse, UserAnalysisResponse
from app.servicos.servico_de_analise_de_repositorio import analisar_repositorio
from app.servicos.servico_de_analise_de_usuario import analisar_usuario

router = APIRouter(prefix="/analyze", tags=["analise"])


@router.post("/user", response_model=UserAnalysisResponse)
async def endpoint_de_analise_de_usuario(
    requisicao: UserAnalysisRequest,
) -> UserAnalysisResponse:
    return analisar_usuario(requisicao)


@router.post("/repo", response_model=RepoAnalysisResponse)
async def endpoint_de_analise_de_repositorio(
    requisicao: RepoAnalysisRequest,
) -> RepoAnalysisResponse:
    return analisar_repositorio(requisicao)
