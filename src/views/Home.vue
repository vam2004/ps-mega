<template>
  <div id="fundo">
    <header>
      <h3>Megabank</h3>
      <h3 id="title">Dashboard</h3>
      <img id="bell" src="Img/bell.png" alt="Sino" />
      <img id="config" src="Img/config.png" alt="config" />
    </header>
    <hr />
    <div id="container">
      <div id="lateral">
        <div id="vertical-line">
          <img id="dash" src="Img/dashboard.png" alt="dashboard" />
          <br />
          <img class="list" src="Img/line.png" alt="list" />
          <br />
          <img class="list" src="Img/line.png" alt="list" />
          <br />
          <img class="list" src="Img/line.png" alt="list" />
          <br />
          <img class="list" src="Img/line.png" alt="list" />
          <div id="user">
            <img id="icon " src="Img/icon.png" alt="icon" />
            <h5>Bem-Vindo de volta</h5>
            <h5>Angelo</h5>
          </div>
          <router-link to="/" class="log-out">
            <img id="sign-out-img" src="Img/sign-out.png" alt="sign-out" />
            <h5 id="sign-out-text">Sign-out</h5>
          </router-link>
        </div>
      </div>
      <div id="centro">
        <div>
          <div class="esquerda">
            <div class="ao-lado">
              <div id="saldo">
                <h4 id="saldo-text">Meu saldo</h4>
                <div class="ao-lado">
                  <h2 id="saldo-number">$99,999.99</h2>
                  <p id="moeda">BRL</p>
                </div>
                <div id="historico">
                  <div class="ao-lado">
                    <img src="Img/clock.png" alt="clock" />
                    <p id="historico-text">Histórico</p>
                  </div>
                </div>
              </div>
              <div id="renda/gastos">
                <div class="ao-lado">
                  <h4 id="renda-text">Renda</h4>
                  <h4 id="renda-mensal-text">/ mensal</h4>
                  <img id="seta-baixo" src="Img/seta-baixo.png" alt="seta" />
                </div>
                <h2 id="renda-number">$3,331.22</h2>
                <hr id="hr-renda" />
                <div class="ao-lado">
                  <h4 id="gasto-text">Gastos</h4>
                  <h4 id="gastos-mensal-text">/ mensal</h4>
                  <img
                    id="seta-baixo-gasto"
                    src="Img/seta-baixo.png"
                    alt="seta"
                  />
                </div>
                <h2 id="gasto-number">$1,461.98</h2>
              </div>
            </div>
          </div>
          <div class="esquerda" id="cartão"></div>
        </div>
        <div class="direita"></div>
      </div>
    </div>
  </div>
</template>

<script></script>

<style scoped>
#fundo {
  background-color: black;
  height: 61.7rem;
  color: white;
}
.ao-lado {
  display: flex;
}

header {
  display: flex;
  padding: 2rem;
}

#title {
  margin-left: 50rem;
}
#bell {
  margin-left: 55rem;
}
#config {
  margin-left: 3rem;
}
#container {
  display: flex;
}
#dash {
  margin-top: 4rem;
  width: 15rem;
}
#lateral {
  margin-left: 5rem;
}
.list {
  margin-top: 1rem;
}
#vertical-line {
  width: 30rem;
  height: 54.5rem;
  border-right: 3px solid #964cad;
}
#user {
  margin-top: 10rem;
  width: 20rem;
  height: 10rem;
  border: 2px solid #f4f7f6;
  border-radius: 35px;
}
#icon {
  width: 50rem;
}
.log-out {
  margin-top: 2rem;
  width: 20rem;
  height: 4rem;
  background: #2e2e2e;
  border-radius: 10px;
  display: flex;
  text-decoration: none;
}
#sign-out-img {
  width: 3rem;
  margin-top: 0.5rem;
  margin-left: 1.5rem;
}
#sign-out-text {
  margin-left: 3rem;
  margin-top: 0.5rem;
  font-size: 2rem;
  color: #f4f7f6;
}
.esquerda {
  margin-left: 5rem;
  margin-top: 3rem;
  width: 40rem;
  height: 20rem;
  border: 1px solid #f4f7f6;
  border-radius: 50px;
}
#saldo {
  border-radius: 50px;
  width: 20rem;
  height: 20rem;
  background-color: #f4f7f6;
}
#saldo-text {
  color: black;
  padding-top: 3rem;
  margin-left: 2rem;
  padding-bottom: 0;
}
#saldo-number {
  margin-top: 2rem;
  margin-left: 2rem;
  color: black;
}
#moeda {
  color: #964cad;
  margin-top: 3rem;
  font-size: 1.4rem;
  font-weight: bold;
}
#historico {
  margin-top: 2rem;
  margin-left: 2rem;
  width: 13rem;
  height: 3rem;
  background-color: #2d0039;
  border-radius: 10px;
}
#historico-text {
  margin-left: 2rem;
  margin-top: 0.4rem;
}
#renda-text {
  margin-left: 2.5rem;
  margin-top: 2rem;
  margin-right: 1.5rem;
}

#renda-mensal-text {
  margin-top: 2rem;
  color: #c9c9c9;
}
#seta-baixo {
  width: 1.5rem;
  height: 1.5rem;
  margin-top: 2.3rem;
  margin-left: 0.5rem;
}
#renda-number {
  margin-left: 3.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}
#hr-renda {
  margin-left: 6rem;
  margin-right: 3rem;
}
#gasto-text {
  margin-left: 2.5rem;
  margin-top: 1rem;
  margin-right: 1.5rem;
}
#gastos-mensal-text {
  margin-top: 1rem;
  color: #c9c9c9;
}
#seta-baixo-gasto {
  width: 1.5rem;
  height: 1.5rem;
  margin-top: 1.3rem;
  margin-left: 0.5rem;
}
#gasto-number {
  margin-left: 3.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
}
</style>
