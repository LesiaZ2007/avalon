'use client';

import { useEffect, useState } from 'react';
import RoundTable from './RoundTable';
import Fan from './Fan';
import { ApproveMark, BrokenBlade, Grail, LadyDrop, RejectMark, RoleEmblem } from './art';
import { ReactionIcon } from './reactionIcons';
import { EVIL_COUNT, ROLES } from '@/lib/rules';

// A practice table for the walkthrough. Nothing here touches a real room.
const DEMO = [
  { id: 'gawain', name: 'Gawain', avatar: { icon: 'helm', tint: 0 } },
  { id: 'elaine', name: 'Elaine', avatar: { icon: 'rose', tint: 5 } },
  { id: 'tristan', name: 'Tristan', avatar: { icon: 'stag', tint: 2 } },
  { id: 'you', name: 'You', avatar: { icon: 'owl', tint: 6 } },
  { id: 'cai', name: 'Cai', avatar: { icon: 'raven', tint: 4 } },
  { id: 'lamorak', name: 'Lamorak', avatar: { icon: 'wolf', tint: 9 } },
];
const demoName = (id) => DEMO.find((p) => p.id === id)?.name ?? '';
const demoAvatar = (id) => DEMO.find((p) => p.id === id)?.avatar;

const SPECIALS = [
  ['merlin', 'Knows who is evil (except Mordred), but must stay hidden.'],
  ['percival', 'Sees Merlin, though Morgana looks the same to him.'],
  ['assassin', 'If good wins three quests, gets one guess at Merlin.'],
  ['morgana', 'Appears as Merlin to Percival.'],
  ['mordred', 'Hidden from Merlin.'],
  ['oberon', 'Evil, but unknown to the other evil players.'],
];

function TeamStep() {
  const [picked, setPicked] = useState([]);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 2 ? p : [...p, id]));
  return (
    <>
      <div className="tut-table">
        <RoundTable
          seats={DEMO.map((p) => p.id)}
          nameOf={demoName}
          avatarOf={demoAvatar}
          you={null}
          info={(id) => ({ leader: id === 'you', picked: picked.includes(id) })}
          onPick={toggle}
          canPick={() => true}
          center={
            <>
              <span className="center-title">Quest I</span>
              <span className="center-line">{picked.length} of 2 knights chosen</span>
            </>
          }
        />
      </div>
      <p className="tut-try">
        {picked.length < 2 ? 'Try it: you hold the crown. Tap two seats to build a team.' : `${picked.map(demoName).join(' and ')} it is. Next, the whole table votes on your choice.`}
      </p>
    </>
  );
}

function VoteStep() {
  const others = { gawain: true, elaine: false, tristan: true, cai: true, lamorak: false };
  const [mine, setMine] = useState(null);
  const votes = mine === null ? null : { ...others, you: mine };
  const yes = votes ? Object.values(votes).filter(Boolean).length : 0;
  const approved = yes > DEMO.length / 2;
  return (
    <>
      <div className="token-row">
        <button className={`vote-token is-approve ${mine === true ? 'is-on' : ''}`} onClick={() => setMine(true)}>
          <span className="token-face">
            <ApproveMark size={40} />
          </span>
          Approve
        </button>
        <button className={`vote-token is-reject ${mine === false ? 'is-on' : ''}`} onClick={() => setMine(false)}>
          <span className="token-face">
            <RejectMark size={40} />
          </span>
          Reject
        </button>
      </div>
      {votes ? (
        <div className="tut-reveal">
          <div className="vote-reveal">
            {DEMO.map((p, i) => (
              <div key={p.id} className="vote-reveal-item" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className={`mini-token ${votes[p.id] ? 'is-approve' : 'is-reject'}`}>{votes[p.id] ? <ApproveMark size={22} /> : <RejectMark size={22} />}</span>
                <span>{p.name}</span>
              </div>
            ))}
          </div>
          <p className={`tut-result ${approved ? 'good-text' : 'evil-text'}`}>
            {approved ? `Approved ${yes}–${DEMO.length - yes}. The team goes on the quest.` : `Rejected ${yes}–${DEMO.length - yes}. Leadership passes to the next seat.`}
          </p>
        </div>
      ) : (
        <p className="tut-try">Try it: cast your vote. Everyone&rsquo;s votes are revealed at once.</p>
      )}
    </>
  );
}

