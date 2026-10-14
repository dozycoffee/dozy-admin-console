/**
 * 열려 있는 모달의 순서. 모달 위에 모달(예: 폼 안의 확인 모달)이 겹쳐 열려도 Esc와 Tab 포커스 가두기는 맨 위 모달만 처리해야 한다.
 * 모달이 열릴 때 `pushModal()`로 층을 만들고 닫힐 때 `remove()`를 부른다.
 */
const stack: symbol[] = []

export function pushModal() {
  const id = Symbol('modal')
  stack.push(id)
  return {
    isTop: () => stack[stack.length - 1] === id,
    remove: () => {
      const index = stack.indexOf(id)
      if (index >= 0) stack.splice(index, 1)
    },
  }
}
