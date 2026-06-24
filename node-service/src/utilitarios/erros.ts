import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_UNAUTHORIZED,
  HTTP_STATUS_SERVICE_UNAVAILABLE,
} from './constantes';

export class ErroDeNegocio extends Error {
  constructor(
    public readonly code: string,
    public readonly mensagemParaCliente: string,
    public readonly statusHttp: number,
  ) {
    super(mensagemParaCliente);
    this.name = 'ErroDeNegocio';
  }
}

export class ErroUsuarioNaoEncontrado extends ErroDeNegocio {
  constructor() {
    super('USER_NOT_FOUND', 'Usuário não encontrado no GitHub.', HTTP_STATUS_NOT_FOUND);
  }
}

export class ErroRepositorioNaoEncontrado extends ErroDeNegocio {
  constructor() {
    super('REPO_NOT_FOUND', 'Repositório não encontrado.', HTTP_STATUS_NOT_FOUND);
  }
}

export class ErroServicoIndisponivel extends ErroDeNegocio {
  constructor() {
    super(
      'SERVICE_UNAVAILABLE',
      'Serviço temporariamente indisponível. Tente novamente em alguns minutos.',
      HTTP_STATUS_SERVICE_UNAVAILABLE,
    );
  }
}

export class ErroCredenciaisInvalidas extends ErroDeNegocio {
  constructor() {
    super('INVALID_CREDENTIALS', 'Email ou senha incorretos.', HTTP_STATUS_UNAUTHORIZED);
  }
}

export class ErroItemNaoEncontrado extends ErroDeNegocio {
  constructor() {
    super('NOT_FOUND', 'Item não encontrado.', HTTP_STATUS_NOT_FOUND);
  }
}

export class ErroParametroInvalido extends ErroDeNegocio {
  constructor(campo: string) {
    super('INVALID_PARAMETER', `Parâmetro inválido: ${campo}.`, HTTP_STATUS_BAD_REQUEST);
  }
}
