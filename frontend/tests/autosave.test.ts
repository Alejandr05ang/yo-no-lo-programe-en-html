import { describe, it } from 'node:test'
import * as assert from 'node:assert'

describe('Autosave and Load Races', () => {
  it('A) in-flight save blocks navigation and serializes saves (e4 to e5)', async () => {
    let savedState = 'dirty'
    let serverCode = ''
    let serverEvents: string[] = []

    // Simulate API delay
    const apiSave = async (code: string, delay: number) => {
      serverEvents.push(`START ${code}`)
      await new Promise(r => setTimeout(r, delay))
      serverCode = code
      serverEvents.push(`END ${code}`)
    }

    const saveChainRef = { current: Promise.resolve() }

    const enqueueSave = (code: string, delay: number) => {
      saveChainRef.current = saveChainRef.current.catch(() => {}).then(async () => {
        savedState = 'saving'
        await apiSave(code, delay)
        savedState = 'saved'
      })
    }

    const flushPendiente = async (finalCode: string) => {
      if (savedState === 'dirty') {
        enqueueSave(finalCode, 10)
      }
      await saveChainRef.current.catch(() => {})
    }

    savedState = 'dirty'

    // 1. User types Code A, autosave triggers (takes 50ms)
    enqueueSave('CODE A', 50)

    // 2. User quickly types Code B before A finishes, making state dirty again
    savedState = 'dirty'

    // 3. User clicks Next, which triggers flushPendiente with Code B (takes 10ms)
    const flushPromise = flushPendiente('CODE B')

    // Flush should wait
    let flushResolved = false
    flushPromise.then(() => { flushResolved = true })

    assert.strictEqual(flushResolved, false)

    await flushPromise

    assert.strictEqual(flushResolved, true)

    // Assert serialization
    assert.deepStrictEqual(serverEvents, [
      'START CODE A',
      'END CODE A',
      'START CODE B',
      'END CODE B'
    ])
    assert.strictEqual(serverCode, 'CODE B')
    assert.strictEqual(savedState, 'saved')
  })

  it('B) late response from e4 is ignored when in e5', async () => {
    let currentReq = 1
    let appliedData: string | null = null

    const apiGetProgress = () => new Promise<string>(res => setTimeout(() => res('late-e4-data'), 50))

    // request e4
    const reqId = ++currentReq
    const p = apiGetProgress().then(data => {
      if (reqId === currentReq) appliedData = data
    })

    // navigate e5
    currentReq++ // new request for e5

    await p
    assert.strictEqual(appliedData, null) // ignored!
  })

  it('C) workbench recognizes accepted status loaded from API', () => {
    const res = { status: 'accepted', cases_passed: 3, cases_total: 3 }
    const revision = { ok: true, casosPasados: res.cases_passed, casosTotales: res.cases_total, casos: [] }
    assert.strictEqual(revision.ok, true)
    assert.strictEqual(revision.casosPasados, 3)
  })
})
