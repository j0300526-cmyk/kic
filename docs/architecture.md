# AlphaMix 시스템 아키텍처

## 1. 제품 범위

AlphaMix는 기관투자자의 포트폴리오 의사결정을 지원하는 MVP입니다. 여섯 전문
Agent가 자산별 의견을 생성하고 Critic이 이를 검증하며, TPA(Total Portfolio
Approach) 최적화 엔진이 사용자가 설정한 믹스를 투자 가능한 자산배분으로
변환합니다.

MVP의 범위는 의사결정 지원이며 주문관리나 자율매매 시스템은 포함하지
않습니다. Agent 분석은 결정론적 모의 데이터를 사용하고, 상단 시장 티커는
Yahoo Finance 지연 시세를 사용하므로 API 키 없이 실행할 수 있습니다.

## 2. 시스템 구성

```text
React / TypeScript / Vite
  종합 현황 | Agent 분석 | 믹싱 콘솔 | 최적화 | 글로벌 리스크 | 시나리오 | 보고서
                    |
                    | JSON over /api/v1
                    v
FastAPI / Pydantic
  분석 서비스 ----- LangGraph 워크플로 ----- 전문 Agent 6개 + Critic
  믹싱 서비스 ----- 점수 통합
  포트폴리오 서비스 --- CVXPY TPA 최적화
  시장 데이터 서비스 --- Yahoo Finance 지연 시세 + 60초 캐시
  리스크 이벤트 서비스 --- GDELT DOC 기사 + 분류·위치·영향 추정 + 15분 캐시
  시나리오 서비스 ----- SQLite 저장소
             |                         |
        결정론적 샘플 데이터       Yahoo Finance / GDELT
```

## 3. 주요 구성요소

### 프론트엔드

- `frontend/src`: 단일 페이지 React 애플리케이션입니다.
- 중앙 애플리케이션 상태가 프리셋, 활성 상태, 원시 페이더 값, 정규화 가중치,
  기준 결과와 현재 결과를 관리합니다.
- Recharts로 자산배분, 위험·수익, 변경 전후 비교를 표시합니다.
- Natural Earth `world-atlas` 지형을 SVG로 렌더링해 별도 지도 키 없이 뉴스 위치와
  심각도를 표시합니다.
- 모든 분석에 `mock` 또는 `llm` 데이터 출처를 명시합니다.
- 활성 가중치 합계가 0이면 최적화 요청 전과 API 양쪽에서 거부합니다.

### 백엔드

- `backend/app/api`: 버전이 지정된 FastAPI 라우터입니다.
- `backend/app/schemas`: 공용 Pydantic 요청·응답 계약입니다.
- `backend/app/agents`: 전문 Agent, Critic, LangGraph 오케스트레이션 그래프입니다.
- `backend/app/services`: 점수 믹싱, 최적화, 시나리오, 보고서 서비스입니다.
- 시장 데이터 서비스는 네 지표를 병렬 조회하고 60초 메모리 캐시, 마지막 정상값,
  명시적 샘플 fallback 순으로 장애를 처리합니다.
- 리스크 이벤트 서비스는 GDELT 기사 한 번의 통합 질의, 15분 메모리 캐시,
  마지막 정상값, 명시적 모의 이벤트 순으로 장애와 호출 제한을 처리합니다.
- 기사 제목을 결정론적으로 분쟁·정책·무역·거시경제로 분류하고, 보수적인 지역
  사전 매칭과 Agent·자산 영향 규칙을 적용합니다. 자동 추정은 원문 사실과 분리해
  경고하며 투자 판단 전에 교차 확인하도록 합니다.
- `backend/app/data`: 재현 가능한 실행을 위한 버전별 샘플 가정입니다.
- `backend/app/db`: SQLite 모델과 저장소입니다.

### Agent 워크플로

```text
시작 -> 전문 Agent 6개 병렬 분석 -> Critic
     -> [승인] 통합
     -> [재분석 요청] 해당 Agent 보정 -> Critic -> 통합
```

Mock 경로와 LLM 경로는 동일한 `AgentAnalysis` 스키마를 반환합니다. 모델
어댑터는 환경변수로 선택하며, 모델 설정이 없을 때는 모의 모드로 실행합니다.
비밀정보는 저장소에 커밋하지 않습니다.

Critic은 믹싱 대상 의견이 아닙니다. 출처 존재 여부, 기준일, 점수 범위, 내부
일관성, 신뢰도와 한계 공개 여부를 검증합니다. 수정 단계를 최대 한 번으로
제한해 무한 반복을 방지합니다.

## 4. 금융 모델

초기 지원 자산:

| ID | 표시명 | 역할 |
| --- | --- | --- |
| `us_equity` | 미국 주식 | 성장·위험자산 |
| `us_treasury` | 미국 국채 | 듀레이션·방어자산 |
| `gold` | 금 | 인플레이션·지정학 헤지 |
| `cash` | 현금 | 유동성 준비자산 |

각 활성 Agent는 `[-1, 1]` 범위의 표준화 점수를 제공합니다. 원시 페이더 값은
활성 Agent 안에서 다음과 같이 정규화합니다.

```text
normalized_weight_i = raw_weight_i / sum(enabled raw weights)
mixed_score_asset = sum(normalized_weight_i * agent_score_i, i)
adjusted_return_asset = base_return_asset + score_scale_asset * mixed_score_asset
```

볼록 최적화 엔진은 위험조정 기대수익률을 최대화합니다.

```text
maximize adjusted_return @ w - risk_aversion * quad_form(w, covariance)
```

완전 투자, 매수 전용 비중, 자산별 상한, 최소 현금, 유동성 예산, 최대 변동성
제약을 적용합니다. 필수 위험 한도는 점수 믹싱 후 별도의 요청 제약으로
적용되므로 위험관리 Agent의 페이더가 0%여도 계속 유지됩니다.

제약을 만족할 수 없으면 제약을 임의로 완화하지 않고 구조화된
`OPTIMIZATION_INFEASIBLE` 오류를 반환합니다.

## 5. 영속성과 재현성

- SQLite에 이름이 지정된 믹스 시나리오와 최적화 스냅샷을 저장합니다.
- 요청에는 `analysis_run_id`, `model_version`, `data_as_of`, 정규화 가중치,
  제약조건, 결정론적 입력 가정을 기록합니다.
- Mock 결과는 난수 대신 고정 입력을 사용합니다.
- 자금 집행과 개인정보 처리는 MVP 범위에 포함하지 않습니다.

## 6. 보안과 신뢰성

- Pydantic으로 값 범위와 필드 간 제약을 검증합니다.
- 설정을 통해 CORS 허용 대상을 제한합니다.
- API 오류는 고정 코드, 사람이 읽을 수 있는 메시지, 선택적 상세정보를
  포함합니다.
- 출처가 하나도 없는 Agent 주장은 Critic이 경고로 표시합니다.
- 최적화 엔진은 응답 전에 비중 합계와 모든 제약을 수치 허용오차 안에서
  재검증합니다.
- Yahoo Finance 시세는 지연 데이터로 표시하고 영속 저장하지 않습니다. 공개·상업
  서비스에서는 재배포 권한이 있는 정식 공급자로 provider를 교체해야 합니다.

