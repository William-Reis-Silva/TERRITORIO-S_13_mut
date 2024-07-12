
var galeria = document.getElementById('galeria');
var imagens = galeria.getElementsByTagName('img');

for (var i = 0; i < imagens.length; i++) {
    imagens[i].addEventListener('click', function () {
        openFullscreen(this.src);
    });
}

function openFullscreen(imageSrc) {
    var fullscreenElement = document.getElementById("fullscreen");
    var fullscreenImg = document.getElementById("fullscreen-img");

    fullscreenImg.src = imageSrc;
    fullscreenElement.style.display = "flex";
    document.body.style.overflow = "hidden"; // Impede o rolar da página
}

function closeFullscreen() {
    var fullscreenElement = document.getElementById("fullscreen");
    fullscreenElement.style.display = "none";
    document.body.style.overflow = "auto"; // Permite o rolar da página novamente
}

