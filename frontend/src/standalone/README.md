# 독립형 AlphaMixingConsole

`AlphaMixingConsole.tsx`는 AlphaMix의 믹싱 콘솔만 다른 React + TypeScript
프로젝트로 복사할 수 있도록 만든 단일 파일 컴포넌트입니다.

- React 외 추가 패키지가 필요하지 않습니다.
- CSS, 6개 Agent 정의, 프리셋, 정규화 로직이 파일 안에 포함됩니다.
- 활성 Agent의 최종 반영률은 합계가 정확히 `100.0%`가 되도록 계산됩니다.
- 활성 가중치가 모두 0이면 `valid: false`와 `normalizedWeights: null`을 반환합니다.

```tsx
import AlphaMixingConsole from './AlphaMixingConsole'

export function App() {
  return (
    <AlphaMixingConsole
      onChange={({ controls, normalizedWeights, valid }) => {
        console.log({ controls, normalizedWeights, valid })
      }}
    />
  )
}
```

부모가 상태를 직접 관리하려면 `value`와 `onChange`를 함께 전달합니다.
