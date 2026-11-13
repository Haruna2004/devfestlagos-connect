import { useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SKILL_LIMITS } from "../../shared/skills";
import { LIMITS, LOOKING_FOR } from "../../shared/types";
import type { MyProfile, ProfileInput } from "../../shared/types";
import { ChipPicker } from "../components/Chips";
import { IconClose } from "../components/icons";
import { SkillPicker } from "../components/SkillPicker";
import { missing, STEPS, wantsLabel } from "../lib/strength";
import type { Step } from "../lib/strength";

// "Get better intros": one short question per screen, each skippable.
// Starts at the first missing step and saves as you go.
export function Boost({
  me,
  start,
  onSave,
  onClose,
}: {
  me: MyProfile;
  start?: Step;
  onSave: (input: ProfileInput) => Promise<void>;
  onClose: () => void;
}) {
  // Fixed when the flow opens; saving a step must not reshuffle the rest.
  const [steps] = useState(() => (start ? STEPS.slice(STEPS.indexOf(start)) : missing(me).length ? missing(me) : STEPS));
  const [i, setI] = useState(0);
  const [skills, setSkills] = useState(me.skills);
  const [lookingFor, setLookingFor] = useState(me.lookingFor);
  const [wantsSkills, setWantsSkills] = useState(me.wantsSkills);
  const [findMe, setFindMe] = useState(me.findMe);
  const [title, setTitle] = useState(me.title);
  const [company, setCompany] = useState(me.company);
  const [bio, setBio] = useState(me.bio);
  const [busy, setBusy] = useState(false);
  const step = steps[i];

  async function next() {
    setBusy(true);
    try {
      const input: ProfileInput =
        step === "skills"
          ? { skills }
          : step === "goals"
            ? { lookingFor, wantsSkills }
            : step === "findMe"
              ? { findMe }
              : { title, company, bio };
      await onSave(input);
      if (i + 1 < steps.length) setI(i + 1);
      else onClose();
    } finally {
      setBusy(false);
    }
  }

  const skip = () => (i + 1 < steps.length ? setI(i + 1) : onClose());

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="bg-ink pt-safe text-paper">
        <div className="flex h-14 items-center gap-3 px-5">
          <div className="flex flex-1 gap-1.5">
            {steps.map((s, n) => (
              <span key={s} className={`h-1.5 flex-1 ${n <= i ? "bg-amber" : "bg-paper/20"}`} />
            ))}
          </div>
          <button onClick={onClose} className="-mr-2 p-2" aria-label="Close">
            <IconClose />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pt-7 pb-6">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.18 }}>
            {step === "skills" && (
              <Q title="What do you work with?" sub="Tech or not. Up to 8. These power your intros.">
                <SkillPicker value={skills} onChange={setSkills} max={SKILL_LIMITS.have} tags={me.tags} />
              </Q>
            )}

            {step === "goals" && (
              <Q title="What are you looking for today?" sub="Pick up to 4.">
                <ChipPicker options={LOOKING_FOR} value={lookingFor} onChange={setLookingFor} max={4} />
                {lookingFor.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-7 grid gap-3">
                    <div>
                      <h3 className="font-display text-[22px] leading-tight">{wantsLabel(lookingFor)}</h3>
                      <p className="text-[14px] text-muted">Optional. Up to 5. Makes intros much sharper.</p>
                    </div>
                    <SkillPicker
                      value={wantsSkills}
                      onChange={setWantsSkills}
                      max={SKILL_LIMITS.want}
                      tags={me.tags}
                      placeholder="e.g. Kubernetes, PyTorch, Fundraising"
                    />
                  </motion.div>
                )}
              </Q>
            )}

            {step === "findMe" && (
              <Q title="Where can people find you?" sub="Update it as you move. Rough is fine.">
                <input
                  autoFocus
                  value={findMe}
                  onChange={(e) => setFindMe(e.target.value)}
                  maxLength={LIMITS.findMe}
                  placeholder="Hall B, row 3, green hoodie"
                  className={inputCls}
                />
              </Q>
            )}

            {step === "about" && (
              <Q title="A bit about you" sub="All optional.">
                <div className="grid grid-cols-2 gap-3">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} placeholder="Role" className={inputCls} />
                  <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={LIMITS.company} placeholder="Company" className={inputCls} />
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={LIMITS.bio}
                  rows={3}
                  placeholder="One line people can start a conversation with."
                  className={`${inputCls} mt-3 h-auto resize-none py-3 leading-snug`}
                />
              </Q>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-3 border-t-2 border-ink px-5 pt-3 pb-safe">
        <button onClick={skip} className="mb-4 h-14 px-4 text-[16px] text-muted">
          Skip
        </button>
        <button onClick={next} disabled={busy} className="press pop mb-4 h-14 flex-1 border-2 border-ink bg-ink text-[17px] font-semibold text-paper disabled:opacity-60">
          {busy ? "Saving…" : i + 1 < steps.length ? "Next" : "Done"}
        </button>
      </div>
    </div>
  );
}

const inputCls = "h-12 w-full border-2 border-ink bg-card px-3.5 outline-none placeholder:text-ink/35 focus:bg-white";

function Q({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-[34px] leading-[1.02]">{title}</h2>
      <p className="mt-2 mb-6 text-[16px] text-muted">{sub}</p>
      {children}
    </div>
  );
}
