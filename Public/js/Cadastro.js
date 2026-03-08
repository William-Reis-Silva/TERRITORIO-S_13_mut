document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("cadastro-form");
  const mensagemErro = document.getElementById("mensagem-erro");
  const mensagemSucesso = document.getElementById("mensagem-sucesso");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usuario = document.getElementById("usuario").value; // 🔧 sem acento
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    mensagemErro.textContent = "";
    mensagemSucesso.textContent = "";

    // Verificar senhas
    if (senha !== confirmarSenha) {
      mensagemErro.textContent = "As senhas não coincidem.";
      return;
    }

    if (senha.length < 6) {
      mensagemErro.textContent = "A senha deve ter pelo menos 6 caracteres.";
      return;
    }

    try {
      // Criar usuário no Firebase Authentication
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, senha);
      const user = userCredential.user;

      const userData = {
        usuario: usuario,
        email: email,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        isAdmin: false,
        writtenPermission: false,
      };

      // Salvar no Firestore
      await firebase.firestore().collection("usuarios").doc(user.uid).set(userData);

      mensagemSucesso.textContent = "Usuário cadastrado com sucesso! Redirecionando...";
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);

    } catch (error) {
      console.error("Erro no cadastro:", error);
      let errorMessage = "Erro ao cadastrar usuário.";

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "Este email já está em uso.";
          break;
        case "auth/invalid-email":
          errorMessage = "Email inválido.";
          break;
        case "auth/weak-password":
          errorMessage = "A senha deve ter pelo menos 6 caracteres.";
          break;
      }

      mensagemErro.textContent = errorMessage;
    }
  });
});