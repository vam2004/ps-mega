<template>
  <header>
    <h3>MegaBank</h3>
    <h3 id="centro">DashBord</h3>
  </header>
  <div class="lateral">
    <h4>DashBord</h4>
    <br />
    <ul>
      <li>***********</li>
      <li>***********</li>
      <li>***********</li>
      <li>***********</li>
    </ul>
    <div class="usuario">
      <p id="saudacoes">Bem-Vindo de volta</p>
      <p id="name">Usuário</p>
    </div>
    <router-link to="/">
      <button id="saida">Sign-out</button>
    </router-link>
  </div>
</template>

<script></script>

<style scoped>
* {
  color: #f4f7f6;
}

header {
  width: 100%;
  height: 5.5rem;
  padding: 1.5rem;
  display: flex;
  box-sizing: border-box;
  border-bottom: 1px solid #964acd;
}

#centro {
  margin-left: 45rem;
}

.lateral {
  margin-top: 5rem;
  margin-left: 10rem;
}

.usuario {
  width: 20rem;
  height: 10rem;
  box-sizing: border-box;
  border: 2px solid #f4f7f6;
  border-radius: 35px;
  margin-left: -5rem;
  margin-top: 18rem;
}

#saudacoes {
  text-align: center;
  margin-top: 3rem;
  margin-left: 4.5rem;
  font-size: 1.4rem;
  color: #c9c9c9;
}
#name {
  margin-left: 5.7rem;
  font-size: 1.8rem;
}
#saida {
  width: 20rem;
  height: 4rem;
  margin-top: 5rem;
  margin-left: -5rem;
  border-radius: 10px;
  background-color: #2e2e2e;

  font-weight: 700;
  font-size: 1.6rem;
  align-content: center;
}
</style>
