import Link from "next/link";
import type { SeasonData, TeamStanding } from "@/lib/season";
import { MarbleLink } from "./Marble";
import { Flag } from "./Flag";

const MEDAL = ["var(--color-gold)", "var(--color-silver)", "var(--color-bronze)"];

function Movement({ t }: { t: TeamStanding }) {
  if (t.prevRank == null) return <span className="text-ink-faint" aria-hidden>&nbsp;</span>;
  const d = t.prevRank - t.rank;
  if (d === 0) return <span className="text-ink-faint" title="No change">&ndash;</span>;
  const up = d > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? "text-[#2f855a]" : "text-redline"}`} title={`${up ? "Up" : "Down"} ${Math.abs(d)} since the previous event`}>
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden className={up ? "" : "rotate-180"}><path d="M5 1 9.5 8.5h-9z" fill="currentColor" /></svg>
      {Math.abs(d)}
    </span>
  );
}

export function Leaderboard({ data, q }: { data: SeasonData; q: string }) {
  const { teams, lastEvent, season } = data;
  return (
    <div className="roll-in overflow-hidden rounded-2xl bg-board shadow-[0_1px_0_var(--color-frost),0_12px_32px_-18px_rgb(11_42_74_/_0.35)]">
      <div className="hidden grid-cols-[3rem_2.25rem_1fr_4.5rem_5rem_4rem] items-end gap-x-3 border-b border-frost px-5 pb-2 pt-4 text-[13px] text-ink-faint sm:grid">
        <span>Rank</span>
        <span />
        <span>Team</span>
        <span className="text-right">{lastEvent ? `Event ${lastEvent.no}` : "Last"}</span>
        <span className="text-right">Points</span>
        <span className="text-right">Behind</span>
      </div>
      <ol>
        {teams.map((t, i) => (
          <li key={t.id} className="relative border-b border-frost last:border-0">
            {t.rank <= 3 && data.completed.length > 0 && (
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: MEDAL[t.rank - 1] }} aria-hidden />
            )}
            <div className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-3 px-4 py-3 transition-colors hover:bg-ice/60 sm:grid-cols-[3rem_2.25rem_1fr_4.5rem_5rem_4rem] sm:px-5">
              <span className="num row-span-2 self-start pt-2 text-[28px] font-bold leading-none text-ink sm:row-span-1 sm:self-center sm:pt-0 sm:text-[32px]">{t.rank}</span>
              <span className="hidden text-sm sm:block"><Movement t={t} /></span>
              <span className="flex min-w-0 items-center gap-3">
                <Flag src={t.flag} name={t.name} size={42} className="self-start" />
                <span className="min-w-0">
                  {/* the team link stretches over the whole row; marble links sit above it */}
                  <Link href={`/teams/${t.id}${q}`} className="block truncate text-[17px] font-semibold leading-tight after:absolute after:inset-0 after:content-['']">
                    {t.name}
                  </Link>
                  <span className="block truncate text-sm text-ink-soft">{t.manager}</span>
                </span>
              </span>
              <span className="order-last col-span-2 col-start-2 row-start-2 mt-2 flex flex-wrap items-center gap-1.5 sm:col-span-1 sm:col-start-3 sm:-mt-1 sm:pl-[54px]">
                {t.current.map((m, k) => (
                  <span key={k} style={{ ["--i" as string]: i * season.slotsPerTeam + k }}>
                    <MarbleLink m={m} q={q} size={22} className="max-w-[11rem] bg-ice py-0.5 pl-0.5 pr-2.5 hover:bg-frost">
                      <span className="truncate text-[13px] font-medium text-ink-soft">{m?.name}</span>
                    </MarbleLink>
                  </span>
                ))}
              </span>
              <span className="hidden text-right num text-lg text-ink-soft sm:block">
                {t.lastEventPoints != null ? `+${t.lastEventPoints}` : ""}
              </span>
              <span className="text-right">
                <span className="num text-[30px] font-bold leading-none">{t.total}</span>
              </span>
              <span className="hidden text-right num text-lg text-ink-faint sm:block">{t.gap === 0 ? "" : `${t.gap}`}</span>
            </div>
          </li>
        ))}
      </ol>
      {teams.length === 0 && <p className="px-5 py-10 text-center text-ink-soft">No league teams in this season yet. Add them in admin.</p>}
    </div>
  );
}
