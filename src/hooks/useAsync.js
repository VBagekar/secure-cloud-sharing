import { useCallback, useEffect, useRef, useState } from 'react'

export const useAsync = (asyncFn, deps = []) => {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [reloadToken, setReloadToken] = useState(0)
  const fnRef = useRef(asyncFn)
  fnRef.current = asyncFn

  useEffect(() => {
    let active = true
    setState((prev) => ({ ...prev, status: 'loading', error: null }))

    Promise.resolve()
      .then(() => fnRef.current())
      .then((data) => {
        if (active) setState({ status: 'success', data, error: null })
      })
      .catch((error) => {
        if (active) setState({ status: 'error', data: null, error })
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  const setData = useCallback((updater) => {
    setState((prev) => ({
      ...prev,
      data: typeof updater === 'function' ? updater(prev.data) : updater,
    }))
  }, [])

  return { ...state, reload, setData }
}
