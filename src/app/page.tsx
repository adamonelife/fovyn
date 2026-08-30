"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BrandMark from "./brand-mark";

const workoutTypes = ["Push", "Pull", "Leg"];
const variants = ["A", "B"];

export default function HomePage() {
  const router = useRouter();
  const [type, setType] = useState("Pull");
  const [variant, setVariant] = useState("A");

  return <main className="shell forbair-home">
    <header className="home-brand-row">
      <BrandMark />
      <Link href="/account" className="account-pill">Account</Link>
    </header>

    <section className="home-welcome">
      <p className="eyebrow">YOUR DAY</p>
      <h1>Build a good day.</h1>
      <p className="muted">One place for the things that help you develop, grow and keep moving forward.</p>
    </section>

    <section className="module-grid" aria-label="FORBAIR modules">
      <article className="module-card module-training">
        <div className="module-heading"><div><span className="module-icon">T</span><div><p className="eyebrow">TRAINING</p><h2>Start a workout</h2></div></div><Link href="/cardio">Cardio</Link></div>
        <div className="segmented three">{workoutTypes.map((item) => <button key={item} className={type === item ? "active" : ""} onClick={() => setType(item)}>{item}</button>)}</div>
        <div className="segmented">{variants.map((item) => <button key={item} className={variant === item ? "active" : ""} onClick={() => setVariant(item)}>{item}</button>)}</div>
        <button className="primary big" onClick={() => router.push(`/workout?type=${type}&variant=${variant}`)}>Build {type} {variant}</button>
      </article>

      <article className="module-card module-next">
        <span className="module-icon">H</span>
        <p className="eyebrow">COMING NEXT</p>
        <h2>Habits</h2>
        <p className="muted">Daily actions, flexible schedules and progress without turning a missed day into failure.</p>
      </article>

      <article className="module-card module-soon"><span className="module-icon">R</span><h2>Recovery</h2><p className="muted">Sleep, energy and readiness.</p></article>
      <article className="module-card module-soon"><span className="module-icon">N</span><h2>Nutrition</h2><p className="muted">Meals, calories and macros.</p></article>
    </section>

    <nav className="home-footer-links"><Link href="/settings">Settings</Link><Link href="/account">Profile & sign in</Link></nav>
  </main>;
}
