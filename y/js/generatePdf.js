document.getElementById("generatePdfBtn").addEventListener("click", function () {
  generatePDF();
});

function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");
  doc.setFontSize(12);

  const title = "REGISTRO DE DESIGNAÇÃO DE TERRITÓRIO";
  const startX = 150;
  const startY = 30;
  const title1 = "Ano de Serviço:";
  const startX1 = 40;
  const startY1 = 60;
  const table = document.getElementById("territoryTable");
  
  // Define headers
  const headers = [
    [
      {
        content: "Terr. n.º",
        rowSpan: 2,
        styles: { valign: "middle", halign: "center" },
      },
      {
        content: "Última data concluída",
        rowSpan: 2,
        styles: { valign: "middle", halign: "center" },
      },
      { content: "Designado para ", colSpan: 2, styles: { halign: "center" } },
      { content: "Designado para ", colSpan: 2, styles: { halign: "center" } },
      { content: "Designado para ", colSpan: 2, styles: { halign: "center" } },
      { content: "Designado para ", colSpan: 2, styles: { halign: "center" } },
    ],
    [
      { content: "Data da designação", styles: { halign: "center" } },
      { content: "Data da conclusão", styles: { halign: "center" } },
      { content: "Data da designação", styles: { halign: "center" } },
      { content: "Data da conclusão", styles: { halign: "center" } },
      { content: "Data da designação", styles: { halign: "center" } },
      { content: "Data da conclusão", styles: { halign: "center" } },
      { content: "Data da designação", styles: { halign: "center" } },
      { content: "Data da conclusão", styles: { halign: "center" } },
    ],
  ];

  const data = [];

  // Collect data
  const rows = table.querySelectorAll("tbody tr");
  for (let i = 0; i < rows.length; i += 2) {
    const firstRowCells = rows[i].querySelectorAll("td");
    const secondRowCells = rows[i + 1].querySelectorAll("td");

    const rowData = [
      firstRowCells[0] ? firstRowCells[0].innerText : "", // Terr. n.º
      firstRowCells[1] ? firstRowCells[1].innerText : "", // Última data concluída
      firstRowCells[2] ? firstRowCells[2].innerText : "", // Designado para 1
      secondRowCells[0] ? secondRowCells[0].innerText : "", // Data da designação 1
      secondRowCells[1] ? secondRowCells[1].innerText : "", // Data da conclusão 1
      firstRowCells[3] ? firstRowCells[3].innerText : "", // Designado para 2
      secondRowCells[2] ? secondRowCells[2].innerText : "", // Data da designação 2
      secondRowCells[3] ? secondRowCells[3].innerText : "", // Data da conclusão 2
      firstRowCells[4] ? firstRowCells[4].innerText : "", // Designado para 3
      secondRowCells[4] ? secondRowCells[4].innerText : "", // Data da designação 3
      secondRowCells[5] ? secondRowCells[5].innerText : "", // Data da conclusão 3
      firstRowCells[5] ? firstRowCells[5].innerText : "", // Designado para 4
      secondRowCells[6] ? secondRowCells[6].innerText : "", // Data da designação 4
      secondRowCells[7] ? secondRowCells[7].innerText : "", // Data da conclusão 4
    ];

    data.push(rowData);
  }

  // Add title to PDF
  doc.text(title, startX, startY,);
  doc.text(title1, startX1, startY1);

  // Use autoTable to add the table to the PDF
  doc.autoTable({
    startY: startY + 40,
    head: headers,
    body: data,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 4,
      halign: "center", // Align all text to center
      valign: "middle", // Align all text to middle
    },
    headStyles: {
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 55 },
      2: { cellWidth: 55 },
      3: { cellWidth: 55 },
      4: { cellWidth: 55 },
      5: { cellWidth: 55 },
      6: { cellWidth: 55 },
      7: { cellWidth: 55 },
      8: { cellWidth: 55 },
      9: { cellWidth: 55 },
      10: { cellWidth: 55 },
      11: { cellWidth: 55 },
      12: { cellWidth: 55 },
      13: { cellWidth: 55 },
    },
    didDrawCell: function (data) {
      // Merge cells logic for the first two rows (headers)
      if (data.row.section === 'head' && data.row.index === 0 && (data.column.index === 0 || data.column.index === 1)) {
        const cellHeight = data.cell.height * 2;
        data.cell.height = cellHeight;
        doc.rect(data.cell.x, data.cell.y, data.cell.width, cellHeight, 'S');
      }
    },
  });

  doc.save("Registro_Designacao_Territorio.pdf");
}
