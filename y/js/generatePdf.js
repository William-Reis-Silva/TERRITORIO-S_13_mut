document
  .getElementById("generatePdfBtn")
  .addEventListener("click", function () {
    // Importa a biblioteca jsPDF e o plugin autoTable
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Adiciona o cabeçalho com o título e o ano de serviço dinâmico
    const yearElement = document.getElementById("serviceYear");
    const serviceYearFullText = yearElement
      ? yearElement.textContent
      : "Ano desconhecido";

    // Extrai apenas o ano de serviço do texto completo
    const serviceYearMatch = serviceYearFullText.match(/(\d{4})/);
    const serviceYear = serviceYearMatch
      ? serviceYearMatch[0]
      : "Ano desconhecido";

    doc.setFontSize(14);
    doc.text("REGISTRO DE DESIGNAÇÃO DE TERRITÓRIO", 50, 15);
    doc.setFontSize(12);
    doc.text(`Ano de Serviço: ${serviceYear}`, 14, 25);

    // Configurações do autoTable
    doc.autoTable({
      html: "#territoryTable",
      theme: "grid", // Usa o tema 'grid' para garantir as bordas das células
      startY: 30, // Define a posição inicial da tabela após o cabeçalho
      headStyles: {
        fillColor: [220, 220, 220], // Cor do cabeçalho (cinza claro)
        textColor: [0, 0, 0], // Cor do texto do cabeçalho (preto))
      },
      bodyStyles: {
        fillColor: [255, 255, 255], // Fundo das células (branco)
        textColor: [0, 0, 0], // Cor do texto (preto)
        lineColor: [0, 0, 0], // Cor das bordas (preto)
        lineWidth: 0.1, // Largura da borda
        halign: "center", // Centraliza o texto no corpo da tabela
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255], // Fundo alternado (branco)
      },
      styles: {
        fontSize: 8,
        cellPadding: 1,
        lineColor: [0, 0, 0], // Cor das bordas (preto)
        lineWidth: 0.1, // Largura da borda
      },
    });
    // Visualiza o PDF em uma nova janela antes de salvar
    window.open(doc.output("bloburl"), "_blank");

    // Salva o PDF
    doc.save("Registro S_13.pdf");
  });
