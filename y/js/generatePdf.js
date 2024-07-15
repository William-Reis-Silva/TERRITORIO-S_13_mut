function generatePDF() {
  console.log("Função generatePDF chamada"); // Adicione esta linha para depuração
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');
  doc.setFontSize(12);
  
  const title = "REGISTRO DE DESIGNAÇÃO DE TERRITÓRIO";
  const startX = 40;
  const startY = 40;
  const table = document.getElementById("territoryTable");
  const headers = [];
  const data = [];

  // Get headers
  const headerRows = table.querySelectorAll("thead tr");
  headerRows.forEach((row) => {
    const headerCells = row.querySelectorAll("th");
    const headerArray = [];
    headerCells.forEach((cell) => {
      headerArray.push(cell.innerText);
    });
    headers.push(headerArray);
  });

  console.log("Headers:", headers); // Adicione esta linha para depuração

  // Get data
  const dataRows = table.querySelectorAll("tbody tr");
  dataRows.forEach((row) => {
    const dataCells = row.querySelectorAll("td");
    const dataArray = [];
    dataCells.forEach((cell) => {
      dataArray.push(cell.innerText);
    });
    data.push(dataArray);
  });

  console.log("Data:", data); // Adicione esta linha para depuração

  // Add title to PDF
  doc.text(title, startX, startY);

  // Add headers to PDF
  let currentY = startY + 20;
  headers.forEach((headerRow) => {
    let currentX = startX;
    headerRow.forEach((header) => {
      doc.text(header, currentX, currentY);
      currentX += 60; // Adjust this value to match your table column width
    });
    currentY += 20; // Move to the next line for each header row
  });

  // Add data to PDF
  data.forEach((dataRow) => {
    let currentX = startX;
    dataRow.forEach((data) => {
      doc.text(data, currentX, currentY);
      currentX += 60; // Adjust this value to match your table column width
    });
    currentY += 20; // Move to the next line for each data row
  });

  console.log("Saving PDF"); // Adicione esta linha para depuração
  doc.save("Registro_Designacao_Territorio.pdf");
}