function QuestStep() {
  const [side, setSide] = useState('good');
  const [played, setPlayed] = useState(null);
  const [note, setNote] = useState('');
  useEffect(() => {
    setPlayed(null);
    setNote('');
  }, [side]);

  function play(success) {
    if (!success && side === 'good') return setNote('Loyal servants of Arthur must play Success. Only evil can sink a quest.');
    setNote('');
    setPlayed(success ? 'success' : 'fail');
  }
  const cards = played ? ['success', 'success', played].sort() : [];
  const failed = played === 'fail';

  return (
    <>
      <div className="pills" role="radiogroup" aria-label="Practice as">
        <button className="pill" role="radio" aria-checked={side === 'good'} aria-pressed={side === 'good'} onClick={() => setSide('good')}>
          Play as loyal
        </button>
        <button className="pill" role="radio" aria-checked={side === 'evil'} aria-pressed={side === 'evil'} onClick={() => setSide('evil')}>
          Play as evil
        </button>
      </div>
      {played ? (
        <div className="tut-reveal">
          <div className="cards">
            {cards.map((c, i) => (
              <span key={i} className={`quest-card is-${c}`} style={{ animationDelay: `${0.1 + i * 0.35}s` }}>
                {c === 'success' ? <Grail size={32} /> : <BrokenBlade size={32} />}
                <span>{c === 'success' ? 'Success' : 'Fail'}</span>
              </span>
            ))}
          </div>
          <p className={`tut-result ${failed ? 'evil-text' : 'good-text'}`}>
            {failed ? 'One Fail card, so the quest fails. Nobody knows who played it.' : 'All Success: the quest succeeds.'}
          </p>
          <button className="btn btn-sm btn-ghost" onClick={() => setPlayed(null)}>
            Play again
          </button>
        </div>
      ) : (
        <>
          <div className="card-hand">
            <button className="quest-choice is-success" onClick={() => play(true)}>
              <Grail size={48} />
              Success
            </button>
            <button className="quest-choice is-fail" onClick={() => play(false)}>
              <BrokenBlade size={48} />
              Fail
            </button>
          </div>
          <p className={note ? 'error tut-try' : 'tut-try'}>{note || 'Try it: you are on a three-knight quest. Play a card.'}</p>
        </>
      )}
    </>
  );
}

