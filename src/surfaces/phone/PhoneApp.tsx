// The rider's phone app during the ride (390×844).
import {
  appointmentClock,
  arrivalClock,
  formatClock,
  isHolding,
  useRiderAction,
  useSim,
} from "../../engine";

export function PhoneApp() {
  const sim = useSim();
  const help = useRiderAction("pressHelp", "phone");
  const arrival = arrivalClock(sim);
  const appointment = appointmentClock(sim);
  const lateBy = appointment === null ? 0 : Math.ceil((arrival - appointment) / 60);
  const statusText =
    sim.car.mode === "arrived" ? "You've arrived" : isHolding(sim) ? "Stopped" : sim.car.mode === "idle" ? "Ready to go" : "On the way";

  return (
    <div className="phone">
      <div className="phone-notch" />
      <header className="phone-header">Your ride</header>
      <section className="phone-card">
        <div className="phone-status">{statusText}</div>
        <div className="phone-arrival">Arriving {formatClock(arrival)}</div>
        <div className="phone-dest">{sim.trip.destination}</div>
        {sim.trip.address && <div className="phone-muted">{sim.trip.address}</div>}
      </section>
      {appointment !== null && (
        <section className={`phone-card appointment ${lateBy > 0 ? "late" : ""}`}>
          <div className="phone-muted">Appointment</div>
          <div className="phone-appt">{formatClock(appointment)}</div>
          <div>{lateBy > 0 ? `About ${lateBy} min late` : "On time"}</div>
        </section>
      )}
      {sim.support.messages.length > 0 && (
        <section className="phone-card">
          <div className="phone-muted">Rider Support</div>
          {sim.support.messages.slice(-3).map((m, i) => (
            <p key={i} className={`phone-msg from-${m.from}`}>
              {m.text}
            </p>
          ))}
        </section>
      )}
      <div className="phone-spacer" />
      <button className="phone-help" onClick={help}>
        Get help
      </button>
    </div>
  );
}
