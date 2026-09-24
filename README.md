# lol-sim

Three.js 기반 이즈리얼 이동·스킬 연습장. 기본 스킨의 금발, 고글, 갈색 재킷, 푸른 옷깃, 왼팔 마법 장갑을 참고해 직접 만든 스타일화된 로우폴리 3D 팬 모델을 사용합니다. 공식 게임의 모델/텍스처/애니메이션을 추출한 것이 아니며 원작과 동일한 그래픽 품질을 구현한 버전은 아닙니다.

## 구현된 기능

- 좌클릭 / 우클릭 / 터치로 이동, 이동 중 목적지 변경
- 이동 방향으로 부드럽게 회전
- 어깨·팔꿈치·골반·무릎 관절의 걷기 모션, 몸통 움직임, 스카프 흔들림
- 대기 중 호흡 및 고개 움직임, 마법 장갑 발광
- 이동 범위 제한, 확대·축소, 캐릭터 중심 보기, 초기화

Q/W/E/R의 시전, 투사체, 순간이동, 쿨타임과 적중 로직을 구현했습니다. **이번 버전에는 적을 생성하지 않습니다.** 적중·표식·피해·E 자동 공격은 주입 가능한 적 인터페이스 및 테스트로 검증했으며, 실제 적과 기본 공격·패시브는 후속 작업입니다.

| 스킬 | 현재 동작 | 쿨타임 |
|---|---|---|
| Q 신비한 화살 | 첫 적에게 피해 50. 적중 시 Q/W/E/R 남은 쿨타임 각각 1초 감소 | 3초 |
| W 정수의 흐름 | 첫 적을 5초간 둘러싸는 표식. 다른 스킬 적중 시 표식을 소모하고 해당 스킬 피해 + 100 | 6초* |
| E 비전 이동 | 커서 쪽으로 최대 25 이동. 도착 위치에서 25 이내 적에게 유도탄, 피해 50* | 10초* |
| R 정조준 일격 | 1초* 준비 후 넓은 관통 투사체. 적마다 한 번 피해 200* | 20초* |

별표 값과 Q/W/R 사거리·투사체 속도는 시험용 임시 설정이며 원작 수치가 아닙니다. E 사거리와 탐색 범위 25는 요청한 20~30 범위에서 선택했습니다. E는 W 표식이 있는 적을 우선하고, 같은 우선순위에서는 가장 가까운 적을 선택합니다. 설정은 `src/combat/spells.js`의 `SPELLS`에서 수정합니다.

## 실행

Python: `python -m http.server 8000`

또는 Node.js: `npm run dev`

이후 http://localhost:8000 접속. 별도 패키지 설치는 필요 없습니다. ES 모듈이므로 HTML을 파일 탐색기에서 직접 여는 대신 서버를 사용하세요. Three.js r160을 저장소에 포함해 CDN에 의존하지 않습니다.

## 조작

| 입력 | 동작 |
|---|---|
| 좌클릭 / 우클릭 / 터치 | 이동 |
| Q / W / E / R | 마우스 위치로 즉시 시전 |
| 스킬 버튼 → 바닥 클릭 / 터치 | 선택한 스킬 시전 |
| 우클릭 / Escape | 스킬 선택 취소 (우클릭은 이동도 실행) |
| S / Escape | 이동 정지 (이미 시작한 시전은 유지) |
| Space | 캐릭터 중심 보기 |
| 마우스 휠 | 확대 / 축소 |
| 연습 초기화 버튼 | 위치·카메라·쿨타임·투사체·표식 초기화 |

## GitHub Pages

저장소 **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**를 선택합니다.

배포 완료 후 주소: https://gimon0330.github.io/lol-sim/

저장소에 코드를 올리는 것만으로 Pages가 자동 활성화되지는 않습니다.

## 구조

- `src/characters/ezreal.js`: 캐릭터 모델, 관절, 걷기/대기 애니메이션
- `src/game.js`: 연습장, 카메라, 이동, 조준, 스킬 입력과 UI
- `src/combat/spells.js`: 스킬 설정, 시전·충돌·피해·쿨타임·표식
- `src/combat/spell-effects.js`: 투사체·표식·순간이동 이펙트, 팔 시전 모션
- `src/template.html`: 화면 레이아웃 원본
- `index.html`: Pages 진입점
- `build.py`: 템플릿에서 진입점 생성 (`python build.py`)
- `dev-server.mjs`: 외부 의존성 없는 개발 서버
- `vendor/`: Three.js와 MIT 라이선스
- `tests/movement.mjs`: 모델·이동·QWER 입력 통합 검증 (`node tests/movement.mjs`)
- `tests/spells.mjs`: 피해·쿨타임·충돌·표식·자동 표적 검증 (`node tests/spells.mjs`)
- `docs/spells.md`: 정확한 스킬 동작과 적 연동 계약
- `docs/character-reference.md`: 외형 참고 출처 및 스킬 후속 작업 범위

`src/game.js`와 캐릭터 모듈은 수정 즉시 반영됩니다. 템플릿 수정 시에만 빌드가 필요합니다. 캐릭터 모듈은 `root`, `body`, `head`, `arms`, `legs`, `gauntlet`, `muzzle`, `animate()`를 반환합니다. 추후 투사체는 `muzzle.getWorldPosition()`을 기준으로 생성할 수 있습니다.

## 검증과 제한

구문 검사 및 실제 Three.js 객체를 사용한 이동/모델/스킬 로직 검증을 통과했습니다. W→Q=150, Q 전체 쿨타임 감소, W 만료/갱신, R 관통과 중복 피해 방지, E 사거리/표적 우선순위/무대상 동작, 스킬 입력과 초기화를 확인했습니다. 검증 환경의 브라우저는 WebGL이 비활성화되어 실제 렌더링과 애니메이션의 시각적 검증은 완료하지 못했습니다. WebGL 오류 안내 화면은 확인했습니다.

현재 직선 이동과 스킬 연습을 지원합니다. 적, 기본 공격, 패시브, 장애물 경로 탐색, 멀티플레이는 미구현입니다. 시전 준비 중에는 이동과 다른 스킬을 막습니다. 쿨타임은 시전 시작부터 계산하며 비활성 탭에서는 게임 시뮬레이션을 일시 정지합니다.

## 출처

- 공식 이즈리얼 소개: https://www.leagueoflegends.com/ko-kr/champions/ezreal/
- 외형 렌더 참고: https://leagueoflegends.fandom.com/wiki/Ezreal/LoL
- Three.js: https://github.com/mrdoob/three.js/tree/r160

이즈리얼과 League of Legends 관련 캐릭터 및 명칭은 Riot Games의 자산입니다. 본 프로젝트는 비공식 팬 프로토타입이며 Riot Games와 제휴하지 않습니다. 저장소의 기존 LICENSE는 유지하며, Three.js의 라이선스는 `vendor/THREE-LICENSE.txt`를 참고하세요.
