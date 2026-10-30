import { useState } from 'react'
import { CircleCheck, CircleX, PackageCheck } from 'lucide-react'
import { Alert, Button, inputClass } from './ui'
import { completeRequest, decideRequest } from '../lib/api'
import { friendlyError } from '../lib/errors'
import { validateComment } from '../lib/validation'
import { LIMITS } from '../lib/constants'

export function DecisionPanel({ request, onDone }) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const fieldId = `decision-comment-${request.id}`

  async function decide(decision) {
    setError(null)
    const message = validateComment(comment, { required: decision === 'Rejected' })
    if (message) {
      setError(message)
      return
    }
    setBusy(decision)
    try {
      const updated = await decideRequest(request.id, decision, comment)
      setComment('')
      onDone?.(decision, updated)
    } catch (err) {
      setError(friendlyError(err, 'Unable to record the decision. Please try again.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-slate-700">
          Decision comment <span className="font-normal text-slate-400">(required to reject)</span>
        </label>
        <textarea
          id={fieldId}
          rows={3}
          value={comment}
          maxLength={LIMITS.commentMax}
          onChange={(e) => setComment(e.target.value)}
          className={inputClass}
          placeholder="Reason for your decision"
        />
        <p className="mt-1 text-right text-xs text-slate-400">
          {comment.length}/{LIMITS.commentMax}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="success" loading={busy === 'Approved'} disabled={Boolean(busy)} onClick={() => decide('Approved')}>
          {busy !== 'Approved' && <CircleCheck className="h-4 w-4" aria-hidden="true" />}
          Approve
        </Button>
        <Button variant="danger" loading={busy === 'Rejected'} disabled={Boolean(busy)} onClick={() => decide('Rejected')}>
          {busy !== 'Rejected' && <CircleX className="h-4 w-4" aria-hidden="true" />}
          Reject
        </Button>
      </div>
    </div>
  )
}

export function CompletePanel({ request, onDone }) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const fieldId = `complete-comment-${request.id}`

  async function complete() {
    setError(null)
    const message = validateComment(comment)
    if (message) {
      setError(message)
      return
    }
    setBusy(true)
    try {
      const updated = await completeRequest(request.id, comment)
      setComment('')
      onDone?.(updated)
    } catch (err) {
      setError(friendlyError(err, 'Unable to complete the request. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert type="error">{error}</Alert>}
      <div>
        <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-slate-700">
          Fulfilment note <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id={fieldId}
          rows={3}
          value={comment}
          maxLength={LIMITS.commentMax}
          onChange={(e) => setComment(e.target.value)}
          className={inputClass}
          placeholder="What was delivered or done"
        />
      </div>
      <Button variant="primary" loading={busy} onClick={complete}>
        {!busy && <PackageCheck className="h-4 w-4" aria-hidden="true" />}
        Mark as completed
      </Button>
    </div>
  )
}