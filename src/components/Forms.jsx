import { normalizeBillingStatus } from '../utils/storage'

export function Modal({ title, onClose, children, actions }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
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
  return (
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
        POD
        <input
          list="pod-options"
          value={value.pod}
          onChange={(e) => set('pod', e.target.value)}
          placeholder="e.g. Velocity"
        />
        <datalist id="pod-options">
          {pods.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <label>
        Role
        <input value={value.role} onChange={(e) => set('role', e.target.value)} />
      </label>
      <label>
        Skill
        <input
          value={value.skill || ''}
          onChange={(e) => set('skill', e.target.value)}
          placeholder="e.g. Data Engineering, Databricks, BA/DA"
          list="skill-options"
        />
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
      </label>
      <label>
        Assignee
        <input
          value={value.assignee}
          onChange={(e) => set('assignee', e.target.value)}
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
        Billing Status
        <select
          value={normalizeBillingStatus(value.billingStatus)}
          onChange={(e) => set('billingStatus', e.target.value)}
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
          value={value.allocation}
          onChange={(e) => set('allocation', e.target.value)}
          placeholder="100% / 0.5 / Shared"
        />
      </label>
      <label>
        Onboard Month
        <input
          value={value.onboardMonth}
          onChange={(e) => set('onboardMonth', e.target.value)}
          placeholder="April 2026"
        />
      </label>
      <label>
        End Date
        <input
          value={value.endDate}
          onChange={(e) => set('endDate', e.target.value)}
          placeholder="Dec-2026"
        />
      </label>
      <label className="full">
        Remarks
        <textarea
          rows={3}
          value={value.remarks}
          onChange={(e) => set('remarks', e.target.value)}
        />
      </label>
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
        Onboarded team member
        <input
          value={value.onboardedMember}
          onChange={(e) => set('onboardedMember', e.target.value)}
          placeholder="Name of person onboarded"
        />
      </label>
      <label>
        New / Replacement
        <input
          value={value.newOrReplacement}
          onChange={(e) => set('newOrReplacement', e.target.value)}
          placeholder="New / Replacement of ..."
        />
      </label>
      <label>
        No. Positions
        <input
          type="number"
          min="1"
          value={value.positions}
          onChange={(e) => set('positions', Number(e.target.value) || 1)}
        />
      </label>
      <label>
        Status
        <select
          value={value.status}
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
