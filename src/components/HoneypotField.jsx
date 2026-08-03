/**
 * Campo honeypot — invisível a humanos, tentador para bots.
 * Não usar display:none (alguns bots ignoram); manter no DOM fora do ecrã.
 */
export default function HoneypotField({ id = 'url_extra', value, onChange }) {
  return (
    <div
      className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden opacity-0"
      aria-hidden="true"
    >
      <label htmlFor={id}>
        Website
        <input
          id={id}
          name="url_extra"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={onChange}
        />
      </label>
    </div>
  )
}
