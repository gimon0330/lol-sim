# lol-sim

Three.js 기반 이즈리얼 클릭 이동 연습장. 기본 스킨의 금발, 고글, 갈색 재킷, 푸른 옷깃, 왼팔 마법 장갑을 참고해 직접 만든 스타일화된 로우폴리 3D 팬 모델을 사용합니다. 공식 게임의 모델/텍스처/애니메이션을 추출한 것이 아니며 원작과 동일한 그래픽 품질을 구현한 버전은 아닙니다.

## 구현된 기능

- 좌클릭 / 우클릭 / 터치로 이동, 이동 중 목적지 변경
- 이동 방향으로 부드럽게 회전
- 어깨·팔꿈치·골반·무릎 관절의 걷기 모션, 몸통 움직임, 스카프 흔들림
- 대기 중 호흡 및 고개 움직임, 마법 장갑 발광
- 이동 범위 제한, 확대·축소, 캐릭터 중심 보기, 초기화

**현재 범위는 캐릭터 외형과 이동입니다. Q/W/E/R, 기본 공격, 피해 판정, 패시브는 아직 구현하지 않았습니다.**

## 실행

Python: `python -m http.server 8000`

또는 Node.js: `npm run dev`

이후 http://localhost:8000 접속. 별도 패키지 설치는 필요 없습니다. ES 모듈이므로 HTML을 파일 탐색기에서 직접 여는 대신 서버를 사용하세요. Three.js r160을 저장소에 포함해 CDN에 의존하지 않습니다.

## 조작

| 입력 | 동작 |
|---|---|
| 좌클릭 / 우클릭 / 터치 | 이동 |
| S / Escape | 정지 |
| Space | 캐릭터 중심 보기 |
| 마우스 휠 | 확대 / 축소 |
| 위치 초기화 버튼 | 캐릭터와 카메라 초기화 |

## GitHub Pages

저장소 **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**를 선택합니다.

배포 완료 후 주소: https://gimon0330.github.io/lol-sim/

저장소에 코드를 올리는 것만으로 Pages가 자동 활성화되지는 않습니다.

## 구조

- `src/characters/ezreal.js`: 캐릭터 모델, 관절, 걷기/대기 애니메이션
- `src/game.js`: 연습장, 카메라, 클릭 판정, 이동
- `src/template.html`: 화면 레이아웃 원본
- `index.html`: Pages 진입점
- `build.py`: 템플릿에서 진입점 생성 (`python build.py`)
- `dev-server.mjs`: 외부 의존성 없는 개발 서버
- `vendor/`: Three.js와 MIT 라이선스
- `tests/movement.mjs`: WebGL을 제외한 모델·이동 로직 검증 (`node tests/movement.mjs`)
- `docs/character-reference.md`: 외형 참고 출처 및 스킬 후속 작업 범위

`src/game.js`와 캐릭터 모듈은 수정 즉시 반영됩니다. 템플릿 수정 시에만 빌드가 필요합니다. 캐릭터 모듈은 `root`, `body`, `head`, `arms`, `legs`, `gauntlet`, `muzzle`, `animate()`를 반환합니다. 추후 투사체는 `muzzle.getWorldPosition()`을 기준으로 생성할 수 있습니다.

## 검증과 제한

구문 검사 및 실제 Three.js 객체를 사용한 이동/모델 검증을 통과했습니다. 검증 환경의 브라우저는 WebGL이 비활성화되어 실제 렌더링과 애니메이션의 시각적 검증은 완료하지 못했습니다. WebGL 오류 안내 화면은 확인했습니다.

현재 직선 이동만 지원합니다. 장애물 경로 탐색, 전투, 스킬, 멀티플레이는 미구현입니다.

## 출처

- 공식 이즈리얼 소개: https://www.leagueoflegends.com/ko-kr/champions/ezreal/
- 외형 렌더 참고: https://leagueoflegends.fandom.com/wiki/Ezreal/LoL
- Three.js: https://github.com/mrdoob/three.js/tree/r160

이즈리얼과 League of Legends 관련 캐릭터 및 명칭은 Riot Games의 자산입니다. 본 프로젝트는 비공식 팬 프로토타입이며 Riot Games와 제휴하지 않습니다. 저장소의 기존 LICENSE는 유지하며, Three.js의 라이선스는 `vendor/THREE-LICENSE.txt`를 참고하세요.
