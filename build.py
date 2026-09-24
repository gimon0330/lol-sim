"""Build the GitHub Pages entrypoint with Python standard library only."""
from pathlib import Path
root = Path(__file__).resolve().parent
bootstrap = "import('./src/game.js').catch(error=>{console.error(error);document.querySelector('#loading').hidden=true;document.querySelector('#error').hidden=false;});"
html = (root/'src/template.html').read_text().replace('/* GAME_MODULE */', bootstrap)
(root/'index.html').write_text(html)
print('Built index.html:', len(html.encode()), 'bytes')
