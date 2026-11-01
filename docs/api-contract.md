# AlphaMix API 계약

기본 경로: `/api/v1`

모든 시간은 ISO 8601 UTC 형식입니다. API 응답의 포트폴리오·Agent 가중치는
소수이며, 페이더 입력은 0에서 100 사이의 정수 또는 실수입니다.

## 1. 공용 타입

### 자산

```json
{
  "id": "us_equity",
  "name": "미국 주식"
}
```

### SourceReference

```json
{
  "title": "미국 거시경제 모의 데이터셋",
  "publisher": "AlphaMix 샘플 데이터",
  "url": null,
  "as_of": "2026-10-31"
}
```

### AgentAnalysis

```json
{
  "agent_id": "macro",
  "agent_name": "거시경제 Agent",
  "mode": "mock",
  "assets": ["us_equity", "us_treasury", "gold", "cash"],
  "scores": {
    "us_equity": 0.3,
    "us_treasury": 0.1,
    "gold": 0.2,
    "cash": -0.1
  },
  "sources": [],
  "rationale": "...",
  "confidence": 0.78,
  "uncertainties": ["모의 데이터는 실시간 시장 데이터가 아닙니다."],
  "as_of": "2026-10-31T00:00:00Z"
}
```

규칙: 점수 `[-1, 1]`, 신뢰도 `[0, 1]`, 비어 있지 않은 분석 근거, 하나 이상의
불확실성, 네 자산 전체가 포함되어야 합니다.

### CriticResult

```json
{
  "approved": true,
  "warnings": [],
  "revision_requests": [],
  "checked_agent_ids": ["macro", "valuation", "flow", "risk", "liquidity", "geopolitical"]
}
```

## 2. 분석

### `GET /analysis/latest?mode=mock`

재현 가능한 분석 실행 결과를 반환합니다.

```json
{
  "analysis_run_id": "mock-2026-10-31-v1",
  "mode": "mock",
  "data_as_of": "2026-10-31T00:00:00Z",
  "analyses": [],
  "critic": {},
  "warnings": []
}
```

`mode=llm`은 설정된 모델 어댑터를 사용합니다. 설정이 없으면 API가
`MODEL_NOT_CONFIGURED`를 반환하며 프론트엔드는 Mock 모드로 다시 요청할 수 있습니다.

## 3. 최적화

### `POST /portfolio/optimize`

요청:

```json
{
  "analysis_run_id": "mock-2026-10-31-v1",
  "agent_weights": {
    "macro": 20,
    "valuation": 20,
    "flow": 15,
    "risk": 20,
    "liquidity": 15,
    "geopolitical": 10
  },
  "enabled_agents": ["macro", "valuation", "flow", "risk", "liquidity", "geopolitical"],
  "risk_tolerance": "balanced",
  "constraints": {
    "max_weights": {
      "us_equity": 0.65,
      "us_treasury": 0.70,
      "gold": 0.30,
      "cash": 0.40
    },
    "min_cash": 0.03,
    "max_illiquid_weight": 0.85
  }
}
```

서버는 비활성 Agent의 원시값을 무시하고 활성 가중치 합계가 0보다 큰지 검증한
뒤 1.0으로 정규화합니다.

응답:

```json
{
  "optimization_id": "...",
  "analysis_run_id": "mock-2026-10-31-v1",
  "status": "optimal",
  "normalized_agent_weights": {"macro": 0.2},
  "mixed_scores": {"us_equity": 0.12},
  "base_expected_returns": {"us_equity": 0.075},
  "adjusted_expected_returns": {"us_equity": 0.084},
  "portfolio_weights": {
    "us_equity": 0.45,
    "us_treasury": 0.30,
    "gold": 0.15,
    "cash": 0.10
  },
  "expected_return": 0.061,
  "volatility": 0.098,
  "sharpe_ratio": 0.42,
  "binding_constraints": [],
  "warnings": [],
  "model_version": "tpa-v1",
  "data_as_of": "2026-10-31T00:00:00Z"
}
```

### `GET /portfolio/assumptions`

샘플 모델이 사용하는 자산명, 기준 수익률, 변동성, 공분산, 점수 민감도,
기본 필수 제약을 반환합니다.

## 4. 프리셋과 시나리오

### `GET /presets`

`balanced`, `defensive`, `value` 프리셋 정의를 반환합니다.

### `GET /scenarios`

저장된 시나리오 요약 목록을 반환합니다.

### `POST /scenarios`

이름, 원시 페이더, 활성 Agent, 정규화 가중치, 요청 제약, 현재 최적화
스냅샷을 저장합니다.

### `GET /scenarios/{scenario_id}`

저장된 시나리오 하나를 반환합니다.

### `DELETE /scenarios/{scenario_id}`

시나리오 하나를 삭제하고 HTTP 204를 반환합니다.

## 5. 종합 현황과 보고서

### `GET /market/snapshot`

상단 시장 티커용 Yahoo Finance 지연 시세를 반환합니다. S&P 500(`^GSPC`),
미국 10년물 금리(`^TNX`), 금 선물(`GC=F`), 달러지수(`DX-Y.NYB`)를 60초
메모리 캐시하며, 외부 연결 실패 시 마지막 정상값 또는 명확히 표시된 샘플
fallback을 반환합니다.

```json
{
  "provider": "yahoo_finance",
  "status": "delayed",
  "source_label": "Yahoo Finance",
  "as_of": "2026-10-30T20:47:43Z",
  "cached": false,
  "cache_ttl_seconds": 60,
  "items": [
    {
      "id": "sp500",
      "symbol": "^GSPC",
      "label": "S&P 500",
      "value": 7580.07,
      "formatted_value": "7,580.07",
      "formatted_change": "-1.82%",
      "direction": "negative"
    }
  ],
  "notice": "Yahoo Finance 제공 지연 시세입니다."
}
```

`status`는 `delayed`, `stale`, `fallback` 중 하나입니다. Yahoo Finance 데이터는
연구·교육용 로컬 데모에만 사용하며 공개 서비스에서는 라이선스된 공급자로
교체해야 합니다.

### `GET /overview`

간단한 모의 시장 스냅샷과 최신 기준 자산배분을 반환합니다.

### `POST /reports`

시나리오·최적화 스냅샷을 받아 핵심 요약, Agent 근거, Critic 경고,
포트폴리오 판단 근거, 한계를 포함한 구조화 보고서를 반환합니다. MVP는 이를
웹 화면에 표시합니다.

## 6. 오류 형식

```json
{
  "error": {
    "code": "ZERO_AGENT_WEIGHT",
    "message": "활성 Agent 중 하나 이상에 0보다 큰 가중치를 설정해야 합니다.",
    "details": {"agent_weights": "가중치 합계는 0보다 커야 합니다"}
  }
}
```

주요 오류 코드는 `VALIDATION_ERROR`, `ZERO_AGENT_WEIGHT`,
`ANALYSIS_NOT_FOUND`, `MODEL_NOT_CONFIGURED`, `OPTIMIZATION_INFEASIBLE`,
`SCENARIO_NOT_FOUND`입니다.

