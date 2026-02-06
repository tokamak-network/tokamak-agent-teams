# Tokamak Agent Teams

Anthropic의 [**"How we built a C compiler using Claude as our coding agent"**](https://www.anthropic.com/engineering/building-c-compiler) 글에서 영감을 받아 만든 프로젝트입니다. 여러 Claude 에이전트가 Git을 통해 협업하며 자율적으로 소프트웨어를 만들어내는 방식을, 미니 게임 개발에 적용해봤습니다.

## How It Works

게임 이름을 입력하면 N개의 Claude 에이전트가 Docker 컨테이너에서 각자 동작합니다. 중앙 오케스트레이터 없이, 공유 Git 저장소를 통해서만 협업합니다.

```bash
./forge.sh pingpong 3
```

1. 게임 스펙(`SPEC.md`)을 자동 생성
2. 각 에이전트가 `CLAUDE.md`(헌법)을 읽고 다음 할 일을 스스로 판단
3. 파일 기반 태스크 잠금으로 작업 충돌 방지
4. 구현 → 테스트 → 커밋 → 푸시를 반복
5. 실시간 대시보드(`http://localhost:3000`)에서 진행 상황 확인

## Ping Pong — First Game

첫 번째로 만들어본 게임은 Ping Pong입니다. 3개의 에이전트가 93개의 커밋, 1,234줄의 코드, 32개의 태스크를 자율적으로 완료했습니다.

[`games/pingpong/index.html`](games/pingpong/index.html)을 브라우저에서 열면 플레이할 수 있습니다.

## Quick Start

```bash
cp .env.example .env
# .env에 ANTHROPIC_API_KEY 설정

./forge.sh <game-name> <agent-count>
```
