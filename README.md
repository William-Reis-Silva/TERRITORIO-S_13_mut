

# Projeto de Registro de Designação de Território
Sistema de controle de território com mapas e formulário S_13
Este projeto tem como objetivo gerenciar e gerar relatórios em PDF dos registros de designação de território, utilizando Firebase para hospedagem e Cloud Functions para a geração de PDFs com Python. 
[]Falta implementar o python

## Estrutura do Projeto

```
meu_projeto/
│
├── public/
│   ├── index.html
│   ├── css/
│   │   └── S_13.css
│   ├── js/
│   │   ├── Firebaseconfig.js
│   │   ├── S_13.js
│   │   └── generatePdf.js
│   └── ...
├── functions/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
├── requirements.txt
├── firebase.json
├── .firebaserc
└── README.md
```

## Passos para Configurar o Projeto

### 1. Criar um Projeto no Firebase

- Acesse [Firebase Console](https://console.firebase.google.com/).
- Clique em "Add project" e siga as instruções para criar um novo projeto.

### 2. Instalar a Firebase CLI

```bash
npm install -g firebase-tools
```

### 3. Inicializar o Firebase no Projeto

No diretório raiz do seu projeto (`meu_projeto`), execute:

```bash
firebase login
firebase init
```

Durante a inicialização, selecione "Hosting" e "Functions".

### 4. Configurar Firebase Hosting

- **firebase.json**:

  ```json
  {
    "hosting": {
      "public": "public",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "function": "app"
        }
      ]
    }
  }
  ```

- **.firebaserc**:

  ```json
  {
    "projects": {
      "default": "YOUR_PROJECT_ID"
    }
  }
  ```

### 5. Configurar Cloud Functions para Python

1. **Estrutura do Projeto com Cloud Functions:**

   ```
   meu_projeto/
   │
   ├── public/
   │   ├── index.html
   │   ├── css/
   │   │   └── S_13.css
   │   ├── js/
   │   │   ├── Firebaseconfig.js
   │   │   ├── S_13.js
   │   │   └── generatePdf.js
   │   └── ...
   ├── functions/
   │   ├── main.py
   │   ├── requirements.txt
   │   └── ...
   ├── requirements.txt
   ├── firebase.json
   └── .firebaserc
   ```

2. **Configurar o `main.py` para Cloud Functions:**

   - **functions/main.py**:

     ```python
     from flask import Flask, request, send_file
     import pdfkit
     import os

     app = Flask(__name__)

     @app.route('/generate-pdf', methods=['POST'])
     def generate_pdf():
         data = request.json
         html_content = data.get('html')
         
         html_template = f"""
         <!DOCTYPE html>
         <html lang="pt-br">
         <head>
           <meta charset="UTF-8" />
           <meta name="viewport" content="width=device-width, initial-scale=1.0" />
           <title>Foulario S_13</title>
           <style>
             @page {{
               size: A4;
               margin: 1cm;
             }}
             body {{
               width: 21cm;
               height: 29.7cm;
               margin: 0 auto;
               padding: 20px;
               box-sizing: border-box;
               font-family: Arial, sans-serif;
               background-color: #f4f4f9;
               color: #333;
             }}
             h2 {{
               text-align: center;
               font-size: 24px;
               margin-bottom: 20px;
             }}
             table {{
               width: 100%;
               border-collapse: collapse;
               margin-bottom: 20px;
               background-color: #fff;
               box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
             }}
             th, td {{
               border: 1px solid #ddd;
               padding: 12px;
               text-align: center;
               font-size: 14px;
             }}
             th {{
               background-color: #f2f2f2;
               color: #333;
             }}
             tr:nth-child(even) {{
               background-color: #f9f9f9;
             }}
             tr:hover {{
               background-color: #f1f1f1;
             }}
           </style>
         </head>
         <body>
           <h2>REGISTRO DE DESIGNAÇÃO DE TERRITÓRIO</h2>
           <table>
             {html_content}
           </table>
         </body>
         </html>
         """

         # Save the HTML to a file
         html_file = '/tmp/table.html'
         with open(html_file, 'w', encoding='utf-8') as f:
             f.write(html_template)

         # Convert HTML file to PDF
         pdf_file = '/tmp/TerritoryReport.pdf'
         pdfkit.from_file(html_file, pdf_file)

         # Remove the HTML file
         os.remove(html_file)

         # Send the PDF file to the client
         return send_file(pdf_file, as_attachment=True)

     if __name__ == '__main__':
         app.run(debug=True)
     ```

   - **functions/requirements.txt**:

     ```plaintext
     Flask
     pdfkit
     ```

3. **Deploy as Cloud Functions:**

   Primeiro, navegue até o diretório `functions`:

   ```bash
   cd functions
   ```

   Instale as dependências:

   ```bash
   pip install -r requirements.txt
   ```

   Volte ao diretório raiz e execute:

   ```bash
   firebase deploy --only functions
   ```

### 6. Deploy do Firebase Hosting

Execute o comando para deploy do Firebase Hosting:

```bash
firebase deploy --only hosting
```

Com isso, seu site estará hospedado e as funções configuradas no Firebase. Você poderá acessar o site e usar a funcionalidade de geração de PDFs conforme configurado.

### Notas Finais

Certifique-se de que o caminho para o executável `wkhtmltopdf` está correto. Caso contrário, especifique-o na configuração do `pdfkit`:

```python
config = pdfkit.configuration(wkhtmltopdf='/usr/local/bin/wkhtmltopdf')
pdfkit.from_file(html_file, pdf_file, configuration=config)
```

Se você tiver alguma dúvida ou problema, consulte a documentação oficial do Firebase ou busque ajuda na comunidade.

