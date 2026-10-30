import { supabase } from './supabase'
import { cleanText } from './validation'
import { OPEN_STATUSES } from './constants'
import { todayISO } from './format'

// Two foreign keys point from service_requests to profiles, so the embed names the constraint explicitly.
export const REQUEST_SELECT = `
  id, reference, title, description, priority, status,
  submitted_at, due_date, decided_at, decision_comment, completed_at, updated_at,
  department_id, request_type_id, requester_id, decided_by,
  department:departments(name),
  request_type:request_types(name),
  requester:profiles!service_requests_requester_id_fkey(full_name, email),
  decider:profiles!service_requests_decided_by_fkey(full_name)
`

export async function fetchLookups() {
  const [departments, requestTypes] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
    supabase.from('request_types').select('id, name').order('name'),
  ])
  if (departments.error) throw departments.error
  if (requestTypes.error) throw requestTypes.error
  return { departments: departments.data, requestTypes: requestTypes.data }
}

export async function fetchRequests() {
  const { data, error } = await supabase
    .from('service_requests')
    .select(REQUEST_SELECT)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchRequestById(id) {
  const { data, error } = await supabase.from('service_requests').select(REQUEST_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchPendingApprovals() {
  const { data, error } = await supabase
    .from('service_requests')
    .select(REQUEST_SELECT)
    .eq('status', 'Pending Approval')
    .order('submitted_at', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchHistory(requestId) {
  const { data, error } = await supabase
    .from('request_status_history')
    .select('id, from_status, to_status, comment, changed_at, actor:profiles!request_status_history_changed_by_fkey(full_name, role)')
    .eq('request_id', requestId)
    .order('changed_at', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

// All writes go through SECURITY DEFINER database functions that enforce role and lifecycle rules.
export async function submitRequest(values) {
  const { data, error } = await supabase.rpc('submit_request', {
    p_title: cleanText(values.title),
    p_description: cleanText(values.description),
    p_department_id: Number(values.departmentId),
    p_request_type_id: Number(values.requestTypeId),
    p_priority: values.priority,
  })
  if (error) throw error
  return data
}

export async function decideRequest(requestId, decision, comment) {
  const { data, error } = await supabase.rpc('decide_request', {
    p_request_id: requestId,
    p_decision: decision,
    p_comment: cleanText(comment) || null,
  })
  if (error) throw error
  return data
}

export async function completeRequest(requestId, comment) {
  const { data, error } = await supabase.rpc('complete_request', {
    p_request_id: requestId,
    p_comment: cleanText(comment) || null,
  })
  if (error) throw error
  return data
}

export function isOverdue(request) {
  return OPEN_STATUSES.includes(request.status) && Boolean(request.due_date) && request.due_date < todayISO()
}