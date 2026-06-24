import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageWrapper } from '../../componentes/layout/PageWrapper';
import { UserDashboard } from '../../componentes/dashboard/UserDashboard';
import { IndicadorDeCarregamentoDePerfil } from '../../componentes/dashboard/IndicadorDeCarregamento';
import { MensagemDeErro } from '../../componentes/dashboard/MensagemDeErro';
import { useUsuarioGitHub } from '../../hooks/useUsuarioGitHub';
import { extrairCodigoDeErro } from '../../api/cliente';

export function UserResultPage() {
  const { username = '' } = useParams<{ username: string }>();
  const { data, isPending, error, refetch } = useUsuarioGitHub(username);

  useEffect(() => {
    document.title = username ? `@${username} — GitAnalytics` : 'GitAnalytics';
  }, [username]);

  if (isPending) {
    return (
      <PageWrapper>
        <IndicadorDeCarregamentoDePerfil />
      </PageWrapper>
    );
  }

  if (error) {
    const codigo = extrairCodigoDeErro(error);
    if (codigo === 'USER_NOT_FOUND') {
      return (
        <PageWrapper>
          <MensagemDeErro titulo="Usuário não encontrado" descricao="Usuário não encontrado no GitHub." />
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
      <UserDashboard dados={data} />
    </PageWrapper>
  );
}
