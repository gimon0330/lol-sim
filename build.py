"""Build the GitHub Pages entrypoint with Python standard library only."""
from pathlib import Path
root = Path(__file__).resolve().parent
bootstrap = "import('./src/game.js').catch(error=>{console.error(error);document.querySelector('#loading').hidden=true;const panel=document.querySelector('#error');if(!panel.dataset.shown){const title=document.querySelector('#error-title');const copy=document.querySelector('#error-copy');const detail=document.querySelector('#error-detail');if(title)title.textContent='게임 초기화 실패';if(copy)copy.textContent='게임 코드가 실행되지 않았습니다. 아래 오류를 개발자 도구와 함께 확인해 주세요.';if(detail&&!detail.textContent)detail.textContent='실행 오류: '+(error?.message||String(error));panel.dataset.shown='true';}panel.hidden=false;});"
html = (root/'src/template.html').read_text().replace('/* GAME_MODULE */', bootstrap)
(root/'index.html').write_text(html)
print('Built index.html:', len(html.encode()), 'bytes')
