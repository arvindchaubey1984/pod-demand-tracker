import {
  createEmptyAssignment,
  normalizeBillingStatus,
  normalizeMemberStatus,
} from '../utils/storage'

export function Modal({ title, onClose, children, actions }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        {children}
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  )
}

export function TeamForm({ value, onChange, pods }) {
  const set = (key, v) => onChange({ ...value, [key]: v })
  const assignments = Array.isArray(value.assignments) ? value.assignments : []

  function updateAssignment(id, key, v) {
    set(
      'assignments',
      assignments.map((a) => (a.id === id ? { ...a, [key]: v } : a)),
    )
  }

  function addAssignment() {
    set('assignments', [...assignments, createEmptyAssignment()])
  }

  function removeAssignment(id) {
    if (assignments.length <= 1) return
    set(
      'assignments',
      assignments.filter((a) => a.id !== id),
    )
  }

  return (
    <div className="team-form">
      <div className="form-grid">
        <label>
          Account
          <input
            value={value.account}
            onChange={(e) => set('account', e.target.value)}
            placeholder="McKesson"
          />
        </label>
        <label>
          Assignee
          <input
            value={value.assignee}
            onChange={(e) => set('assignee', e.target.value)}
            placeholder="Full name"
          />
        </label>
        <label>
          Location
          <select
            value={value.location}
            onChange={(e) => set('location', e.target.value)}
          >
            <option value="India">India</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
            <option value="">TBD</option>
          </select>
        </label>
        <label>
          Employment status
          <select
            value={normalizeMemberStatus(value.status)}
            onChange={(e) => set('status', e.target.value)}
          >
            <option value="Active">Active</option>
            <option value="Released">Released</option>
            <option value="Resigned">Resigned</option>
          </select>
        </label>
      </div>

      <div className="assignments-block">
        <div className="assignments-head">
          <div>
            <h4>POD assignments</h4>
            <p>
              Add every engagement for this person. End one POD and start another here —
              no need for a second team-member row.
            </p>
          </div>
          <button className="btn btn-ghost btn-small" type="button" onClick={addAssignment}>
            + Add assignment
          </button>
        </div>

        {assignments.map((a, index) => (
          <div className="assignment-card" key={a.id}>
            <div className="assignment-card-top">
              <strong>Assignment {index + 1}</strong>
              {assignments.length > 1 ? (
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => removeAssignment(a.id)}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="form-grid">
              <label>
                POD / Project
                <input
                  list="pod-options"
                  value={a.pod}
                  onChange={(e) => updateAssignment(a.id, 'pod', e.target.value)}
                  placeholder="e.g. Velocity / UA 2.0"
                />
              </label>
              <label>
                Role
                <input
                  value={a.role}
                  onChange={(e) => updateAssignment(a.id, 'role', e.target.value)}
                />
              </label>
              <label>
                Skill
                <input
                  value={a.skill || ''}
                  onChange={(e) => updateAssignment(a.id, 'skill', e.target.value)}
                  placeholder="e.g. Java, Databricks"
                  list="skill-options"
                />
              </label>
              <label>
                Billing
                <select
                  value={normalizeBillingStatus(a.billingStatus)}
                  onChange={(e) =>
                    updateAssignment(a.id, 'billingStatus', e.target.value)
                  }
                >
                  <option value="Billable">Billable</option>
                  <option value="Yet to be Billed">Yet to be Billed</option>
                  <option value="Non-Billable">Non-Billable</option>
                  <option value="">Unspecified</option>
                </select>
              </label>
              <label>
                Allocation
                <input
                  value={a.allocation}
                  onChange={(e) => updateAssignment(a.id, 'allocation', e.target.value)}
                  placeholder="100% / 0.5 / Shared"
                />
              </label>
              <label>
                Start (onboard)
                <input
                  value={a.onboardMonth}
                  onChange={(e) =>
                    updateAssignment(a.id, 'onboardMonth', e.target.value)
                  }
                  placeholder="April 2026"
                />
              </label>
              <label>
                End
                <input
                  value={a.endDate}
                  onChange={(e) => updateAssignment(a.id, 'endDate', e.target.value)}
                  placeholder="Sep 2026"
                />
              </label>
              <label className="full">
                Remarks
                <input
                  value={a.remarks}
                  onChange={(e) => updateAssignment(a.id, 'remarks', e.target.value)}
                  placeholder="e.g. Moved from LoopRx from Oct-26"
                />
              </label>
            </div>
          </div>
        ))}

        <datalist id="pod-options">
          {pods.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <datalist id="skill-options">
          <option value="Data Engineering" />
          <option value="Architecture" />
          <option value="DevOps" />
          <option value="BA / DA" />
          <option value="QA" />
          <option value="AI / ML" />
          <option value="Engineering" />
          <option value="BI / Reporting" />
          <option value="Agile / SM" />
          <option value="Delivery / TPM" />
          <option value="UX / Design" />
          <option value="Leadership" />
        </datalist>
      </div>
    </div>
  )
}

export function DemandForm({ value, onChange, projects }) {
  const set = (key, v) => onChange({ ...value, [key]: v })
  return (
    <div className="form-grid">
      <label>
        Project Name
        <input
          list="project-options"
          value={value.projectName}
          onChange={(e) => set('projectName', e.target.value)}
          placeholder="e.g. MHx / IG / Statestreet"
        />
        <datalist id="project-options">
          {projects.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <label>
        Role
        <input value={value.role} onChange={(e) => set('role', e.target.value)} />
      </label>
      <label>
        Location
        <select
          value={value.location}
          onChange={(e) => set('location', e.target.value)}
        >
          <option value="India">India</option>
          <option value="USA">USA</option>
          <option value="UK">UK</option>
          <option value="">TBD</option>
        </select>
      </label>
      <label>
        Demand Open Date
        <input
          type="date"
          value={value.demandOpenDate}
          onChange={(e) => set('demandOpenDate', e.target.value)}
        />
      </label>
      <label>
        Onboarded Member
        <input
          value={value.onboardedMember}
          onChange={(e) => set('onboardedMember', e.target.value)}
        />
      </label>
      <label>
        New / Replacement
        <select
          value={value.newOrReplacement}
          onChange={(e) => set('newOrReplacement', e.target.value)}
        >
          <option value="New">New</option>
          <option value="Replacement">Replacement</option>
        </select>
      </label>
      <label>
        Positions
        <input
          type="number"
          min={1}
          value={value.positions}
          onChange={(e) => set('positions', Number(e.target.value) || 1)}
        />
      </label>
      <label>
        Status
        <select
          value={value.status || 'Open'}
          onChange={(e) => set('status', e.target.value)}
        >
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Filled">Filled</option>
          <option value="On Hold">On Hold</option>
        </select>
      </label>
    </div>
  )
}
