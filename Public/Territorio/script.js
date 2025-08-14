const dirigentes = {
  setembro: ["Thalles", "Lucas", "William", "Jhony"],
  outubro: ["Lidinei", "Matheus", "Wemerson"],
  novembro: ["Thalles", "William", "Lucas", "Jhony", "Joebel"],
  dezembro: ["Lidinei", "Matheus", "Wemerson", "Thalles"],
};

const grupos = ["Grupo Timirim", "Grupo Eldorado", "Grupo Primavera"];

const atividades = [
  {
    dia: "Ter",
    modalidade: "Casa em casa",
    hora: "08:45",
    dirigente: "Joebel",
    saida: "Salão Timirim",
  },
  {
    dia: "Qua",
    modalidade: "Casa em casa",
    hora: "08:45",
    dirigente: "Thalles",
    saida: "Salão Timirim",
  },
  {
    dia: "Qui",
    modalidade: "Carrinho na feira",
    hora: "07:30",
    dirigente: "Lidinei",
    saida: "Feira timirim",
  },
  {
    dia: "Sex",
    modalidade: "Casa em casa",
    hora: "08:45",
    dirigente: "Werley",
    saida: "Salão Timirim",
  },
  {
    dia: "Sab",
    modalidade: "Casa em casa",
    hora: "09:00",
    dirigente: "",
    saida: "Salão Timirim",
  },
  {
    dia: "Dom",
    modalidade: "Casa em casa",
    hora: "09:00",
    dirigente: "Thalles",
    saida: "Salão Timirim",
  },
  {
    dia: "Dom",
    modalidade: "Carrinho na feira",
    hora: "07:30",
    dirigente: "Grupo Timirim",
    saida: "Feira Timirim",
  },
];

// Função para calcular a semana do mês atual
function getSemanaAtual() {
  const hoje = new Date();
  const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const semana = Math.floor((hoje.getDate() + primeiroDiaDoMes.getDay()) / 7);
  return semana;
}

function atualizarProgramacao() {
  const hoje = new Date();
  const mes = hoje.toLocaleString("pt-BR", { month: "long" }).toLowerCase();
  const semana = getSemanaAtual();

  // Atualiza o dirigente de sábado com base na semana
  const dirigenteSabado = dirigentes[mes][semana] || "";
  atividades[4].dirigente = dirigenteSabado;

  // Atualiza o grupo e a saída do domingo de acordo com a semana
  const grupoDomingo = grupos[semana % grupos.length]; // Alterna os grupos conforme a semana
  atividades[5].grupo = grupoDomingo;
  atividades[5].saida = `Salão ${grupoDomingo.split(" ")[1]}`; // Exemplo: "Salão Eldorado", "Salão Timirim"

  atividades[6].grupo = grupoDomingo;
  atividades[6].saida = `Feira ${grupoDomingo.split(" ")[1]}`; // Exemplo: "Feira Eldorado", "Feira Timirim"

  // Limpa a tabela antes de gerar a nova programação
  const tabela = document
    .getElementById("tabelaProgramacao")
    .getElementsByTagName("tbody")[0];
  tabela.innerHTML = "";

  atividades.forEach((atividade) => {
    const row = tabela.insertRow();
    row.insertCell(0).innerHTML = atividade.dia;
    row.insertCell(1).innerHTML = atividade.modalidade;
    row.insertCell(2).innerHTML = atividade.hora;
    row.insertCell(3).innerHTML = atividade.dirigente;
    row.insertCell(4).innerHTML = atividade.saida;
  });
}

// Chama a função para atualizar a programação ao carregar a página
window.onload = atualizarProgramacao;

//------------------------------------------------------------------------------------------------

var galeria = document.getElementById("galeria");
var imagens = galeria.getElementsByTagName("img");

for (var i = 0; i < imagens.length; i++) {
  imagens[i].addEventListener("click", function () {
    openFullscreen(this.src);
  });
}

function openFullscreen(src) {
  const fullscreenDiv = document.getElementById("fullscreen");
  const fullscreenImg = document.getElementById("fullscreen-img");

  fullscreenImg.src = src;
  fullscreenDiv.style.display = "flex"; // Use 'flex' para centralizar a imagem.
}

function closeFullscreen() {
  document.getElementById("fullscreen").style.display = "none";
}

function closeFullscreen() {
  var fullscreenElement = document.getElementById("fullscreen");
  fullscreenElement.style.display = "none";
  document.body.style.overflow = "auto"; // Permite o rolar da página novamente
}
