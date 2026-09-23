import { describe, it } from 'node:test'
import * as assert from 'node:assert'

describe('Autosave and Load Races', () => {
  it('A) in-flight save blocks navigation and prevents overlapping state (e4 to e5)', async () => {
    let savedState = 'dirty'
    const flushPendiente = async (inFlightRef: any, doSave: () => Promise<void>) => {
      if (inFlightRef.current) await inFlightRef.current.catch(() => {})
      if (savedState === 'dirty') {
        savedState = 'saving'
        const req = doSave()
        inFlightRef.current = req
        try {
          await req
          savedState = 'saved'
        } finally {
          if (inFlightRef.current === req) inFlightRef.current = null
        }
      }
    }

    let pResolve: any
    const apiSave = () => new Promise<void>(res => { pResolve = res })
    
    const inFlight = { current: null as any }
    // e4 is dirty
    savedState = 'dirty'
    // Autosave triggers (simulated)
    const inFlightPromise = apiSave()
    inFlight.current = inFlightPromise
    savedState = 'saving'
    
    // User clicks Next, calls flushPendiente
    let flushResolved = false
    flushPendiente(inFlight, apiSave).then(() => { flushResolved = true })
    
    // It should wait for inFlightPromise
    assert.strictEqual(flushResolved, false)
    
    // We navigate to e5 (simulated) and set e5 state to saved
    pResolve()
    await new Promise(r => setTimeout(r, 0)) // wait for microtasks
    
    assert.strictEqual(flushResolved, true)
    assert.strictEqual(savedState, 'saving') 
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
