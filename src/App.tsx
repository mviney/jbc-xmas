import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TurnstileWidget } from './lib/TurnstileWidget'
import { TURNSTILE_SITE_KEY } from './lib/turnstile'
import {
  Armchair,
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Leaf,
  MapPin,
  Search,
  Ticket,
  TreePine,
  Users,
  Utensils,
} from 'lucide-react'
import { getPublicAttendees, reserveSeats, searchMembers, type MemberLookupEntry } from './lib/eventData'
import './App.css'

type DietaryRequirement = 'Vegetarian' | 'Nut-Free' | 'Gluten-Free'

type Attendee = {
  id: string
  name: string
  tableNumber: number
  isGuest: boolean
}

const TABLES = Array.from({ length: 15 }, (_, index) => ({
  number: index + 1,
  capacity: 12,
}))

const EXPANDED_KEY = 'jbc-xmas-expanded-tables'

function loadExpandedTables(): number[] {
  try {
    const saved = localStorage.getItem(EXPANDED_KEY)
    return saved ? (JSON.parse(saved) as number[]) : []
  } catch {
    return []
  }
}

function App() {
  const queryClient = useQueryClient()
  const attendeesQuery = useQuery({
    queryKey: ['public-attendees'],
    queryFn: getPublicAttendees,
    refetchInterval: 15_000,
  })
  const attendees = (attendeesQuery.data ?? [])
    .toSorted((left, right) => {
      const tableOrder = left.table_number - right.table_number
      if (tableOrder) return tableOrder

      const hasGroupInfo = left.registered_by_attendee_id !== undefined &&
        right.registered_by_attendee_id !== undefined
      const groupOrder = hasGroupInfo
        ? (left.registered_by_attendee_id ?? left.id).localeCompare(right.registered_by_attendee_id ?? right.id)
        : 0

      return groupOrder || Number(left.is_guest) - Number(right.is_guest) || left.name.localeCompare(right.name)
    })
    .map((attendee) => ({
      id: attendee.id,
      name: attendee.name,
      tableNumber: attendee.table_number,
      isGuest: attendee.is_guest,
    })) satisfies Attendee[]
  const reservationMutation = useMutation({
    mutationFn: reserveSeats,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['public-attendees'] }),
  })
  const [expandedTables, setExpandedTables] = useState<number[]>(loadExpandedTables)
  const [search, setSearch] = useState('')
  const [memberName, setMemberName] = useState('')
  const [selectedMember, setSelectedMember] = useState<MemberLookupEntry | null>(null)
  const [activeMemberSuggestion, setActiveMemberSuggestion] = useState(0)
  const [isMemberListOpen, setIsMemberListOpen] = useState(false)
  const [memberTicket, setMemberTicket] = useState('')
  const [addGuest, setAddGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestTicket, setGuestTicket] = useState('')
  const [dietaryRequirements, setDietaryRequirements] = useState<DietaryRequirement[]>([])
  const [dietaryNotes, setDietaryNotes] = useState('')
  const [guestDietaryRequirements, setGuestDietaryRequirements] = useState<DietaryRequirement[]>([])
  const [guestDietaryNotes, setGuestDietaryNotes] = useState('')
  const [preferredTable, setPreferredTable] = useState(1)
  const [formMessage, setFormMessage] = useState('')
  const [savedMessage, setSavedMessage] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileError, setTurnstileError] = useState(false)
  const [turnstileResetNonce, setTurnstileResetNonce] = useState(0)

  useEffect(() => {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(expandedTables))
  }, [expandedTables])

  const attendeeCount = attendees.length
  const memberCount = attendees.filter((attendee) => !attendee.isGuest).length
  const guestCount = attendeeCount - memberCount
  const totalCapacity = TABLES.reduce((total, table) => total + table.capacity, 0)
  const remainingPlaces = totalCapacity - attendeeCount
  const deferredMemberName = useDeferredValue(memberName.trim())
  const memberSuggestionsQuery = useQuery({
    queryKey: ['member-search', deferredMemberName],
    queryFn: () => searchMembers(deferredMemberName),
    enabled: deferredMemberName.length >= 2 && !selectedMember,
    staleTime: 60_000,
  })
  const memberSuggestions = memberSuggestionsQuery.data ?? []

  const normalizedSearch = search.trim().toLowerCase().replace(/^table\s*/, '')
  const matchingTables = useMemo(() => {
    if (!normalizedSearch) return new Set<number>()

    const matched = new Set<number>()
    const tableSearch = /^\d+$/.test(normalizedSearch)
    if (tableSearch) {
      const number = Number(normalizedSearch)
      if (TABLES.some((table) => table.number === number)) matched.add(number)
    }

    attendees.forEach((attendee) => {
      if (
        attendee.name.toLowerCase().includes(normalizedSearch)
      ) {
        matched.add(attendee.tableNumber)
      }
    })
    return matched
  }, [attendees, normalizedSearch])

  useEffect(() => {
    if (matchingTables.size === 0 || !search.trim()) return
    const firstMatch = Math.min(...matchingTables)
    document.getElementById(`table-${firstMatch}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [matchingTables, search])

  const tableAttendees = (tableNumber: number) =>
    attendees.filter((attendee) => attendee.tableNumber === tableNumber)

  const goToRegistration = (tableNumber?: number) => {
    if (tableNumber) setPreferredTable(tableNumber)
    document.getElementById('registration')?.scrollIntoView({ behavior: 'smooth' })
    window.setTimeout(() => document.getElementById('member-name')?.focus(), 400)
  }

  const toggleDietary = (requirement: DietaryRequirement) => {
    setDietaryRequirements((current) =>
      current.includes(requirement)
        ? current.filter((item) => item !== requirement)
        : [...current, requirement],
    )
  }

  const toggleGuestDietary = (requirement: DietaryRequirement) => {
    setGuestDietaryRequirements((current) =>
      current.includes(requirement)
        ? current.filter((item) => item !== requirement)
        : [...current, requirement],
    )
  }

  const selectMember = (member: MemberLookupEntry) => {
    setSelectedMember(member)
    setMemberName(member.name)
    setActiveMemberSuggestion(0)
    setIsMemberListOpen(false)
  }

  const handleMemberKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && memberSuggestions.length > 0) {
      event.preventDefault()
      setIsMemberListOpen(true)
      setActiveMemberSuggestion((index) => (index + 1) % memberSuggestions.length)
    } else if (event.key === 'ArrowUp' && memberSuggestions.length > 0) {
      event.preventDefault()
      setActiveMemberSuggestion((index) => (index - 1 + memberSuggestions.length) % memberSuggestions.length)
    } else if (event.key === 'Enter' && memberSuggestions[activeMemberSuggestion]) {
      event.preventDefault()
      selectMember(memberSuggestions[activeMemberSuggestion])
    } else if (event.key === 'Escape') {
      setIsMemberListOpen(false)
    }
  }

  const submitReservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormMessage('')
    setSavedMessage(false)

    const memberTicketNumber = memberTicket.trim()
    const guestNumber = guestTicket.trim()
    if (!selectedMember) {
      setFormMessage('Choose a member from the current members list.')
      return
    }

    if (!turnstileToken) {
      setFormMessage('Complete the security check before reserving.')
      return
    }

    if (memberTicketNumber.toLowerCase() === guestNumber.toLowerCase() && addGuest) {
      setFormMessage('Each attendee needs a different ticket number.')
      return
    }
    const seatsRequested = addGuest ? 2 : 1
    const selectedTable = TABLES.find((table) => table.number === preferredTable)
    if (!selectedTable) {
      setFormMessage('Choose a valid table.')
      return
    }
    const seatsAvailable = selectedTable.capacity -
      tableAttendees(preferredTable).length
    if (seatsAvailable < seatsRequested) {
      setFormMessage(`Table ${preferredTable} does not have enough seats for this reservation.`)
      return
    }

    try {
      await reservationMutation.mutateAsync({
        reservation: {
          memberId: selectedMember.id,
          memberTicketNumber,
          tableNumber: preferredTable,
          dietaryRequirements,
          dietaryNotes: dietaryNotes.trim(),
          guestName: addGuest ? guestName.trim() : null,
          guestTicketNumber: addGuest ? guestNumber : null,
          guestDietaryRequirements: addGuest ? guestDietaryRequirements : [],
          guestDietaryNotes: addGuest ? guestDietaryNotes.trim() : '',
        },
        turnstileToken,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('member_already_registered')) {
        setFormMessage(`${selectedMember.name} already has a reservation.`)
      } else if (message.includes('ticket_already_registered') || message.includes('23505')) {
        setFormMessage('That ticket number already has a reservation.')
      } else if (message.includes('table_full')) {
        setFormMessage(`Table ${preferredTable} no longer has enough seats for this reservation.`)
      } else {
        setFormMessage('We could not save your reservation. Please try again.')
      }
      return
    } finally {
      setTurnstileToken('')
      setTurnstileResetNonce((nonce) => nonce + 1)
    }

    setSavedMessage(true)
    setMemberName('')
    setSelectedMember(null)
    setMemberTicket('')
    setAddGuest(false)
    setGuestName('')
    setGuestTicket('')
    setDietaryRequirements([])
    setDietaryNotes('')
    setGuestDietaryRequirements([])
    setGuestDietaryNotes('')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="club-mark" href="#top" aria-label="Joondalup Bridge Club home">
          <span className="mark-icon"><TreePine size={19} strokeWidth={1.7} /></span>
          <span>JOONDALUP<br />BRIDGE CLUB</span>
        </a>
        <nav className="header-nav" aria-label="Main navigation">
          <a href="#registration">Reserve a seat</a>
          <a href="#seating">Seating plan</a>
        </nav>
        <span className="event-chip"><span className="status-dot" /> DECEMBER 2026</span>
      </header>

      <main id="top">
        <section className="intro-section">
          <div className="intro-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> THE ANNUAL CLUB GATHERING</p>
            <h1>Christmas<br /><em>Table Sign-Up</em></h1>
            <p className="intro-description">Save your place at the table. Bring someone along.<br className="desktop-break" /> We’ll take care of the rest.</p>
          </div>
          <div className="intro-aside" aria-label="Event details">
            <TreePine className="aside-tree" size={27} strokeWidth={1.2} />
            <span>GOOD COMPANY<br />GOOD CARDS<br />A VERY MERRY TIME</span>
            <ArrowDownRight size={20} strokeWidth={1.3} />
          </div>
        </section>

        <section className="summary-strip" aria-label="Seating summary">
          <div className="summary-title"><Users size={17} /><span>THE ROOM</span></div>
          <div className="summary-stat"><strong>{totalCapacity}</strong><span>PLACES</span></div>
          <div className="summary-stat"><strong>{attendeeCount}</strong><span>RESERVED</span></div>
          <div className="summary-stat"><strong>{remainingPlaces}</strong><span>REMAINING</span></div>
          <div className="summary-stat"><strong>{memberCount}<small> / {guestCount}</small></strong><span>MEMBERS / GUESTS</span></div>
          <div className="summary-progress" aria-label={`${attendeeCount} of ${totalCapacity} places reserved`}>
            <span style={{ width: `${(attendeeCount / totalCapacity) * 100}%` }} />
          </div>
        </section>

        <section className="registration-section" id="registration">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 <span className="eyebrow-line" /> MAKE IT OFFICIAL</p>
              <h2>Reserve your place</h2>
            </div>
            <span className="required-note"><span className="required-star">*</span> Required fields</span>
          </div>

          <form className="reservation-form" onSubmit={submitReservation}>
            <div className="form-main">
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="member-name">Member name <b>*</b></label>
                  <div
                    className="member-lookup"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setIsMemberListOpen(false)
                      }
                    }}
                  >
                    <input
                      id="member-name"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={isMemberListOpen && memberSuggestions.length > 0}
                      aria-controls="member-suggestions"
                      aria-activedescendant={memberSuggestions[activeMemberSuggestion] ? `member-option-${memberSuggestions[activeMemberSuggestion].id}` : undefined}
                      autoComplete="off"
                      placeholder="Search name or ABF number"
                      value={memberName}
                      onFocus={() => setIsMemberListOpen(true)}
                      onKeyDown={handleMemberKeyDown}
                      onChange={(event) => {
                        setMemberName(event.target.value)
                        setSelectedMember(null)
                        setActiveMemberSuggestion(0)
                        setIsMemberListOpen(true)
                      }}
                      required
                    />
                    {selectedMember && <small className="member-number-note">ABF number · {selectedMember.abf_number || 'not listed'}</small>}
                    {isMemberListOpen && memberSuggestions.length > 0 && (
                      <div className="member-suggestions" id="member-suggestions" role="listbox">
                        {memberSuggestions.map((member, index) => (
                          <button
                            className={`member-suggestion ${index === activeMemberSuggestion ? 'is-active' : ''}`}
                            id={`member-option-${member.id}`}
                            key={member.id}
                            type="button"
                            role="option"
                            aria-selected={index === activeMemberSuggestion}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectMember(member)}
                          >
                            <span>{member.name}</span>
                            <small>{member.abf_number ? `ABF #${member.abf_number}` : 'ABF number not listed'}</small>
                          </button>
                        ))}
                      </div>
                    )}
                    {isMemberListOpen && memberName.trim().length >= 2 && !memberSuggestionsQuery.isFetching && memberSuggestions.length === 0 && (
                      <p className="member-no-results">No current member matches. Check the spelling or number.</p>
                    )}
                  </div>
                </div>
                <label className="field">
                  <span>Member ticket number <b>*</b></span>
                  <div className="input-with-icon"><Ticket size={16} /><input inputMode="numeric" placeholder="e.g. 127" value={memberTicket} onChange={(event) => setMemberTicket(event.target.value)} required /></div>
                </label>
              </div>

              <label className="guest-toggle">
                <input type="checkbox" checked={addGuest} onChange={(event) => setAddGuest(event.target.checked)} />
                <span className="custom-check"><Check size={13} /></span>
                <span className="guest-toggle-copy"><strong>Bring a guest</strong><small>Add another place at your table</small></span>
                <span className="guest-seat"><Armchair size={16} /> +1 SEAT</span>
              </label>

              {addGuest && (
                <div className="field-grid guest-fields">
                  <label className="field"><span>Guest name <b>*</b></span><input placeholder="Guest's full name" value={guestName} onChange={(event) => setGuestName(event.target.value)} required /></label>
                  <label className="field"><span>Guest ticket number <b>*</b></span><div className="input-with-icon"><Ticket size={16} /><input inputMode="numeric" placeholder="e.g. 128" value={guestTicket} onChange={(event) => setGuestTicket(event.target.value)} required /></div></label>
                </div>
              )}

              <fieldset className="dietary-fieldset">
                <legend><Utensils size={15} /> Dietary requirements <span>OPTIONAL</span></legend>
                <div className="dietary-options">
                  {(['Vegetarian', 'Nut-Free', 'Gluten-Free'] as DietaryRequirement[]).map((item) => (
                    <label className="dietary-option" key={item}>
                      <input type="checkbox" checked={dietaryRequirements.includes(item)} onChange={() => toggleDietary(item)} />
                      <span className="custom-check"><Check size={13} /></span>{item}
                    </label>
                  ))}
                </div>
                <label className="notes-field"><span>Anything else we should know?</span><input maxLength={100} placeholder="Additional dietary notes (100 characters max)" value={dietaryNotes} onChange={(event) => setDietaryNotes(event.target.value)} /><small>{dietaryNotes.length}/100</small></label>
              </fieldset>

              {addGuest && (
                <fieldset className="dietary-fieldset">
                  <legend><Utensils size={15} /> Guest dietary requirements <span>OPTIONAL</span></legend>
                  <div className="dietary-options">
                    {(['Vegetarian', 'Nut-Free', 'Gluten-Free'] as DietaryRequirement[]).map((item) => (
                      <label className="dietary-option" key={item}>
                        <input type="checkbox" checked={guestDietaryRequirements.includes(item)} onChange={() => toggleGuestDietary(item)} />
                        <span className="custom-check"><Check size={13} /></span>{item}
                      </label>
                    ))}
                  </div>
                  <label className="notes-field"><span>Anything else we should know about your guest?</span><input maxLength={100} placeholder="Guest dietary notes (100 characters max)" value={guestDietaryNotes} onChange={(event) => setGuestDietaryNotes(event.target.value)} /><small>{guestDietaryNotes.length}/100</small></label>
                </fieldset>
              )}
            </div>

            <aside className="form-aside">
              <p className="aside-label"><MapPin size={15} /> YOUR TABLE</p>
              <label className="field table-select-field"><span>Choose a table</span>
                <select value={preferredTable} onChange={(event) => setPreferredTable(Number(event.target.value))}>
                  {TABLES.map((table) => {
                    const openSeats = table.capacity - tableAttendees(table.number).length
                    return <option key={table.number} value={table.number} disabled={openSeats < (addGuest ? 2 : 1)}>Table {table.number} ({openSeats} seats left)</option>
                  })}
                </select>
              </label>
              <div className="table-preview"><span className="preview-number">{String(preferredTable).padStart(2, '0')}</span><span><small>TABLE</small><strong>{tableAttendees(preferredTable).length} / 12 SEATED</strong></span><Armchair size={18} /></div>
              <p className="form-assurance"><Leaf size={14} /> Your details are only used for event planning.</p>
              <TurnstileWidget
                siteKey={TURNSTILE_SITE_KEY}
                resetNonce={turnstileResetNonce}
                onToken={(token) => {
                  setTurnstileToken(token)
                  setTurnstileError(false)
                }}
                onError={() => setTurnstileError(true)}
              />
              {turnstileError && <p className="turnstile-error" role="alert">Security verification could not load. Refresh the page and try again.</p>}
              <button className="submit-button" type="submit" disabled={reservationMutation.isPending || !turnstileToken}>{reservationMutation.isPending ? 'Saving reservation…' : addGuest ? 'Reserve 2 places' : 'Reserve my place'} <ArrowRight size={17} /></button>
            </aside>
          </form>
          {formMessage && <p className="form-feedback error-feedback" role="alert">{formMessage}</p>}
          {savedMessage && <p className="form-feedback success-feedback" role="status"><CircleCheck size={17} /> You’re on the list. Your reservation is saved at Table {preferredTable}.</p>}
        </section>

        <section className="seating-section" id="seating">
          <div className="section-heading board-heading">
            <div><p className="eyebrow">02 <span className="eyebrow-line" /> FIND YOUR PEOPLE</p><h2>The seating board</h2></div>
            <div className="search-wrap"><Search size={17} /><input aria-label="Search by name or table number" placeholder="Find a name or table" value={search} onChange={(event) => setSearch(event.target.value)} /><span className="search-shortcut">⌕</span></div>
          </div>
          <div className="board-meta"><span><span className="board-dot occupied-dot" /> SEATED</span><span><span className="board-dot available-dot" /> AVAILABLE</span><span className="board-count">{attendeeCount} OF {totalCapacity} PLACES RESERVED</span></div>
          {attendeesQuery.isError && <p className="form-feedback error-feedback" role="alert">The seating board could not load. Please refresh to try again.</p>}

          <div className="table-grid">
            {TABLES.map((table) => {
              const guests = tableAttendees(table.number)
              const isExpanded = expandedTables.includes(table.number)
              const isMatch = matchingTables.has(table.number)
              return (
                <article className={`table-card ${isMatch ? 'is-match' : ''} ${guests.length === 0 ? 'is-empty' : ''} ${attendeeCount === 0 && table.number === 1 ? 'first-empty-table' : ''}`} id={`table-${table.number}`} data-table-id={table.number} key={table.number}>
                  <div className="table-card-top"><span className="table-kicker">JOONDALUP BRIDGE CLUB</span><span className="table-available">{table.capacity - guests.length} OPEN</span></div>
                  <div className="table-title-row"><h3>Table <strong>{String(table.number).padStart(2, '0')}</strong></h3><span className="table-watermark">{String(table.number).padStart(2, '0')}</span></div>
                  <div className="table-occupancy"><span>{guests.length} / {table.capacity} seated</span><span>{table.capacity - guests.length} places available</span></div>
                  <div className="occupancy-track"><span style={{ width: `${(guests.length / table.capacity) * 100}%` }} /></div>
                  <div className={`seat-list ${isExpanded ? 'is-expanded' : ''}`}>
                    {guests.length > 0 ? guests.map((attendee) => (
                      <div className="seat-row occupied-seat" key={attendee.id}><span className="seat-status"><Check size={11} /></span><span className="seat-name">{attendee.name}</span><span className="seat-type">{attendee.isGuest ? 'GUEST' : 'MEMBER'}</span></div>
                    )) : <div className="empty-notice"><span className="seat-status" /> A place is waiting for you</div>}
                    {Array.from({ length: table.capacity - guests.length }, (_, index) => <div className="seat-row available-seat" key={`available-${index}`}><span className="seat-status" /><span className="seat-name">Available</span></div>)}
                  </div>
                  <div className="table-card-actions">
                    <button className="sit-button" onClick={() => goToRegistration(table.number)} type="button">Sit here <ArrowRight size={14} /></button>
                    <button className="expand-button" type="button" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} Table ${table.number}`} onClick={() => setExpandedTables((current) => current.includes(table.number) ? current.filter((number) => number !== table.number) : [...current, table.number])}>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}<span>{isExpanded ? 'Collapse layout' : 'View seating layout'}</span></button>
                  </div>
                </article>
              )
            })}
          </div>
          {matchingTables.size === 0 && search.trim() && <p className="no-results">No names or tables match “{search}”.</p>}
        </section>
      </main>

      <footer className="site-footer"><span>JOONDALUP BRIDGE CLUB <span className="footer-separator">/</span> CHRISTMAS FUNCTION 2026</span><span>MADE FOR GOOD COMPANY <TreePine size={14} /></span></footer>
    </div>
  )
}

export default App
