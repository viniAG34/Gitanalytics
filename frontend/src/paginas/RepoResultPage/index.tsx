import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageWrapper } from '../../componentes/layout/PageWrapper';
import { RepoDashboard } from '../../componentes/dashboard/RepoDashboard';
import { IndicadorDeCarregamentoDeRepositorio } from '../../componentes/dashboard/IndicadorDeCarregamento';
import { MensagemDeErro } from '../../componentes/dashboard/MensagemDeErro';
import { useRepositorioGitHub } from '../../hooks/useRepositorioGitHub';
import { extrairCodigoDeErro } from '../../api/cliente';

export function RepoResultPage() {
  const { owner = '', repo = '' } = useParams<{ owner: string; repo: string }>();
  const { data, isPending, error, refetch } = useRepositorioGitHub(owner, repo);

  useEffect(() => {
    document.title = owner && repo ? `${owner}/${repo} — GitAnalytics` : 'GitAnalytics';
  }, [owner, repo]);

  if (isPending) {
    return (
      <PageWrapper>
        <IndicadorDeCarregamentoDeRepositorio />
      </PageWrapper>
    );
  }

  if (error) {
    const codigo = extrairCodigoDeErro(error);
    if (codigo === 'REPO_NOT_FOUND') {
      return (
        <PageWrapper>
          <MensagemDeErro titulo="Repositório não encontrado" descricao="Repositório não encontrado." />
        </PageWrapper>
      );
    }
    if (codigo === 'SERVICE_UNAVAILABLE') {
      return (
        <PageWrapper>
          <MensagemDeErro
            titulo="Serviço indisponível"
            descricao="Serviço temporariamente indisponível. Tente novamente em alguns minutos."
            podeRetentar
            aoRetentar={() => void refetch()}
          />
        </PageWrapper>
      );
    }
    const mensagem = error.message.includes('network') || error.message.includes('Network')
      ? 'Não foi possível conectar ao servidor.'
      : error.message;
    return (
      <PageWrapper>
        <MensagemDeErro
          titulo="Erro ao carregar dados"
          descricao={mensagem}
          podeRetentar
          aoRetentar={() => void refetch()}
        />
      </PageWrapper>
    );
  }

  if (!data) return null;

  return (
    <PageWrapper>
      <RepoDashboard dados={data} />
    </PageWrapper>
  );
}
