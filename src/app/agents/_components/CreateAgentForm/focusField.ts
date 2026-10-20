/**
 * Move the reader to a field named in the gap list.
 *
 * Fields are found by the `data-field` attribute their `FormItem` carries,
 * because the control inside can be an input, a textarea or a Radix combobox
 * button, and only the wrapper knows the form path.
 */
export function focusField(field: string): void {
  if (typeof document === "undefined") return;

  const selector = `[data-field="${
    typeof CSS !== "undefined" && CSS.escape ? CSS.escape(field) : field
  }"]`;

  // The field may be two commits away: one to switch step, another for the
  // panel holding it to expand. Look again for a few frames before giving up.
  let attemptsLeft = 5;

  const attempt = () => {
    const host = document.querySelector<HTMLElement>(selector);
    if (!host) {
      attemptsLeft -= 1;
      if (attemptsLeft > 0) window.requestAnimationFrame(attempt);
      return;
    }

    const target =
      host.querySelector<HTMLElement>(
        "input:not([type='hidden']), textarea, select, button, [tabindex]:not([tabindex='-1'])"
      ) ?? host;

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;

    target.scrollIntoView({
      block: "center",
      behavior: reduceMotion ? "auto" : "smooth",
    });
    target.focus({ preventScroll: true });
  };

  window.requestAnimationFrame(attempt);
}
