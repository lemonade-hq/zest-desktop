module.exports = function aboutBruno({ version }) {
  const currentYear = new Date().getFullYear();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, minimum-scale=1.0, initial-scale=1, user-scalable=yes">
        <title>About Zest</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin: 0;
                padding: 10px;
                background-color: #f4f4f4;
                color: #333;
            }
            .logo {
                margin-top: 0px;
            }
            .title {
                font-size: 24px;
                margin-top: 5px;
                font-weight: bold;
                color: #222;
            }
            .description {
                font-size: 12px;
                color: #222;
                margin-top: 5px;
            }
            .buttons {
                margin-top: 5px;
            }
            .footer {
                margin-top: 5px;
                padding: 5px;
                font-size: 14px;
                color: #555;
            }
            .link {
                display: inline-block;
                margin-top: 10px;
                padding: 10px 15px;
                background-color: #F4AA41;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.3s;
            }
            .link:hover {
                background-color: #F4AA41;
            }
        </style>
    </head>
    <body>
      <div class="logo">
      </div>
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#000"/>
  <g fill="none" stroke="#FFF" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 27 27 C 19 27 21 34 21 42 C 21 47 18 50 14 50 C 18 50 21 53 21 58 C 21 66 19 73 27 73"/>
    <path d="M 73 27 C 81 27 79 34 79 42 C 79 47 82 50 86 50 C 82 50 79 53 79 58 C 79 66 81 73 73 73"/>
  </g>
  <path d="M 36 34 H 64 L 36 66 H 64" fill="none" stroke="#FF0083" stroke-width="10" stroke-linecap="square" stroke-linejoin="miter"/>
</svg>
      <h2 class="title">Zest ${version}</h2>
      <p class="description">Zest is based on <a href="https://github.com/usebruno/bruno" target="_blank">Bruno</a> (MIT)</p>
      <footer class="footer">
          ©${currentYear} Lemonade Inc
      </footer>
    </body>
    </html>
  `;
};
