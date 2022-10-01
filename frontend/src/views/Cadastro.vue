<template>
  <div id="wrapper">
    <!--Card de Login-->
    <div class="side-a">
      <div class="card">
        <div class="card-header">
          <span>Seja um membro do Mega Bank!!</span>
        </div>
        <form id="base-form">
          <h5>Informações gerais</h5>
          <input name="name" id="nome" type="text" placeholder="NOME COMPLETO" />
          <input name="cpf" id="cpf" type="text" placeholder="CPF" />
          <div class="ao-lado">
            <input name="rg" id="rg" type="text" placeholder="RG" />
            <input name="emiter" id="emissor" type="text" placeholder="ORGÃO EMISSOR" />
          </div>
          <input name="email" id="email" type="email" placeholder="EMAIL" />
          <div class="ao-lado">
            <input name="userpass" class="senha" type="password" placeholder="SENHA" />
            <input
              class="senha"
              type="password"
			  name="secondpass"
              placeholder="CONFIRMAÇÃO DE SENHA"
            />
          </div>
          <h5>Endereço</h5>
          <input name="cep" id="cep" type="text" placeholder="CEP" />
          <div class="ao-lado">
            <input name="street" id="rua" type="text" placeholder="RUA" />
            <input name="number" id="numero" type="text" placeholder="Nº" />
          </div>
          <div class="ao-lado">
            <input name="district" id="bairro" type="text" placeholder="Bairro" />
            <input name="compl" id="complemento" type="text" placeholder="COMPLEMENTO" />
          </div>
          <h5>Sobre suas finanças</h5>
          <div class="ao-lado">
            <input name="work" id="profissao" type="text" placeholder="PROFISSÃO" />
            <input name="income" id="renda" type="text" placeholder="RENDA" />
          </div>
          <!---<router-link to="/">-->
            <button v-on:click="register">Crie sua conta</button>
          <!--</router-link>-->
        </form>
      </div>
    </div>

    <!--Logo-->
    <div class="side-b">
      <div>
        <img id="logo" src="Img/logo.png" alt="logo" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  nome: "Cadastro",
  methods: {
	register(evt) {
		evt.preventDefault();
		const source = document.querySelector("#base-form");
		const raw = new FormData(source);
		const data = {};
		for(const pair of raw.entries()) {
			const key = pair[0];
			const value = pair[1];
			console.log(key + ": " + value);
			if(value !== undefined)
				data[key] = value;
		}
		const that = this;
		fetch("http://127.0.0.1:9001/fetch/register/", {
			method: "POST", 
			headers: { 
				"Content-Type": "application/json",	
			}, 
			credentials: 'include',
			body: JSON.stringify(data)
		}).then(res => res.json()).then(function(res){
			if(res.status === "error") {
				alert("Error: " + res.message ?? "unknown");
			} else if(res.status === "sucess") {
				alert("O pedido de registro foi efetuado com sucesso. Aguarde a confimação");
			}
		}).catch(console.log);
	}
  }
};
</script>

<style scoped>
#wrapper {
  display: grid;

  grid-template-columns: 1fr 1.5fr;
  grid-template-areas: "A B";
}

.side-a {
  grid-area: A;

  display: flex;
  flex-direction: column;

  align-items: center;

  margin-top: 3rem;
}

.side-b {
  grid-area: B;
}

.side-b div {
  position: fixed;
  width: 120.7rem;
  height: 83.8rem;

  top: 10rem;

  background: rgba(15, 12, 15, 0.3);
  transform: rotate(-80deg);
}

.card {
  background-color: var(--branco);

  height: 60rem;
  width: 55rem;
  border-radius: 1.25rem;

  box-shadow: 1rem 1rem 0.5rem rgba(0, 0, 0, 0.25);

  margin: -2rem 2rem;
}

.card-header {
  background-color: var(--branco);

  height: 5rem;
  width: 55rem;
  border-radius: 1.18rem 1.18rem 0rem 0rem;

  box-shadow: 0rem 0.6rem 0.5rem rgba(0, 0, 0, 0.25);

  display: flex;
  justify-content: center;
  align-items: center;
}

.card-header span {
  font-style: normal;
  font-weight: 800;
  font-size: 2.3rem;

  background: linear-gradient(
    135deg,
    var(--vermelho-primaria) 14.64%,
    var(--roxo-secundaria) 85.36%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

form {
  display: flex;
  flex-direction: column;

  gap: 1rem;

  /* align-items: center; */
  margin-left: 2rem;

  margin-top: 1.4rem;
}

form input {
  padding-left: 2rem;
  height: 3.3rem;

  background: var(--auxiliar);

  border-radius: 0.7rem;

  border: none;

  font-size: 1.2rem;
}

#nome {
  width: 50rem;
}
#cpf {
  width: 27rem;
  /* TIRAR O CONTADOR */
}

#rg {
  width: 27rem;
  margin-right: 3rem;
}

#emissor {
  width: 20rem;
  /* COLOCAR AO LADO DO RG */
}

#email {
  width: 50rem;
}

.senha {
  width: 23.5rem;
  margin-right: 3rem;
}

#cep {
  width: 23.5rem;
}

#rua {
  width: 40rem;
  margin-right: 3rem;
}

#numero {
  width: 7rem;
}

#bairro {
  width: 23.5rem;
  margin-right: 3rem;
}

#complemento {
  width: 23.5rem;
}

#profissao {
  width: 23.5rem;
  margin-right: 3rem;
}

#renda {
  width: 23.5rem;
}

form input::placeholder {
  color: var(--placeholder);
}

form button {
  width: 50rem;
  height: 4rem;

  background: var(--preto);
  border-radius: 0.5rem;

  font-family: "Nunito", sans-serif;
  font-style: normal;
  font-weight: 400;
  font-size: 2rem;
  line-height: 2.7rem;
  text-align: center;

  color: var(--branco);

  border: none;
  margin-top: 1.5rem;
}
#logo {
  transform: rotate(80deg);
  margin-left: 72rem;
  width: 20rem;
  margin-top: 25rem;
}
</style>
