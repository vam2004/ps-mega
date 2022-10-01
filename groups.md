# Prologo
- Objetivo: Modelar o sistemas de grupos
- Modelo: Cada interação com o servidor é vista como uma chamada a um objeto.  Cada classe de objeto representa um conjunto de comportamento que o usário pode realizar
- Estado: Este documento é um memorando, servindo como uma documetação auxiliar do sistema de grupos. A notação usuada é simples e direta, mas traz o conjunto de ferramentas que deveriam ser implementadas inicialmente.
# Especifição (memorando)
+ supervisor (controla agências e bancos):
- supervisor.bancos.adicionar(banco)
- supervisor.bancos.remover(banco)

- supervisor.agencias.adicionar(agencia)
- supervisor.agencias.remover(agencia)

- supervisor.entrar(supervisor_crendeciais)
- supervisor.sair()

+ Agencia (ponto final):
- agencia.terminal.saque(cliente, valor)
- agencia.terminal.deposito(cliente, valor)

- agencia.sessao(cliente).autenticar(cliente_crendenciais) // Autentica um usuário
- agencia.sessao(cliente).executar(cliente_sessao)  // Delega uma açao do usuário para a agência
- agencia.sessao(cliente).finalizar(cliente_sessao) // Desconecta um usuário por segurança

- agencia.entrar(agencia_crendenciais)

+ Cliente (ator principal):
- cliente.perfil.criar(cliente_dados, cliente_crendenciais)
- cliente.perfil.remover()
- cliente.perfil.atualizar(cliente_dados)

- cliente.conta_corrente.tranferir(banco, cliente_alvo, valor)
- cliente.conta_corrente.extrato()

- cliente.pix.chaves.criar(chave_pix)
- cliente.pix.chaves.remover(chave_pix)

- cliente.pix.enviar() -> transacao
- cliente.pix.receber() -> transacao
- cliente.pix.historico()

- cliente.sair()
- cliente.entrar(cliente_crendenciais) -> sessao

+ Banco (apenas:
banco.autenticar(banco_crendeciais) -> sessao
banco.remover_perfil()
banco.sair()
banco.depositar(cliente, valor) -> transacao


