
function menuShow() {
    let menuMobile = document.querySelector(".mobile-menu");
    if (menuMobile.classList.contains("open")) {
      menuMobile.classList.remove("open");
      document.querySelector(".icon").src = "img/menu_white_36dp.svg";
    } else {
      menuMobile.classList.add("open");
      document.querySelector(".icon").src = "img/close_white_36dp.svg";
    }
  }
;

  firebase.auth().onAuthStateChanged(function (user) {
    const usuarioLogado = !!user;

    if (!usuarioLogado) {
      mensagemAcessoNegado.style.display = "none";

      links.forEach(function (link) {
        link.addEventListener("click", function (event) {
          event.preventDefault();
          mensagemAcessoNegado.style.display = "block";
        });
      });
    } else {
      document.getElementById("user-greeting").style.display = "block";

      // Verificar se o usuário tem uma propriedade 'uid' antes de acessá-la
      if (user.uid) {
        const userId = user.uid;
        const databaseRef = firebase.database().ref("usuarios/" + userId);
        databaseRef
          .once("value")
          .then(function (snapshot) {
            const userData = snapshot.val();
            if (userData && userData.usuario) {
              document.getElementById("username").textContent =
                userData.usuario;
            } else {
              document.getElementById("username").textContent = "Usuário";
            }
          })
          .catch(function (error) {
            console.error("Erro ao recuperar os dados do usuário:", error);
          });
      }
    }
  });