const STEPS = [
  {
    title: 'Loyalty is secret',
    body: 'Everyone is dealt a hidden role. Most players are loyal servants of King Arthur. A few are minions of Mordred, and they know each other. Good needs to find them; evil needs to stay hidden.',
    stage: () => (
      <>
        <Fan roles={['servant', 'servant', 'merlin', 'percival', 'assassin', 'minion']} label="Good and evil roles" />
        {[
          [[5, 6, 7, 8], ''],
          [[9, 10, 11, 12], ''],
          [[13, 14, 15], 'house rules'],
        ].map(([counts, note]) => (
          <table key={counts[0]} className="tut-counts">
            <tbody>
              <tr>
                <th scope="row">Players</th>
                {counts.map((n) => (
                  <td key={n} className={n > 10 ? 'is-house' : ''}>
                    {n}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="evil-text">
                  Evil
                </th>
                {counts.map((n) => (
                  <td key={n} className={`evil-text ${n > 10 ? 'is-house' : ''}`}>
                    {EVIL_COUNT[n]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        ))}
        <p className="muted small">The box stops at 10 players; 11 to 15 use house rules with bigger quest teams.</p>
      </>
    ),
  },
  {
    title: 'Special roles',
    body: 'The host chooses which special roles are in play. Merlin is good’s secret weapon, and the Assassin is evil’s answer to him.',
    stage: () => (
      <ul className="tut-roles">
        {SPECIALS.map(([role, text]) => (
          <li key={role} className={`is-${ROLES[role].team}`}>
            <span className="tut-role-art">
              <RoleEmblem role={role} size={36} />
            </span>
            <span>
              <strong>{ROLES[role].name}</strong>
              <span className="muted"> {text}</span>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: 'The leader picks a team',
    body: 'Each round, the leader (wearing the crown) proposes knights for the next quest. The quest board says how many. Leadership passes clockwise around the table after every proposal.',
    stage: () => <TeamStep />,
  },
  {
    title: 'Everyone votes',
    body: 'Every player votes to approve or reject the team, and all votes are shown at once. A majority sends the team; a tie rejects it. If five teams in a row are rejected, evil wins on the spot.',
    stage: () => <VoteStep />,
  },
  {
    title: 'The quest',
    body: 'Each knight on the team secretly plays Success or Fail. Loyal players must play Success; evil players can choose. One Fail sinks the quest. With 7 or more players, quest IV needs two.',
    stage: () => <QuestStep />,
  },
  {
    title: 'Winning',
    body: 'Three failed quests and evil wins. Three successful quests and good is nearly there, but then evil is revealed and the Assassin names one player. If it is Merlin, evil steals the game.',
    stage: () => (
      <div className="tut-win">
        <div className="tut-board">
          <div className="quest-row">
            {['success', 'fail', 'success', 'success', 'pending'].map((r, i) => (
              <span key={i} className={`medal is-${r}`}>
                {r === 'success' ? <Grail size={22} /> : r === 'fail' ? <BrokenBlade size={22} /> : 4}
              </span>
            ))}
          </div>
        </div>
        <div className="tut-assassin">
          <RoleEmblem role="assassin" size={44} />
          <span>
            Three successes. <strong className="evil-text">The Assassin now has one guess.</strong>
          </span>
        </div>
      </div>
    ),
  },
  {
    title: 'Lady of the Lake',
    body: 'An optional rule, best with 7 or more players. After quests II, III and IV, whoever holds the Lady secretly learns one player’s loyalty, then passes her to that player. Nobody can be examined twice.',
    stage: () => (
      <div className="tut-lady">
        <span className="tut-lady-art">
          <LadyDrop size={56} />
        </span>
        <div className="tut-lady-result">
          <span className="chip chip-good">Elaine: Good</span>
          <span className="muted small">Only the holder sees the answer.</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Reading the table',
    body: 'The game is about deduction, and the app keeps the evidence where you can see it.',
    stage: () => (
      <ul className="tut-tips">
        <li>
          <span className="tut-tip-icon">
            <RoleEmblem role="servant" size={28} />
          </span>
          <span>
            <strong>My role</strong> turns your card over whenever you need a reminder. Shield your screen first.
          </span>
        </li>
        <li>
          <span className="tut-tip-icon">
            <ApproveMark size={26} />
          </span>
          <span>
            <strong>Seats show the last vote</strong>, and tapping a player shows every vote they cast. Mark them Trust or Suspect; only you can see it.
          </span>
        </li>
        <li>
          <span className="tut-tip-icon">
            <ReactionIcon id="sus" size={26} />
          </span>
          <span>
            <strong>Reactions</strong> pop up over your seat for the whole table.
          </span>
        </li>
        <li>
          <span className="tut-tip-icon">
            <Grail size={26} />
          </span>
          <span>
            <strong>The chronicle</strong> lists every proposal, vote and quest result in order.
          </span>
        </li>
      </ul>
    ),
  },
];

/** A step-by-step walkthrough of the rules, with a practice table. */
export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay overlay-sheet tutorial" onClick={onClose} role="dialog" aria-modal="true" aria-label="How to play">
      <div className="tut-card" onClick={(e) => e.stopPropagation()}>
        <div className="tut-head">
          <p className="eyebrow">
            How to play · {step + 1} of {STEPS.length}
          </p>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="tut-dots" role="tablist" aria-label="Steps">
          {STEPS.map((s, i) => (
            <button key={s.title} role="tab" aria-selected={i === step} aria-label={s.title} className={`tut-dot ${i <= step ? 'is-done' : ''}`} onClick={() => setStep(i)} />
          ))}
        </div>
        <div className="tut-step" key={step}>
          <h2 className="tut-title">{current.title}</h2>
          <p className="tut-body">{current.body}</p>
          <div className="tut-stage">{current.stage()}</div>
        </div>
        <div className="tut-nav">
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </button>
          <button className="btn btn-primary" onClick={() => (last ? onClose() : setStep(step + 1))}>
            {last ? 'Ready to play' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
